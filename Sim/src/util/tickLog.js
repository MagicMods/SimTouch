export class TickLog {
    constructor(timer, debugFlags) {
        this.timer = timer;
        this.tick = false;
        this.lastTick = 0;
        this.debugFlags = debugFlags;
    }

    update() {
        const now = Date.now();
        if (now - this.lastTick >= this.timer) {
            this.tick = true;
            this.lastTick = now;
        }
    }

    GetTick() {
        return this.tick;
    }

    ResetTick() {
        this.tick = false;
    }
}

export const tickLog = new TickLog();
