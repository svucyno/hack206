// mockData.js

const mockData = {
    weather: {
        temp: 28, // Celsius
        wind: 85, // km/h
        rain: 120 // mm
        // AI Logic threshold: Wind > 70 or Rain > 100 == HIGH RISK
    },

    family: [
        { name: "Lakshmi (Mother)", status: "safe" },
        { name: "Raju (Brother)", status: "missing" },
        { name: "Suresh (Father)", status: "safe" }
    ],

    gasDistributors: [
        { name: "Bharat Gas - Vizag Center", distance: "2.1 km", stock: "available", contact: "9876543210", lat: 17.7128, lng: 83.2285 },
        { name: "HP Gas - Beach Road", distance: "3.5 km", stock: "low", contact: "9876543211", lat: 17.7250, lng: 83.3000 },
        { name: "Indane Gas - Port Area", distance: "5.0 km", stock: "out", contact: "9876543212", lat: 17.6500, lng: 83.2000 }
    ],

    rescueRequests: [
        { id: "REQ-001", location: "Sector 4, Low-lying Area", status: "Needs Evacuation", time: "10 mins ago" },
        { id: "REQ-002", location: "Main Road (Tree Fallen)", status: "Medical Help", time: "25 mins ago" }
    ],

    communityReports: [
        { user: "Kiran R.", type: "flood", desc: "Water entered ground floors near Bus Stand.", time: "1 hr ago" },
        { user: "Anita V.", type: "gas", desc: "HP Gas agency says out of stock untill tomorrow.", time: "2 hrs ago" }
    ],

    shelters: [
        { lat: 17.6868, lng: 83.2185, name: "Govt School Relief Camp", type: "safe" },
        { lat: 17.7011, lng: 83.2750, name: "Community Hall", type: "safe" }
    ],

    gasLocations: [
        { lat: 17.7128, lng: 83.2285, name: "Bharat Gas (Available)", type: "gas-green" },
        { lat: 17.7250, lng: 83.3000, name: "HP Gas (Low Stock)", type: "gas-yellow" }
    ],

    dangerZones: [
        { lat: 17.6900, lng: 83.2500, radius: 2000 } // Circle radius in meters
    ],

    earthquake: {
        magnitude: 5.8,
        location: "Bay of Bengal",
        depth: "35 km"
    },

    foodCenters: [
        { name: "Govt Food Distribution Center", distance: "1.2 km", status: "available", lat: 17.6950, lng: 83.2200 },
        { name: "Community Kitchen", distance: "2.5 km", status: "limited", lat: 17.7100, lng: 83.2500 },
        { name: "SuperMarket Ration point", distance: "3.1 km", status: "unavailable", lat: 17.7200, lng: 83.2700 },
        { name: "NGO Meal Camp", distance: "4.0 km", status: "available", lat: 17.6700, lng: 83.2900 }
    ],

    waterPoints: [
        { name: "Municipal Water Tank", distance: "0.8 km", status: "available", lat: 17.6800, lng: 83.2100 },
        { name: "School RO Plant", distance: "1.5 km", status: "low", lat: 17.6900, lng: 83.2300 },
        { name: "Main Reservoir", distance: "4.2 km", status: "critical", lat: 17.7400, lng: 83.3100 }
    ],

    medicalCenters: [
        { name: "KGH Hospital", distance: "5.5 km", status: "available", lat: 17.7100, lng: 83.3000 },
        { name: "Local Clinic", distance: "1.0 km", status: "limited", lat: 17.6850, lng: 83.2150 },
        { name: "Pharmacy Plus", distance: "0.5 km", status: "available", lat: 17.6880, lng: 83.2190 }
    ],

    evacuationRoutes: [
        { from: "Sector 4", to: "Govt School Relief Camp", mode: "Walk", distance: "2.0 km", status: "Safe Route" },
        { from: "Main Road", to: "Community Hall", mode: "Vehicle", distance: "3.5 km", status: "Clear" }
    ]
};

// Simple global to expose it
window.mockData = mockData;
