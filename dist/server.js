"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const accessCode_1 = require("./models/accessCode");
const systemConfig_1 = require("./models/systemConfig");
const dev_1 = require("./routes/dev");
const app = (0, express_1.default)();
let isInitializationMode = false;
// Middleware
app.use((0, cors_1.default)({
    origin: 'http://localhost:8000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-admin-code', 'x-session-id']
}));
app.use(express_1.default.json());
app.use(express_1.default.static('.'));
const Log = mongoose_1.default.model('Log', new mongoose_1.default.Schema({
    code: String,
    name: String,
    type: String,
    success: Boolean,
    timestamp: { type: Date, default: Date.now }
}));
// Check system initialization state
async function checkInitializationMode() {
    try {
        // First, ensure we have a default admin code
        let adminCode = await accessCode_1.AccessCode.findOne({ isAdmin: true });
        if (!adminCode) {
            console.log('Creating default admin code...');
            adminCode = await accessCode_1.AccessCode.create({
                code: config_1.DEFAULT_ADMIN_CODE,
                name: 'Default Admin',
                type: 'Admin',
                isAdmin: true,
                isActive: true
            });
        }
        // Check if system has been initialized
        const defaultAdminConfig = await systemConfig_1.SystemConfig.findOne({ key: 'defaultAdminInitialized' });
        // System needs initialization if:
        // 1. defaultAdminInitialized flag is false/missing AND
        // 2. current admin code is the default one
        isInitializationMode = (!(defaultAdminConfig === null || defaultAdminConfig === void 0 ? void 0 : defaultAdminConfig.value)) &&
            (adminCode.code === config_1.DEFAULT_ADMIN_CODE);
        if (isInitializationMode) {
            console.log('Server starting in initialization mode');
            console.log('Please set up admin code using the default code (123456)');
        }
        else {
            console.log('Server starting in normal mode');
        }
    }
    catch (error) {
        console.error('Error checking initialization mode:', error);
        process.exit(1); // Exit if we can't determine the mode
    }
}
// Connect to MongoDB and initialize
mongoose_1.default.connect(config_1.MONGODB_URI)
    .then(async () => {
    console.log('Connected to MongoDB');
    await checkInitializationMode();
})
    .catch(err => console.error('MongoDB connection error:', err));
