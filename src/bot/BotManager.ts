import { Bot } from './Bot';
import { BotConfig } from './types';
import { Logger } from './utils/logger';
import { Storage } from './storage';
import { Helpers } from './utils/helpers';
import { Message } from 'node-telegram-bot-api';
import { registerAdminFeatures } from './features/admin';
import { registerUtilityFeatures } from './features/utilities';

export class BotManager {
  private bots: Map<string, Bot> = new Map();
  private defaultBotName?: string;

  constructor() {
    Logger.info('BotManager initialized');
  }

  /**
   * Register a new bot with the manager
   */
  async registerBot(name: string, config: BotConfig): Promise<Bot> {
    if (this.bots.has(name)) {
      throw new Error(`Bot with name "${name}" already exists`);
    }

    const bot = new Bot(config);
    this.bots.set(name, bot);
    
    if (!this.defaultBotName) {
      this.defaultBotName = name;
    }

    // Register additional features
    this.registerFeatures(bot, name);
    
    // Register admin features
    registerAdminFeatures(bot);
    
    // Register utility features
    registerUtilityFeatures(bot);
    
    Logger.info(`Bot "${name}" registered successfully`);
    return bot;
  }

  /**
   * Get a bot by name
   */
  getBot(name?: string): Bot | undefined {
    const botName = name || this.defaultBotName;
    if (!botName) {
      return undefined;
    }
    return this.bots.get(botName);
  }

  /**
   * Get all registered bots
   */
  getAllBots(): Map<string, Bot> {
    return this.bots;
  }

  /**
   * Set default bot
   */
  setDefaultBot(name: string): void {
    if (!this.bots.has(name)) {
      throw new Error(`Bot "${name}" not found`);
    }
    this.defaultBotName = name;
    Logger.info(`Default bot set to: ${name}`);
  }

  /**
   * Unregister a bot
   */
  async unregisterBot(name: string): Promise<void> {
    if (!this.bots.has(name)) {
      throw new Error(`Bot "${name}" not found`);
    }

    const bot = this.bots.get(name);
    if (bot) {
      // Stop polling if active
      const telegramBot = await bot.getTelegramBot();
      telegramBot.stopPolling();
    }

    this.bots.delete(name);
    
    if (this.defaultBotName === name) {
      this.defaultBotName = Array.from(this.bots.keys())[0];
    }

    Logger.info(`Bot "${name}" unregistered`);
  }

