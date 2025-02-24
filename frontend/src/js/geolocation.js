import { devLog, devError } from './utils.js';
import { trackUserLocation, trackGeolocationDenied } from './analytics.js';

// Function to set up geolocation controls
export function setupGeolocation(map) {
    // Add user location functionality to the bottom right, above zoom controls
    const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
    });

    // Add the geolocate control to the map
    map.addControl(geolocate, 'bottom-right');

    // Handle successful geolocation
    geolocate.on('geolocate', function(e) {
        const lon = e.coords.longitude;
        const lat = e.coords.latitude;
        const zoom = map.getZoom();
        
        // Save user's geolocation
        localStorage.setItem('lastMapLocation', JSON.stringify({
            center: [lon, lat],
            zoom: zoom
        }));
        
        devLog("User location:", lat, lon);

        // Reverse geocode to get address
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${mapboxgl.accessToken}`)
            .then(response => response.json())
            .then(data => {
                if (data.features && data.features.length > 0) {
                    const address = data.features[0].place_name;
                    devLog("User's address:", address);
                    
                    // Call Mixpanel tracking function
                    trackUserLocation(address, lat, lon);
                } else {
                    devError("No address found");
                }
            })
            .catch(error => devError("Error in reverse geocoding:", error));
    });

    // Handle geolocation errors
    geolocate.on('error', function(e) {
        if (e.code === 1) { // PERMISSION_DENIED
            devLog("User denied geolocation permission via the map control");
            trackGeolocationDenied();
            showEnableLocationMessage(geolocate);
        }
    });
}

// Function to show message for enabling location
function showEnableLocationMessage(geolocate) {
    var messageBox = document.createElement('div');
    messageBox.id = 'location-message';
    messageBox.style.position = 'absolute';
    messageBox.style.top = '10px';
    messageBox.style.left = '50%';
    messageBox.style.transform = 'translateX(-50%)';
    messageBox.style.backgroundColor = 'rgba(0,0,0,0.7)';
    messageBox.style.color = 'white';
    messageBox.style.padding = '10px';
    messageBox.style.borderRadius = '5px';
    messageBox.style.zIndex = '1000';
    messageBox.innerHTML = 'Location access is disabled. Click here to enable.';
    messageBox.style.cursor = 'pointer';
    
    messageBox.onclick = function() {
        geolocate.trigger();
        this.remove();
    };

    document.body.appendChild(messageBox);
}
