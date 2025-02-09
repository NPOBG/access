// ... (keep all imports and initial setup) ...

// Verify access code endpoint
app.post('/api/verify', async (req: Request, res: Response) => {
  try {
    const { code, isAdminMode, newCode, confirmCode } = req.body;

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

// ... (keep rest of the file the same) ...
