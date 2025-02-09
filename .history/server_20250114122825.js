const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = 8000;

// MongoDB connection with retry logic
const connectWithRetry = async () => {
  const maxRetries = 10;
  const retryDelay = 5000; // 5 seconds
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/door-access', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('MongoDB connected successfully');
      return;
    } catch (err) {
      console.log(`MongoDB connection attempt ${i + 1} failed, retrying in ${retryDelay/1000} seconds...`);
      if (i === maxRetries - 1) {
        throw err; // Re-throw error on last attempt
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};


// MongoDB Models
const AccessCode = mongoose.model('AccessCode', new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },  // Frontend's 'name' field
    type: {  // Frontend's 'type' field
        type: String,
        required: true,
        enum: ['Admin', 'Host', 'Resident', 'Guest'],
        default: 'Guest'
    },
    user: { type: String, required: true },  // Kept for backward compatibility
    unit: { 
        type: String,
        default: function() {
            return this.type === 'Admin' ? 'Admin' : `Unit ${this.type}`;
        }
    },
    isAdmin: {
        type: Boolean,
        default: function() {
            return this.type === 'Admin';
        }
    },
    activation: { type: Date, required: true },
    deactivation: { type: Date },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, default: Date.now }
}));

const GuestCode = mongoose.model('GuestCode', new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    user: { type: String, default: 'Guest' },
    unit: { type: String, default: 'Guest Access' },
    created: { type: Date, default: Date.now },
    used: { type: Boolean, default: false }
}));

const Log = mongoose.model('Log', new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    code: { type: String, required: true },
    user: { type: String, required: true },
    unit: { type: String, required: true },
    success: { type: Boolean, required: true }
}));

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Initialize default admin code if none exists
async function initializeAdminCode() {
    const adminCode = await AccessCode.findOne({ isAdmin: true });
    if (!adminCode) {
        await AccessCode.create({
            code: '1234',
            user: 'Admin',
            unit: 'Admin',
            isAdmin: true
        });
        console.log('Created default admin code');
    }
}

// API Routes

// Verify access code
app.post('/api/verify', async (req, res) => {
    try {
        const { code } = req.body;
        const accessCode = await AccessCode.findOne({ code });
        
        if (accessCode) {
            await Log.create({
                code: accessCode.code,
                user: accessCode.user,
                unit: accessCode.unit,
                success: true
            });
            res.json(accessCode);
        } else {
            await Log.create({
                code,
                user: 'Unknown',
                unit: 'Unknown',
                success: false
            });
            res.status(401).json({ error: 'Invalid code' });
        }
    } catch (error) {
        console.error('Verification error:', error);
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
            unit: 'Guest Access'
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
        const accessCodes = await AccessCode.find();
        res.json(accessCodes);
    } catch (error) {
        console.error('Error getting access codes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add access code (admin only)
app.post('/api/access-codes', async (req, res) => {
    try {
        const { code, name, type, activation, deactivation } = req.body;
        
        // Validate required fields
        if (!code || !name || !type || !activation) {
            return res.status(400).json({ 
                error: 'Missing required fields: code, name, type, activation' 
            });
        }

        // Map frontend fields to schema
        const user = name;
        const unit = type === 'Admin' ? 'Admin' : `Unit ${type}`;
        const isAdmin = type === 'Admin';
        const createdBy = 'Admin'; // TODO: Get from session

        // Validate code format (4-6 digits)
        if (!/^\d{4,6}$/.test(code)) {
            return res.status(400).json({ 
                error: 'Code must be 4-6 digits' 
            });
        }

        // Validate activation date
        const activationDate = new Date(activation);
        if (isNaN(activationDate.getTime())) {
            return res.status(400).json({ 
                error: 'Invalid activation date format' 
            });
        }

        // Validate deactivation date if provided
        let deactivationDate = null;
        if (deactivation) {
            deactivationDate = new Date(deactivation);
            if (isNaN(deactivationDate.getTime())) {
                return res.status(400).json({ 
                    error: 'Invalid deactivation date format' 
                });
            }
            if (deactivationDate <= activationDate) {
                return res.status(400).json({ 
                    error: 'Deactivation date must be after activation date' 
                });
            }
        }

        // Check for duplicate code
        const existingCode = await AccessCode.findOne({ code });
        if (existingCode) {
            return res.status(409).json({ 
                error: 'Access code already exists' 
            });
        }

        const newAccessCode = await AccessCode.create({ 
            code, 
            user, 
            unit, 
            isAdmin: Boolean(isAdmin),
            activation: activationDate,
            deactivation: deactivationDate,
            createdBy,
            createdOn: new Date()
        });
        
        res.status(201).json(newAccessCode);
    } catch (error) {
        console.error('Error adding access code:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

// Remove access code (admin only)
app.delete('/api/access-codes/:code', async (req, res) => {
    try {
        const result = await AccessCode.deleteOne({ code: req.params.code });
        if (result.deletedCount > 0) {
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
        const logs = await Log.find().sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        console.error('Error getting logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get guest codes (admin only)
app.get('/api/guest-codes', async (req, res) => {
    try {
        const guestCodes = await GuestCode.find().sort({ created: -1 });
        res.json(guestCodes);
    } catch (error) {
        console.error('Error getting guest codes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, async () => {
    try {
        await connectWithRetry();
        console.log('\n🚪 Door Access System is running!');
        console.log(`\nAccess the app at: http://localhost:${PORT}`);
        console.log('\nPress Ctrl+C to stop the server');
        
        // Initialize default admin code
        await initializeAdminCode();
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
});
