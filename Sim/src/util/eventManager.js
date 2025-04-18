class EventManager {
    constructor() {
        this._events = {}; // Use underscore for "private" convention
        this.debugFlags = {}; // Added initialization
    }

    // Added method to initialize debug flags
    initDebug(debugFlags) {
        this.debugFlags = debugFlags || {};
    }

    // Register a listener
    on(eventName, listener) {
        if (!this._events[eventName]) {
            this._events[eventName] = [];
        }
        this._events[eventName].push(listener);
        if (this.debugFlags.events) console.log(`Listener added for: ${eventName}`);
    }

    // Unregister a listener
    off(eventName, listenerToRemove) {
        if (!this._events[eventName]) {
            return;
        }
        this._events[eventName] = this._events[eventName].filter(listener => listener !== listenerToRemove);
        if (this.debugFlags.events) console.log(`Listener removed for: ${eventName}`);
    }

    // Emit an event to all registered listeners
    emit(eventName, data) {
        if (this.debugFlags.events) console.log(`Emitting event: ${eventName}`, data);
        if (!this._events[eventName]) {
            return; // No listeners for this event
        }
        // Call listeners asynchronously to prevent blocking the emitter
        this._events[eventName].forEach(listener => {
            try {
                // Use setTimeout to avoid one listener error breaking others
                setTimeout(() => listener(data), 0);
            } catch (error) {
                console.error(`Error in listener for event "${eventName}":`, error);
            }
        });
    }
}

export const eventBus = new EventManager();
