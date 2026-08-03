export class FakeQueue {
  addedJobs: Array<{ name: string; data: unknown; opts?: unknown }> = [];
  shouldFail = false;
  failWithError: Error = new Error("Queue.add() failed");

  async add(name: string, data: unknown, opts?: unknown): Promise<any> {
    if (this.shouldFail) throw this.failWithError;
    this.addedJobs.push({ name, data, opts });
    return { id: `job_${this.addedJobs.length}` };
  }

  clear(): void {
    this.addedJobs = [];
    this.shouldFail = false;
  }
}
