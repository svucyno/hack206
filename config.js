// config.js - Application Configuration for Crisis AI
// IMPORTANT: Update these constants with your real API keys and project settings.

const CONFIG = {
    // 1. Firebase Configuration (Get this from Firebase Console)
    FIREBASE: {
        apiKey: "YOUR_FIREBASE_API_KEY",
        authDomain: "your-project-id.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project-id.appspot.com",
        messagingSenderId: "your-sender-id",
        appId: "your-app-id"
    },

    // 2. Weather Configuration
    WEATHER_API_URL: "https://api.open-meteo.com/v1/forecast",

    // 3. Backend Proxies (Running on localhost:4000)
    BACKEND_URL: "http://localhost:4000/api",

    // 4. Emergency Contacts (Real-world simulation)
    EMERGENCY_CONTACTS: ["+910000000000"], // Add real numbers here

    // 5. Default Map Center (Visakhapatnam, Andhra Pradesh)
    DEFAULT_COORDS: {
        lat: 17.6868,
        lng: 83.2185
    }
};

// Export config for both browser and potential Node.js use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
