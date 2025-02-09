"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const os_1 = __importDefault(require("os"));
const models_1 = require("./models");
const config_1 = require("./config");
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.static('.'));
// Connect to MongoDB
mongoose_1.default.connect(config_1.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const readline = require('readline');

async function promptForAdminCode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Please enter a 6-digit admin code: ', (code1) => {
            rl.question('Please confirm the 6-digit admin code: ', (code2) => {
                if (code1 === code2 && /^\d{6}$/.test(code1)) {
                    rl.close();
                    resolve(code1);
                } else {
                    console.log('Invalid code. Please ensure both inputs match and are 6 digits.');
                    rl.close();
                    resolve(null);
                }
            });
        });
    });
}

async function initializeAdmin() {
    const accessCodes = await models_1.AccessCode.find();
    if (accessCodes.length === 0) {
        const adminCode = await promptForAdminCode();
        if (adminCode) {
            await models_1.AccessCode.create({
                code: adminCode,
                user: config_1.ADMIN_USERNAME,
                unit: 'Admin',
                isAdmin: true
            });
        }
    } else {
        const adminExists = await models_1.AccessCode.findOne({ isAdmin: true });
        if (!adminExists) {
            await models_1.AccessCode.create({
                code: config_1.ADMIN_PASSWORD,
                user: config_1.ADMIN_USERNAME,
                unit: 'Admin',
                isAdmin: true
            });
        }
    }
}
initializeAdmin().catch(console.error);

// API Routes
// Debugging endpoint to check access codes
app.get('/api/debug/access-codes', async (req, res) => {
    try {
        const accessCodes = await models_1.AccessCode.find();
        console.log('Current Access Codes:', accessCodes);
        res.json(accessCodes);
    } catch (error) {
        console.error('Error retrieving access codes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify access code
app.post('/api/verify', async (req, res) => {
    try {
        const { code } = req.body;
        console.log(`Received code for verification: ${code}`);
        
        // Always accept admin code
        if (code === config_1.ADMIN_PASSWORD) {
            console.log('Admin code provided.');
            const adminCode = await models_1.AccessCode.findOne({ code: config_1.ADMIN_PASSWORD });
            if (!adminCode) {
                await models_1.AccessCode.create({
                    code: config_1.ADMIN_PASSWORD,
                    user: config_1.ADMIN_USERNAME,
                    unit: 'Admin',
                    isAdmin: true
                });
            }
            await models_1.Log.create({
                timestamp: new Date(),
                code: config_1.ADMIN_PASSWORD,
                user: config_1.ADMIN_USERNAME,
                unit: 'Admin',
                success: true
            });
            return res.json({
                code: config_1.ADMIN_PASSWORD,
                user: config_1.ADMIN_USERNAME,
                unit: 'Admin',
                isAdmin: true
            });
        }

        // Validate code format (4-6 digits)
        if (!code || typeof code !== 'string' || code.length < 4 || code.length > 6 || !/^\d+$/.test(code)) {
            console.log('Invalid code format.');
            return res.status(401).json({ error: 'Invalid code format - must be 4 to 6 digits' });
        }

        // Check for valid access code
        const accessCode = await models_1.AccessCode.findOne({ code });
        console.log(`Access code found: ${accessCode}`);
        if (accessCode) {
            await models_1.Log.create({
                timestamp: new Date(),
                code: accessCode.code,
                user: accessCode.user,
                unit: accessCode.unit,
                success: true
            });
            return res.json(accessCode);
        }

        // Log failed attempt
        await models_1.Log.create({
            timestamp: new Date(),
            code,
            user: 'Unknown',
            unit: 'Unknown',
            success: false
        });
        res.status(401).json({ error: 'Invalid code' });
    }
    catch (error) {
        console.error('Error verifying code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create a new guest code
app.post('/api/guest-codes', async (req, res) => {
    try {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const guestCode = await models_1.GuestCode.create({
            code,
            user: 'Guest',
            unit: 'Guest Access',
            created: new Date(),
            used: false
        });
        res.json({ code: guestCode.code });
    }
    catch (error) {
        console.error('Error creating guest code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get access codes (admin only)
app.get('/api/access-codes', async (req, res) => {
    try {
        const accessCodes = await models_1.AccessCode.find().lean();
        res.json(accessCodes);
    }
    catch (error) {
        console.error('Error getting access codes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add access code (admin only)
app.post('/api/access-codes', async (req, res) => {
    try {
        const { code, user, unit, isAdmin } = req.body;
        const newAccessCode = await models_1.AccessCode.create({ code, user, unit, isAdmin });
        res.json(newAccessCode);
    }
    catch (error) {
        console.error('Error adding access code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Remove access code (admin only)
app.delete('/api/access-codes/:code', async (req, res) => {
    try {
        const result = await models_1.AccessCode.findOneAndDelete({ code: req.params.code });
        if (result) {
            res.json({ success: true });
        }
        else {
            res.status(404).json({ error: 'Access code not found' });
        }
    }
    catch (error) {
        console.error('Error removing access code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get access logs (admin only)
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await models_1.Log.find().sort({ timestamp: -1 }).lean();
        res.json(logs);
    }
    catch (error) {
        console.error('Error getting logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get guest codes (admin only)
app.get('/api/guest-codes', async (req, res) => {
    try {
        const guestCodes = await models_1.GuestCode.find().lean();
        res.json(guestCodes);
    }
    catch (error) {
        console.error('Error getting guest codes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get local IP address
function getLocalIP() {
    const interfaces = os_1.default.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const ifaces = interfaces[name];
        if (ifaces) {
            for (const iface of ifaces) {
                if (!iface.internal && iface.family === 'IPv4') {
                    return iface.address;
                }
            }
        }
    }
    return 'localhost';
}
// Start server
app.listen(config_1.PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('\n🚪 Door Access System is running!');
    console.log('\nAccess the app from:');
    console.log(`- This device: http://localhost:${config_1.PORT}`);
    console.log(`- Other devices: http://${localIP}:${config_1.PORT}`);
    console.log('\nPress Ctrl+C to stop the server');
});