export class AudioQueue {
  private queue: string[] = [];
  private waiters: ((chunk: string) => void)[] = [];

  push(chunk: string) {
    if (this.waiters.length > 0) {
      // generator is already waiting — give it directly
      const resolve = this.waiters.shift()!;
      resolve(chunk);
    } else {
      // generator not ready yet — store it
      this.queue.push(chunk);
    }
  }

  pop(): Promise<string> {
    return new Promise((resolve) => {
      if (this.queue.length > 0) {
        // chunk already waiting — give it immediately
        resolve(this.queue.shift()!);
      } else {
        // no chunk yet — wait until one arrives
        this.waiters.push(resolve);
      }
    });
  }

  clear() {
    this.queue = [];
    this.waiters = [];
  }
}