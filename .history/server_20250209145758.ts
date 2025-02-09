import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { MONGODB_URI, PORT, DEFAULT_ADMIN_CODE } from './config';
import { AccessCode, IAccessCode } from './models/accessCode';
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
async function checkInitializationMode(): Promise<void> {
  try {
    const defaultAdminConfig = await SystemConfig.findOne({ key: 'defaultAdminInitialized' });
    const adminCode = await AccessCode.findOne({ isAdmin: true });

    // System needs initialization if:
    // 1. defaultAdminInitialized is false OR doesn't exist
    // OR
    // 2. admin code is either the default or doesn't exist
    isInitializationMode = (!defaultAdminConfig || !defaultAdminConfig.value) || 
                          (!adminCode || adminCode.code === DEFAULT_ADMIN_CODE);

    if (isInitializationMode) {
      console.log('Server starting in initialization mode');
      // Create default admin code if none exists
      if (!adminCode) {
        await AccessCode.create({
          code: DEFAULT_ADMIN_CODE,
          name: 'Default Admin',
          type: 'Admin',
          isAdmin: true,
          isActive: true
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

// Connect to MongoDB and initialize
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await checkInitializationMode();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Setup development routes first (these work even in initialization mode)
setupDevRoutes(app, isInitializationMode, checkInitializationMode);

// Verify access code endpoint
app.post('/api/verify', async (req: Request, res: Response) => {
  try {
    const { code, isAdminMode, newCode, confirmCode } = req.body as {
      code?: string;
      isAdminMode?: boolean;
      newCode?: string;
      confirmCode?: string;
    };

    // In initialization mode, only handle admin code setup
    if (isInitializationMode) {
      // If no new code provided, check if this is the default admin code
      if (!newCode && !confirmCode) {
        const adminCode = await AccessCode.findOne({ isAdmin: true });
        if (code !== DEFAULT_ADMIN_CODE || !adminCode || adminCode.code !== DEFAULT_ADMIN_CODE) {
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
      if (!newCode?.match(/^\d{6}$/)) {
        return res.status(400).json({ error: 'New admin code must be exactly 6 digits.' });
      }

      // Verify codes match
      if (newCode !== confirmCode) {
        return res.status(400).json({ error: 'New codes do not match. Please try again.' });
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

      // Force recheck of initialization mode
      await checkInitializationMode();

      // System will restart and enter normal mode
      return res.json({ 
        success: true, 
        message: 'Admin code updated successfully. System will restart.'
      });
    }

    // Normal mode operation
    if (!code?.match(/^\d{6}$/)) {
      return res.status(400).json({ error: 'Access code must be 6 digits.' });
    }

    const accessCode = await AccessCode.findOne({ code });
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

  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// All other endpoints are disabled in initialization mode
const normalModeOnly = (req: Request, res: Response, next: Function): void => {
  if (isInitializationMode) {
    res.status(503).json({ 
      error: 'System is in initialization mode. Please complete admin code setup first.' 
    });
    return;
  }
  next();
};

// Apply normal mode middleware to all API routes except /verify
const apiRouter = express.Router();

// Create guest code (normal mode only)
apiRouter.post('/guest-codes', async (req: Request, res: Response) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const guestCode = await AccessCode.create({
      code,
      name: 'Guest',
      type: 'Guest',
      isAdmin: false,
      isActive: true
    });

    res.json(guestCode);
  } catch (error) {
    console.error('Error creating guest code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle door state (normal mode only)
apiRouter.post('/toggle-door', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: 'Door toggled successfully' });
  } catch (error) {
    console.error('Error toggling door:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all access codes (admin only, normal mode only)
apiRouter.get('/access-codes', async (req: Request, res: Response) => {
  try {
    const accessCodes = await AccessCode.find();
    res.json(accessCodes);
  } catch (error) {
    console.error('Error getting access codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new access code (admin only, normal mode only)
apiRouter.post('/access-codes', async (req: Request, res: Response) => {
  try {
    const { code, name, type } = req.body as {
      code: string;
      name: string;
      type: string;
    };

    if (!code || !name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!code.match(/^\d{6}$/)) {
      return res.status(400).json({ error: 'Access code must be 6 digits.' });
    }

    const newCode = await AccessCode.create({ 
      code, 
      name, 
      type,
      isActive: true
    });
    res.json(newCode);
  } catch (error) {
    console.error('Error adding access code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove access code (admin only, normal mode only)
apiRouter.delete('/access-codes/:code', async (req: Request, res: Response) => {
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
apiRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply normal mode middleware to all API routes except /verify
app.use('/api', (req: Request, res: Response, next: Function) => {
  if (req.path === '/verify') {
    next();
  } else {
    normalModeOnly(req, res, next);
  }
}, apiRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (isInitializationMode) {
    console.log('NOTICE: Server is in initialization mode. Please set up admin code.');
  }
});
