/**
 * RequestQueue throttles asynchronous functions to prevent rate limiting.
 */
export class RequestQueue {
    constructor(concurrency = 3, delayMs = 300) {
        this.concurrency = concurrency;
        this.delayMs = delayMs;
        this.queue = [];
        this.activeCount = 0;
    }

    async add(taskFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ taskFn, resolve, reject });
            this._processNext();
        });
    }

    async _processNext() {
        if (this.activeCount >= this.concurrency || this.queue.length === 0) {
            return;
        }

        const { taskFn, resolve, reject } = this.queue.shift();
        this.activeCount++;

        try {
            const result = await taskFn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            setTimeout(() => {
                this.activeCount--;
                this._processNext();
            }, this.delayMs);
        }
    }
}
