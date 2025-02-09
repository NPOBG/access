"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDevRoutes = setupDevRoutes;
const mongoose_1 = __importDefault(require("mongoose"));
const accessCode_1 = require("../models/accessCode");
const systemConfig_1 = require("../models/systemConfig");
const config_1 = require("../config");
function setupDevRoutes(app, isInitializationMode, checkInitializationMode) {
    if (process.env.NODE_ENV !== 'production') {
        // Reset database endpoint - available even in initialization mode
        app.post('/dev/reset-db', async (req, res) => {
            try {
                // Check if we have a database connection
                if (!mongoose_1.default.connection.db) {
                    throw new Error('No database connection');
                }
                // Get all collections
                const collections = await mongoose_1.default.connection.db.collections();
                // Drop each collection
                for (let collection of collections) {
                    await collection.drop();
                    console.log(`Dropped collection: ${collection.collectionName}`);
                }
                // Reinitialize the default admin code
                await accessCode_1.AccessCode.create({
                    code: config_1.DEFAULT_ADMIN_CODE,
                    name: 'Default Admin',
                    type: 'Admin',
                    isAdmin: true
                });
                // Reset initialization flag
                await systemConfig_1.SystemConfig.updateOne({ key: 'defaultAdminInitialized' }, { key: 'defaultAdminInitialized', value: false }, { upsert: true });
                // Rerun initialization check
                await checkInitializationMode();
                console.log('Database reset successfully');
                res.json({
                    success: true,
                    message: 'Database reset successfully. System is in initialization mode.'
                });
            }
            catch (error) {
                console.error('Error resetting database:', error);
                res.status(500).json({
                    error: 'Failed to reset database',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // Status endpoint - available even in initialization mode
        app.get('/dev/status', async (req, res) => {
            try {
                if (!mongoose_1.default.connection.db) {
                    throw new Error('No database connection');
                }
                const adminCode = await accessCode_1.AccessCode.findOne({ isAdmin: true });
                const config = await systemConfig_1.SystemConfig.findOne({ key: 'defaultAdminInitialized' });
                res.json({
                    initializationMode: isInitializationMode,
                    defaultAdminInitialized: (config === null || config === void 0 ? void 0 : config.value) || false,
                    currentAdminCode: (adminCode === null || adminCode === void 0 ? void 0 : adminCode.code) || 'none',
                    isDefaultCode: (adminCode === null || adminCode === void 0 ? void 0 : adminCode.code) === config_1.DEFAULT_ADMIN_CODE,
                    databaseConnected: true
                });
            }
            catch (error) {
                console.error('Error getting status:', error);
                res.status(500).json({
                    error: 'Failed to get status',
                    details: error instanceof Error ? error.message : 'Unknown error',
                    databaseConnected: false
                });
            }
        });
    }
}
