import { Message, Client } from 'discord.js';
import autoReply from './auto-reply';
import { ExtendedClient } from '../utils/ExtendedClient';

const prefixes = ['?', '.'];

export default {
  name: 'messageCreate',
  once: false,
  async execute(message: Message, client: ExtendedClient) {

    // Auto-reply system
    autoReply(message);

    // Prefix command handling
    const prefix = prefixes.find(p => message.content.startsWith(p));
    if (!prefix) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()!.toLowerCase();
    const command = client.prefixCommands.get(commandName);

    if (command) {
      try {
        await command.execute(message, args, client);
      } catch (error) {
        console.error(`Error in prefix command ${commandName}:`, error);
        message.reply({ content: process.env.ERR, allowedMentions: { parse: [] } });
      }
    }
  }
};
