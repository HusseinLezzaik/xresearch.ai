// Determine if running in development mode (localhost)
export const isDev = window.location.hostname === 'localhost' && window.location.port === '8888';

// Development logging function
export function devLog(...args) {
    if (isDev) {
        console.log(...args);
    }
}

// Development error logging function
export function devError(...args) {
    if (isDev) {
        console.error(...args);
    }
}
