import { devLog } from './utils.js';

// Function to initialize analytics (Mixpanel and time tracking)
export function initializeAnalytics() {
    // Mixpanel Initialization
    mixpanel.init("84192e740b650021632dcb4fac704493", {
        debug: false, // Set to true to see events in console
        track_pageview: true,
        persistence: "localStorage",
    });

    // Track userID and time spent
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9); // Generate a unique ID if one doesn't exist
        localStorage.setItem('userId', userId);
    }

    // Identify the user to Mixpanel
    mixpanel.identify(userId);

    // Track time spent
    let startTime = new Date();

    // Track time spent before user leaves the page
    window.addEventListener('beforeunload', function() {
        let endTime = new Date();
        let timeSpent = ((endTime - startTime) / 60000).toFixed(2); // Convert to minutes and round to 2 decimal places
        mixpanel.track('Time Spent', { 'duration': timeSpent });
    });
}

/*
 *  MIXPANEL TRACKING FUNCTIONS
 *  ---------------------------
 *  Functions for tracking user interactions
 *  and behavior using Mixpanel analytics.
 */

// Function to track search queries
export function trackSearchQuery(query, latitude, longitude) {
    devLog('Tracking search query:', query);
    mixpanel.track('Search Query', {
        'query': query,
        'latitude': latitude,
        'longitude': longitude
    });
}

// Function to track user location
export function trackUserLocation(address, latitude, longitude) {
    devLog('Tracking user location:', { address, latitude, longitude });
    mixpanel.track('User Location', {
        'address': address,
        'latitude': latitude,
        'longitude': longitude
    });
}

// Function to track when geolocation is denied
export function trackGeolocationDenied() {
    devLog('Geolocation denied');
    mixpanel.track('Geolocation Denied');
}