// Setup development routes first (these work even in initialization mode)
(0, dev_1.setupDevRoutes)(app, isInitializationMode, checkInitializationMode);
// Verify access code endpoint
app.post('/api/verify', async (req, res) => {
    try {
        const { code, isAdminMode, newCode, confirmCode } = req.body;
        // In initialization mode, only handle admin code setup
        if (isInitializationMode) {
            // If no new code provided, check if this is the default admin code
            if (!newCode && !confirmCode) {
                const adminCode = await accessCode_1.AccessCode.findOne({ isAdmin: true });
                if (code !== config_1.DEFAULT_ADMIN_CODE || !adminCode || adminCode.code !== config_1.DEFAULT_ADMIN_CODE) {
                    return res.status(401).json({
                        error: 'Please enter the default admin code (123456) to begin setup.'
                    });
                }
                return res.json({
                    isAdmin: true,
                    requiresChange: true,
                    message: 'Default admin code accepted. Please enter new admin code.'
                });
            }
            // Validate new code format (must be 6 digits)
            if (!(newCode === null || newCode === void 0 ? void 0 : newCode.match(/^\d{6}$/))) {
                return res.status(400).json({ error: 'New admin code must be exactly 6 digits.' });
            }
            // Verify codes match
            if (newCode !== confirmCode) {
                return res.status(400).json({ error: 'New codes do not match. Please try again.' });
            }
            // Update admin code
            await accessCode_1.AccessCode.findOneAndUpdate({ isAdmin: true }, { code: newCode });
            // Mark system as initialized
            await systemConfig_1.SystemConfig.updateOne({ key: 'defaultAdminInitialized' }, { key: 'defaultAdminInitialized', value: true }, { upsert: true });
            // Force recheck of initialization mode
            await checkInitializationMode();
            // System will restart and enter normal mode
            return res.json({
                success: true,
                message: 'Admin code updated successfully. System will restart.'
            });
        }
        // Normal mode operation
        if (!(code === null || code === void 0 ? void 0 : code.match(/^\d{6}$/))) {
            return res.status(400).json({ error: 'Access code must be 6 digits.' });
        }
        const accessCode = await accessCode_1.AccessCode.findOne({ code });
        if (!accessCode) {
            await Log.create({ code, name: 'Unknown', type: 'Unknown', success: false });
            return res.status(401).json({ error: 'Invalid code' });
        }
        // Check if code is active and within valid date range
        const now = new Date();
        if (!accessCode.isActive ||
            (accessCode.validFrom && accessCode.validFrom > now) ||
            (accessCode.validUntil && accessCode.validUntil < now)) {
            await Log.create({
                code: accessCode.code,
                name: accessCode.name,
                type: accessCode.type,
                success: false
            });
            return res.status(401).json({ error: 'Code is not active or has expired' });
        }
        // Update last used timestamp
        accessCode.lastUsed = now;
        await accessCode.save();
        // Log successful access
        await Log.create({
            code: accessCode.code,
            name: accessCode.name,
            type: accessCode.type,
            success: true
        });
        // If admin mode is requested, check admin privileges
        if (isAdminMode && !accessCode.isAdmin) {
            return res.status(403).json({ error: 'This code does not have admin privileges' });
        }
        // Return success with code details
        res.json({
            ...accessCode.toObject(),
            success: true,
            isAdmin: accessCode.isAdmin,
            message: isAdminMode ? 'Admin access granted' : 'Access granted'
        });
    }
    catch (error) {
        console.error('Error verifying code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// All other endpoints are disabled in initialization mode
const normalModeOnly = (req, res, next) => {
    if (isInitializationMode) {
        res.status(503).json({
            error: 'System is in initialization mode. Please complete admin code setup first.'
        });
        return;
    }
    next();
};
// Apply normal mode middleware to all API routes except /verify
const apiRouter = express_1.default.Router();
// Create guest code (normal mode only)
apiRouter.post('/guest-codes', async (req, res) => {
    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const guestCode = await accessCode_1.AccessCode.create({
            code,
            name: 'Guest',
            type: 'Guest',
            isAdmin: false,
            isActive: true
        });
        res.json(guestCode);
    }
    catch (error) {
        console.error('Error creating guest code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Toggle door state (normal mode only)
apiRouter.post('/toggle-door', async (req, res) => {
    try {
        res.json({ success: true, message: 'Door toggled successfully' });
    }
    catch (error) {
        console.error('Error toggling door:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get all access codes (admin only, normal mode only)
apiRouter.get('/access-codes', async (req, res) => {
    try {
        const accessCodes = await accessCode_1.AccessCode.find();
        res.json(accessCodes);
    }
    catch (error) {
        console.error('Error getting access codes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add new access code (admin only, normal mode only)
apiRouter.post('/access-codes', async (req, res) => {
    try {
        const { code, name, type } = req.body;
        if (!code || !name || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!code.match(/^\d{6}$/)) {
            return res.status(400).json({ error: 'Access code must be 6 digits.' });
        }
        const newCode = await accessCode_1.AccessCode.create({
            code,
            name,
            type,
            isActive: true
        });
        res.json(newCode);
    }
    catch (error) {
        console.error('Error adding access code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Remove access code (admin only, normal mode only)
apiRouter.delete('/access-codes/:code', async (req, res) => {
    try {
        const { code } = req.params;
        await accessCode_1.AccessCode.findOneAndDelete({ code });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error removing access code:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get access logs (admin only, normal mode only)
apiRouter.get('/logs', async (req, res) => {
    try {
        const logs = await Log.find().sort({ timestamp: -1 });
        res.json(logs);
    }
    catch (error) {
        console.error('Error getting logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Apply normal mode middleware to all API routes except /verify
app.use('/api', (req, res, next) => {
    if (req.path === '/verify') {
        next();
    }
    else {
        normalModeOnly(req, res, next);
    }
}, apiRouter);
// Start server
app.listen(config_1.PORT, () => {
    console.log(`Server running on port ${config_1.PORT}`);
    if (isInitializationMode) {
        console.log('NOTICE: Server is in initialization mode. Please set up admin code.');
    }
});
