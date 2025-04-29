import { eventBus } from '../../util/eventManager.js';
import { debugManager } from '../../util/debugManager.js';
class SerialManager {
    static instance;

    // Command types and their validation rules
    static COMMANDS = {
        BRIGHTNESS: {
            index: 7,
            validate: (value) => typeof value === 'number' && value >= 0 && value <= 100,
            debounceKey: 'brightness'
        },
        POWER: {
            index: 8,
            validate: (value) => typeof value === 'number' && value >= 0 && value <= 100,
            debounceKey: 'power'
        }
    };

    static getInstance() {
        if (!SerialManager.instance) {
            SerialManager.instance = new SerialManager();
        }
        return SerialManager.instance;
    }

    constructor() {
        this.isApiSupported = ('serial' in navigator);
        this.isConnected = false;
        this.isConnecting = false;
        this.enable = false;
        this.availablePorts = []; // Stores actual SerialPort objects
        this.activePort = null;
        this.portReader = null;
        this.portWriter = null;
        this.keepReading = false;
        this.lastConnectedPortId = null;
        this.isRequestingPort = false;
        this.baudRate = 250000;
        this.lastConnectAttemptTime = 0;
        this.connectAttemptCooldown = 2000;
        // Initialize command state tracking
        this.lastSentCommands = {};
        Object.values(SerialManager.COMMANDS).forEach(cmd => {
            this.lastSentCommands[cmd.debounceKey] = { value: null, time: 0 };
        });

        if (!this.isApiSupported) {
            console.warn("SerialManager: Web Serial API not supported by this browser.");
        }

        // Subscribe to parameter updates
        eventBus.on('simParamsUpdated', this.handleParamsUpdate.bind(this));
    }

    get db() {
        return debugManager.get('serial');
    }


    async getAvailablePortsInfo() {
        if (!this.isApiSupported) return [];

        try {
            this.availablePorts = await navigator.serial.getPorts();
            const portInfoArray = await Promise.all(this.availablePorts.map(async (port, index) => {
                let portInfo = null;
                try {
                    portInfo = port.getInfo();
                } catch (infoError) {
                    if (this.db) console.warn(`Could not get info for port ${index}:`, infoError);
                }
                const name = `Port ${index}${portInfo ? ` (VID:${portInfo.usbVendorId} PID:${portInfo.usbProductId})` : ''}`;
                return { id: index, name: name };
            }));

            if (this.db) console.log('Serial Ports Updated:', portInfoArray);
            eventBus.emit('serialPortsUpdated', portInfoArray);
            return portInfoArray;
        } catch (error) {
            console.error("Error getting serial ports:", error);
            eventBus.emit('serialPortsUpdated', []);
            return [];
        }
    }

    async requestPort() {
        if (!this.isApiSupported) return false;

        if (this.isRequestingPort) {
            if (this.db) console.log("SerialManager: Port request already in progress.");
            return false;
        }

        this.isRequestingPort = true;
        let success = false;
        try {
            await navigator.serial.requestPort();
            if (this.db) console.log("Serial port requested successfully.");
            await this.getAvailablePortsInfo(); // Refresh list after request
            success = true;
        } catch (error) {
            if (error.name === 'NotFoundError' || error.name === 'NotAllowedError') {
                if (this.db) console.log("User cancelled port selection or no port selected.");
            } else {
                console.error("Error requesting serial port:", error);
            }
            success = false;
        } finally {
            this.isRequestingPort = false;
        }
        return success;
    }

