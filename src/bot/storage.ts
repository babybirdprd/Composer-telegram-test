import { promises as fs } from 'fs';
import path from 'path';
import { UserData } from './types';

const DATA_DIR = path.join(process.cwd(), '.bot-data');

export class Storage {
  private static ensureDataDir = async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  };

  private static getFilePath(filename: string): string {
    return path.join(DATA_DIR, `${filename}.json`);
  }

  static async save<T>(filename: string, data: T): Promise<void> {
    await this.ensureDataDir();
    const filePath = this.getFilePath(filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  static async load<T>(filename: string, defaultValue?: T): Promise<T | undefined> {
    await this.ensureDataDir();
    const filePath = this.getFilePath(filename);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      return defaultValue;
    }
  }

  static async append<T>(filename: string, item: T): Promise<void> {
    const data = await this.load<T[]>(filename, []);
    if (data) {
      data.push(item);
      await this.save(filename, data);
    } else {
      await this.save(filename, [item]);
    }
  }

  static async remove<T>(filename: string, predicate: (item: T) => boolean): Promise<void> {
    const data = await this.load<T[]>(filename, []);
    if (data) {
      const filtered = data.filter(item => !predicate(item));
      await this.save(filename, filtered);
    }
  }

  static async update<T>(filename: string, predicate: (item: T) => boolean, updater: (item: T) => T): Promise<void> {
    const data = await this.load<T[]>(filename, []);
    if (data) {
      const updated = data.map(item => predicate(item) ? updater(item) : item);
      await this.save(filename, updated);
    }
  }

  static async getUserData(userId: number): Promise<UserData | undefined> {
    const users = await this.load<UserData[]>('users', []);
    return users?.find(u => u.id === userId);
  }

  static async saveUserData(userData: UserData): Promise<void> {
    const users = await this.load<UserData[]>('users', []);
    if (!users) {
      await this.save('users', [userData]);
      return;
    }
    
    const index = users.findIndex(u => u.id === userData.id);
    if (index >= 0) {
      users[index] = userData;
    } else {
      users.push(userData);
    }
    await this.save('users', users);
  }

  static async getAllUsers(): Promise<UserData[]> {
    return (await this.load<UserData[]>('users', [])) || [];
  }
}
