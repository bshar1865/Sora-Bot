import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember
} from 'discord.js';
import idclass from '../utils/idclass';
import { getSortedModules, updateModuleStatus, editStatusInPlace } from '../utils/sourceStatusManager';

export default {
  data: new SlashCommandBuilder()
    .setName('sourcestatus')
    .setDescription('Manage source module statuses')
    .addSubcommand(subcommand =>
      subcommand
        .setName('up')
        .setDescription('Mark a source as UP')
        .addIntegerOption(option =>
          option
            .setName('number')
            .setDescription('The number of the source from the status list')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Optional message to add')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('down')
        .setDescription('Mark a source as DOWN')
        .addIntegerOption(option =>
          option
            .setName('number')
            .setDescription('The number of the source from the status list')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Optional message to add')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('refresh')
        .setDescription('Refresh the source status list')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // Check permissions - only allow specific roles
    const allowedRoleIDs = [idclass.roleDev(), idclass.roleCommander(), idclass.rolePaul(), idclass.roleCranci()];
    const member = interaction.member as GuildMember;
    
    if (!member) {
      return interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    }

    const hasPermission = member.roles.cache.some((role) => allowedRoleIDs.includes(role.id));
    if (!hasPermission) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command.', 
        ephemeral: true 
      });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'refresh') {
      // Trigger a refresh of the source status
      await interaction.reply({ content: 'Refreshing source status...', ephemeral: true });
      
      try {
        // Import updateSourceStatus here to avoid circular dependency
        const { updateSourceStatus } = await import('../utils/sourceStatusManager');
        await updateSourceStatus(interaction.client);
        await interaction.editReply('✅ Source status refreshed successfully!');
      } catch (error) {
        console.error('Error refreshing source status:', error);
        await interaction.editReply('❌ Error refreshing source status.');
      }
      return;
    }

    const number = interaction.options.getInteger('number', true);
    const message = interaction.options.getString('message') || undefined;

    // Get the sorted list of modules
    const modulesArray = getSortedModules();
    
    if (modulesArray.length === 0) {
      return interaction.reply({ 
        content: 'No sources found. Please wait for the system to initialize or use /sourcestatus refresh.', 
        ephemeral: true 
      });
    }
    
    if (number > modulesArray.length) {
      return interaction.reply({ 
        content: `Invalid number. There are only ${modulesArray.length} sources in the list.`, 
        ephemeral: true 
      });
    }

    const targetModule = modulesArray[number - 1]; // Convert to 0-based index
    if (!targetModule) {
      return interaction.reply({ 
        content: 'Source not found.', 
        ephemeral: true 
      });
    }

    // Update the status
    const newStatus: 'up' | 'down' = subcommand === 'up' ? 'up' : 'down';
    const success = updateModuleStatus(targetModule.name, newStatus, message);
    
    if (!success) {
      return interaction.reply({ 
        content: 'Failed to update source status.', 
        ephemeral: true 
      });
    }

    // Create response embed
    const statusEmoji = newStatus === 'up' ? '🟢' : '🔴';
    const statusText = newStatus === 'up' ? 'UP' : 'DOWN';
    
    const embed = new EmbedBuilder()
      .setTitle(`${statusEmoji} Source Status Updated`)
      .setColor(newStatus === 'up' ? '#00ff00' : '#ff0000')
      .addFields(
        { name: 'Source', value: targetModule.name, inline: true },
        { name: 'Status', value: `${statusEmoji} ${statusText}`, inline: true },
        { name: 'Number', value: number.toString(), inline: true }
      )
      .setTimestamp();

    if (message) {
      embed.addFields({ name: 'Message', value: message, inline: false });
    }

    await interaction.reply({ embeds: [embed] });

    // Edit the status messages in place to reflect the change
    try {
      await editStatusInPlace(interaction.client, targetModule.name);
      console.log(`Source ${targetModule.name} marked as ${newStatus}${message ? ` with message: ${message}` : ''}`);
    } catch (error) {
      console.error('Error updating source status display:', error);
    }
  }
}; 