    async connect(portId) {
        if (!this.isApiSupported || typeof portId !== 'number' || portId < 0 || portId >= this.availablePorts.length) {
            console.error(`SerialManager Connect: Invalid portId ${portId} or API not supported.`);
            return false;
        }
        if (this.isConnecting) {
            if (this.db) console.log("SerialManager Connect: Already attempting connection, request ignored.");
            return false;
        }

        // Step 5 & 6: Add cooldown check logic
        const now = Date.now();
        if ((now - this.lastConnectAttemptTime) < this.connectAttemptCooldown) {
            // if (this.db) console.log("SerialManager Connect: Throttled due to recent failed attempt.");
            return false; // Exit if within cooldown period
        }
        // Update attempt time *before* trying to connect
        this.lastConnectAttemptTime = now;

        this.isRequestingPort = false;

        this.isConnecting = true;
        const port = this.availablePorts[portId];

        if (this.activePort === port && this.isConnected) {
            if (this.db) console.log(`SerialManager Connect: Already connected to Port ${portId}.`);
            this.isConnecting = false;
            return true;
        }

        // Disconnect if a different port is active
        if (this.activePort && this.activePort !== port) {
            if (this.db) console.log(`SerialManager Connect: Disconnecting from previous port before connecting to Port ${portId}.`);
            await this.disconnect();
        }

        try {
            if (this.db) console.log(`SerialManager: Attempting to open Port ${portId}...`);
            await port.open({ baudRate: this.baudRate });
            this.activePort = port;
            this.isConnected = true;
            this.portReader = this.activePort.readable.getReader();
            this.portWriter = this.activePort.writable.getWriter();
            this.keepReading = true;
            this.readLoop(); // Start reading in background
            this.lastConnectedPortId = portId;

            if (this.db) console.log(`SerialManager: Successfully connected to Port ${portId}.`);
            eventBus.emit('serialConnectionStatusChanged', { connected: true, portId });
            this.isConnecting = false;
            return true;

        } catch (error) {
            console.error(`SerialManager: Error opening Port ${portId}:`, error);
            this.activePort = null;
            this.isConnected = false;
            eventBus.emit('serialConnectionStatusChanged', { connected: false });
            this.isConnecting = false;
            this.lastConnectAttemptTime = Date.now(); // Step 7: Update time on connect failure
            return false;
        }
    }

    async disconnect() {
        if (!this.isApiSupported) return;
        if (!this.activePort && !this.isConnected) {
            if (this.db) console.log("SerialManager Disconnect: Already disconnected.");
            return;
        }
        if (this.db) console.log(`SerialManager: Disconnecting from port...`);

        this.keepReading = false; // Signal read loop to stop

        // Release reader
        if (this.portReader) {
            try {
                await this.portReader.cancel(); // Cancel pending reads
                this.portReader.releaseLock();
                if (this.db) console.log("Serial port reader cancelled and lock released.");
            } catch (error) {
                if (this.db) console.error("Error cancelling/releasing reader:", error);
            }
            this.portReader = null;
        }

        // Release writer
        if (this.portWriter) {
            try {
                // Ensure the writer is closed before releasing the lock
                if (this.activePort?.writable && !this.activePort.writable.locked) {
                    await this.portWriter.close(); // Close the stream
                    if (this.db) console.log("Serial port writer stream closed.");
                } else if (this.portWriter.close) {
                    // Fallback if direct stream access isn't feasible but close exists
                    await this.portWriter.close();
                    if (this.db) console.log("Serial port writer stream closed (fallback).");
                }
                this.portWriter.releaseLock();
                if (this.db) console.log("Serial port writer lock released.");
            } catch (error) {
                // Ignore errors if the port is already closing
                if (error.name !== 'InvalidStateError') { // Avoid logging expected errors on close
                    if (this.db) console.error("Error closing/releasing writer:", error);
                }
            }
            this.portWriter = null;
        }

        // Close the port
        if (this.activePort) {
            try {
                await this.activePort.close();
                if (this.db) console.log("Serial port closed.");
            } catch (error) {
                // Ignore errors if the port is already closing
                if (error.name !== 'InvalidStateError') {
                    if (this.db) console.error("Error closing serial port:", error);
                }
            }
        }

        const previouslyConnected = this.isConnected;
        this.activePort = null;
        this.isConnected = false;
        this.isConnecting = false; // Ensure reset
        this.isRequestingPort = false; // Step 3: Add flag reset here

        // Only emit event if status actually changed
        if (previouslyConnected) {
            if (this.db) console.log("SerialManager: Disconnected. Emitting status change.");
            eventBus.emit('serialConnectionStatusChanged', { connected: false });
        }
    }