  /**
   * Register additional features for a bot
   */
  private registerFeatures(bot: Bot, botName: string): void {
    // Admin commands
    bot.registerCommand({
      command: 'broadcast',
      description: 'Broadcast a message to all users (Admin only)',
      adminOnly: true,
      handler: async (msg, args) => {
        if (!args || args.length === 0) {
          await bot.sendMessage(msg.chat.id, 'Usage: /broadcast <message>');
          return;
        }

        const message = args.join(' ');
        const users = await Storage.getAllUsers();
        let successCount = 0;
        let failCount = 0;

        await bot.sendMessage(msg.chat.id, `?? Broadcasting to ${users.length} users...`);

        for (const user of users) {
          try {
            await bot.sendMessage(user.id, `?? *Broadcast:*\n\n${message}`, { parse_mode: 'Markdown' });
            successCount++;
            await Helpers.delay(50); // Rate limiting
          } catch (error) {
            failCount++;
            Logger.warn(`Failed to send broadcast to user ${user.id}:`, error);
          }
        }

        await bot.sendMessage(
          msg.chat.id,
          `? Broadcast completed!\n? Success: ${successCount}\n? Failed: ${failCount}`
        );
      },
    });

    bot.registerCommand({
      command: 'users',
      description: 'Get user statistics (Admin only)',
      adminOnly: true,
      handler: async (msg) => {
        const users = await Storage.getAllUsers();
        const activeUsers = users.filter(u => Date.now() - u.lastActive < 7 * 24 * 60 * 60 * 1000);
        
        await bot.sendMessage(
          msg.chat.id,
          `?? *User Statistics*\n\n` +
          `Total Users: ${users.length}\n` +
          `Active (last 7 days): ${activeUsers.length}\n` +
          `Admin Users: ${users.filter(u => u.isAdmin).length}`,
          { parse_mode: 'Markdown' }
        );
      },
    });

    bot.registerCommand({
      command: 'echo',
      description: 'Echo your message',
      handler: async (msg, args) => {
        if (!args || args.length === 0) {
          await bot.sendMessage(msg.chat.id, 'Usage: /echo <message>');
          return;
        }
        await bot.sendMessage(msg.chat.id, args.join(' '));
      },
    });

    bot.registerCommand({
      command: 'info',
      description: 'Get information about yourself',
      handler: async (msg) => {
        const userInfo = Helpers.getUserInfo(msg);
        const userData = await Storage.getUserData(userInfo.id);
        const user = msg.from;

        let info = `?? *Your Information*\n\n`;
        info += `?? User ID: \`${userInfo.id}\`\n`;
        if (userInfo.username) {
          info += `?? Username: @${userInfo.username}\n`;
        }
        info += `?? Name: ${userInfo.name}\n`;
        if (userData) {
          const createdDate = new Date(userData.createdAt).toLocaleDateString();
          const lastActive = new Date(userData.lastActive).toLocaleDateString();
          info += `?? First seen: ${createdDate}\n`;
          info += `?? Last active: ${lastActive}\n`;
        }
        if (user) {
          info += `?? Language: ${user.language_code || 'Unknown'}\n`;
        }
        if (userData?.isAdmin) {
          info += `?? Role: Administrator\n`;
        }

        await bot.sendMessage(msg.chat.id, info, { parse_mode: 'Markdown' });
      },
    });

    bot.registerCommand({
      command: 'weather',
      description: 'Get weather information (placeholder)',
      handler: async (msg, args) => {
        const location = args.join(' ') || 'New York';
        await bot.sendMessage(
          msg.chat.id,
          `??? Weather for ${location}:\n\n` +
          `?? Weather service not configured. This is a placeholder feature.`
        );
      },
    });

    bot.registerCommand({
      command: 'remind',
      description: 'Set a reminder',
      handler: async (msg, args) => {
        if (!args || args.length < 2) {
          await bot.sendMessage(
            msg.chat.id,
            'Usage: /remind <time> <message>\nExample: /remind 30m Buy groceries'
          );
          return;
        }

        const timeStr = args[0];
        const message = args.slice(1).join(' ');
        
        // Parse time (e.g., 30m, 1h, 2d)
        const timeMatch = timeStr.match(/^(\d+)([smhd])$/);
        if (!timeMatch) {
          await bot.sendMessage(msg.chat.id, 'Invalid time format. Use: 30s, 5m, 1h, or 2d');
          return;
        }

        const value = parseInt(timeMatch[1]);
        const unit = timeMatch[2];
        let delay = value * 1000;

        if (unit === 'm') delay = value * 60 * 1000;
        else if (unit === 'h') delay = value * 60 * 60 * 1000;
        else if (unit === 'd') delay = value * 24 * 60 * 60 * 1000;

        await bot.sendMessage(
          msg.chat.id,
          `? Reminder set! I'll remind you in ${timeStr}:\n\n"${message}"`
        );

        setTimeout(async () => {
          try {
            await bot.sendMessage(msg.chat.id, `?? *Reminder:*\n\n${message}`, { parse_mode: 'Markdown' });
          } catch (error) {
            Logger.error('Error sending reminder:', error);
          }
        }, delay);
      },
    });

    bot.registerCommand({
      command: 'quote',
      description: 'Get a random quote',
      handler: async (msg) => {
        const quotes = [
          'The only way to do great work is to love what you do. - Steve Jobs',
          'Innovation distinguishes between a leader and a follower. - Steve Jobs',
          'Life is what happens to you while you\'re busy making other plans. - John Lennon',
          'The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt',
          'It is during our darkest moments that we must focus to see the light. - Aristotle',
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        await bot.sendMessage(msg.chat.id, `?? *Quote of the Day*\n\n"${randomQuote}"`, { parse_mode: 'Markdown' });
      },
    });

    bot.registerCommand({
      command: 'dice',
      description: 'Roll a dice',
      handler: async (msg) => {
        const result = Math.floor(Math.random() * 6) + 1;
        await bot.sendMessage(msg.chat.id, `?? You rolled: **${result}**`, { parse_mode: 'Markdown' });
      },
    });

    bot.registerCommand({
      command: 'poll',
      description: 'Create a poll',
      handler: async (msg, args) => {
        if (!args || args.length < 3) {
          await bot.sendMessage(
            msg.chat.id,
            'Usage: /poll <question> | <option1> | <option2> [| <option3> ...]'
          );
          return;
        }

        const input = args.join(' ');
        const parts = input.split('|').map(p => p.trim()).filter(p => p.length > 0);
        
        if (parts.length < 3) {
          await bot.sendMessage(msg.chat.id, 'You need at least a question and 2 options.');
          return;
        }

        const question = parts[0];
        const options = parts.slice(1);

        if (options.length > 10) {
          await bot.sendMessage(msg.chat.id, 'Maximum 10 options allowed.');
          return;
        }

        await bot.getTelegramBot().then(telegramBot => {
          return telegramBot.sendPoll(msg.chat.id, question, options);
        });
      },
    });

    // Register callback handlers
    bot.registerCallbackHandler('menu', async (query, data) => {
      if (!query.message) return;

      const chatId = query.message.chat.id;
      const messageId = query.message.message_id || 0;

      switch (data) {
        case 'help':
          const bot = this.getBot(botName);
          if (!bot) return;
          
          const commands = Array.from(bot['commands'].values())
            .map(cmd => `/${cmd.command} - ${cmd.description}`)
            .join('\n');

          await bot.editMessage(
            chatId,
            messageId,
            `?? *Help Menu*\n\n${commands}`,
            { parse_mode: 'Markdown', reply_markup: Helpers.createMenu({
              title: 'Help',
              buttons: [[{ text: '?? Back', callback_data: 'menu:main' }]],
            }) }
          );
          break;

        case 'settings':
          // Settings menu already handled by command
          break;

        case 'main':
          const mainBot = this.getBot(botName);
          if (!mainBot) return;
          
          await mainBot.editMessage(
            chatId,
            messageId,
            `?? *Main Menu*\n\nChoose an option:`,
            {
              parse_mode: 'Markdown',
              reply_markup: Helpers.createMenu({
                title: 'Main Menu',
                buttons: [
                  [{ text: '?? Help', callback_data: 'menu:help' }, { text: '?? Settings', callback_data: 'menu:settings' }],
                  [{ text: '?? Stats', callback_data: 'action:stats' }, { text: '?? Info', callback_data: 'action:info' }],
                  [{ text: '?? Quote', callback_data: 'action:quote' }, { text: '?? Dice', callback_data: 'action:dice' }],
                ],
              }),
            }
          );
          break;
      }
    });

    bot.registerCallbackHandler('action', async (query, data) => {
      if (!query.message || !query.from) return;

      const chatId = query.message.chat.id;
      const bot = this.getBot(botName);
      if (!bot) return;

      switch (data) {
        case 'stats':
          const stats = await bot.getStats();
          const uptime = Helpers.formatDuration(stats.uptime);
          await bot.sendMessage(
            chatId,
            `?? *Bot Statistics*\n\n` +
            `?? Messages: ${stats.totalMessages}\n` +
            `?? Commands: ${stats.totalCommands}\n` +
            `?? Users: ${stats.totalUsers}\n` +
            `?? Uptime: ${uptime}`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'info':
          const userData = await Storage.getUserData(query.from.id);
          const info = `?? *Your Info*\n\n?? ID: \`${query.from.id}\`\n?? Name: ${query.from.first_name}`;
          await bot.sendMessage(chatId, info, { parse_mode: 'Markdown' });
          break;

        case 'quote':
          const quotes = [
            'The only way to do great work is to love what you do.',
            'Innovation distinguishes between a leader and a follower.',
            'Life is what happens while you\'re busy making other plans.',
          ];
          const quote = quotes[Math.floor(Math.random() * quotes.length)];
          await bot.sendMessage(chatId, `?? "${quote}"`, { parse_mode: 'Markdown' });
          break;

        case 'dice':
          const result = Math.floor(Math.random() * 6) + 1;
          await bot.sendMessage(chatId, `?? Result: **${result}**`, { parse_mode: 'Markdown' });
          break;
      }
    });

    // Register message handlers
    bot.registerMessageHandler({
      pattern: /^hi|hello|hey$/i,
      handler: async (msg) => {
        const userInfo = Helpers.getUserInfo(msg);
        await bot.sendMessage(msg.chat.id, `Hello, ${userInfo.name}! ??`);
      },
    });

    bot.registerMessageHandler({
      pattern: /thank|thanks|thx/i,
      handler: async (msg) => {
        await bot.sendMessage(msg.chat.id, 'You\'re welcome! ??');
      },
    });

    // Register scheduled task example
    bot.registerScheduledTask({
      id: 'daily-statistics',
      name: 'Daily Statistics Update',
      cron: '@every 24h',
      enabled: false, // Disabled by default
      handler: async () => {
        Logger.info('Daily statistics update task executed');
        // Add your logic here
      },
    });

    Logger.info(`Features registered for bot: ${botName}`);
  }

  /**
   * Get manager statistics
   */
  getStats(): {
    totalBots: number;
    botNames: string[];
  } {
    return {
      totalBots: this.bots.size,
      botNames: Array.from(this.bots.keys()),
    };
  }
}
