// ============================================================
//  Crisis AI — Backend Server
//  Built with Node.js + Express (beginner friendly!)
//  Run with:  node server.js
//  API runs on: http://localhost:4000
// ============================================================

// 1. Import the libraries we need
const express = require('express');   // Web framework
const cors    = require('cors');      // Allows the frontend to talk to this server
const fs      = require('fs');        // Built-in Node.js file reader/writer
const path    = require('path');      // Built-in Node.js path helper
const axios   = require('axios');     // For making external API calls

// 2. Create the Express app
const app  = express();
const PORT = 4000;

// 3. Middleware — these run before every request
app.use(cors());                        // Allow all origins (frontend on port 3000)
app.use(express.json());                // Allow reading JSON from request body

// ============================================================
//  HELPER FUNCTIONS
//  These two functions make it easy to read/write our JSON files
// ============================================================

// Read a JSON data file and return its contents as a JS object
function readData(filename) {
    const filePath = path.join(__dirname, 'data', filename);
    const raw      = fs.readFileSync(filePath, 'utf8');  // Read the file
    return JSON.parse(raw);                               // Convert text → JS object
}

// Write a JS object back into a JSON data file
function writeData(filename, data) {
    const filePath = path.join(__dirname, 'data', filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ============================================================
//  ROUTE 0 — Root page (so localhost:4000 shows something useful)
// ============================================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Crisis AI — API Server</title>
            <style>
                body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
                h1   { color: #3b82f6; }
                a    { color: #60a5fa; }
                li   { margin: 0.4rem 0; font-family: monospace; font-size: 1rem; }
                .badge { background: #1e293b; padding: 0.2rem 0.6rem; border-radius: 4px; margin-right: 0.5rem; font-size: 0.85rem; }
                .get  { color: #10b981; } .post { color: #f59e0b; } .patch { color: #a855f7; }
            </style>
        </head>
        <body>
            <h1>🛡️ Crisis AI — Backend API</h1>
            <p>Server is running on port ${PORT}. 
               Visit <a href="http://localhost:3000">localhost:3000</a> for the frontend app.</p>
            <hr style="border-color:#334155">
            <h2>Available Endpoints</h2>
            <ul>
                <li><span class="badge get">GET</span>   <a href="/api/health">/api/health</a></li>
                <li><span class="badge get">GET</span>   <a href="/api/weather">/api/weather</a></li>
                <li><span class="badge get">GET</span>   <a href="/api/risk">/api/risk</a></li>
                <li><span class="badge get">GET</span>   <a href="/api/family">/api/family</a></li>
                <li><span class="badge patch">PATCH</span> /api/family/:id</li>
                <li><span class="badge get">GET</span>   <a href="/api/gas">/api/gas</a></li>
                <li><span class="badge patch">PATCH</span> /api/gas/:id</li>
                <li><span class="badge get">GET</span>   <a href="/api/shelters">/api/shelters</a></li>
                <li><span class="badge get">GET</span>   <a href="/api/reports">/api/reports</a></li>
                <li><span class="badge post">POST</span>  /api/reports</li>
                <li><span class="badge get">GET</span>   <a href="/api/sos">/api/sos</a></li>
                <li><span class="badge post">POST</span>  /api/sos</li>
            </ul>
        </body>
        </html>
    `);
});

// ============================================================
//  ROUTE 1 — Health Check
//  GET http://localhost:4000/api/health
//  Just confirms the server is running
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Crisis AI server is running 🛡️',
        version: '1.1.0',
        capabilities: ['weather', 'risk', 'family', 'gas', 'food', 'shelters', 'reports', 'sos', 'chat-proxy', 'sms-proxy', 'sms-direct']
    });
});

// ============================================================
//  ROUTE 2 — Weather
//  GET http://localhost:4000/api/weather
//  Returns the current weather data
// ============================================================
app.get('/api/weather', (req, res) => {
    const weather = readData('weather.json');
    res.json(weather);
});

// ============================================================
//  ROUTE 3 — AI Risk Assessment (computed on the server!)
//  GET http://localhost:4000/api/risk
//  Reads weather and calculates the risk level automatically
// ============================================================
app.get('/api/risk', (req, res) => {
    const weather = readData('weather.json');

    let level   = 'LOW';
    let message = 'Conditions are normal. Stay informed.';
    let color   = 'green';

    // AI Logic: check wind and rain thresholds
    if (weather.wind > 80 || weather.rain > 100) {
        level   = 'HIGH';
        message = 'Cyclone Warning! Move to higher ground immediately.';
        color   = 'red';
    } else if (weather.wind > 50 || weather.rain > 50) {
        level   = 'MEDIUM';
        message = 'Heavy weather expected. Keep emergency kit ready.';
        color   = 'yellow';
    }

    res.json({ level, message, color, weather });
});

// ============================================================
//  ROUTE 4 — Family Tracker
//  GET  http://localhost:4000/api/family           → get all members
//  PATCH http://localhost:4000/api/family/:id      → update a member's status
// ============================================================

// Get all family members
app.get('/api/family', (req, res) => {
    const family = readData('family.json');
    res.json(family);
});

// Update one family member's status (e.g. { "status": "safe" })
app.patch('/api/family/:id', (req, res) => {
    const id     = parseInt(req.params.id);   // Get the ID from the URL
    const family = readData('family.json');

    // Find the family member with this ID
    const member = family.find(m => m.id === id);

    if (!member) {
        // If not found, send a 404 error
        return res.status(404).json({ error: 'Family member not found' });
    }

    // Update only the fields sent in the request body
    if (req.body.status) member.status = req.body.status;

    writeData('family.json', family);      // Save changes to file
    res.json(member);                      // Send updated member back
});

// ============================================================
//  ROUTE 5 — Gas Distributors
//  GET   http://localhost:4000/api/gas         → list all distributors
//  PATCH http://localhost:4000/api/gas/:id     → update stock status
// ============================================================

// Get all gas distributors
app.get('/api/gas', (req, res) => {
    const gas = readData('gas.json');
    res.json(gas);
});

// Update a distributor's stock level (admin use)
app.patch('/api/gas/:id', (req, res) => {
    const id  = parseInt(req.params.id);
    const gas = readData('gas.json');

    const distributor = gas.find(g => g.id === id);
    if (!distributor) {
        return res.status(404).json({ error: 'Distributor not found' });
    }

    if (req.body.stock) distributor.stock = req.body.stock;

    writeData('gas.json', gas);
    res.json(distributor);
});

// ============================================================
//  ROUTE 5b — Food Distribution Centers
//  GET   http://localhost:4000/api/food
//  PATCH http://localhost:4000/api/food/:id
// ============================================================
app.get('/api/food', (req, res) => {
    const food = readData('food.json');
    res.json(food);
});

app.patch('/api/food/:id', (req, res) => {
    const id   = parseInt(req.params.id);
    const food = readData('food.json');
    const center = food.find(f => f.id === id);
    if (!center) return res.status(404).json({ error: 'Food center not found' });
    if (req.body.stock) center.stock = req.body.stock;
    writeData('food.json', food);
    res.json(center);
});

// ============================================================
//  ROUTE 6 — Shelters & Danger Zones
//  GET http://localhost:4000/api/shelters
// ============================================================
app.get('/api/shelters', (req, res) => {
    const shelters = readData('shelters.json');
    res.json(shelters);
});

// ============================================================
//  ROUTE 7 — Community Reports
//  GET  http://localhost:4000/api/reports      → get all reports
//  POST http://localhost:4000/api/reports      → submit a new report
// ============================================================

// Get all reports
app.get('/api/reports', (req, res) => {
    const reports = readData('reports.json');
    // Return newest first
    res.json(reports.reverse());
});

// Submit a new report
// Body should look like: { "user": "Name", "type": "flood", "desc": "Description" }
app.post('/api/reports', (req, res) => {
    const { user, type, desc } = req.body;

    // Validate — make sure required fields are present
    if (!user || !type || !desc) {
        return res.status(400).json({ error: 'user, type, and desc are required' });
    }

    const reports = readData('reports.json');

    // Create the new report object
    const newReport = {
        id:        reports.length + 1,         // Simple ID: count + 1
        user,
        type,
        desc,
        time:      'Just now',
        createdAt: new Date().toISOString()    // Current timestamp
    };

    reports.push(newReport);                   // Add to the list
    writeData('reports.json', reports);        // Save to file
    res.status(201).json(newReport);           // 201 = "Created"
});

// ============================================================
//  ROUTE 8 — SOS / Rescue Requests
//  GET  http://localhost:4000/api/sos          → get all active SOS requests
//  POST http://localhost:4000/api/sos          → create a new SOS request
// ============================================================

// Get all SOS requests
app.get('/api/sos', (req, res) => {
    const sos = readData('sos.json');
    res.json(sos.reverse());
});

// Create a new SOS request
// Body: { "location": "Street or description", "status": "Needs Evacuation" }
app.post('/api/sos', (req, res) => {
    const { location, status } = req.body;

    if (!location) {
        return res.status(400).json({ error: 'location is required' });
    }

    const sos = readData('sos.json');

    const newRequest = {
        id:        `REQ-${String(sos.length + 1).padStart(3, '0')}`,  // e.g. REQ-003
        location,
        status:    status || 'Needs Help',
        time:      'Just now',
        createdAt: new Date().toISOString()
    };

    sos.push(newRequest);
    writeData('sos.json', sos);
    res.status(201).json(newRequest);
});

// ============================================================
//  ROUTE 9 — AI Chatbot Proxy (OpenAI)
//  POST http://localhost:4000/api/chat
// ============================================================
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    
    if (!message) return res.status(400).json({ error: 'Message is required' });

    try {
        // OpenAI Integration (Placeholder for your API Key)
        const OPENAI_KEY = process.env.OPENAI_API_KEY || 'YOUR_OPENAI_KEY_HERE';
        
        if (OPENAI_KEY.startsWith('YOUR_')) {
            // ==========================================
            // ADVANCED LOCAL NLP SIMULATOR (No API Key Required)
            // Works like an AI agent by scoring user intent against a knowledge base
            // ==========================================
            const knowledgeBase = [
                {
                    intent: "flood_safety",
                    keywords: ["flood", "water", "drown", "swim", "higher ground", "rain", "overflow"],
                    response: "🌊 **Flood Safety:** Immediately move to higher ground. Do not walk, swim, or drive through flood waters. Turn around, don't drown! Just 6 inches of moving water can knock you down."
                },
                {
                    intent: "cyclone_safety",
                    keywords: ["cyclone", "hurricane", "wind", "storm", "tornado", "blow"],
                    response: "🌀 **Cyclone Safety:** Stay indoors, away from windows. If your house isn't secure, use the 'Nearby Finder' to locate the nearest Safe Shelter. Board up windows if you have time."
                },
                {
                    intent: "resource_gas",
                    keywords: ["gas", "lpg", "cylinder", "cooking", "stove", "fuel"],
                    response: "🔥 **Gas Shortage:** LPG cylinders are scarce during crises. Please navigate to the 'Resources' tab on the sidebar to view live availability across local hubs like Bharat Gas and HP Gas."
                },
                {
                    intent: "resource_food",
                    keywords: ["food", "hungry", "eat", "starving", "ration", "meal", "water", "drink", "thirsty"],
                    response: "🍲 **Food & Water:** Govt relief camps are distributing essential food kits and clean drinking water. Check the 'Resources' tab for real-time stock levels near you."
                },
                {
                    intent: "emergency_sos",
                    keywords: ["help", "sos", "emergency", "dying", "hurt", "injured", "medical", "hospital", "doctor", "trauma", "save"],
                    response: "🚨 **EMERGENCY:** If you are injured or in immediate danger, go to the SOS tab and click the pulsating SOS button right now. It will broadcast your GPS location to rescuers."
                },
                {
                    intent: "evacuation",
                    keywords: ["evacuate", "leave", "escape", "run", "where to go", "shelter"],
                    response: "🛡️ **Evacuation:** Grab your emergency kit. Follow the 'Evacuation Guidance' routes listed in the SOS panel to reach the nearest Green Zone / Safe Shelter."
                },
                {
                    intent: "telugu",
                    keywords: ["telugu", "sahayam", "basha", "namaskaram"],
                    response: "నమస్కారం! నేను క్రైసిస్ AI. మీకు సహాయం కావాలంటే దయచేసి 'SOS' బటన్‌ని నొక్కండి."
                },
                {
                    intent: "identity",
                    keywords: ["who are you", "what are you", "are you ai", "chatbot", "name"],
                    response: "🤖 I am Crisis AI, an intelligent agent built to guide you through disaster scenarios with real-time data."
                }
            ];

            const userWords = message.toLowerCase().replace(/[^\w\s]/g, '').split(' ');
            let bestMatch = null;
            let highestScore = 0;

            for (const item of knowledgeBase) {
                let score = 0;
                for (const word of userWords) {
                    if (item.keywords.includes(word)) score++;
                }
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = item;
                }
            }

            let aiResponse = "🤖 I'm here to help. Please ask me a specific safety question (like 'what do I do in a flood?', 'where is food?', or 'how do I get help?').";
            if (bestMatch && highestScore > 0) {
                aiResponse = bestMatch.response;
            }

            // Simulate slight AI typing delay
            await new Promise(resolve => setTimeout(resolve, 800));

            return res.json({ response: aiResponse });
        }

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are Crisis AI, a survival assistant for coastal Andhra Pradesh. Speak in English and Telugu." },
                { role: "user", content: message }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${OPENAI_KEY}` }
        });

        res.json({ response: response.data.choices[0].message.content });
    } catch (err) {
        console.error('OpenAI Error:', err.message);
        res.status(500).json({ error: 'AI Chatbot failed to respond' });
    }
});

