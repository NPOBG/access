import express = require('express');
import { Request, Response } from 'express';
import mongoose = require('mongoose');
import cors = require('cors');
import { MONGODB_URI, PORT } from './config';

const DEFAULT_ADMIN_CODE = '123456';
let isDefaultCodeActive = true; // Track if the default code is active

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:8000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-admin-code', 'x-session-id']
}));
app.use(express.json());
app.use(express.static('.'));

// Admin access middleware
const verifyAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    const code = req.headers['x-admin-code'] || req.query.code || req.body.code;
    
    console.log('Received admin code:', code);
    if (!code) {
      console.log('No admin code provided');
      return res.status(401).json({ error: 'Admin code required' });
    }

    // Check if the default admin code is being used
    if (isDefaultCodeActive && code === DEFAULT_ADMIN_CODE) {
      // Prompt for new admin code
      const { newCode, confirmCode } = req.body; // Expecting new codes in the request body
      if (!newCode || !confirmCode || newCode !== confirmCode) {
        return res.status(400).json({ error: 'New codes must match and cannot be empty' });
      }

      // Store the new admin code in the database
      await AccessCode.create({ code: newCode, name: 'Admin', type: 'Permanent', isAdmin: true });
      isDefaultCodeActive = false; // Deactivate the default code
      console.log('Default admin code has been replaced with a new code');
      return res.json({ message: 'Admin code updated successfully' });
    }

    // Check if code exists in database and is marked as admin
    const adminCode = await AccessCode.findOne({ code, isAdmin: true });
    if (!adminCode) {
      console.log('Invalid admin code:', code);
      return res.status(401).json({ error: 'Invalid admin code' });
    }
    console.log('Admin code verified successfully');
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware
app.use(cors({
  origin: 'http://localhost:8000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-admin-code', 'x-session-id']
}));
app.use(express.json());
app.use(express.static('.'));

// Admin access middleware
const verifyAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    const code = req.headers['x-admin-code'] || req.query.code || req.body.code;
    
    console.log('Received admin code:', code);
    if (!code) {
      console.log('No admin code provided');
      return res.status(401).json({ error: 'Admin code required' });
    }

    // Check if code exists in database and is marked as admin
    const adminCode = await AccessCode.findOne({ code, isAdmin: true });
    if (!adminCode) {
      console.log('Invalid admin code:', code);
      return res.status(401).json({ error: 'Invalid admin code' });
    }
    console.log('Admin code verified successfully');
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Models
interface IAccessCode {
  code: string;
  name: string;
  type: string;
  isAdmin?: boolean;
}

const AccessCode = mongoose.model<IAccessCode>('AccessCode', new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }
}));

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

// Verify access code
app.post('/api/verify', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const sessionId = req.headers['x-session-id'] || '';
    const sessionTimestamp = req.headers['x-session-timestamp'] || Date.now();
    
    // Validate code format
    if (!code || typeof code !== 'string' || code.length < 4 || code.length > 6 || !/^\d+$/.test(code)) {
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

    // Create new session data
    const session = {
      id: sessionId || Math.random().toString(36).substring(2, 15),
      timestamp: Date.now()
    };

    res.json({
      ...accessCode.toObject(),
      session
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create guest code
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

// Toggle door state
app.post('/api/toggle-door', async (req: Request, res: Response) => {
  try {
    // Simulate door toggle
    res.json({ success: true, message: 'Door toggled successfully' });
  } catch (error) {
    console.error('Error toggling door:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all access codes (admin only)
app.get('/api/access-codes', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const accessCodes = await AccessCode.find();
    res.json(accessCodes);
  } catch (error) {
    console.error('Error getting access codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new access code (admin only)
app.post('/api/access-codes', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { code, name, type } = req.body;

    // Validate input
    if (!code || !name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newCode = await AccessCode.create({ code, name, type });
    res.json(newCode);
  } catch (error) {
    console.error('Error adding access code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove access code (admin only)
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

// Get access logs (admin only)
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
});
