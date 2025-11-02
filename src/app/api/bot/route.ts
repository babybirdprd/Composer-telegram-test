import { NextRequest, NextResponse } from 'next/server';
import { BotManager } from '@/bot/BotManager';
import { getBotConfig } from '@/bot/config';
import { Logger } from '@/bot/utils/logger';
import TelegramBot from 'node-telegram-bot-api';

// Singleton instance
let botManager: BotManager | null = null;
let defaultBot: TelegramBot | null = null;

function getBotManager(): BotManager {
  if (!botManager) {
    botManager = new BotManager();
    
    // Initialize default bot
    try {
      const config = getBotConfig();
      botManager.registerBot('default', config).then(bot => {
        bot.getTelegramBot().then(telegramBot => {
          defaultBot = telegramBot;
          Logger.info('Default bot initialized and ready');
        });
      });
    } catch (error) {
      Logger.error('Failed to initialize bot:', error);
    }
  }
  return botManager;
}

// Handle webhook requests
export async function POST(request: NextRequest) {
  try {
    if (!defaultBot) {
      getBotManager();
      return NextResponse.json({ ok: false, error: 'Bot not initialized' }, { status: 500 });
    }

    const body = await request.json();
    
    // Process the update
    await defaultBot.processUpdate(body);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    Logger.error('Webhook error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Get bot info
export async function GET() {
  try {
    const manager = getBotManager();
    const stats = manager.getStats();
    
    return NextResponse.json({
      ok: true,
      stats,
      message: 'Bot API is running',
    });
  } catch (error) {
    Logger.error('API error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
