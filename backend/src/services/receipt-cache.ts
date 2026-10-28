// Process-local, bounded cache. Access control remains in the authenticated route.
export class ReceiptCache {
  private entries = new Map<string, { data: Buffer; expires: number }>();
  private bytes = 0;
  private pending = new Map<string, Promise<Buffer>>();
  constructor(private maxBytes = 32 * 1024 * 1024, private ttl = 5 * 60_000, private now = Date.now) {}
  delete(key: string) {
    const entry = this.entries.get(key);
    if (entry) { this.bytes -= entry.data.length; this.entries.delete(key); }
  }
  async get(key: string, load: () => Promise<Buffer>): Promise<Buffer> {
    const entry = this.entries.get(key);
    if (entry && entry.expires > this.now()) {
      this.entries.delete(key); this.entries.set(key, entry); return entry.data;
    }
    this.delete(key);
    const pending = this.pending.get(key); if (pending) return pending;
    const request = load().then(data => {
      for (const [id, item] of this.entries) if (item.expires <= this.now()) this.delete(id);
      if (data.length <= this.maxBytes) {
        while (this.bytes + data.length > this.maxBytes) this.delete(this.entries.keys().next().value!);
        this.entries.set(key, { data, expires: this.now() + this.ttl }); this.bytes += data.length;
      }
      return data;
    }).finally(() => { this.pending.delete(key); });
    this.pending.set(key, request); return request;
  }
}
