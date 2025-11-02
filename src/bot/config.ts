import { BotConfig } from './types';

export function getBotConfig(): BotConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }

  const adminIds = process.env.TELEGRAM_ADMIN_IDS
    ? process.env.TELEGRAM_ADMIN_IDS.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : undefined;

  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

  return {
    token,
    webhookUrl,
    polling: process.env.TELEGRAM_POLLING !== 'false',
    adminIds,
  };
}
