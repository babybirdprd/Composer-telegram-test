# Telegram Bot and Bot Manager

A comprehensive Telegram bot system with a powerful bot manager, built for Next.js applications.

## Features

### Core Features
- ? **Command System**: Easy-to-use command registration and handling
- ? **Message Handlers**: Pattern-based message processing
- ? **Callback Query Handlers**: Inline keyboard support
- ? **Scheduled Tasks**: Background task scheduling
- ? **User Management**: Automatic user tracking and data persistence
- ? **Admin System**: Role-based access control
- ? **Storage System**: JSON-based data persistence
- ? **Logging**: Comprehensive logging system
- ? **Webhook Support**: Production-ready webhook handling

### Bot Features

#### User Commands
- `/start` - Start the bot
- `/help` - Show available commands
- `/info` - Get your user information
- `/stats` - View bot statistics
- `/settings` - Open settings menu
- `/echo <message>` - Echo your message
- `/weather <location>` - Weather information (placeholder)
- `/remind <time> <message>` - Set reminders (e.g., `/remind 30m Buy groceries`)
- `/quote` - Get a random inspirational quote
- `/dice` - Roll a dice
- `/poll <question> | <option1> | <option2>` - Create polls

#### Utility Commands
- `/calc <expression>` - Calculate math expressions
- `/uuid` - Generate a UUID
- `/random [min] <max>` - Generate random numbers
- `/reverse <text>` - Reverse text
- `/uppercase <text>` - Convert to uppercase
- `/lowercase <text>` - Convert to lowercase
- `/encode64 <text>` - Encode to Base64
- `/decode64 <text>` - Decode Base64
- `/timestamp [unix_timestamp]` - Convert timestamps

#### Admin Commands
- `/broadcast <message>` - Broadcast to all users
- `/users` - View user statistics
- `/userinfo <user_id>` - Get user information
- `/makeadmin <user_id>` - Promote user to admin
- `/removeadmin <user_id>` - Remove admin privileges
- `/ban <user_id> [reason]` - Ban a user
- `/unban <user_id>` - Unban a user

## Setup

### 1. Get a Bot Token

1. Talk to [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ADMIN_IDS=123456789,987654321
TELEGRAM_POLLING=true
```

### 3. Installation

Dependencies are already installed. If needed:
```bash
pnpm install
```

## Usage

### Option 1: Integrated with Next.js (Recommended)

The bot integrates with Next.js and runs through the API route at `/api/bot`. Simply start your Next.js server:

```bash
pnpm run dev
```

The bot will automatically initialize when the API route is first accessed.

### Option 2: Standalone Server

Run the bot as a standalone server:

```bash
pnpm run bot
```

Or in watch mode during development:

```bash
pnpm run bot:dev
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Your bot token from BotFather |
| `TELEGRAM_ADMIN_IDS` | No | Comma-separated list of admin user IDs |
| `TELEGRAM_POLLING` | No | Use polling (default: true) |
| `TELEGRAM_WEBHOOK_URL` | No | Webhook URL for production |

### Admin Setup

To set up admins, get your Telegram user ID:
1. Talk to [@userinfobot](https://t.me/userinfobot) on Telegram
2. Copy your user ID
3. Add it to `TELEGRAM_ADMIN_IDS` in `.env`

## Architecture

```
src/bot/
??? Bot.ts              # Core Bot class
??? BotManager.ts       # Bot manager for multiple bots
??? config.ts           # Configuration loader
??? storage.ts          # Data persistence
??? server.ts           # Standalone server
??? types.ts            # TypeScript types
??? index.ts            # Main exports
??? features/           # Feature modules
?   ??? admin.ts        # Admin features
?   ??? utilities.ts    # Utility commands
??? utils/              # Utilities
    ??? logger.ts       # Logging system
    ??? helpers.ts      # Helper functions
```

## Creating Custom Commands

```typescript
import { BotManager } from '@/bot';
import { getBotConfig } from '@/bot/config';

const manager = new BotManager();
const config = getBotConfig();
const bot = await manager.registerBot('mybot', config);

bot.registerCommand({
  command: 'mycommand',
  description: 'My custom command',
  handler: async (msg, args) => {
    await bot.sendMessage(msg.chat.id, 'Hello from my command!');
  },
});
```

## Adding Message Handlers

```typescript
bot.registerMessageHandler({
  pattern: /hello/i,
  handler: async (msg) => {
    await bot.sendMessage(msg.chat.id, 'Hi there!');
  },
});
```

## Adding Callback Handlers

```typescript
bot.registerCallbackHandler('mycallback', async (query, data) => {
  if (!query.message) return;
  await bot.sendMessage(query.message.chat.id, `Callback data: ${data}`);
});
```

## Data Storage

User data is automatically stored in `.bot-data/users.json`. You can also create custom storage:

```typescript
import { Storage } from '@/bot';

// Save data
await Storage.save('my-data', { key: 'value' });

// Load data
const data = await Storage.load('my-data');

// Append to array
await Storage.append('items', { id: 1, name: 'Item' });
```

## Scheduled Tasks

```typescript
bot.registerScheduledTask({
  id: 'daily-report',
  name: 'Daily Report',
  cron: '@every 24h',
  enabled: true,
  handler: async () => {
    // Your task logic
  },
});
```

## Webhook Mode (Production)

For production, use webhooks instead of polling:

1. Set `TELEGRAM_POLLING=false` in `.env`
2. Set `TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/bot`
3. Deploy your Next.js app
4. The bot will use webhooks automatically

## Security Notes

- Never commit your `.env` file
- Keep your bot token secret
- Use environment variables for sensitive data
- Regularly update dependencies
- Monitor bot logs for suspicious activity

## Troubleshooting

### Bot not responding
- Check that `TELEGRAM_BOT_TOKEN` is set correctly
- Verify the token is valid with BotFather
- Check logs for errors

### Admin commands not working
- Verify your user ID is in `TELEGRAM_ADMIN_IDS`
- Use `/info` to check your user ID
- Make sure the format is correct (comma-separated)

### Storage issues
- Ensure the `.bot-data` directory is writable
- Check file permissions
- Verify disk space

## License

This bot system is part of the Telegram Mini Apps Next.js template.

## Contributing

Feel free to extend the bot with additional features! The modular architecture makes it easy to add new commands and handlers.
