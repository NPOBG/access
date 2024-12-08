import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import os from 'os';
import { AccessCode, GuestCode, Log, IAccessCode, IGuestCode } from './models';

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dooraccess';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize admin user if not exists
async function initializeAdmin() {
  const adminExists = await AccessCode.findOne({ isAdmin: true });
  if (!adminExists) {
    await AccessCode.create({
      code: '1234',
      user: 'Admin',
      unit: 'Admin',
      isAdmin: true
    });
  }
}
initializeAdmin().catch(console.error);

// API Routes

// Verify access code
app.post('/api/verify', async (req, res) => {
  try {
    const { code } = req.body;
    const accessCode = await AccessCode.findOne({ code });
    const guestCode = await GuestCode.findOne({ code, used: false });
    
    const validCode = accessCode || guestCode;

    if (validCode) {
      if (guestCode) {
        guestCode.used = true;
        await guestCode.save();
      }

      await Log.create({
        timestamp: new Date(),
        code: validCode.code,
        user: validCode.user,
        unit: validCode.unit,
        success: true
      });

      res.json(validCode);
    } else {
      res.status(401).json({ error: 'Invalid code' });
    }
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new guest code
app.post('/api/guest-codes', async (req, res) => {
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
app.get('/api/access-codes', async (req, res) => {
  try {
    const accessCodes = await AccessCode.find().lean();
    res.json(accessCodes);
  } catch (error) {
    console.error('Error getting access codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add access code (admin only)
app.post('/api/access-codes', async (req, res) => {
  try {
    const { code, user, unit, isAdmin } = req.body;
    const newAccessCode = await AccessCode.create({ code, user, unit, isAdmin });
    res.json(newAccessCode);
  } catch (error) {
    console.error('Error adding access code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove access code (admin only)
app.delete('/api/access-codes/:code', async (req, res) => {
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
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).lean();
    res.json(logs);
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get guest codes (admin only)
app.get('/api/guest-codes', async (req, res) => {
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
