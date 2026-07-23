import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export class SimpleStore {
  private filePath: string;
  private data: Record<string, unknown> = {};

  constructor(name = 'config') {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, `${name}.json`);
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      }
    } catch {
      this.data = {};
    }
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('SimpleStore save error:', e);
    }
  }

  get(key: string): unknown {
    return this.data[key];
  }

  set(key: string, value: unknown) {
    this.data[key] = value;
    this.save();
  }

  delete(key: string) {
    delete this.data[key];
    this.save();
  }

  clear() {
    this.data = {};
    this.save();
  }
}
