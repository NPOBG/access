// ... (keep all imports and initial setup) ...

// Verify access code (needs to work in both modes)
app.post('/api/verify', async (req: Request, res: Response) => {
  try {
    const { code, newCode, confirmCode } = req.body;

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
      if (!newCode.match(/^\d{6}$/)) {
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
    if (!code || !code.match(/^\d{6}$/)) {
      return res.status(400).json({ error: 'Access code must be 6 digits.' });
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
const normalModeOnly = (req: Request, res: Response, next: Function): void => {
  if (isInitializationMode) {
    res.status(503).json({ 
      error: 'System is in initialization mode. Please complete admin code setup first.' 
    });
    return;
  }
  next();
};

// Apply normal mode middleware to all other API routes
app.use('/api', normalModeOnly);

// ... (keep rest of the file the same) ...
