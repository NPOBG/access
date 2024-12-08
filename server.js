const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const filePath = path.join(__dirname, 'data', 'db.json');

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Read data from JSON file
function readData() {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Write data to JSON file
function writeData(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Initialize data if not exists
if (!fs.existsSync(filePath)) {
    writeData({
        accessCodes: [
            {
                code: '1234',
                user: 'Admin',
                unit: 'Admin',
                isAdmin: true
            }
        ],
        guestCodes: [],
        logs: []
    });
}

// API Routes

// Verify access code
app.post('/api/verify', (req, res) => {
    const { code } = req.body;
    const data = readData();
    const accessCodes = data.accessCodes;

    const accessCode = accessCodes.find(ac => ac.code === code);
    if (accessCode) {
        const log = {
            timestamp: new Date().toISOString(),
            code: accessCode.code,
            user: accessCode.user,
            unit: accessCode.unit,
            success: true
        };
        data.logs.push(log);
        writeData(data);
        res.json(accessCode);
    } else {
        res.status(401).json({ error: 'Invalid code' });
    }
});

// Create a new guest code
app.post('/api/guest-codes', (req, res) => {
    const data = readData();
    const guestCodes = data.guestCodes;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const guestCode = {
        code,
        user: 'Guest',
        unit: 'Guest Access',
        created: new Date().toISOString(),
        used: false
    };
    guestCodes.push(guestCode);
    data.guestCodes = guestCodes;
    writeData(data);
    res.json({ code: guestCode.code });
});

// Get access codes (admin only)
app.get('/api/access-codes', (req, res) => {
    const data = readData();
    res.json(data.accessCodes);
});

// Add access code (admin only)
app.post('/api/access-codes', (req, res) => {
    const data = readData();
    const accessCodes = data.accessCodes;
    const { code, user, unit, isAdmin } = req.body;
    const newAccessCode = { code, user, unit, isAdmin };
    accessCodes.push(newAccessCode);
    data.accessCodes = accessCodes;
    writeData(data);
    res.json(newAccessCode);
});

// Remove access code (admin only)
app.delete('/api/access-codes/:code', (req, res) => {
    const data = readData();
    const accessCodes = data.accessCodes;
    const index = accessCodes.findIndex(ac => ac.code === req.params.code);
    if (index !== -1) {
        accessCodes.splice(index, 1);
        data.accessCodes = accessCodes;
        writeData(data);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Access code not found' });
    }
});

// Get access logs (admin only)
app.get('/api/logs', (req, res) => {
    const data = readData();
    res.json(data.logs);
});

// Get guest codes (admin only)
app.get('/api/guest-codes', (req, res) => {
    const data = readData();
    res.json(data.guestCodes);
});

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('\n🚪 Door Access System is running!');
    console.log('\nAccess the app from:');
    console.log(`- This device: http://localhost:${PORT}`);
    console.log(`- Other devices: http://${localIP}:${PORT}`);
    console.log('\nPress Ctrl+C to stop the server');
});
