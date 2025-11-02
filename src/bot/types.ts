import { Message, CallbackQuery, InlineKeyboardMarkup } from 'node-telegram-bot-api';

export interface BotConfig {
  token: string;
  webhookUrl?: string;
  polling?: boolean;
  adminIds?: number[];
}

export interface Command {
  command: string;
  description: string;
  handler: (msg: Message, args?: string[]) => Promise<void> | void;
  adminOnly?: boolean;
}

export interface MessageHandler {
  pattern: RegExp | string;
  handler: (msg: Message, match?: RegExpMatchArray) => Promise<void> | void;
}

export interface CallbackHandler {
  pattern: string;
  handler: (query: CallbackQuery, data?: string) => Promise<void> | void;
}

export interface ScheduledTask {
  id: string;
  name: string;
  cron: string;
  handler: () => Promise<void> | void;
  enabled: boolean;
}

export interface UserData {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
  createdAt: number;
  lastActive: number;
  preferences?: Record<string, any>;
}

export interface BotStats {
  totalUsers: number;
  totalMessages: number;
  totalCommands: number;
  uptime: number;
}

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: any;
}

export interface MenuConfig {
  title: string;
  buttons: InlineButton[][];
}
