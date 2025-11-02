import TelegramBot from 'node-telegram-bot-api';
import { BotConfig, Command, MessageHandler, CallbackHandler, ScheduledTask, UserData, BotStats } from './types';
import { Storage } from './storage';
import { Logger } from './utils/logger';
import { Helpers } from './utils/helpers';
import { Message, CallbackQuery } from 'node-telegram-bot-api';

export class Bot {
  private bot: TelegramBot;
  private config: BotConfig;
  private commands: Map<string, Command> = new Map();
  private messageHandlers: MessageHandler[] = [];
  private callbackHandlers: Map<string, CallbackHandler> = new Map();
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private startTime: number = Date.now();
  private stats = {
    totalMessages: 0,
    totalCommands: 0,
  };

  constructor(config: BotConfig) {
    this.config = config;
    this.bot = new TelegramBot(config.token, {
      polling: config.polling !== false,
      webHook: config.webhookUrl ? { port: 8443 } : undefined,
    });

    if (config.webhookUrl) {
      this.bot.setWebHook(config.webhookUrl);
    }

    this.setupEventHandlers();
    this.registerDefaultCommands();
  }

  private setupEventHandlers(): void {
    this.bot.on('message', async (msg) => {
      await this.handleMessage(msg);
    });

    this.bot.on('callback_query', async (query) => {
      await this.handleCallbackQuery(query);
    });

    this.bot.on('error', (error) => {
      Logger.error('Bot error:', error);
    });

    this.bot.on('polling_error', (error) => {
      Logger.error('Polling error:', error);
    });
  }

  private async handleMessage(msg: Message): Promise<void> {
    try {
      this.stats.totalMessages++;
      await this.updateUserData(msg);

      if (!msg.text) {
        return;
      }

      // Check if it's a command
      const parsed = Helpers.parseCommand(msg.text);
      if (parsed) {
        const command = this.commands.get(parsed.command);
        if (command) {
          // Check admin-only commands
          if (command.adminOnly && !this.isAdmin(msg.from?.id)) {
            await this.bot.sendMessage(msg.chat.id, '? This command is only available for administrators.');
            return;
          }

          this.stats.totalCommands++;
          Logger.info(`Command executed: /${parsed.command} by user ${msg.from?.id}`);
          await command.handler(msg, parsed.args);
          return;
        }
      }

      // Check message handlers
      for (const handler of this.messageHandlers) {
        let match: RegExpMatchArray | null = null;
        
        if (handler.pattern instanceof RegExp) {
          match = msg.text.match(handler.pattern);
        } else if (typeof handler.pattern === 'string') {
          if (msg.text.includes(handler.pattern)) {
            match = [] as any;
          }
        }

        if (match) {
          await handler.handler(msg, match);
          break;
        }
      }
    } catch (error) {
      Logger.error('Error handling message:', error);
      try {
        await this.bot.sendMessage(
          msg.chat.id,
          '? An error occurred while processing your message. Please try again later.'
        );
      } catch (sendError) {
        Logger.error('Error sending error message:', sendError);
      }
    }
  }

  private async handleCallbackQuery(query: CallbackQuery): Promise<void> {
    try {
      if (!query.data || !query.message) {
        return;
      }

      // Extract callback data and optional parameters
      const parts = query.data.split(':');
      const callbackId = parts[0];
      const data = parts.slice(1).join(':');

      const handler = this.callbackHandlers.get(callbackId);
      if (handler) {
        await handler.handler(query, data);
      } else {
        Logger.warn(`No handler found for callback: ${callbackId}`);
      }

      // Answer the callback query
      await this.bot.answerCallbackQuery(query.id);
    } catch (error) {
      Logger.error('Error handling callback query:', error);
    }
  }

  private async updateUserData(msg: Message): Promise<void> {
    if (!msg.from) return;

    const userData: UserData = {
      id: msg.from.id,
      username: msg.from.username,
      firstName: msg.from.first_name,
      lastName: msg.from.last_name,
      isAdmin: this.isAdmin(msg.from.id),
      createdAt: Date.now(),
      lastActive: Date.now(),
      preferences: {},
    };

    const existing = await Storage.getUserData(msg.from.id);
    if (existing) {
      userData.createdAt = existing.createdAt;
      userData.preferences = existing.preferences || {};
    }

    await Storage.saveUserData(userData);
  }

  private isAdmin(userId?: number): boolean {
    if (!userId || !this.config.adminIds) {
      return false;
    }
    return this.config.adminIds.includes(userId);
  }

