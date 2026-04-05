// map.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Configuration from CONFIG
    const defaultCoords = window.CONFIG ? [window.CONFIG.DEFAULT_COORDS.lat, window.CONFIG.DEFAULT_COORDS.lng] : [17.6868, 83.2185];
    
    // Default Map Layer (OSM Light/Standard)
    const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    });

    // Satellite Layer (Esri World Imagery)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    });

    // 2. Create Map
    const map = L.map('map-container', {
        center: defaultCoords,
        zoom: 13,
        layers: [standardLayer]
    });

    // Expose for resize events and external control
    window.mapInstance = map;

    // Toggle Layer logic
    let isSatellite = false;
    const toggleBtn = document.getElementById('toggle-satellite');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            if (isSatellite) {
                map.removeLayer(satelliteLayer);
                map.addLayer(standardLayer);
                this.textContent = 'Toggle Satellite';
            } else {
                map.removeLayer(standardLayer);
                map.addLayer(satelliteLayer);
                this.textContent = 'Toggle Standard';
            }
            isSatellite = !isSatellite;
        });
    }

    // 3. Custom Icons setup
    const safeIcon = L.divIcon({
        className: 'custom-icon',
        html: '<div style="background-color:#10b981; width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>',
        iconSize: [20, 20]
    });

    const gasGreenIcon = L.divIcon({
        className: 'custom-icon',
        html: '<div style="background-color:#10b981; width:20px; height:20px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; color:white; font-size:10px;"><i class="fa-solid fa-fire"></i></div>',
        iconSize: [20, 20]
    });

    const gasYellowIcon = L.divIcon({
        className: 'custom-icon',
        html: '<div style="background-color:#f59e0b; width:20px; height:20px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; color:white; font-size:10px;"><i class="fa-solid fa-fire"></i></div>',
        iconSize: [20, 20]
    });

    // 4. Marker Rendering Function
    const markerLayerGroup = L.layerGroup().addTo(map);

    function renderMarkers(shelters, gasLocations, dangerZones) {
        markerLayerGroup.clearLayers();

        // Shelters
        shelters.forEach(shelter => {
            L.marker([shelter.lat, shelter.lng], { icon: safeIcon })
                .addTo(markerLayerGroup)
                .bindPopup(`<b>${shelter.name}</b><br>Status: Safe Zone`);
        });

        // Gas & Food Locations
        gasLocations.forEach(loc => {
            const icon = loc.type === 'gas-green' || loc.stock === 'available' ? gasGreenIcon : gasYellowIcon;
            L.marker([loc.lat, loc.lng], { icon: icon })
                .addTo(markerLayerGroup)
                .bindPopup(`<b>${loc.name}</b><br>Resource: ${loc.type?.includes('food') ? 'Food Kit' : 'LPG Gas'}<br>Stock: ${loc.stock || 'Unknown'}<br><button class='btn btn-small mt-2' onclick='alert("Navigating to ${loc.name}...")'>Navigate</button>`);
        });

        // Danger Zones
        dangerZones.forEach(zone => {
            L.circle([zone.lat, zone.lng], {
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.3,
                radius: zone.radius || 500
            }).addTo(markerLayerGroup).bindPopup('<b>Danger Zone</b><br>High risk area. Exercise caution.');
        });
    }

    // 5. Initial Render & Live Refresh
    async function refreshMapData() {
        const API_URL = window.CONFIG ? window.CONFIG.BACKEND_URL : 'http://localhost:4000/api';
        
        try {
            // Try to fetch live data from backend
            const [shelters, gas, food] = await Promise.all([
                fetch(API_URL + '/shelters').then(r => r.ok ? r.json() : null),
                fetch(API_URL + '/gas').then(r => r.ok ? r.json() : null),
                fetch(API_URL + '/food').then(r => r.ok ? r.json() : null)
            ]);

            const finalShelters = shelters || window.mockData.shelters;
            const finalGas      = (gas || window.mockData.gasLocations).concat(food || []);
            const dangerZones   = window.mockData.dangerZones; // Danger zones usually stay static for now

            renderMarkers(finalShelters, finalGas, dangerZones);
            console.log('🗺️ Map markers synced with backend.');

        } catch (err) {
            console.warn('Map sync failed, using mockData:', err);
            renderMarkers(window.mockData.shelters, window.mockData.gasLocations, window.mockData.dangerZones);
        }
    }

    // Initial load
    refreshMapData();

    // 6. Live Sync from Firebase (if available)
    if (window.db) {
        // Simple example: sync gas locations if they change in Firebase
        window.db.collection("gas_locations").onSnapshot(snapshot => {
            if (!snapshot.empty) {
                const liveGas = snapshot.docs.map(doc => doc.data());
                renderMarkers(window.mockData.shelters, liveGas, window.mockData.dangerZones);
            }
        });
    }

    // 7. Geolocation Integration
    const locateBtn = document.getElementById('map-locate-btn');
    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            map.locate({setView: true, maxZoom: 14});
        });
    }

    map.locate({setView: true, maxZoom: 14});
    map.on('locationfound', function(e) {
        L.marker(e.latlng, {
            icon: L.divIcon({
                className: 'user-location-marker',
                html: '<div style="background-color:#3b82f6; width:15px; height:15px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px #3b82f6;"></div>'
            })
        }).addTo(map).bindPopup("You are here").openPopup();
        console.log('User located at:', e.latlng);
    });

    map.on('locationerror', function(e) {
        console.warn('Location access denied or failed:', e.message);
        map.setView(defaultCoords, 13);
    });
});
