/**
 * Admin features module
 */

import { Bot } from '../Bot';
import { Storage } from '../storage';
import { Logger } from '../utils/logger';
import { Helpers } from '../utils/helpers';
import { Message } from 'node-telegram-bot-api';

export function registerAdminFeatures(bot: Bot): void {
  // User management
  bot.registerCommand({
    command: 'userinfo',
    description: 'Get info about a user (Admin only)',
    adminOnly: true,
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Usage: /userinfo <user_id>');
        return;
      }

      const userId = parseInt(args[0]);
      if (isNaN(userId)) {
        await bot.sendMessage(msg.chat.id, 'Invalid user ID');
        return;
      }

      const userData = await Storage.getUserData(userId);
      if (!userData) {
        await bot.sendMessage(msg.chat.id, `User ${userId} not found in database.`);
        return;
      }

      const createdDate = new Date(userData.createdAt).toLocaleString();
      const lastActive = new Date(userData.lastActive).toLocaleString();

      let info = `?? *User Information*\n\n`;
      info += `?? ID: \`${userData.id}\`\n`;
      if (userData.username) info += `?? Username: @${userData.username}\n`;
      info += `?? Name: ${userData.firstName || ''} ${userData.lastName || ''}\n`;
      info += `?? Created: ${createdDate}\n`;
      info += `?? Last Active: ${lastActive}\n`;
      info += `?? Admin: ${userData.isAdmin ? 'Yes' : 'No'}\n`;

      await bot.sendMessage(msg.chat.id, info, { parse_mode: 'Markdown' });
    },
  });

  // Make user admin
  bot.registerCommand({
    command: 'makeadmin',
    description: 'Make a user admin (Admin only)',
    adminOnly: true,
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Usage: /makeadmin <user_id>');
        return;
      }

      const userId = parseInt(args[0]);
      if (isNaN(userId)) {
        await bot.sendMessage(msg.chat.id, 'Invalid user ID');
        return;
      }

      const userData = await Storage.getUserData(userId);
      if (!userData) {
        await bot.sendMessage(msg.chat.id, `User ${userId} not found.`);
        return;
      }

      userData.isAdmin = true;
      await Storage.saveUserData(userData);

      await bot.sendMessage(msg.chat.id, `? User ${userId} is now an administrator.`);
      Logger.info(`User ${userId} promoted to admin by ${msg.from?.id}`);
    },
  });

  // Remove admin
  bot.registerCommand({
    command: 'removeadmin',
    description: 'Remove admin privileges (Admin only)',
    adminOnly: true,
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Usage: /removeadmin <user_id>');
        return;
      }

      const userId = parseInt(args[0]);
      if (isNaN(userId)) {
        await bot.sendMessage(msg.chat.id, 'Invalid user ID');
        return;
      }

      if (userId === msg.from?.id) {
        await bot.sendMessage(msg.chat.id, '? You cannot remove your own admin privileges.');
        return;
      }

      const userData = await Storage.getUserData(userId);
      if (!userData) {
        await bot.sendMessage(msg.chat.id, `User ${userId} not found.`);
        return;
      }

      userData.isAdmin = false;
      await Storage.saveUserData(userData);

      await bot.sendMessage(msg.chat.id, `? Admin privileges removed from user ${userId}.`);
      Logger.info(`Admin privileges removed from user ${userId} by ${msg.from?.id}`);
    },
  });

  // Ban user
  bot.registerCommand({
    command: 'ban',
    description: 'Ban a user (Admin only)',
    adminOnly: true,
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Usage: /ban <user_id> [reason]');
        return;
      }

      const userId = parseInt(args[0]);
      if (isNaN(userId)) {
        await bot.sendMessage(msg.chat.id, 'Invalid user ID');
        return;
      }

      const reason = args.slice(1).join(' ') || 'No reason provided';

      // Save ban status (you might want to use a separate bans file)
      const banned = await Storage.load<any[]>('banned_users', []);
      if (!banned.find(u => u.id === userId)) {
        banned.push({ id: userId, reason, bannedBy: msg.from?.id, bannedAt: Date.now() });
        await Storage.save('banned_users', banned);
      }

      try {
        await bot.sendMessage(userId, `?? You have been banned.\n\nReason: ${reason}`);
      } catch (error) {
        Logger.warn(`Could not notify banned user ${userId}`);
      }

      await bot.sendMessage(msg.chat.id, `? User ${userId} has been banned.\nReason: ${reason}`);
      Logger.info(`User ${userId} banned by ${msg.from?.id}`);
    },
  });

  // Unban user
  bot.registerCommand({
    command: 'unban',
    description: 'Unban a user (Admin only)',
    adminOnly: true,
    handler: async (msg, args) => {
      if (!args || args.length === 0) {
        await bot.sendMessage(msg.chat.id, 'Usage: /unban <user_id>');
        return;
      }

      const userId = parseInt(args[0]);
      if (isNaN(userId)) {
        await bot.sendMessage(msg.chat.id, 'Invalid user ID');
        return;
      }

      await Storage.remove('banned_users', (user: any) => user.id === userId);

      await bot.sendMessage(msg.chat.id, `? User ${userId} has been unbanned.`);
      Logger.info(`User ${userId} unbanned by ${msg.from?.id}`);
    },
  });
}
