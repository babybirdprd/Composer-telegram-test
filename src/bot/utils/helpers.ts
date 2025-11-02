import { Message } from 'node-telegram-bot-api';
import { InlineKeyboardMarkup } from 'node-telegram-bot-api';
import { InlineButton, MenuConfig } from '../types';

export class Helpers {
  static extractCommandArgs(text: string): string[] {
    const parts = text.split(' ').slice(1);
    return parts.filter(p => p.length > 0);
  }

  static parseCommand(text: string): { command: string; args: string[] } | null {
    if (!text || !text.startsWith('/')) {
      return null;
    }

    const match = text.match(/^\/(\w+)(?:\s+(.*))?$/);
    if (!match) {
      return null;
    }

    return {
      command: match[1],
      args: match[2] ? match[2].split(/\s+/) : [],
    };
  }

  static getUserInfo(msg: Message): { id: number; username?: string; name: string } {
    const user = msg.from;
    if (!user) {
      throw new Error('User information not available');
    }

    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown';
    return {
      id: user.id,
      username: user.username,
      name,
    };
  }

  static createInlineKeyboard(buttons: InlineButton[][]): InlineKeyboardMarkup {
    return {
      inline_keyboard: buttons.map(row =>
        row.map(button => ({
          text: button.text,
          callback_data: button.callback_data,
          url: button.url,
          web_app: button.web_app,
        }))
      ),
    };
  }

  static createMenu(config: MenuConfig): InlineKeyboardMarkup {
    return this.createInlineKeyboard(config.buttons);
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  static formatDuration(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  static escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  static formatUserMention(userId: number, name: string): string {
    return `[${this.escapeMarkdown(name)}](tg://user?id=${userId})`;
  }

  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
