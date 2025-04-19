export class TickLog {
    constructor(timer = 1000, debugFlags) {
        this.timer = timer;
        this.debugFlags = debugFlags;
        this.tick = false;
        this.lastTick = Date.now();
        this.intervalId = null;
        this.start();
    }

    start() {
        if (this.intervalId !== null) {
            return;
        }
        this.lastTick = Date.now();
        this.intervalId = setInterval(() => this._internalUpdate(), this.timer);
    }

    _internalUpdate() {
        const now = Date.now();
        if (now - this.lastTick >= this.timer) {
            this.tick = true;
            this.lastTick = now;
        }
    }

    stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    GetTick() {
        if (this.tick) {
            this.tick = false;
            return true;
        }
        return false;
    }

}

export const tickLog = new TickLog();
