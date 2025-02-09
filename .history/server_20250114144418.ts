import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import os from 'os';
import { AccessCode, GuestCode, Log, IAccessCode, IGuestCode } from './models';
import { MONGODB_URI, PORT, ADMIN_USERNAME, ADMIN_PASSWORD } from './config';

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize admin user if not exists
async function initializeAdmin() {
  const adminExists = await AccessCode.findOne({ isAdmin: true });
  if (!adminExists) {
    await AccessCode.create({
      code: ADMIN_PASSWORD,
      user: ADMIN_USERNAME,
      unit: 'Admin',
      isAdmin: true
    });
  }
}
initializeAdmin().catch(console.error);

// API Routes

// Verify access code
app.post('/api/verify', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    
    // Always accept admin code
    if (code === ADMIN_PASSWORD) {
      const adminCode = await AccessCode.findOne({ code: ADMIN_PASSWORD });
      if (!adminCode) {
        // If admin code doesn't exist, create it
        await AccessCode.create({
          code: ADMIN_PASSWORD,
          user: ADMIN_USERNAME,
          unit: 'Admin',
          isAdmin: true
        });
      }
      
      await Log.create({
        timestamp: new Date(),
        code: ADMIN_PASSWORD,
        user: ADMIN_USERNAME,
        unit: 'Admin',
        success: true
      });
      
      return res.json({
        code: ADMIN_PASSWORD,
        user: ADMIN_USERNAME,
        unit: 'Admin',
        isAdmin: true
      });
    }

    // Validate code format (4-6 digits)
    if (!code || typeof code !== 'string' || code.length < 4 || code.length > 6 || !/^\d+$/.test(code)) {
      return res.status(401).json({ error: 'Invalid code format - must be 4 to 6 digits' });
    }

    // Check for valid access code
    const accessCode = await AccessCode.findOne({ code });
    if (accessCode) {
      await Log.create({
        timestamp: new Date(),
        code: accessCode.code,
        user: accessCode.user,
        unit: accessCode.unit,
        success: true
      });
      return res.json(accessCode);
    }

    // Check for valid guest code
    const guestCode = await GuestCode.findOne({ code, used: false });
    if (guestCode) {
      guestCode.used = true;
      await guestCode.save();
      
      await Log.create({
        timestamp: new Date(),
        code: guestCode.code,
        user: guestCode.user,
        unit: guestCode.unit,
        success: true
      });
      
      return res.json(guestCode);
    }

    // Log failed attempt
    await Log.create({
      timestamp: new Date(),
      code,
      user: 'Unknown',
      unit: 'Unknown',
      success: false
    });

    res.status(401).json({ error: 'Invalid code' });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new guest code
app.post('/api/guest-codes', async (req: Request, res: Response) => {
  try {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const guestCode = await GuestCode.create({
      code,
      user: 'Guest',
      unit: 'Guest Access',
      created: new Date(),
      used: false
    });
    res.json({ code: guestCode.code });
  } catch (error) {
    console.error('Error creating guest code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get access codes (admin only)
app.get('/api/access-codes', async (req: Request, res: Response) => {
  try {
    const accessCodes = await AccessCode.find().lean();
    res.json(accessCodes);
  } catch (error) {
    console.error('Error getting access codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add access code (admin only)
app.post('/api/access-codes', async (req: Request, res: Response) => {
  try {
    const { code, user, unit, isAdmin } = req.body;

    // Validate required fields
    if (!code || !user || !unit) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          code: !code ? 'Code is required' : undefined,
          user: !user ? 'User is required' : undefined,
          unit: !unit ? 'Unit is required' : undefined
        }
      });
    }

    // Validate code format (4-6 digits)
    if (typeof code !== 'string' || code.length < 4 || code.length > 6 || !/^\d+$/.test(code)) {
      return res.status(400).json({ 
        error: 'Invalid code format',
        details: 'Code must be 4 to 6 digits'
      });
    }

    // Check for duplicate code
    const existingCode = await AccessCode.findOne({ code });
    if (existingCode) {
      return res.status(409).json({ 
        error: 'Code already exists',
        details: `Code ${code} is already assigned to ${existingCode.user}`
      });
    }

    // Create new access code
    const newAccessCode = await AccessCode.create({ 
      code, 
      user, 
      unit, 
      isAdmin: isAdmin || false 
    });

    // Log successful creation
    await Log.create({
      timestamp: new Date(),
      code: 'SYSTEM',
      user: 'Admin',
      unit: 'System',
      success: true,
      details: `Created access code ${code} for ${user}`
    });

    res.json(newAccessCode);
  } catch (error) {
    console.error('Error adding access code:', error);
    
    // Log the error
    await Log.create({
      timestamp: new Date(),
      code: 'SYSTEM',
      user: 'Admin',
      unit: 'System',
      success: false,
      details: `Failed to create access code: ${error.message}`
    });

    res.status(500).json({ 
      error: 'Failed to create access code',
      details: error.message 
    });
  }
});

// Remove access code (admin only)
app.delete('/api/access-codes/:code', async (req: Request, res: Response) => {
  try {
    const result = await AccessCode.findOneAndDelete({ code: req.params.code });
    if (result) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Access code not found' });
    }
  } catch (error) {
    console.error('Error removing access code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get access logs (admin only)
app.get('/api/logs', async (req: Request, res: Response) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).lean();
    res.json(logs);
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get guest codes (admin only)
app.get('/api/guest-codes', async (req: Request, res: Response) => {
  try {
    const guestCodes = await GuestCode.find().lean();
    res.json(guestCodes);
  } catch (error) {
    console.error('Error getting guest codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
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
app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n🚪 Door Access System is running!');
  console.log('\nAccess the app from:');
  console.log(`- This device: http://localhost:${PORT}`);
  console.log(`- Other devices: http://${localIP}:${PORT}`);
  console.log('\nPress Ctrl+C to stop the server');
});
