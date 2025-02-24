import { initializeMap } from './map.js';
import { setupGeocoder } from './geocoder.js';
import { setupGeolocation } from './geolocation.js';
import { initializeAnalytics } from './analytics.js';
import { devLog } from './utils.js';

// Initialize Analytics
initializeAnalytics();

// Initialize Map
initializeMap()
    .then((map) => {
        // Setup Geocoder after map is initialized
        setupGeocoder(map);

        // Setup Geolocation
        setupGeolocation(map);
    })
    .catch(error => {
        devLog('Error initializing the map:', error);
    });
