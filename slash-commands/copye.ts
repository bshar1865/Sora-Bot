import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Guild,
    GuildMemberRoleManager,
    TextChannel
} from 'discord.js';
import idclass from '../idclass';

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function addEmojisWithPause(guild: Guild, emojiData: string[], interaction: ChatInputCommandInteraction) {
    const addedEmojis = new Set(guild.emojis.cache.map(e => e.name));
    const logLines: string[] = [];

    const totalEmojiLimit = guild.premiumTier >= 2 ? 250 : guild.premiumTier === 1 ? 150 : 50;

    // Count current static and animated emojis
    const currentStatic = guild.emojis.cache.filter(e => !e.animated).size;
    const currentAnimated = guild.emojis.cache.filter(e => e.animated).size;

    const maxStatic = totalEmojiLimit;
    const maxAnimated = totalEmojiLimit;

    let remainingStatic = maxStatic - currentStatic;
    let remainingAnimated = maxAnimated - currentAnimated;

    let added = 0;
    let failed = 0;
    let skipped = 0;
    let index = 0;

    while (index < emojiData.length) {
        const emojiInput = emojiData[index];
        let nameFromUrl: string;
        let emojiId: string;
        let isAnimated = false;

        const match = emojiInput.match(/<(a?):(\w+):(\d+)>/);
        if (match) {
            isAnimated = match[1] === 'a';
            nameFromUrl = match[2];
            emojiId = match[3];
        } else if (/^\d+$/.test(emojiInput)) {
            emojiId = emojiInput;
            nameFromUrl = `emoji_${emojiId}`;
        } else {
            logLines.push(`Invalid format for \`${emojiInput}\``);
            failed++;
            index++;
            continue;
        }

        if (addedEmojis.has(nameFromUrl)) {
            logLines.push(`Emoji \`${nameFromUrl}\` already exists.`);
            skipped++;
            index++;
            continue;
        }

        if (isAnimated && remainingAnimated <= 0) {
            logLines.push(`Skipped animated emoji \`${nameFromUrl}\` - no animated slots left.`);
            skipped++;
            index++;
            continue;
        }

        if (!isAnimated && remainingStatic <= 0) {
            logLines.push(`Skipped static emoji \`${nameFromUrl}\` - no static slots left.`);
            skipped++;
            index++;
            continue;
        }

        try {
            const extension = isAnimated ? 'gif' : 'png';
            const emoji = await guild.emojis.create({
                attachment: `https://cdn.discordapp.com/emojis/${emojiId}.${extension}`,
                name: nameFromUrl
            });

            logLines.push(`${isAnimated ? '<a:' : '<:'}${emoji.name}:${emoji.id}> \`:${emoji.name}:\``);
            added++;
            isAnimated ? remainingAnimated-- : remainingStatic--;
            index++;
        } catch (error: any) {
            failed++;

            if (
                error.message?.includes("rate limited") ||
                error.code === 20028 ||
                error.code === 50013
            ) {
                logLines.push(`Rate limit hit. Pausing for 15 minutes...`);
                await interaction.followUp({
                    content: "Rate limited. Waiting 15 minutes before resuming...",
                    ephemeral: false
                });

                await sleep(15 * 60 * 1000);

                logLines.push(`Resuming copying.`);
                await interaction.followUp({
                    content: "Resuming copying after 15-minute wait.",
                    ephemeral: false
                });

                continue;
            } else {
                logLines.push(`Failed to add emoji \`${nameFromUrl}\``);
                index++;
            }
        }
    }

    logLines.unshift(`Added: ${added} | Skipped: ${skipped} | Failed: ${failed}`);

    const chunks = [];
    let chunk = '';
    for (const line of logLines) {
        if (chunk.length + line.length + 1 > 2000) {
            chunks.push(chunk);
            chunk = '';
        }
        chunk += line + '\n';
    }
    if (chunk) chunks.push(chunk);

    return chunks;
}


export const data = new SlashCommandBuilder()
    .setName('copye')
    .setDescription('Copies emojis to this server')
    .addStringOption(option =>
        option.setName('emoji_list')
            .setDescription('Emoji mentions or Emoji IDs')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (
        !interaction.member ||
        !(interaction.member.roles instanceof GuildMemberRoleManager) ||
        !interaction.member.roles.cache.has(idclass.roleDev())
    ) {
        return interaction.reply({
            content: 'You do not have permission to use this command.',
            ephemeral: false
        });
    }

    const emojiString = interaction.options.getString('emoji_list', true);
    const emojiMentions = emojiString.match(/<a?:\w+:\d+>/g) || [];
    const rawIds = emojiString.match(/\b\d{17,20}\b/g) || [];

    const processedIds = new Set<string>();
    const emojiArray: string[] = [];

    for (const mention of emojiMentions) {
        const match = mention.match(/<a?:(\w+):(\d+)>/);
        if (match) {
            const id = match[2];
            if (!processedIds.has(id)) {
                emojiArray.push(mention);
                processedIds.add(id);
            }
        }
    }

    for (const id of rawIds) {
        if (!processedIds.has(id)) {
            emojiArray.push(id);
            processedIds.add(id);
        }
    }

    if (emojiArray.length === 0) {
        return interaction.reply({
            content: 'No valid emojis or IDs found in the input.',
            ephemeral: false
        });
    }

    await interaction.deferReply({ ephemeral: false });

    const logs = await addEmojisWithPause(interaction.guild!, emojiArray, interaction);

    for (const chunk of logs) {
        await interaction.followUp({ content: chunk, ephemeral: false });
    }

    // Logging to channel
    const logChannel = interaction.guild?.channels.cache.get(idclass.roleDev()) as TextChannel;
    if (logChannel) {
        for (const chunk of logs) {
            await logChannel.send({
                content: `**Emoji has been **__COPIED__** by <@${interaction.user.id}>**\n${chunk}`,
                allowedMentions: { parse: [] }
            });
        }
    }
}

export default {
    data,
    execute
};
