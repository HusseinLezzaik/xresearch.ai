import { addCustomMarker, clearAllMarkers } from './map.js';
import { trackSearchQuery } from './analytics.js';
import { devLog, devError } from './utils.js';

// Function to set up the geocoder (search bar)
export function setupGeocoder(map) {
    // Initialize the Mapbox Geocoder control with suggestions disabled
    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: false, // We'll handle markers ourselves
        placeholder: 'find something you like',
        // Disable suggestions by setting autocomplete to false
        autocomplete: false,
        // Optionally, set a high minLength to prevent suggestions
        minLength: 1000,
        // Disable the default flyTo behavior
        flyTo: false,
        // Limit results to zero to prevent any automatic suggestions
        limit: 0,
        // Remove types to allow all kinds of queries
        types: ''
         // Enable suggestions dropdown
        //types: 'country,region,place,postcode,locality,neighborhood,address,poi'
    });

    // Add the geocoder to the map
    const geocoderContainer = document.getElementById('geocoder');
    geocoderContainer.appendChild(geocoder.onAdd(map));

    // Create and add a clear button
    const clearButton = document.createElement('button');
    clearButton.innerHTML = '&times;'; // × symbol
    clearButton.className = 'mapboxgl-ctrl-geocoder--button';
    clearButton.setAttribute('aria-label', 'Clear');
    clearButton.style.display = 'none'; // Initially hidden
    geocoderContainer.querySelector('.mapboxgl-ctrl-geocoder').appendChild(clearButton);

    // Access the input element of the geocoder
    const inputEl = geocoder._inputEl;

    // Show/hide clear button based on input content
    inputEl.addEventListener('input', function() {
        clearButton.style.display = this.value ? 'block' : 'none';
    });

    // Clear input and hide button when clicked
    clearButton.addEventListener('click', function() {
        inputEl.value = '';
        this.style.display = 'none';
        geocoder.clear();
    });

    // Create a loading indicator element
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.style.display = 'none'; // Initially hidden
    loadingIndicator.innerHTML = '<div class="spinner"></div>'; // You can style this spinner

    // Add the loading indicator to the geocoder container
    geocoderContainer.appendChild(loadingIndicator);

    // Handle Enter key presses to process the query manually
    inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent the default behavior
            const query = inputEl.value.trim();
            devLog('User pressed Enter:', query);
            handleQuery(query, map);
        }
    });

    // Clear markers when search is cleared
    geocoder.on('clear', function() {
        clearAllMarkers();
    });
}

// Function to handle the user's query
async function handleQuery(query, map) {
    try {
        // Show loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        loadingIndicator.style.display = 'block';

        // Clear existing markers before processing the new query
        clearAllMarkers();

        // Log the query being handled
        devLog('Handling query:', query);

        // Call Netlify function to get decision and possibly locations from GPT
        devLog('Sending query to Netlify function: /get-gpt4-locations');
        const response = await fetch('/.netlify/functions/get-gpt4-locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: query })
        });

        // Log the response status
        devLog('Response status from Netlify function:', response.status);

        if (!response.ok) {
            // Handle HTTP errors
            devError('Error fetching from Netlify function:', response.statusText);
            alert('An error occurred while processing your request.');
            return;
        }

        const data = await response.json();

        // Log the data received from the Netlify function
        devLog('Data received from Netlify function:', data);

        if (data.decision === 'mapbox') {
            devLog('Decision is mapbox. Using Mapbox Geocoding API.');

            // Use Mapbox Geocoding API to handle the query
            const geocodeResponse = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}`);
            const geocodeData = await geocodeResponse.json();

            // Log the geocode data
            devLog('Geocode data from Mapbox:', geocodeData);

            if (geocodeData.features && geocodeData.features.length > 0) {
                const feature = geocodeData.features[0];
                const { center, place_name } = feature;

                // Save location
                localStorage.setItem('lastMapLocation', JSON.stringify({
                    center: center,
                    zoom: map.getZoom()
                }));

                // Add custom marker
                addCustomMarker(map, center[0], center[1], place_name);

                // Center the map to the location
                map.flyTo({ center: center });

                // Track search query
                trackSearchQuery(place_name, center[1], center[0]);
            } else {
                devLog('No results found with Mapbox.');
                alert('No results found. Please try a different query.');
            }
        } else if (data.decision === 'gpt' && data.locations && data.locations.length > 0) {
            devLog('Decision is gpt. Locations returned from GPT:', data.locations);

            // Geocode locations in parallel
            const geocodePromises = data.locations.map(location => {
                devLog('Geocoding location from GPT:', location);
                return fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxgl.accessToken}`)
                    .then(response => response.json())
                    .then(geocodeData => {
                        devLog('Geocode data for', location, ':', geocodeData);
                        if (geocodeData.features && geocodeData.features.length > 0) {
                            return {
                                feature: geocodeData.features[0],
                                originalLocation: location
                            };
                        }
                        return null;
                    })
                    .catch(error => {
                        devError('Error geocoding location:', location, error);
                        return null;
                    });
            });

            const geocodeResults = await Promise.all(geocodePromises);

            // Process geocoded results
            const bounds = new mapboxgl.LngLatBounds();

            geocodeResults.forEach(result => {
                if (result) {
                    const { feature, originalLocation } = result;
                    const { center, place_name } = feature;

                    devLog('Adding marker for location:', place_name);

                    // Add custom marker for each location
                    addCustomMarker(map, center[0], center[1], place_name);

                    // Extend bounds
                    bounds.extend(center);

                    // Track each location
                    trackSearchQuery(place_name, center[1], center[0]);
                } else {
                    devError('No geocoding results for location:', result.originalLocation);
                }
            });

            // Fit map to show all markers
            if (!bounds.isEmpty()) {
                devLog('Fitting map to bounds:', bounds);
                map.fitBounds(bounds, { padding: 50 });
            } else {
                devLog('No valid locations to display.');
                alert('No results found. Please try a different query.');
            }
        } else {
            devLog('No locations returned from GPT or invalid decision.');
            alert('No results found. Please try a different query.');
        }
    } catch (error) {
        devError('Error handling query:', error);
        alert('An error occurred while processing your request.');
    } finally {
        // Hide loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        loadingIndicator.style.display = 'none';
    }
}