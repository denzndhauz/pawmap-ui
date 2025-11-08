// Configuration for environment variables
const config = {
    GOOGLE_MAPS_API_KEY: window.GOOGLE_MAPS_API_KEY || 'YOUR_VALID_API_KEY_HERE'
};

// Validate API key
if (!config.GOOGLE_MAPS_API_KEY || config.GOOGLE_MAPS_API_KEY === 'YOUR_VALID_API_KEY_HERE') {
    console.warn('Google Maps API key is not set or invalid. Please update your API key.');
}

window.AppConfig = config;
