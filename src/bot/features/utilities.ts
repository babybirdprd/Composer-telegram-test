/**
 * Utility features module
 */

import { Bot } from '../Bot';
import { Helpers } from '../utils/helpers';
import { Message } from 'node-telegram-bot-api';

export function registerUtilityFeatures(bot: Bot): void {
  // Calculator
  bot.registerCommand({
    command: 'calc',
    description: 'Calculate a math expression',
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Usage: /calc <expression>\nExample: /calc 2 + 2 * 3');
        return;
      }

      const expression = args.join(' ');
      try {
        // Simple and safe evaluation (for production, use a proper math parser)
        const result = Function(`"use strict"; return (${expression})`)();
        
        if (typeof result !== 'number' || !isFinite(result)) {
          throw new Error('Invalid result');
        }

        await bot.sendMessage(
          msg.chat.id,
          `?? *Calculator*\n\n\`${expression}\` = \`${result}\``,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        await bot.sendMessage(msg.chat.id, '? Invalid expression. Please check your input.');
      }
    },
  });

  // UUID generator
  bot.registerCommand({
    command: 'uuid',
    description: 'Generate a UUID',
    handler: async (msg) => {
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      await bot.sendMessage(
        msg.chat.id,
        `?? *Generated UUID*\n\n\`${uuid}\``,
        { parse_mode: 'Markdown' }
      );
    },
  });

  // Random number
  bot.registerCommand({
    command: 'random',
    description: 'Generate a random number',
    handler: async (msg, args) => {
      let min = 1;
      let max = 100;

      if (args && args.length > 0) {
        if (args.length === 1) {
          max = parseInt(args[0]);
          if (isNaN(max) || max < 1) {
            await bot.sendMessage(msg.chat.id, 'Usage: /random [min] <max>\nExample: /random 10 20');
            return;
          }
        } else {
          min = parseInt(args[0]);
          max = parseInt(args[1]);
          if (isNaN(min) || isNaN(max) || min >= max) {
            await bot.sendMessage(msg.chat.id, 'Usage: /random [min] <max>\nExample: /random 10 20');
            return;
          }
        }
      }

      const result = Math.floor(Math.random() * (max - min + 1)) + min;
      await bot.sendMessage(
        msg.chat.id,
        `?? *Random Number*\n\nBetween \`${min}\` and \`${max}\`:\n**${result}**`,
        { parse_mode: 'Markdown' }
      );
    },
  });

  // Text utilities
  bot.registerCommand({
    command: 'reverse',
    description: 'Reverse a text',
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Usage: /reverse <text>');
        return;
      }

      const text = args.join(' ');
      const reversed = text.split('').reverse().join('');
      await bot.sendMessage(msg.chat.id, `?? *Reversed Text*\n\n\`${reversed}\``, { parse_mode: 'Markdown' });
    },
  });

  bot.registerCommand({
    command: 'uppercase',
    description: 'Convert text to uppercase',
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Usage: /uppercase <text>');
        return;
      }

      const text = args.join(' ');
      await bot.sendMessage(msg.chat.id, `?? *Uppercase*\n\n\`${text.toUpperCase()}\``, { parse_mode: 'Markdown' });
    },
  });

  bot.registerCommand({
    command: 'lowercase',
    description: 'Convert text to lowercase',
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Usage: /lowercase <text>');
        return;
      }

      const text = args.join(' ');
      await bot.sendMessage(msg.chat.id, `?? *Lowercase*\n\n\`${text.toLowerCase()}\``, { parse_mode: 'Markdown' });
    },
  });

  // Base64 encode/decode
  bot.registerCommand({
    command: 'encode64',
    description: 'Encode text to Base64',
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Usage: /encode64 <text>');
        return;
      }

      const text = args.join(' ');
      const encoded = Buffer.from(text).toString('base64');
      await bot.sendMessage(msg.chat.id, `?? *Base64 Encoded*\n\n\`${encoded}\``, { parse_mode: 'Markdown' });
    },
  });

  bot.registerCommand({
    command: 'decode64',
    description: 'Decode Base64 text',
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Usage: /decode64 <base64_text>');
        return;
      }

      try {
        const text = args.join(' ');
        const decoded = Buffer.from(text, 'base64').toString('utf-8');
        await bot.sendMessage(msg.chat.id, `?? *Base64 Decoded*\n\n\`${decoded}\``, { parse_mode: 'Markdown' });
      } catch (error) {
        await bot.sendMessage(msg.chat.id, '? Invalid Base64 string.');
      }
    },
  });

  // Timestamp converter
  bot.registerCommand({
    command: 'timestamp',
    description: 'Convert timestamp to date or get current timestamp',
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        // Return current timestamp
        const now = Math.floor(Date.now() / 1000);
        const date = new Date().toISOString();
        await bot.sendMessage(
          msg.chat.id,
          `? *Current Timestamp*\n\nUnix: \`${now}\`\nISO: \`${date}\``,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const timestamp = parseInt(args[0]);
      if (isNaN(timestamp)) {
        await bot.sendMessage(msg.chat.id, 'Invalid timestamp. Provide a Unix timestamp (seconds).');
        return;
      }

      const date = new Date(timestamp * 1000);
      await bot.sendMessage(
        msg.chat.id,
        `?? *Timestamp Converter*\n\nUnix: \`${timestamp}\`\nDate: \`${date.toISOString()}\`\nFormatted: \`${date.toLocaleString()}\``,
        { parse_mode: 'Markdown' }
      );
    },
  });
}
