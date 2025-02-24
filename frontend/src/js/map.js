import { devLog, devError } from './utils.js';

// Array to keep track of markers added to the map
let markers = [];

// Function to initialize the Mapbox map
export async function initializeMap() {
    try {
        // Fetch Mapbox access token from Netlify function
        const response = await fetch('/.netlify/functions/get-mapbox-token');
        const data = await response.json();

        // Set Mapbox access token
        mapboxgl.accessToken = data.token;

        // Get last location from localStorage, or use default
        const lastLocation = JSON.parse(localStorage.getItem('lastMapLocation')) || {
            center: [-122.4194, 37.7749], // Default center (San Francisco)
            zoom: 12
        };

        // Initialize Mapbox map
        const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11', // Mapbox style URL
            center: lastLocation.center, // Center of the map
            zoom: lastLocation.zoom // Zoom level of the map
        });

        // Add zoom and rotation controls to the bottom right of the map
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

        // Save map location whenever it moves
        map.on('moveend', function() {
            const center = map.getCenter();
            const zoom = map.getZoom();
            localStorage.setItem('lastMapLocation', JSON.stringify({
                center: [center.lng, center.lat],
                zoom: zoom
            }));
        });

        // Log when the map has finished loading
        map.on('load', function() {
            devLog('Map initialized successfully');
        });

        return map;
    } catch (error) {
        devError('Error initializing the map:', error);
        throw error;
    }
}

// Function to add a custom marker to the map
export function addCustomMarker(map, lng, lat, name) {
    // Create a DOM element for the marker
    const el = document.createElement('div');
    el.className = 'custom-marker';

    // Create the marker
    const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<h3>${name}</h3>`))
        .addTo(map);

    // Add the marker to the array for tracking
    markers.push(marker);
}

// Function to clear all markers from the map
export function clearAllMarkers() {
    markers.forEach(marker => marker.remove());
    markers = [];
}