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
        this.activeChannel = 'network'; // Default to network as per comUi initial state
        this.db = null;

        eventBus.on('comChannelChanged', this.setActiveChannel.bind(this));
    }

    setDebugFlags(debugFlags) {
        this.db = debugFlags;
        // Pass flags down to underlying managers
        this.socket.setDebugFlags(debugFlags);
        this.serial.setDebugFlags(debugFlags);
    }

    setActiveChannel(channel) {
        if (channel === 'network' || channel === 'serial') {
            if (this.activeChannel !== channel) {
                this.activeChannel = channel;
                if (this.db?.com) console.log(`ComManager: Active channel set to ${this.activeChannel}`);
            }
        } else {
            console.warn(`ComManager: Invalid channel specified: ${channel}`);
        }
    }

    sendColor(value) {
        if (this.db?.com) console.log(`ComManager: Sending Color (${this.activeChannel}) = ${value}`);
        if (this.activeChannel === 'network') {
            return this.socket.sendColor(value);
        } else if (this.activeChannel === 'serial') {
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

    // Optional: Method to check the active channel's connection status
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


