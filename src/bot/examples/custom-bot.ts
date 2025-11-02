/**
 * Example: Creating a custom bot with additional features
 * 
 * This file demonstrates how to extend the bot with custom commands and handlers
 */

import { BotManager } from '../BotManager';
import { getBotConfig } from '../config';
import { Bot } from '../Bot';

export async function createCustomBot(): Promise<Bot> {
  const manager = new BotManager();
  const config = getBotConfig();

  // Register the bot
  const bot = await manager.registerBot('myCustomBot', config);

  // Add custom command
  bot.registerCommand({
    command: 'greet',
    description: 'Greet the user with a custom message',
    handler: async (msg, args) => {
      const name = args.length > 0 ? args.join(' ') : 'there';
      await bot.sendMessage(msg.chat.id, `Hello, ${name}! ??`);
    },
  });

  // Add custom message handler
  bot.registerMessageHandler({
    pattern: /good (morning|afternoon|evening)/i,
    handler: async (msg, match) => {
      const timeOfDay = match?.[1] || 'day';
      await bot.sendMessage(
        msg.chat.id,
        `Good ${timeOfDay} to you too! ??`
      );
    },
  });

  // Add custom callback handler
  bot.registerCallbackHandler('custom_action', async (query, data) => {
    if (!query.message) return;
    await bot.sendMessage(
      query.message.chat.id,
      `Custom action executed with data: ${data}`
    );
  });

  // Add scheduled task
  bot.registerScheduledTask({
    id: 'daily-greeting',
    name: 'Daily Greeting',
    cron: '@every 24h',
    enabled: false, // Disable by default
    handler: async () => {
      // Your daily task logic here
      console.log('Daily greeting task executed');
    },
  });

  return bot;
}

// Example: Register multiple bots with different configurations
export async function createMultipleBots(): Promise<void> {
  const manager = new BotManager();

  // Bot 1: Main bot
  const mainConfig = getBotConfig();
  await manager.registerBot('main', mainConfig);

  // Bot 2: Support bot (if you have multiple tokens)
  // const supportConfig = { ...getBotConfig(), token: process.env.SUPPORT_BOT_TOKEN! };
  // await manager.registerBot('support', supportConfig);

  // Set default bot
  manager.setDefaultBot('main');
}
