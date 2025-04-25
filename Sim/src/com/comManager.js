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
        this.activeChannel = 'udp'; // Default to udp
        this.db = null;
        this.shouldSendData = false;
        this.gridParamsRef = null; // Add reference holder
        this.dataVisualization = null; // Initialize explicitly

        // Listen for channel changes from UI
        eventBus.on('comChannelChanged', this.setActiveChannel.bind(this));
    }

    // Method to set the gridParams reference
    setGridParamsRef(gridParams) {
        this.gridParamsRef = gridParams;
        if (this.db?.com) console.log("ComManager: gridParams reference set.");
    }

    setDebugFlags(debugFlags) {
        this.db = debugFlags;
        // Pass flags down to underlying managers
        this.socket.setDebugFlags(debugFlags);
        this.serial.setDebugFlags(debugFlags);
    }

    setDataVisualization(dataVisualization) {
        this.dataVisualization = dataVisualization;
        // console.log(this.dataVisualization);
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
        } else if (channel !== 'udp' && channel !== 'serial') {
            console.warn(`ComManager: Invalid channel specified: ${channel}`);
            return;
        }

        // Avoid redundant actions if channel is already active
        if (channel === this.activeChannel) {
            // If it's udp and not connected, try connecting (e.g., initial load)
            if (channel === 'udp' && !this.socket.isConnected) {
                if (this.db?.com) console.log(`ComManager: Udp channel already active, ensuring connection.`);
                this.socket.connect();
            }
            // No action needed if serial is already active (connection handled by user)
            return;
        }

        const oldChannel = this.activeChannel;
        this.activeChannel = channel;
        if (this.db?.com) console.log(`ComManager: Active channel changed from ${oldChannel} to ${this.activeChannel}`);

        // Handle connection/disconnection based on new channel
        if (this.activeChannel === 'udp') {
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
            if (oldChannel === 'udp' && this.socket.isConnected) {
                if (this.db?.com) console.log("ComManager: Disconnecting Socket...");
                this.socket.disconnect();
            }
            // Note: Serial connection is triggered by selecting a port in comUi,
            // which calls serialManager.connect() directly.
            if (this.db?.com) console.log("ComManager: Switched to Serial channel. Waiting for user port selection/connection.");
        }
    }

    // Updated to accept cellValueArray and themeIndex
    sendData(cellValueArray, themeIndex) {
        if (this.shouldSendData) {

            // --- New Connection Check ---
            if (!this.isConnected()) {
                if (this.activeChannel === 'udp') {
                    console.warn("ComManager: UDP disconnected. Initiating reconnect attempt... Current send failed.");
                    this.socket.connect(); // Initiate reconnect attempt
                    return false; // Fail current send
                } else if (this.activeChannel === 'serial') {
                    console.warn("ComManager: Serial disconnected. Manual reconnection required via UI. Current send failed.");
                    return false; // Fail current send
                } else {
                    console.warn(`ComManager: Active channel '${this.activeChannel}' is disconnected. Cannot send.`);
                    return false; // Fail current send
                }
            }
            // --- End New Connection Check ---

            // Ensure dataVisualization is set before using it
            if (this.dataVisualization) {
                this.dataVisualization.updateData(cellValueArray);
            } else {
                if (this.db?.com) console.warn("ComManager: dataVisualization reference not set, skipping update.");
            }

            // Check dependencies
            if (!this.gridParamsRef) {
                console.error("ComManager: Missing gridParams reference!");
                return false;
            }
            if (typeof themeIndex !== 'number' || themeIndex < 0) {
                console.error(`ComManager: Invalid themeIndex received: ${themeIndex}`);
                // Default themeIndex to 0 if invalid to prevent crashing header creation
                themeIndex = 0;
            }

            // --- Construct Header --- 
            const HEADER_SIZE = 19;
            const headerBuffer = new ArrayBuffer(HEADER_SIZE);
            const headerView = new DataView(headerBuffer);
            const headerBytes = new Uint8Array(headerBuffer); // Create Uint8Array view for copying

            try {
                // Gather Metadata (using gridParamsRef and themeIndex parameter)
                const meta = {
                    roundRect: this.gridParamsRef.screen?.shape === 'circular' ? 1 : 0,
                    screenWidth: this.gridParamsRef.screen?.width ?? 0,
                    screenHeight: this.gridParamsRef.screen?.height ?? 0,
                    cellCount: this.gridParamsRef.cellCount ?? 0,
                    gridGap: this.gridParamsRef.gridSpecs?.gap ?? 0,
                    cellRatio: this.gridParamsRef.gridSpecs?.aspectRatio ?? 1.0,
                    allowCut: this.gridParamsRef.gridSpecs?.allowCut ?? 0,
                    cols: this.gridParamsRef.cols ?? 0,
                    rows: this.gridParamsRef.rows ?? 0,
                    cellW: this.gridParamsRef.calculatedCellWidth ?? 0,
                    cellH: this.gridParamsRef.calculatedCellHeight ?? 0,
                    theme: themeIndex,
                    brightness: 100,
                };

                // Add log to check calculated values
                console.log(`ComManager Debug - Calculated Meta -> cols: ${meta.cols}, rows: ${meta.rows}, cellW: ${meta.cellW}, cellH: ${meta.cellH}`);

                // Populate Header Buffer (Order: RoundRect(u8), ScreenWidth(u16), ScreenHeight(u16), CellCount(u16), GridGap(u8), CellRatio(f32), AllowCut(u8), Cols(u8), Rows(u8), CellW(u8), CellH(u8), Theme(u8), Brightness(u8))
                let offset = 0;
                headerView.setUint8(offset, meta.roundRect); offset += 1;
                headerView.setUint16(offset, meta.screenWidth, true); offset += 2;
                headerView.setUint16(offset, meta.screenHeight, true); offset += 2;
                headerView.setUint16(offset, meta.cellCount, true); offset += 2;
                headerView.setUint8(offset, meta.gridGap > 255 ? 255 : meta.gridGap); offset += 1;
                headerView.setFloat32(offset, meta.cellRatio, true); offset += 4;
                headerView.setUint8(offset, meta.allowCut); offset += 1;
                headerView.setUint8(offset, meta.cols > 255 ? 255 : meta.cols); offset += 1;
                headerView.setUint8(offset, meta.rows > 255 ? 255 : meta.rows); offset += 1;
                headerView.setUint8(offset, meta.cellW > 255 ? 255 : meta.cellW); offset += 1;
                headerView.setUint8(offset, meta.cellH > 255 ? 255 : meta.cellH); offset += 1;
                headerView.setUint8(offset, meta.theme); offset += 1;
                headerView.setUint8(offset, meta.brightness); offset += 1;

            } catch (error) {
                console.error("ComManager: Error creating header:", error);
                return false; // Stop if header creation fails
            }

            // Log the raw header bytes after population
            console.log("ComManager Debug - Generated headerBytes:", headerBytes);

            // --- Calculate Sizes and Total Length ---
            const headerSize = headerBytes.length; // Should be 19
            const valuesSize = cellValueArray.length;
            const totalPacketLength = 2 + headerSize + valuesSize; // 2 bytes for length field

            // Check max length
            if (totalPacketLength > 65535) {
                console.error(`ComManager: Total packet length (${totalPacketLength}) exceeds uint16 max! Cannot send.`);
                return false;
            }

            // --- Create Final Packet --- 
            const finalPacketBuffer = new ArrayBuffer(totalPacketLength);
            const finalPacketView = new DataView(finalPacketBuffer);
            const finalPacketBytes = new Uint8Array(finalPacketBuffer);

            // --- Populate Final Packet --- 
            finalPacketView.setUint16(0, totalPacketLength, true); // Set length (Reverted to Little-Endian)
            finalPacketBytes.set(headerBytes, 2); // Copy header after length bytes
            finalPacketBytes.set(cellValueArray, 2 + headerSize); // Copy values after header

            // Log the full constructed byte array details
            if (this.db?.comSR) console.log(`ComManager: Sending Data (Total: ${totalPacketLength} bytes = 2 len + ${headerSize} header + ${valuesSize} values)`);
            // console.log(this.dataVisualization);

            // Send the final byte array (length + header + values)
            if (this.activeChannel === 'udp') {
                return this.socket.sendData(finalPacketBytes);
            } else if (this.activeChannel === 'serial') {
                return this.serial.sendRawData(finalPacketBytes);
            }
        }
        return false; // Return false if shouldSendData is false
    }

    sendColor(value) {
        if (this.db?.com) console.log(`ComManager: Sending Color (${this.activeChannel}) = ${value}`);
        if (this.activeChannel === 'udp') {
            return this.socket.sendColor(value);
        } else if (this.activeChannel === 'serial') {
            return this.serial.sendColor(value);
        }
        return false;
    }

    sendBrightness(value) {
        if (this.db?.com) console.log(`ComManager: Sending Brightness (${this.activeChannel}) = ${value}`);
        if (this.activeChannel === 'udp') {
            return this.socket.sendBrightness(value);
        } else if (this.activeChannel === 'serial') {
            return this.serial.sendBrightness(value);
        }
        return false;
    }

    sendPower(value) {
        if (this.db?.com) console.log(`ComManager: Sending Power (${this.activeChannel}) = ${value}`);
        if (this.activeChannel === 'udp') {
            return this.socket.sendPower(value);
        } else if (this.activeChannel === 'serial') {
            return this.serial.sendPower(value);
        }
        return false;
    }

    isConnected() {
        if (this.activeChannel === 'udp') {
            return this.socket.isConnected;
        } else if (this.activeChannel === 'serial') {
            return this.serial.isConnected;
        }
        return false;
    }
}

export const comManager = ComManager.getInstance();