// ============================================================
//  ROUTE 10 — SOS Alert Proxy (Twilio)
//  POST http://localhost:4000/api/sos-alert
// ============================================================
app.post('/api/sos-alert', async (req, res) => {
    const { location, status } = req.body;

    try {
        const TWILIO_SID = process.env.TWILIO_SID || 'YOUR_TWILIO_SID';
        const TWILIO_AUTH = process.env.TWILIO_AUTH || 'YOUR_TWILIO_AUTH';
        const TWILIO_NUMBER = process.env.TWILIO_NUMBER || '+1234567890';
        const TO_NUMBER = '+910000000000'; // Target emergency number

        if (TWILIO_SID.startsWith('YOUR_')) {
            console.warn('Twilio config is missing. Simulating SMS alert.');
            return res.json({ status: 'sent_simulated', message: 'SOS Alert simulation successful (since no Twilio keys provided).' });
        }

        // Real Twilio SMS Call
        const params = new URLSearchParams();
        params.append('To', TO_NUMBER);
        params.append('From', TWILIO_NUMBER);
        params.append('Body', `🚨 CRISIS SOS! Location: ${location}. Status: ${status}. Needs rescue teams ASAP.`);

        const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
        
        await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, params, {
            headers: { 'Authorization': `Basic ${auth}` }
        });

        res.json({ status: 'sent', message: 'Live SMS Alert sent via Twilio!' });
    } catch (err) {
        console.error('Twilio Error:', err.message);
        res.status(500).json({ error: 'Failed to send SOS alert via Twilio' });
    }
});

// ============================================================
//  ROUTE 11 — Direct SMS API (for manual testing)
//  POST http://localhost:4000/api/sms-direct
//  Body: { "to": "+91...", "message": "..." }
// ============================================================
app.post('/api/sms-direct', async (req, res) => {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'To and message are required' });

    console.log(`📡 [SMS API] To: ${to} | Message: ${message}`);
    // Reuse the logic from sos-alert or implement simulation
    res.json({ status: 'simulated', to, message, timestamp: new Date() });
});

// ============================================================
//  START THE SERVER
// ============================================================
app.listen(PORT, () => {
    console.log('');
    console.log('🛡️  Crisis AI Backend is running!');
    console.log(`🌐  API URL: http://localhost:${PORT}`);
    console.log(`✅  Health:  http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET  /api/weather');
    console.log('  GET  /api/risk');
    console.log('  GET  /api/family       PATCH /api/family/:id');
    console.log('  GET  /api/gas          PATCH /api/gas/:id');
    console.log('  GET  /api/shelters');
    console.log('  GET  /api/reports      POST  /api/reports');
    console.log('  GET  /api/sos          POST  /api/sos');
    console.log('');
});
