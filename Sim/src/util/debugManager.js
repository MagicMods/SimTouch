class DebugManager {
    constructor() {
        if (DebugManager.instance) {
            return DebugManager.instance;
        }
        this.debugFlags = {
            main: false,
            preset: false,
            param: false,
            state: false,
            events: false,

            udp: false,
            serial: false,
            com: false,
            comSR: false,

            boundary: false,
            boundaryShape: false,
            dimensions: false,
            gridGeometry: false,

            grid: false,
            gradients: false,
            gridGenRenderer: false,
            gridRenderModes: false,

            particles: false,
            fluidFlip: false,
            velocity: false,
            collision: false,
            debugCollision: false,
            gravity: false,

            neighbors: false,
            turbulence: false,
            noise: false,
            voronoi: false,
            organic: false,

            modManager: false,
            pulseMod: false,
            inputMod: false,
            inputs: false,
            emu: false,

            randomizer: false,
            server: false,
            sound: false,
            overlay: false,

            noisePrv: false,
            dataViz: false,
            presets: false,
        };
        DebugManager.instance = this;
    }

    static getInstance() {
        if (!DebugManager.instance) {
            new DebugManager(); // Creates the instance if it doesn't exist
        }
        return DebugManager.instance;
    }

    get(flagName) {
        if (flagName in this.debugFlags) {
            return this.debugFlags[flagName];
        } else {
            console.warn(`[DebugManager] Unknown flag requested: ${flagName}`);
            return undefined;
        }
    }

    set(flagName, value) {
        if (flagName in this.debugFlags) {
            if (typeof value === 'boolean') {
                this.debugFlags[flagName] = value;
                if (this.get('param') || this.get('state')) {
                    console.log(`[DebugManager] Flag set: ${flagName} = ${value}`);
                }
            } else {
                console.warn(`[DebugManager] Invalid value type for flag ${flagName}. Expected boolean, got ${typeof value}`);
            }
        } else {
            console.warn(`[DebugManager] Attempted to set unknown flag: ${flagName}`);
        }
    }
}
export const debugManager = DebugManager.getInstance();


