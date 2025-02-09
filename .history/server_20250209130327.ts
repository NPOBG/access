// ... (keep all imports and initial setup) ...

// Setup development routes first (these work even in initialization mode)
setupDevRoutes(app, isInitializationMode, checkInitializationMode);

// Verify access code (needs to work in both modes)
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

// All other endpoints are disabled in initialization mode
const normalModeOnly = (req: Request, res: Response, next: Function) => {
  if (isInitializationMode) {
    return res.status(503).json({ 
      error: 'System is in initialization mode. Please set up admin code first.' 
    });
  }
  next();
};

// Apply normal mode middleware to all other API routes
const apiRouter = express.Router();

// Create guest code (normal mode only)
apiRouter.post('/guest-codes', async (req: Request, res: Response) => {
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
apiRouter.post('/toggle-door', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: 'Door toggled successfully' });
  } catch (error) {
    console.error('Error toggling door:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all access codes (admin only, normal mode only)
apiRouter.get('/access-codes', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const accessCodes = await AccessCode.find();
    res.json(accessCodes);
  } catch (error) {
    console.error('Error getting access codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new access code (admin only, normal mode only)
apiRouter.post('/access-codes', verifyAdmin, async (req: Request, res: Response) => {
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
apiRouter.delete('/access-codes/:code', verifyAdmin, async (req: Request, res: Response) => {
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
apiRouter.get('/logs', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply normal mode middleware to all other API routes
app.use('/api', normalModeOnly, apiRouter);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (isInitializationMode) {
        console.log('NOTICE: Server is in initialization mode. Please set up admin code.');
    }
});
