// ============================================================
//  Crisis AI — Frontend App Logic
//  Tries to load data from the backend API (http://localhost:4000)
//  If the backend is offline, falls back to mockData automatically
// ============================================================

// The URL of our backend server
const API = window.CONFIG ? window.CONFIG.BACKEND_URL : 'http://localhost:4000/api';

// ============================================================
//  API HELPER
//  Tries to fetch from backend. If it fails (offline/not running),
//  it returns null so we can fall back to mockData.
// ============================================================
async function apiFetch(endpoint) {
    try {
        const response = await fetch(API + endpoint);
        if (!response.ok) throw new Error('Bad response');
        return await response.json();
    } catch (err) {
        console.warn(`API offline, using mockData for: ${endpoint}`);
        return null;
    }
}

// ============================================================
//  UI HELPERS
// ============================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div class="toast-content">${message}</div>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'toast-out 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================================
//  API POST HELPER
//  Sends data to the backend (for submitting reports, SOS, etc.)
// ============================================================
async function apiPost(endpoint, body) {
    try {
        const response = await fetch(API + endpoint, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
        });
        return await response.json();
    } catch (err) {
        console.warn(`API POST failed for: ${endpoint}`);
        return null;
    }
}

// ============================================================
//  MAIN APP — runs once the page HTML is fully loaded
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {

    // --- 0.1 Initialize Firebase ---
    window.db = null;
    try {
        const fbConfig = window.CONFIG ? window.CONFIG.FIREBASE : null;
        if (fbConfig && fbConfig.apiKey && fbConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
            firebase.initializeApp(fbConfig);
            window.db = firebase.firestore();
            console.log('🔥 Firebase Initialized');
        } else {
            console.warn('Firebase config missing or using placeholders. Using mockData for persistence.');
        }
    } catch (e) {
        console.error('Firebase initialization failed:', e);
    }
    const db = window.db;

    // --- 0. Home Page Navigation ---
    function launchApp() {
        document.body.classList.remove('show-home');
        document.body.classList.add('show-app');
        document.getElementById('home-page').style.display  = 'none';
        document.getElementById('main-app').style.display   = 'flex';
    }
    function goHome() {
        document.body.classList.remove('show-app');
        document.body.classList.add('show-home');
        document.getElementById('home-page').style.display  = 'block';
        document.getElementById('main-app').style.display   = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    ['get-started-btn', 'home-launch-btn', 'about-launch-btn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', launchApp);
    });

    const navHomeBtn = document.getElementById('nav-home');
    if (navHomeBtn) navHomeBtn.addEventListener('click', goHome);

    // --- 1. SPA Routing ---
    const navLinks = document.querySelectorAll('.nav-links li[data-target]');
    const sections = document.querySelectorAll('.page-section');
    const pageTitle = document.getElementById('current-page-title');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-target');
            if (!targetId || !document.getElementById(targetId)) return;

            // Highlight nav link
            navLinks.forEach(nav => nav.classList.remove('active'));
            link.classList.add('active');

            // Update title
            pageTitle.textContent = link.querySelector('span').textContent;

            // Switch section
            sections.forEach(sec => {
                sec.classList.remove('active');
                sec.classList.add('hidden'); // Ensure it's hidden when not active
            });

            const targetSection = document.getElementById(targetId);
            targetSection.classList.remove('hidden');
            targetSection.classList.add('active');

            // Feature specific refreshes
            if (targetId === 'map-view' && window.mapInstance) {
                // Delay a bit more to ensure the section is fully visible before resizing
                setTimeout(() => {
                    window.mapInstance.invalidateSize();
                    // Also trigger a data refresh on the map
                    if (typeof window.refreshMapData === 'function') window.refreshMapData();
                }, 200);
            }

            if (targetId === 'nearby-page') loadNearby();
            if (targetId === 'gas-page') { loadGas(); loadFood(); loadAdditionalResources(); }
            if (targetId === 'reports-page') loadReports();
            if (targetId === 'sos-page') loadSOS();
            if (targetId === 'dashboard') { loadRisk(); loadSmartSuggestions(); loadDashboardAlerts(); }
            if (targetId === 'admin-page') { loadAdminStats(); loadAdminFeeds(); }
        });
    });

    // ============================================================
    //  DATA LOADING
    //  Try API first → fall back to window.mockData if offline
    // ============================================================

    // Check if backend is alive
    const healthCheck = await apiFetch('/health');
    const backendOnline = healthCheck !== null;

    // Update the status indicator in the header
    const statusEl = document.getElementById('connection-status');
    const offlineTips = document.getElementById('offline-tips');
    if (backendOnline) {
        statusEl.className   = 'status-indicator online';
        statusEl.textContent = 'API Connected';
        if (offlineTips) offlineTips.style.display = 'none';
    } else {
        statusEl.className   = 'status-indicator offline';
        statusEl.textContent = 'Offline Mode';
        if (offlineTips) offlineTips.style.display = 'flex';
    }

    // --- 1.1 Helper: Get User Location ---
    async function getLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                err => reject(err),
                { timeout: 10000 }
            );
        });
    }

    // --- 2. Load & Render Weather + Risk ---
    async function loadRisk() {
        const riskDisplay = document.getElementById('risk-display');
        const wTemp  = document.getElementById('w-temp');
        const wWind  = document.getElementById('w-wind');
        const wRain  = document.getElementById('w-rain');

        let risk = { level: 'LOW', message: 'Conditions are normal.', color: 'green' };
        let weather = { temp: 0, wind: 0, rain: 0 };
        let quake = window.mockData.earthquake;

        try {
            // A. Get Location
            let coords = window.CONFIG.DEFAULT_COORDS;
            try {
                coords = await getLocation();
                console.log(`📍 Location acquired: ${coords.lat}, ${coords.lng}`);
            } catch (locErr) {
                console.warn('Geolocation failed, using default coordinates.');
            }

            // B. Fetch Real-time Weather from Open-Meteo
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=auto`;
            const response = await fetch(weatherUrl);
            if (!response.ok) throw new Error('Weather API error');
            
            const data = await response.json();
            const current = data.current;

            weather = {
                temp: Math.round(current.temperature_2m),
                wind: Math.round(current.wind_speed_10m),
                rain: current.precipitation
            };

            // C. AI Risk Logic (Rain + Wind Speed)
            // Logic: If wind > 60km/h OR rain > 30mm/hr --> HIGH
            // If wind > 40 OR rain > 15 --> MEDIUM
            if (weather.wind > 60 || weather.rain > 30) {
                risk = { 
                    level: 'HIGH', 
                    message: '🚨 CRITICAL: High winds and heavy rain detected. Cyclone conditions possible. Evacuate immediately.', 
                    color: 'red' 
                };
            } else if (weather.wind > 40 || weather.rain > 15) {
                risk = { 
                    level: 'MEDIUM', 
                    message: '⚠️ WARNING: Strong winds and moderate rain. Prepare emergency supplies.', 
                    color: 'yellow' 
                };
            } else {
                risk = { 
                    level: 'LOW', 
                    message: '✅ Stable: Weather conditions are currently safe in your area.', 
                    color: 'green' 
                };
            }

        } catch (err) {
            console.error('Failed to fetch live weather, falling back to mock:', err);
            weather = window.mockData.weather;
            risk = { level: 'LOW', message: 'Using offline weather data.', color: 'green' };
        }

        // Update UI
        wTemp.textContent = weather.temp + '°C';
        wWind.textContent = weather.wind + ' km/h';
        wRain.textContent = weather.rain + ' mm';
        
        if (quake) {
            const qSpan = document.getElementById('w-quake');
            if(qSpan) qSpan.textContent = 'Mag ' + quake.magnitude;
        }

        const badgeClass = { HIGH: 'badge-high pulse', MEDIUM: 'badge-medium', LOW: 'badge-low' }[risk.level] || 'badge-low';

        riskDisplay.innerHTML = `
            <div class="risk-badge ${badgeClass}">${risk.level} RISK</div>
            <p>${risk.message}</p>
        `;
    }

    // --- 3. Load & Render Family Tracker ---
    async function loadFamily() {
        const familyList = document.getElementById('family-list');
        
        const render = (data) => {
            familyList.innerHTML = '';
            if (!data || data.length === 0) {
                familyList.innerHTML = '<p class="text-muted">No family members tracked yet.</p>';
                return;
            }
            data.forEach(member => {
                const statusClass = member.status === 'safe' ? 'f-safe' : 'f-missing';
                const icon        = member.status === 'safe' ? 'fa-check-circle' : 'fa-circle-xmark';
                familyList.innerHTML += `
                    <div class="family-item" data-id="${member.id || ''}">
                        <span>${member.name}</span>
                        <span class="${statusClass}">
                            <i class="fa-solid ${icon}"></i> ${member.status.toUpperCase()}
                        </span>
                    </div>
                `;
            });
        };

        if (db) {
            db.collection("family").onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => doc.data());
                render(data.length ? data : window.mockData.family);
            });
        } else if (backendOnline) {
            const data = await apiFetch('/family');
            render(data || window.mockData.family);
        } else {
            render(window.mockData.family);
        }
    }

    // --- 4. Load & Render Community Reports ---
    async function loadReports() {
        const feed = document.getElementById('report-feed');
        
        const render = (reports) => {
            feed.innerHTML = '';
            if (!reports || reports.length === 0) {
                feed.innerHTML = '<p class="text-muted">No community reports yet.</p>';
                return;
            }
            reports.forEach(rep => {
                let icon = 'fa-water';
                if (rep.type === 'gas')  icon = 'fa-fire-flame-simple';
                if (rep.type === 'road') icon = 'fa-road-barrier';

                feed.innerHTML += `
                    <div class="feed-item">
                        <div class="feed-header">
                            <span><i class="fa-solid ${icon}"></i> <strong>${rep.user}</strong></span>
                            <span>${rep.time || 'Just now'}</span>
                        </div>
                        <p>${rep.desc}</p>
                    </div>
                `;
            });
        };

        if (db) {
            db.collection("reports").orderBy("createdAt", "desc").onSnapshot(snapshot => {
                const reports = snapshot.docs.map(doc => doc.data());
                render(reports.length ? reports : window.mockData.communityReports);
            });
        } else if (backendOnline) {
            const data = await apiFetch('/reports');
            render(data || window.mockData.communityReports);
        } else {
            render(window.mockData.communityReports);
        }
    }

    // --- 5. Load & Render SOS / Rescue Requests ---
    async function loadSOS() {
        const rescueList = document.getElementById('rescue-list');
        rescueList.innerHTML = '';

        const requests = (backendOnline && await apiFetch('/sos')) || window.mockData.rescueRequests;

        requests.forEach(req => {
            rescueList.innerHTML += `
                <div class="rescue-item">
                    <div class="feed-header">
                        <span><strong>${req.id}</strong> — <span class="text-yellow">${req.status}</span></span>
                        <span>${req.time}</span>
                    </div>
                    <p><i class="fa-solid fa-location-dot"></i> ${req.location}</p>
                </div>
            `;
        });
    }

    // --- 6. Load & Render Gas Distributors ---
    async function loadGas() {
        const gasList = document.getElementById('gas-list');
        
        const render = (gasData) => {
            gasList.innerHTML = '';
            if (!gasData || gasData.length === 0) {
                gasList.innerHTML = '<p class="text-muted">No gas distributor data available.</p>';
                return;
            }
            gasData.forEach(gas => {
                let statusClass = 'available'; // Default green
                let statusText  = 'Available ✅';
                
                if (gas.stock === 'low') { 
                    statusClass = 'low'; 
                    statusText = 'Low Stock ⚠️'; 
                } else if (gas.stock === 'out') { 
                    statusClass = 'out'; 
                    statusText = 'Out of Stock ❌'; 
                }

                gasList.innerHTML += `
                    <div class="res-item" data-id="${gas.id || ''}">
                        <div>
                            <strong>${gas.name}</strong>
                            <p style="font-size:0.85rem;color:var(--text-muted)">
                                <i class="fa-solid fa-location-arrow"></i> ${gas.distance || 'Nearby'}
                            </p>
                            <p style="font-size:0.85rem">
                                <i class="fa-solid fa-phone"></i> ${gas.contact || 'N/A'}
                            </p>
                        </div>
                        <div class="res-status ${statusClass}">${statusText}</div>
                    </div>
                `;
            });
        };

        if (db) {
            db.collection("gas").onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => doc.data());
                render(data.length ? data : window.mockData.gasDistributors);
            });
        } else if (backendOnline) {
            const data = await apiFetch('/gas');
            render(data || window.mockData.gasDistributors);
        } else {
            render(window.mockData.gasDistributors);
        }
    }

    // --- 6b. Load & Render Food Distributors ---
    async function loadFood() {
        const foodList = document.getElementById('food-list');
        if (!foodList) return;

        const render = (foodData) => {
            foodList.innerHTML = '';
            if (!foodData || foodData.length === 0) {
                foodList.innerHTML = '<p class="text-muted">No food distributor data available.</p>';
                return;
            }
            foodData.forEach(food => {
                let statusClass = 'available';
                let statusText  = 'Available ✅';
                if (food.stock === 'low') { statusClass = 'low'; statusText = 'Low Stock ⚠️'; }
                else if (food.stock === 'out') { statusClass = 'out'; statusText = 'Out of Stock ❌'; }

                foodList.innerHTML += `
                    <div class="res-item" data-id="${food.id || ''}">
                        <div>
                            <strong>${food.name}</strong>
                            <p style="font-size:0.85rem;color:var(--text-muted)"><i class="fa-solid fa-location-arrow"></i> ${food.distance || 'Nearby'}</p>
                            <p style="font-size:0.85rem"><i class="fa-solid fa-phone"></i> ${food.contact || 'N/A'}</p>
                        </div>
                        <div class="res-status ${statusClass}">${statusText}</div>
                    </div>`;
            });
        };

        if (backendOnline) {
            const data = await apiFetch('/food');
            render(data || window.mockData.foodCenters);
        } else {
            render(window.mockData.foodCenters);
        }
    }

    // --- 6c. Load & Render Additional Resources (Water, Medical, Shelters) ---
    async function loadAdditionalResources() {
        const renderList = (id, data, emptyMsg) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = '';
            if (!data || data.length === 0) { el.innerHTML = `<p>${emptyMsg}</p>`; return; }
            data.forEach(item => {
                let statusClass = 'available';
                let statusText = 'Available ✅';
                let rawStatus = item.status || item.type || 'available';
                if (rawStatus.includes('low') || rawStatus.includes('limited')) { statusClass = 'low'; statusText = 'Low Stock ⚠️'; }
                if (rawStatus === 'unavailable' || rawStatus === 'critical') { statusClass = 'out'; statusText = 'Unavailable ❌'; }
                if (rawStatus === 'safe') { statusClass = 'available'; statusText = 'Safe Zone ✅'; }

                el.innerHTML += `
                    <div class="res-item">
                        <div>
                            <strong>${item.name}</strong>
                            <p style="font-size:0.85rem;color:var(--text-muted)"><i class="fa-solid fa-location-arrow"></i> ${item.distance || 'Calculated live in Nearby Finder'}</p>
                        </div>
                        <div class="res-status ${statusClass}">${statusText}</div>
                    </div>`;
            });
        };

        renderList('water-list', window.mockData.waterPoints, 'No water points found.');
        renderList('medical-list', window.mockData.medicalCenters, 'No medical centers found.');
        renderList('shelter-list', window.mockData.shelters, 'No safe shelters found.');
    }
    
    // Admin SMS Form listener
    const smsForm = document.getElementById('admin-sms-form');
    if (smsForm) {
        smsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const to = document.getElementById('sms-to').value.trim();
            const message = document.getElementById('sms-msg').value.trim();
            if (!to || !message) return showToast('Please fill all fields', 'error');

            showToast('Sending SMS Alert...', 'info');
            const res = await apiPost('/sms-direct', { to, message });
            if (res && res.status) {
                showToast(`SMS sent to ${to}! (Simulation)`, 'success');
                smsForm.reset();
            } else {
                showToast('Failed to send SMS API alert', 'error');
            }
        });
    }


    // --- Haversine Distance Helper ---
    function calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return parseFloat((R * c).toFixed(1));
    }

    async function loadNearby() {
        const userLat = window.CONFIG ? window.CONFIG.DEFAULT_COORDS.lat : 17.6868;
        const userLng = window.CONFIG ? window.CONFIG.DEFAULT_COORDS.lng : 83.2185;
        // In a real app we would use navigator.geolocation.getCurrentPosition here

        const populateNearby = (id, dataArr) => {
            const el = document.getElementById(id);
            if (!el || !dataArr || dataArr.length === 0) return;
            
            // Map true distances
            const mapped = dataArr.map(item => {
                const calculatedDist = calculateDistance(userLat, userLng, item.lat, item.lng);
                return {
                    ...item,
                    calculatedDist: calculatedDist !== null ? calculatedDist : parseFloat(item.distance || "999")
                };
            });

            // Sort purely by the calculated haversine distance
            mapped.sort((a, b) => a.calculatedDist - b.calculatedDist);
            const nearest = mapped[0]; 

            let color = 'var(--success)';
            let statusBadge = (nearest.status || nearest.stock || nearest.type || "unknown").toUpperCase();
            if(statusBadge.toLowerCase().includes('low') || statusBadge.toLowerCase().includes('limited')) color = 'var(--warning)';
            if(statusBadge.toLowerCase() === 'unavailable' || statusBadge.toLowerCase() === 'critical' || statusBadge.toLowerCase() === 'out') color = 'var(--danger)';
            
            const navLink = `https://www.google.com/maps/dir/?api=1&destination=${nearest.lat},${nearest.lng}`;

            el.innerHTML = `
                <div style="font-weight: 600; font-size: 1.1rem;">${nearest.name}</div>
                <div style="color: var(--text-muted);"><i class="fa-solid fa-route"></i> ${nearest.calculatedDist} km away (Actual)</div>
                <div style="color: ${color}; font-weight: 600; margin-top: 0.5rem;">${statusBadge}</div>
                <button class="btn btn-secondary btn-small mt-2" onclick="window.open('${navLink}', '_blank')"><i class="fa-solid fa-diamond-turn-right"></i> Navigate (Google Maps)</button>
            `;
        };
        populateNearby('nearest-shelter', window.mockData.shelters);
        populateNearby('nearest-food', window.mockData.foodCenters);
        populateNearby('nearest-water', window.mockData.waterPoints);
        populateNearby('nearest-gas', window.mockData.gasDistributors);
        populateNearby('nearest-medical', window.mockData.medicalCenters);
    }

    // --- 9. Load Evacuation Guidance ---
    async function loadEvacuation() {
        const evacList = document.getElementById('evacuation-list');
        if(!evacList) return;
        evacList.innerHTML = '';
        const routes = window.mockData.evacuationRoutes || [];
        routes.forEach(r => {
            evacList.innerHTML += `
                <div class="res-item">
                    <div>
                        <strong>From: ${r.from} &rarr; To: ${r.to}</strong>
                        <p style="font-size:0.85rem;color:var(--text-muted)">
                            <i class="fa-solid fa-person-walking"></i> ${r.mode} — ${r.distance}
                        </p>
                    </div>
                    <div class="res-status available">${r.status}</div>
                </div>
            `;
        });
    }

    // --- 10. Smart Suggestions Engine ---
    async function loadSmartSuggestions() {
        const banner = document.getElementById('smart-suggestion-banner');
        const textEl = document.getElementById('smart-suggestion-text');
        if (!banner || !textEl) return;

        try {
            // Fetch resources or use mock
            const gas = (backendOnline && await apiFetch('/gas')) || window.mockData.gasDistributors;
            const food = (backendOnline && await apiFetch('/food')) || window.mockData.foodCenters;

            // Combine and filter for available items
            let allResources = [];
            if(gas) allResources = allResources.concat(gas.map(g => ({ ...g, displayType: 'LPG Gas', isAvailable: g.stock === 'available' })));
            if(food) allResources = allResources.concat(food.map(f => ({ ...f, displayType: 'Food', isAvailable: f.status === 'available' })));

            const available = allResources.filter(r => r.isAvailable);

            if (available.length > 0) {
                // Find nearest (assuming distance string "X km" -> float)
                available.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
                const nearest = available[0];
                
                textEl.innerHTML = `<strong>${nearest.displayType}</strong> is available at <strong>${nearest.name}</strong>, just ${nearest.distance} away.`;
                banner.style.display = 'flex';
            } else {
                banner.style.display = 'none';
            }
        } catch (e) {
            console.warn('Smart suggestions failed to load.');
            banner.style.display = 'none';
        }
    }

    // --- 11. Load Admin Stats ---
    async function loadAdminStats() {
        try {
            const [reports, sos] = await Promise.all([
                backendOnline ? apiFetch('/reports') : null,
                backendOnline ? apiFetch('/sos') : null
            ]);
            const sosCount    = document.querySelector('#admin-page .stat-card:nth-child(1) .stat-number');
            const reportCount = document.querySelector('#admin-page .stat-card:nth-child(3) .stat-number');
            if (sosCount && sos) sosCount.textContent = sos.length;
            if (reportCount && reports) reportCount.textContent = reports.length;
        } catch (e) {
            console.warn('Admin stats sync failed');
        }
    }

    // --- 11b. Load Dashboard Active Alerts ---
    window.loadDashboardAlerts = async function() {
        const list = document.getElementById('dashboard-alerts-list');
        const badge = document.getElementById('alert-count-badge');
        if (!list) return;

        const sosList = (backendOnline && await apiFetch('/sos')) || window.mockData.rescueRequests || [];
        const repsList = (backendOnline && await apiFetch('/reports')) || window.mockData.communityReports || [];

        const allAlerts = [
            ...sosList.map(s => ({ priority: 'HIGH', icon: 'fa-triangle-exclamation', color: 'var(--danger)', title: `SOS: ${s.location || 'Unknown'}`, time: s.time || 'Just now', type: 'SOS' })),
            ...repsList.slice(0, 5).map(r => ({ priority: 'MEDIUM', icon: 'fa-file-lines', color: 'var(--warning)', title: `Report (${r.type || 'general'}): ${r.desc?.slice(0, 60) || ''}...`, time: r.time || 'Just now', type: 'Report' }))
        ];

        if (badge) badge.textContent = allAlerts.length;
        if (allAlerts.length === 0) {
            list.innerHTML = '<p class="text-muted" style="padding:1rem;">No active alerts.</p>';
            return;
        }

        list.innerHTML = allAlerts.map(a => `
            <div class="res-item" style="border-left: 3px solid ${a.color}; padding-left:0.75rem;">
                <div>
                    <strong><i class="fa-solid ${a.icon}" style="color:${a.color}"></i> [${a.priority}] ${a.type}</strong>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.2rem;">${a.title}</p>
                </div>
                <div style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap;">${a.time}</div>
            </div>`).join('');
    };

    // --- 11c. Load Admin Live Feeds ---
    async function loadAdminFeeds() {
        const sosList = (backendOnline && await apiFetch('/sos')) || window.mockData.rescueRequests || [];
        const repsList = (backendOnline && await apiFetch('/reports')) || window.mockData.communityReports || [];

        const adminSosList = document.getElementById('admin-sos-list');
        const adminRepsList = document.getElementById('admin-reports-list');
        const adminSosCount = document.getElementById('admin-sos-count');
        const adminRepsCount = document.getElementById('admin-reports-count');

        if (adminSosCount) adminSosCount.textContent = sosList.length;
        if (adminRepsCount) adminRepsCount.textContent = repsList.length;

        if (adminSosList) {
            adminSosList.innerHTML = sosList.length === 0 ? '<p class="text-muted">No SOS requests yet.</p>' :
                sosList.map(s => `
                    <div class="res-item" style="border-left:3px solid var(--danger);padding-left:0.75rem;">
                        <div>
                            <strong>${s.id || 'SOS'}</strong>
                            <p style="font-size:0.85rem;color:var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${s.location || 'Unknown'}</p>
                        </div>
                        <div class="res-status out">${s.status || 'Needs Help'}</div>
                    </div>`).join('');
        }

        if (adminRepsList) {
            adminRepsList.innerHTML = repsList.length === 0 ? '<p class="text-muted">No reports yet.</p>' :
                repsList.slice(0, 10).map(r => `
                    <div class="res-item" style="border-left:3px solid var(--warning);padding-left:0.75rem;">
                        <div>
                            <strong>${r.user || 'Community Member'} — ${r.type || 'general'}</strong>
                            <p style="font-size:0.85rem;color:var(--text-muted);">${r.desc || ''}</p>
                        </div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">${r.time || 'Just now'}</div>
                    </div>`).join('');
        }
    }

    // ============================================================
    //  EVENT LISTENERS
    // ============================================================

    // Add Family Member
    const addFamilyBtn = document.getElementById('add-family-btn');
    if(addFamilyBtn) {
        addFamilyBtn.addEventListener('click', () => {
            const name = prompt('Enter family member name:');
            if(name) {
                const status = confirm(`Is ${name} currently SAFE? (OK for Yes, Cancel for Missing)`) ? 'safe' : 'missing';
                window.mockData.family.push({ name, status });
                loadFamily();
            }
        });
    }

    // Toggle Family Member Status (event delegation)
    const familyListElt = document.getElementById('family-list');
    if(familyListElt) {
        familyListElt.addEventListener('click', (e) => {
            const item = e.target.closest('.family-item');
            if(item) {
                const name = item.querySelector('span').textContent;
                const member = window.mockData.family.find(m => m.name === name);
                if(member) {
                    member.status = member.status === 'safe' ? 'missing' : 'safe';
                    loadFamily();
                }
            }
        });
    }

    // SOS Button — posts to Firebase/API and opens WhatsApp location sharing
    document.getElementById('main-sos-btn').addEventListener('click', async () => {
        const locationPrompt = prompt('📍 Enter your location (street / area name):') || 'Unknown Location';
        
        // Simulate live location grab for the map link
        const userLat = window.CONFIG ? window.CONFIG.DEFAULT_COORDS.lat : 17.6868;
        const userLng = window.CONFIG ? window.CONFIG.DEFAULT_COORDS.lng : 83.2185;
        const mapLink = `https://www.google.com/maps/search/?api=1&query=${userLat},${userLng}`;
        
        const isWhatsappChecked = document.querySelector('input[type="checkbox"]:nth-child(2)')?.checked ?? true;
        
        if (isWhatsappChecked) {
            const waText = encodeURIComponent(
                `🚨 *CRISIS AI EMERGENCY SOS* 🚨\n\n` +
                `I need urgent help! My location info:\n${locationPrompt}\n\n` +
                `📍 *My GPS Coordinates:* ${mapLink}\n\n` +
                `_Sent automatically via the Crisis AI Platform._`
            );
            
            // This will open the native WhatsApp sharing screen on Mobile/Desktop
            // allowing the user to select multiple contacts or a family group to blast the SOS to.
            window.open(`whatsapp://send?text=${waText}`, '_blank');
        }

        const location = locationPrompt;

        if (db) {
            try {
                await db.collection("sos").add({
                    location,
                    status: 'Needs Help',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    time: 'Just now'
                });
                alert('🚨 SOS SENT to Firebase!\nRescue teams have been notified via live database.');
                
                // Also trigger Twilio alert via backend proxy
                fetch(`${API}/sos-alert`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ location, status: 'Needs Help' })
                }).catch(e => console.warn('Twilio alert proxy failed:', e));
                
                return;
            } catch (e) {
                console.error('Firebase SOS failed:', e);
            }
        }

        if (backendOnline) {
            const result = await apiPost('/sos', { location, status: 'Needs Help' });
            if (result) {
                showToast(`🚨 SOS SENT! Request ID: ${result.id}`, 'success');
                await loadSOS();   // Refresh the rescue list
                await loadDashboardAlerts(); // Also update dashboard
                return;
            }
        }
        // Fallback message if offline
        showToast('🚨 SOS TRIGGERED! Notifications sent to relatives.', 'warning');
    });

    // Report Form — posts to Firebase/API
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('report-type').value;
        const desc = document.getElementById('report-desc').value.trim();
        if (!desc) return;

        if (db) {
            try {
                await db.collection("reports").add({
                    user: 'Community Member',
                    type,
                    desc,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    time: 'Just now'
                });
                alert('✅ Report submitted to Firebase!');
                document.getElementById('report-desc').value = '';
                return;
            } catch (e) {
                console.error('Firebase report failed:', e);
            }
        }

        if (backendOnline) {
            const result = await apiPost('/reports', { user: 'Community Member', type, desc });
            if (result) {
                showToast('✅ Report submitted successfully!', 'success');
                document.getElementById('report-desc').value = '';
                await loadReports();   // Refresh the feed
                loadDashboardAlerts(); // Update dashboard alerts
                return;
            }
        }
        showToast('Report submitted (offline mode).', 'warning');
        document.getElementById('report-desc').value = '';
    });

    // Telugu Voice Alert
    const voiceBtn = document.getElementById('voice-alert-btn');
    voiceBtn.addEventListener('click', () => {
        if ('speechSynthesis' in window) {
            const weather = window.mockData.weather;
            const quake = window.mockData.earthquake;
            let message = 'Thu-faanu he-cha-rika! Da-ya-che-si su-rak-shi-tha pranthaa-la-ku vel-lan-di.';
            if (quake && quake.magnitude >= 5.5) {
                message = 'Bhu-kam-pam he-cha-rika! Da-ya-che-si ba-ya-ta-ki vel-lan-di. Gas off che-yan-di.';
            } else if (weather.wind > 80 && weather.rain > 100) {
                message = 'Thu-faanu he-cha-rika! Da-ya-che-si su-rak-shi-tha pranthaa-la-ku vel-lan-di. Gas ko-ra-tha undi. Mun-du-ga pre-pare av-van-di.';
            }
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang  = 'te-IN';
            window.speechSynthesis.speak(utterance);
            voiceBtn.innerHTML = '<i class="fa-solid fa-volume-high pulse"></i> Playing...';
            setTimeout(() => {
                voiceBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Telugu Alert';
            }, 4000);
        } else {
            alert('Voice synthesis is not supported in this browser.');
        }
    });

    // Online / Offline events
    window.addEventListener('offline', () => {
        statusEl.className   = 'status-indicator offline';
        statusEl.textContent = 'Offline - Cache Active';
    });
    window.addEventListener('online', () => {
        statusEl.className   = 'status-indicator online';
        statusEl.textContent = 'Online';
    });

    // ============================================================
    //  INITIALISE — load all data when app starts
    // ============================================================
    await Promise.all([
        loadRisk(),
        loadSmartSuggestions(),
        loadDashboardAlerts(),
        loadFamily(),
        loadSOS(),
        loadGas(),
        loadFood(),
        loadAdditionalResources(),
        loadNearby(),
        loadEvacuation(),
        loadAdminStats(),
        loadSmartSuggestions()
    ]);

});

// ============================================================
//  PREPAREDNESS QUIZ (called from HTML onclick)
// ============================================================
window.startPrepQuiz = function () {
    let score = 0;
    const maxScore = 120;
    
    if (confirm('1. Do you have an emergency kit ready (Water, First-aid, Torch)?')) score += 20;
    if (confirm('2. Do you have an alternative/backup cooking gas supply?')) score += 20;
    if (confirm('3. Have you packed non-perishable food for 3 days?')) score += 20;
    if (confirm('4. Do you know your nearest safe shelter location?')) score += 20;
    if (confirm('5. Are your important documents stored in a waterproof bag?')) score += 20;
    if (confirm('6. Do you have a power bank charged for your mobile?')) score += 20;
    
    const percentage = Math.round((score / maxScore) * 100);
    const scoreEl = document.getElementById('prep-score');
    if(scoreEl) {
        scoreEl.textContent = percentage + '%';
        scoreEl.parentElement.style.borderColor = percentage < 50 ? 'var(--danger)' : (percentage < 80 ? 'var(--warning)' : 'var(--success)');
    }
    showToast(`Preparedness score: ${percentage}%! ${percentage < 50 ? 'Please improve your supplies.' : 'Great job!'}`, percentage < 50 ? 'error' : 'success');
};
