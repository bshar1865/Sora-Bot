import {
    Message,
    TextChannel,
    GuildMember,
    ChannelType
} from 'discord.js';
import idclass from '../utils/idclass';
const LogChannel = idclass.logChannel();
const RestrictedCategory = idclass.restrictedCategory();
export default {
    name: 'add',
    description: 'Gives a user access to the current channel.',
    
    requiredRoles: idclass.roleMods(),

    async execute(message: Message, args: string[]) {
        if (!message.guild || !message.member) return;

        const hasRequiredRole = message.member.roles.cache.some(role =>
            this.requiredRoles.includes(role.id)
        );

        if (!hasRequiredRole) {
            await message.reply({
                content: 'You do not have permission to use this command.',
                allowedMentions: { parse: [] }
            });
            return;
        }

        const user: GuildMember | undefined = message.mentions.members?.first();
        if (!user) {
            await message.reply({
                content: 'Please mention a valid user.',
                allowedMentions: { parse: [] }
            });
            return;
        }

        if (message.channel.type !== ChannelType.GuildText) return;

        const channel = message.channel as TextChannel;
        const restrictedCategories: string[] = [RestrictedCategory];
        const isRestricted = restrictedCategories.includes(channel.parentId ?? '');

        if (isRestricted) {
            await channel.send({
                content: 'Sus.',
                allowedMentions: { parse: [] }
            });
            return;
        }

        try {
            await channel.permissionOverwrites.edit(user, {
                ViewChannel: true,
                SendMessages: true
            });

            await channel.send({
                content: `Added <@${user.id}> to the channel successfully.`,
                allowedMentions: { parse: [] }
            });

            const logChannel = message.guild.channels.cache.get(LogChannel);
            if (logChannel?.type === ChannelType.GuildText) {
                await (logChannel as TextChannel).send({
                    content: `<@${user.id}> has been __**ADDED**__ to ${channel.name} by <@${message.author.id}>.`,
                    allowedMentions: { parse: [] }
                });
            }
        } catch (error) {
            console.error(error);
            await channel.send({
                content: 'I cannot add this person to this channel.',
                allowedMentions: { parse: [] }
            });
        }
    }
};
