import { socketManager } from './udp/socketManager.js';
import { serialManager } from './serial/serialManager.js';
import { eventBus } from '../util/eventManager.js';

class ComManager {
    static instance;

    static getInstance() {
        if (!ComManager.instance) {
            ComManager.instance = new ComManager();
        }
        return ComManager.instance;
    }

    constructor() {
        this.socket = socketManager;
        this.serial = serialManager;
        this.activeChannel = 'network'; // Default to network
        this.db = null;
        this.shouldSendData = false;

        // Listen for channel changes from UI
        eventBus.on('comChannelChanged', this.setActiveChannel.bind(this));
    }

    setDebugFlags(debugFlags) {
        this.db = debugFlags;
        // Pass flags down to underlying managers
        this.socket.setDebugFlags(debugFlags);
        this.serial.setDebugFlags(debugFlags);
    }

    // Make method async to await disconnect
    async setActiveChannel(channel) {
        // Validate channel
        if (channel == 'sendData') {
            this.shouldSendData = true;
            return;
        } else if (channel == 'stopData') {
            this.shouldSendData = false;
            return;
        } else if (channel !== 'network' && channel !== 'serial') {
            console.warn(`ComManager: Invalid channel specified: ${channel}`);
            return;
        }

        // Avoid redundant actions if channel is already active
        if (channel === this.activeChannel) {
            // If it's network and not connected, try connecting (e.g., initial load)
            if (channel === 'network' && !this.socket.isConnected) {
                if (this.db?.com) console.log(`ComManager: Network channel already active, ensuring connection.`);
                this.socket.connect();
            }
            // No action needed if serial is already active (connection handled by user)
            return;
        }

        const oldChannel = this.activeChannel;
        this.activeChannel = channel;
        if (this.db?.com) console.log(`ComManager: Active channel changed from ${oldChannel} to ${this.activeChannel}`);

        // Handle connection/disconnection based on new channel
        if (this.activeChannel === 'network') {
            // Disconnect Serial (if it was active and connected)
            if (oldChannel === 'serial' && this.serial.isConnected) {
                if (this.db?.com) console.log("ComManager: Disconnecting Serial port...");
                await this.serial.disconnect();
            }
            // Connect Socket
            if (this.db?.com) console.log("ComManager: Connecting Socket...");
            this.socket.connect();
        } else if (this.activeChannel === 'serial') {
            // Disconnect Socket (if it was active and connected)
            if (oldChannel === 'network' && this.socket.isConnected) {
                if (this.db?.com) console.log("ComManager: Disconnecting Socket...");
                this.socket.disconnect();
            }
            // Note: Serial connection is triggered by selecting a port in comUi,
            // which calls serialManager.connect() directly.
            if (this.db?.com) console.log("ComManager: Switched to Serial channel. Waiting for user port selection/connection.");
        }
    }

    sendData(value) {
        if (this.shouldSendData) {
            if (this.db?.comSR) console.log(`ComManager: Sending Data (${this.activeChannel}) = ${value}`);
            if (this.activeChannel === 'network') {
                return this.socket.sendData(value);
            } else if (this.activeChannel === 'serial') {
                return this.serial.sendData(value);
            }
        }
    }

    sendColor(value) {
        if (this.db?.com) console.log(`ComManager: Sending Color (${this.activeChannel}) = ${value}`);
        if (this.activeChannel === 'network') {
            return this.socket.sendColor(value);
        } else if (this.activeChannel === 'serial') {
            // Ensure serial send command is awaited if necessary (check serialManager)
            // Assuming serialManager.sendColor handles async correctly if needed
            return this.serial.sendColor(value);
        }
        return false;
    }

    sendBrightness(value) {
        if (this.db?.com) console.log(`ComManager: Sending Brightness (${this.activeChannel}) = ${value}`);
        if (this.activeChannel === 'network') {
            return this.socket.sendBrightness(value);
        } else if (this.activeChannel === 'serial') {
            return this.serial.sendBrightness(value);
        }
        return false;
    }

    sendPower(value) {
        if (this.db?.com) console.log(`ComManager: Sending Power (${this.activeChannel}) = ${value}`);
        if (this.activeChannel === 'network') {
            return this.socket.sendPower(value);
        } else if (this.activeChannel === 'serial') {
            return this.serial.sendPower(value);
        }
        return false;
    }

    isConnected() {
        if (this.activeChannel === 'network') {
            return this.socket.isConnected;
        } else if (this.activeChannel === 'serial') {
            return this.serial.isConnected;
        }
        return false;
    }
}

export const comManager = ComManager.getInstance();


