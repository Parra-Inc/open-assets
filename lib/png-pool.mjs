import { Worker } from "worker_threads";
import { cpus } from "os";
import { samePngPixels } from "./png.mjs";

const MAX_WORKERS = 4;

/**
 * Compares PNG pixels on worker threads, so decoding full-size screenshots
 * does not block the event loop that drives Chromium and writes files.
 */
export class PngPool {
  constructor() {
    this.size = Math.max(1, Math.min(MAX_WORKERS, cpus().length - 1));
    this.idle = [];
    this.workers = [];
    this.queue = [];
    this.nextId = 0;
  }

  /** @returns {Promise<boolean>} true when both PNGs decode to identical pixels */
  same(a, b) {
    if (a.equals(b)) return Promise.resolve(true);
    return new Promise((resolve) => {
      this.queue.push({ a, b, resolve });
      this.drain();
    });
  }

  spawn() {
    const worker = new Worker(new URL("./png-worker.mjs", import.meta.url));
    this.workers.push(worker);
    return worker;
  }

  drain() {
    while (this.queue.length > 0) {
      const worker = this.idle.pop() || (this.workers.length < this.size ? this.spawn() : null);
      if (!worker) return;
      const job = this.queue.shift();
      const id = this.nextId++;
      const finish = (same) => {
        worker.off("message", onMessage);
        worker.off("error", onError);
        job.resolve(same);
      };
      const onMessage = (msg) => {
        if (msg.id !== id) return;
        finish(msg.same);
        this.idle.push(worker);
        this.drain();
      };
      const onError = () => {
        // A dead worker must not lose the answer: compare here instead.
        this.workers = this.workers.filter((w) => w !== worker);
        finish(samePngPixels(job.a, job.b));
        this.drain();
      };
      worker.on("message", onMessage);
      worker.on("error", onError);
      worker.postMessage({ id, a: job.a, b: job.b });
    }
  }

  async close() {
    const workers = this.workers;
    this.workers = [];
    this.idle = [];
    await Promise.all(workers.map((w) => w.terminate()));
  }
}

/**
 * Should an existing PNG stay in place? Identical pixels keep it, unless a
 * normal render compressed the same image at least 10% smaller, which is how
 * files from a --fast run shrink. The margin stops small byte differences
 * between Chrome versions from rewriting committed files.
 */
export function keepExisting(existing, candidate, same, fast) {
  if (!same) return false;
  return fast || candidate.length > existing.length * 0.9;
}
