import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

class FileDb {
  private filePath: string;
  private data: any = null;

  constructor(filename: string) {
    this.filePath = path.resolve(process.cwd(), filename);
  }

  private async load() {
    if (this.data) return;
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(content);
    } catch {
      this.data = {
        users: [],
        catechumens: [],
        sacraments: [],
        subjects: [
          { id: '1', name: 'Catéchèse' },
          { id: '2', name: 'Doctrine' },
          { id: '3', name: 'Morale' },
          { id: '4', name: 'Liturgie' },
          { id: '5', name: 'Vie de Saint' }
        ],
        report_cards: [],
        grades: []
      };
      await this.save();
    }
  }

  private async save() {
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async findOne(collection: string, query: any) {
    await this.load();
    return this.data[collection].find((item: any) => {
      return Object.entries(query).every(([key, value]) => item[key] == value);
    });
  }

  async findMany(collection: string, query: any = {}) {
    await this.load();
    if (Object.keys(query).length === 0) return this.data[collection];
    return this.data[collection].filter((item: any) => {
      return Object.entries(query).every(([key, value]) => item[key] == value);
    });
  }

  async insert(collection: string, item: any) {
    await this.load();
    const newItem = { id: nanoid(), ...item, created_at: new Date().toISOString() };
    this.data[collection].push(newItem);
    await this.save();
    return newItem;
  }

  async update(collection: string, id: string, updates: any) {
    await this.load();
    const index = this.data[collection].findIndex((i: any) => i.id === id);
    if (index === -1) return null;
    this.data[collection][index] = { ...this.data[collection][index], ...updates };
    await this.save();
    return this.data[collection][index];
  }

  async delete(collection: string, id: string) {
    await this.load();
    this.data[collection] = this.data[collection].filter((i: any) => i.id !== id);
    await this.save();
  }

  async raw() {
    await this.load();
    return this.data;
  }

  async reload() {
    this.data = null;
    await this.load();
  }
}

export const db = new FileDb('database.json');
