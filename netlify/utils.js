import fs from 'fs/promises';
import path from 'path';

// Check if we're in a local development environment
const IS_LOCAL = process.env.NETLIFY_DEV === 'true';
const DEBUG = process.env.DEBUG_MODE === 'true';

// Only log if we're in local development and DEBUG_MODE is true
const SHOULD_LOG = IS_LOCAL && DEBUG;

const LOG_FILE = path.join(process.cwd(), 'netlify', 'debug.log');

// Helper function for conditional logging
async function writeToLogFile(message) {
    if (!SHOULD_LOG) return;
    
    try {
        await fs.appendFile(LOG_FILE, message + '\n');
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
}

// Helper function for conditional logging
export async function debugLog(...args) {
    if (SHOULD_LOG) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : arg
        ).join(' ');
        await writeToLogFile(`[LOG] ${new Date().toISOString()}: ${message}`);
    }
}

// Helper function for conditional error logging
export async function debugError(...args) {
    if (SHOULD_LOG) {
        const message = args.map(arg => 
            arg instanceof Error ? arg.stack : (typeof arg === 'object' ? JSON.stringify(arg) : arg)
        ).join(' ');
        await writeToLogFile(`[ERROR] ${new Date().toISOString()}: ${message}`);
    }
}
