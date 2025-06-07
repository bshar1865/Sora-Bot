import {
    Message,
    Client,
    GuildMember,
    TextChannel,
    EmbedBuilder
  } from 'discord.js';
  import idclass from '../utils/idclass';
  
  export default {
    name: 'softban',
    description: 'Softbans a user (bans, deletes messages, DMs an invite, then unbans).',
    requiredRoles: [idclass.roleDev(), idclass.roleCommander(), idclass.rolePaul(), idclass.roleCranci()],
  
    async execute(message: Message, args: string[], client: Client) {
      const hasRequiredRole = message.member?.roles.cache.some(role =>
        this.requiredRoles.includes(role.id)
      );
      if (!hasRequiredRole) {
        return message.reply({
          content: 'You do not have permission to use this command.',
          allowedMentions: { parse: [] }
        });
      }
  
      const userId = args[0]?.replace(/[<@!>]/g, '');
      if (!userId) {
        return message.reply({
          content: 'Please provide a user ID or mention to softban.',
          allowedMentions: { parse: [] }
        });
      }
  
      const reason = args.slice(1).join(' ') || 'No reason provided';
      const inviteLink = 'https://discord.gg/sulfur'; // Replace with your server invite
  
      try {
        const user = await message.guild?.members.fetch(userId).catch(() => null);
       if (!user) {
        return message.reply({
         content: 'Could not find this user in the server.',
        allowedMentions: { parse: [] }
           });
}

  
        const devEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setDescription('You cannot softban peak devs <:DogHush:1331679185072029798>');
  
        if (user.roles.cache.has(idclass.roleDev())) {
          return message.reply({ embeds: [devEmbed] });
        }
  
        // DM user
        try {
          await user.send(
            `You have been __**SOFTBANNED**__ from **${message.guild?.name}** for the following reason: ${reason}.\nYou may rejoin using this invite: ${inviteLink}`
          );
        } catch {
          const logChannel = message.guild?.channels.cache.get(idclass.logChannel());
          if (logChannel && logChannel.isTextBased()) {
            (logChannel as TextChannel).send({
              content: `Could not send Softban DM to <@${userId}>.`,
              allowedMentions: { parse: [] }
            });
          }
        }
  
        // Ban
        await user.ban({ deleteMessageSeconds: 60 * 60 * 24 * 7, reason: `Softban: ${reason}` });
        message.reply({
          content: `<@${userId}> has been __**SOFTBANNED**__.`,
          allowedMentions: { parse: [] }
        });
  
        const logChannel = message.guild?.channels.cache.get(idclass.logChannel());
        if (logChannel && logChannel.isTextBased()) {
          (logChannel as TextChannel).send({
            content: `<@${userId}> has been __**SOFTBANNED**__ by <@${message.author.id}> for: ${reason}`,
            allowedMentions: { parse: [] }
          });
        }
  
        // Unban after delay
        setTimeout(async () => {
          await message.guild?.bans.remove(userId, 'Softban completed');
          message.reply({
            content: `<@${userId}> has been __**UNBANNED**__ (softban completed).`,
            allowedMentions: { parse: [] }
          });
        }, 3000);
      } catch (err) {
        console.error(err);
        message.reply({
          content: 'I was unable to softban lil bro. Please check if the ID is correct.',
          allowedMentions: { parse: [] }
        });
      }
    }
  };
  