  private registerDefaultCommands(): void {
    this.registerCommand({
      command: 'start',
      description: 'Start the bot',
      handler: async (msg) => {
        const userInfo = Helpers.getUserInfo(msg);
        await this.bot.sendMessage(
          msg.chat.id,
          `?? Welcome, ${userInfo.name}!\n\n` +
          `I'm a feature-rich Telegram bot. Use /help to see all available commands.`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '?? Help', callback_data: 'menu:help' },
                { text: '?? Settings', callback_data: 'menu:settings' }
              ]],
            },
          }
        );
      },
    });

    this.registerCommand({
      command: 'help',
      description: 'Show help message',
      handler: async (msg) => {
        const userCommands = Array.from(this.commands.values())
          .filter(cmd => !cmd.adminOnly || this.isAdmin(msg.from?.id))
          .map(cmd => `/${cmd.command} - ${cmd.description}`)
          .join('\n');

        await this.bot.sendMessage(
          msg.chat.id,
          `?? *Available Commands:*\n\n${userCommands}\n\n` +
          `Use inline buttons for quick access to features!`,
          { parse_mode: 'Markdown' }
        );
      },
    });

    this.registerCommand({
      command: 'stats',
      description: 'Show bot statistics',
      handler: async (msg) => {
        const stats = await this.getStats();
        const uptime = Helpers.formatDuration(stats.uptime);
        
        await this.bot.sendMessage(
          msg.chat.id,
          `?? *Bot Statistics*\n\n` +
          `?? Total Messages: ${stats.totalMessages}\n` +
          `?? Total Commands: ${stats.totalCommands}\n` +
          `?? Total Users: ${stats.totalUsers}\n` +
          `?? Uptime: ${uptime}`,
          { parse_mode: 'Markdown' }
        );
      },
    });

    this.registerCommand({
      command: 'settings',
      description: 'Open settings menu',
      handler: async (msg) => {
        const userData = await Storage.getUserData(msg.from?.id || 0);
        await this.bot.sendMessage(
          msg.chat.id,
          '?? *Settings*\n\nConfigure your bot preferences:',
          {
            parse_mode: 'Markdown',
            reply_markup: Helpers.createMenu({
              title: 'Settings',
              buttons: [[
                { text: '?? Notifications', callback_data: 'settings:notifications' },
                { text: '?? Language', callback_data: 'settings:language' }
              ], [
                { text: '?? Back to Menu', callback_data: 'menu:main' }
              ]],
            }),
          }
        );
      },
    });
  }

  registerCommand(command: Command): void {
    this.commands.set(command.command, command);
    this.bot.setMyCommands(
      Array.from(this.commands.values()).map(cmd => ({
        command: cmd.command,
        description: cmd.description,
      }))
    );
    Logger.info(`Registered command: /${command.command}`);
  }

  registerMessageHandler(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
    Logger.info(`Registered message handler: ${handler.pattern}`);
  }

  registerCallbackHandler(callbackId: string, handler: CallbackHandler['handler']): void {
    this.callbackHandlers.set(callbackId, {
      pattern: callbackId,
      handler,
    });
    Logger.info(`Registered callback handler: ${callbackId}`);
  }

  registerScheduledTask(task: ScheduledTask): void {
    this.scheduledTasks.set(task.id, task);
    this.startScheduledTask(task);
    Logger.info(`Registered scheduled task: ${task.name} (${task.cron})`);
  }

  private startScheduledTask(task: ScheduledTask): void {
    if (!task.enabled) return;

    // Simple interval-based scheduler (for production, use node-cron)
    const cronParts = task.cron.split(' ');
    if (cronParts.length === 1 && cronParts[0].startsWith('@')) {
      // Simple intervals like @every 5m, @every 1h
      const intervalMatch = cronParts[0].match(/^@every\s+(\d+)([smhd])$/);
      if (intervalMatch) {
        const value = parseInt(intervalMatch[1]);
        const unit = intervalMatch[2];
        let ms = value * 1000;
        
        if (unit === 'm') ms = value * 60 * 1000;
        else if (unit === 'h') ms = value * 60 * 60 * 1000;
        else if (unit === 'd') ms = value * 24 * 60 * 60 * 1000;

        setInterval(async () => {
          try {
            await task.handler();
          } catch (error) {
            Logger.error(`Error in scheduled task ${task.name}:`, error);
          }
        }, ms);
      }
    }
  }

  async getStats(): Promise<BotStats> {
    const users = await Storage.getAllUsers();
    return {
      totalUsers: users.length,
      totalMessages: this.stats.totalMessages,
      totalCommands: this.stats.totalCommands,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  async getTelegramBot(): Promise<TelegramBot> {
    return this.bot;
  }

  async sendMessage(chatId: number, text: string, options?: any): Promise<Message> {
    return this.bot.sendMessage(chatId, text, options);
  }

  async editMessage(chatId: number, messageId: number, text: string, options?: any): Promise<Message | boolean> {
    return this.bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...options });
  }

  async deleteMessage(chatId: number, messageId: number): Promise<boolean> {
    return this.bot.deleteMessage(chatId, messageId);
  }

  async sendPhoto(chatId: number, photo: string, options?: any): Promise<Message> {
    return this.bot.sendPhoto(chatId, photo, options);
  }

  async sendDocument(chatId: number, document: string, options?: any): Promise<Message> {
    return this.bot.sendDocument(chatId, document, options);
  }
}
