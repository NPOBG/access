import express from 'express';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { MONGODB_URI, PORT, DEFAULT_ADMIN_CODE } from './config';
import { AccessCode } from './models/accessCode';
import { SystemConfig } from './models/systemConfig';
import { setupDevRoutes } from './routes/dev';

const app = express();
let isInitializationMode = false;

// Middleware
app.use(cors({
  origin: 'http://localhost:8000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-admin-code', 'x-session-id']
}));
app.use(express.json());
app.use(express.static('.'));

// Models
interface ILog {
  code: string;
  name: string;
  type: string;
  success: boolean;
  timestamp: Date;
}

const Log = mongoose.model<ILog>('Log', new mongoose.Schema({
  code: String,
  name: String,
  type: String,
  success: Boolean,
  timestamp: { type: Date, default: Date.now }
}));

// Check system initialization state
async function checkInitializationMode() {
  try {
    const defaultAdminConfig = await SystemConfig.findOne({ key: 'defaultAdminInitialized' });
    const adminCode = await AccessCode.findOne({ isAdmin: true });

    // Convert null to boolean and handle initialization check
    const isInitialized = Boolean(defaultAdminConfig?.value);
    const hasDefaultCode = Boolean(adminCode?.code === DEFAULT_ADMIN_CODE);

    // System needs initialization if:
    // 1. defaultAdminInitialized is false
    // 2. OR current admin code is the default one
    isInitializationMode = !isInitialized || hasDefaultCode;

    if (isInitializationMode) {
      console.log('Server starting in initialization mode');
      if (!adminCode) {
        // Create default admin code if none exists
        await AccessCode.create({
          code: DEFAULT_ADMIN_CODE,
          name: 'Default Admin',
          type: 'Admin',
          isAdmin: true
        });
      }
    } else {
      console.log('Server starting in normal mode');
    }
  } catch (error) {
    console.error('Error checking initialization mode:', error);
    process.exit(1); // Exit if we can't determine the mode
  }
}

// Validate code format
function isValidCodeFormat(code: string): boolean {
  return typeof code === 'string' && code.length >= 4 && code.length <= 6 && /^\d+$/.test(code);
}

// Admin access middleware - only used in normal mode
const verifyAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    const code = req.headers['x-admin-code'] || req.query.code || req.body.code;
    
    if (!code) {
      return res.status(401).json({ error: 'Admin code required' });
    }

    const adminCode = await AccessCode.findOne({ code, isAdmin: true });
    if (!adminCode) {
      return res.status(401).json({ error: 'Invalid admin code' });
    }
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Connect to MongoDB and initialize
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await checkInitializationMode();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Setup development routes first (these work even in initialization mode)
setupDevRoutes(app, isInitializationMode, checkInitializationMode);

// All other endpoints are disabled in initialization mode
const normalModeOnly = (req: Request, res: Response, next: Function) => {
  if (isInitializationMode) {
    return res.status(503).json({ 
      error: 'System is in initialization mode. Please set up admin code first.' 
    });
  }
  next();
};

// Apply normal mode middleware to all non-dev routes
app.use('/api', normalModeOnly);

// Verify access code
app.post('/api/verify', async (req: Request, res: Response) => {
  try {
    const { code, newCode, confirmCode } = req.body;

    // In initialization mode, only handle admin code setup
    if (isInitializationMode) {
      if (!newCode || !confirmCode) {
        return res.json({ 
          isAdmin: true, 
          requiresChange: true,
          message: 'Admin code needs to be changed'
        });
      }

      // Validate new code format
      if (!isValidCodeFormat(newCode)) {
        return res.status(400).json({ error: 'New code must be 4-6 digits' });
      }

      // Verify codes match
      if (newCode !== confirmCode) {
        return res.status(400).json({ error: 'New codes must match' });
      }

      // Update admin code
      await AccessCode.findOneAndUpdate(
        { isAdmin: true },
        { code: newCode }
      );

      // Mark system as initialized
      await SystemConfig.updateOne(
        { key: 'defaultAdminInitialized' },
        { key: 'defaultAdminInitialized', value: true },
        { upsert: true }
      );

      // System will restart and enter normal mode
      return res.json({ 
        success: true, 
        message: 'Admin code updated successfully. System will restart.'
      });
    }

    // Normal mode operation
    if (!isValidCodeFormat(code)) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    const accessCode = await AccessCode.findOne({ code });
    if (!accessCode) {
      await Log.create({ code, name: 'Unknown', type: 'Unknown', success: false });
      return res.status(401).json({ error: 'Invalid code' });
    }

    await Log.create({ 
      code: accessCode.code,
      name: accessCode.name,
      type: accessCode.type,
      success: true 
    });

    res.json({
      ...accessCode.toObject(),
      requiresChange: false
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create guest code (normal mode only)
app.post('/api/guest-codes', async (req: Request, res: Response) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const guestCode = await AccessCode.create({
      code,
      name: 'Guest',
      type: 'Temporary',
      isAdmin: false
    });

    res.json(guestCode);
  } catch (error) {
    console.error('Error creating guest code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle door state (normal mode only)
app.post('/api/toggle-door', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: 'Door toggled successfully' });
  } catch (error) {
    console.error('Error toggling door:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all access codes (admin only, normal mode only)
app.get('/api/access-codes', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const accessCodes = await AccessCode.find();
    res.json(accessCodes);
  } catch (error) {
    console.error('Error getting access codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new access code (admin only, normal mode only)
app.post('/api/access-codes', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { code, name, type } = req.body;

    if (!code || !name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!isValidCodeFormat(code)) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    const newCode = await AccessCode.create({ code, name, type });
    res.json(newCode);
  } catch (error) {
    console.error('Error adding access code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove access code (admin only, normal mode only)
app.delete('/api/access-codes/:code', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    await AccessCode.findOneAndDelete({ code });
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing access code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get access logs (admin only, normal mode only)
app.get('/api/logs', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (isInitializationMode) {
        console.log('NOTICE: Server is in initialization mode. Please set up admin code.');
    }
});