    async readLoop() {
        if (!this.portReader) {
            if (this.db) console.error("Read loop started without a reader.");
            return;
        }
        if (this.db) console.log("Serial read loop starting...");

        while (this.keepReading && this.isConnected) {
            try {
                const { value, done } = await this.portReader.read();
                if (done) {
                    if (this.db) console.log("Read loop finished (done signal).");
                    this.keepReading = false;
                    break; // Exit loop
                }
                if (value) {
                    if (this.db && this.db?.comSR) console.log("Serial Received:", value); // Log raw Uint8Array
                    // TODO: Process received data - parse commands, etc.
                    // this.processMessage(value); // Placeholder for future parsing
                }
            } catch (error) {
                console.error("Error during serial read:", error);
                this.keepReading = false;
                break; // Exit loop on error
            }
        }

        if (this.db) console.log("Serial read loop exited.");
        // Ensure cleanup happens if loop exits unexpectedly
        if (this.isConnected) {
            await this.disconnect();
        }
    }

    // Add handler for simParams updates
    async handleParamsUpdate({ simParams }) {
        if (simParams?.serial) {
            const serialParams = simParams.serial;
            const previousEnable = this.enable;
            this.enable = serialParams.enabled ?? this.enable;

            if (this.enable !== previousEnable) {
                if (this.db) console.log(`SerialManager: Enable state changed to ${this.enable}.`);
                if (!this.enable && this.isConnected) {
                    if (this.db) console.log("SerialManager: Disabling via params, disconnecting port.");
                    await this.disconnect();
                }
            }
        }
    }

    // Unified command sending system - refactored for Web Serial
    async sendCommand(commandType, value) {
        if (!this.isApiSupported || !this.isConnected || !this.portWriter) {
            if (this.db && !this.isConnected) console.warn(`Serial Send: Failed - Not connected.`);
            if (this.db && !this.portWriter) console.warn(`Serial Send: Failed - No writer available.`);
            return false;
        }

        const command = SerialManager.COMMANDS[commandType];
        if (!command) {
            console.error(`Invalid command type: ${commandType}`);
            return false;
        }

        if (!command.validate(value)) {
            console.error(`Invalid value for command ${commandType}: ${value}`);
            return false;
        }

        // Debouncing (optional but good practice)
        const now = Date.now();
        const lastSent = this.lastSentCommands[command.debounceKey];
        if (lastSent.value === value && now - lastSent.time < 100) { // Shorter debounce for serial? TBD
            return false; // Debounced
        }
        this.lastSentCommands[command.debounceKey] = { value, time: now };

        // Format data as byte array [command_index, value]
        const byteArray = new Uint8Array([command.index, value]);

        try {
            if (this.db && this.db?.comSR) console.log(`Serial Sending (${commandType}):`, byteArray);
            await this.portWriter.write(byteArray);
            return true;
        } catch (error) {
            console.error("Error sending serial command:", error);
            // Attempt to disconnect on write error, might indicate port issue
            await this.disconnect();
            return false;
        }
    }


    async sendRawData(byteArray) {
        if (!this.isApiSupported || !this.isConnected || !this.portWriter) {
            if (this.db && !this.isConnected) console.warn(`Serial SendRawData: Failed - Not connected.`);
            if (this.db && !this.portWriter) console.warn(`Serial SendRawData: Failed - No writer available.`);
            return false;
        }

        if (!(byteArray instanceof Uint8Array)) {
            console.error("Serial SendRawData: Failed - Data must be a Uint8Array.");
            return false;
        }

        try {
            if (this.db && this.db?.comSR) console.log(`Serial Sending Raw Data:`, byteArray);
            await this.portWriter.write(byteArray);
            return true;
        } catch (error) {
            console.error("Error sending serial raw data:", error);
            // Do not automatically disconnect, just report failure
            return false;
        }
    }

    getLastConnectedPortId() {
        return this.lastConnectedPortId;
    }
}

export const serialManager = SerialManager.getInstance();
