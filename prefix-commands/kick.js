const idclass = require('../idclass');

module.exports = {
    name: 'kick',
    description: 'Kicks a user from the server.',
    requiredRoles: [idclass.RoleDev], // Modify this role as needed

    async execute(message, args) {
        const hasRequiredRole = message.member.roles.cache.some(role => this.requiredRoles.includes(role.id));
        if (!hasRequiredRole) {
            return message.reply({ content: 'You do not have permission to use this command.', allowedMentions: { parse: [] } });
        }

        const userId = args[0]?.replace(/[<@!>]/g, '');
        if (!userId) {
            return message.reply({ content: 'Please provide a user ID or mention to kick.', allowedMentions: { parse: [] } });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            const user = await message.guild.members.fetch(userId);
            if (!user) {
                return message.reply({ content: 'Could not find this user in the server.', allowedMentions: { parse: [] } });
            }
            if (!user.kickable) {
                return message.reply({ content: 'I cannot kick this user. They might have a higher role or permissions.', allowedMentions: { parse: [] } });
            }

            try {
                await user.send(`You have been __**KICKED**__ from **${message.guild.name}** for the following reason: ${reason}`);
            } catch (dmError) {
                const logChannel = message.guild.channels.cache.get(idclass.LogChannel);
                if (logChannel) {
                    logChannel.send({ content: `Could not send Kick DM to <@${userId}>.`, allowedMentions: { parse: [] } });
                }
            }

            await user.kick(reason);
            message.channel.send({ content: `https://tenor.com/view/kicked-persona-persona5-gif-25017260`, allowedMentions: { parse: [] } });
            message.channel.send({ content: `<@${userId}> has been __**KICKED**__.`, allowedMentions: { parse: [] } });

            const logChannel = message.guild.channels.cache.get(idclass.LogChannel);
            if (logChannel) {
                logChannel.send({ content: `<@${userId}> has been __**KICKED**__ by <@${message.author.id}> for: ${reason}`, allowedMentions: { parse: [] } });
            }
        } catch (error) {
            console.error(error);
            message.reply({ content: 'I was unable to kick lil bro. Please check if the ID is correct.', allowedMentions: { parse: [] } });
        }
    },
};
