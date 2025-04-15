import { Message, Client, TextChannel } from 'discord.js';
import idclass from '../idclass';

export default {
  name: 'cmd',
  description: 'Repeats a message.',
  requiredRoles: [idclass.roleDev(), idclass.soraBotRole()],

  execute(message: Message, args: string[], client: Client) {
    const requiredRoles = this.requiredRoles;

    const hasRequiredRole = message.member?.roles.cache.some(role =>
      requiredRoles.includes(role.id)
    );

    if (!hasRequiredRole) {
      return message.reply({ content: 'You do not have permission to use this command.' });
    }

    let channel = message.mentions.channels.first() as TextChannel | null;
    let text: string;

    if (channel) {
      text = args.slice(1).join(' ');
    } else {
      channel = message.channel as TextChannel;
      text = args.join(' ');
    }

    if (!text) {
      return message.reply({ content: 'Please provide text to repeat.' });
    }

    if (channel.permissionsFor(client.user!)?.has('SendMessages')) {
      channel.send({ content: text }).catch(() => {
        message.reply({
          content: 'Failed to repeat message. Please make sure the bot has permission to send messages in that channel.'
        });
      });
    } else {
      message.reply({ content: 'I do not have permission to send messages in that channel.' });
    }
  }
};
