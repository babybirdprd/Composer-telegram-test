/**
 * Standalone server for running the bot
 * Can be used if you want to run the bot separately from Next.js
 */

import 'dotenv/config';
import { BotManager } from './BotManager';
import { getBotConfig } from './config';
import { Logger } from './utils/logger';

async function startBot() {
  try {
    Logger.setLevel(Logger.LogLevel.INFO);
    Logger.info('Starting Telegram Bot Server...');

    const manager = new BotManager();
    const config = getBotConfig();

    await manager.registerBot('default', config);
    
    Logger.info('Bot is running! Press Ctrl+C to stop.');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      Logger.info('Shutting down gracefully...');
      await manager.unregisterBot('default');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      Logger.info('Shutting down gracefully...');
      await manager.unregisterBot('default');
      process.exit(0);
    });

  } catch (error) {
    Logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  startBot();
}

export { startBot };
