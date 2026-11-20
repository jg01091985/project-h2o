import fs from 'fs';
import path from 'path';

export class MemoryLedger {
  constructor(storagePath = path.resolve(process.cwd(), '.h2o-memory.json')) {
    this.storagePath = storagePath;
    this.history = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        this.history = JSON.parse(data);
      }
    } catch (e) {
      this.history = [];
    }
  }

  save() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (e) {}
  }

  append(role, content, metadata = {}) {
    this.history.push({
      role,
      content,
      metadata,
      timestamp: new Date().toISOString()
    });
    // Keep last 100 turns for optimal context window
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
    this.save();
  }

  getRecentContext(limit = 10) {
    return this.history.slice(-limit);
  }

  clear() {
    this.history = [];
    this.save();
  }
}

export const memoryLedger = new MemoryLedger();
