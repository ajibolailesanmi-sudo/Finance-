/**
 * Runs tasks one at a time per key (per customer phone number), so two
 * WhatsApp messages or a message and a payment for the same customer never
 * update the same conversation at once. Different customers run in parallel.
 */
export class KeyedQueue {
  private tails = new Map<string, Promise<void>>();

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const prev = this.tails.get(key) ?? Promise.resolve();
    const result = prev.then(task);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });
    return result;
  }
}
