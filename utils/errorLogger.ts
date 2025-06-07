import { TextChannel, DMChannel, NewsChannel } from 'discord.js';
import idclass from './idclass';
import { client } from '../sora';

interface ErrorLogOptions {
    error: Error | string;
    source?: string;
    additionalInfo?: Record<string, any>;
}

function formatError(error: Error | string): string {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}\n${error.stack || ''}`;
    }
    return error.toString();
}

function formatAdditionalInfo(info?: Record<string, any>): string {
    if (!info) return '';
    try {
        return '\nAdditional Info:\n' + JSON.stringify(info, null, 2);
    } catch {
        return '\nAdditional Info: [Could not stringify info]';
    }
}

export async function logErrorToChannel(options: ErrorLogOptions): Promise<void> {
    const { error, source = 'Unknown', additionalInfo } = options;

    try {
        const logChannel = await client.channels.fetch(idclass.channelErrorLogs());
        
        if (!logChannel || !(logChannel instanceof TextChannel || logChannel instanceof DMChannel || logChannel instanceof NewsChannel)) {
            throw new Error('Invalid log channel');
        }

        const errorMessage = [
            `**Error in:** \`${source}\``,
            '```',
            formatError(error),
            formatAdditionalInfo(additionalInfo),
            '```'
        ].join('\n');

        if (errorMessage.length > 2000) {
            await logChannel.send(`**Error in:** \`${source}\` (Error too long, check console logs)`);
            console.error('Full error:', error);
            if (additionalInfo) console.error('Additional info:', additionalInfo);
        } else {
            await logChannel.send(errorMessage);
        }
    } catch (err) {
        console.error('Failed to log error to channel:', err);
        console.error('Original error:', error);
    }
}

// Override console.error
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
    originalConsoleError(...args);
    
    const errorMessage = args.map(arg => 
        arg instanceof Error ? arg.stack || arg.message : 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : 
        String(arg)
    ).join(' ');

    logErrorToChannel({
        error: errorMessage,
        source: 'Console'
    });
};

// Export a convenient function for direct use
export const logError = (error: Error | string, source?: string, additionalInfo?: Record<string, any>) => {
    return logErrorToChannel({ error, source, additionalInfo });
};
