// ... (keep all imports and initial setup) ...

// Check system initialization state
async function checkInitializationMode(): Promise<void> {
  try {
    const defaultAdminConfig = await SystemConfig.findOne({ key: 'defaultAdminInitialized' });
    const adminCode = await AccessCode.findOne({ isAdmin: true });

    // System needs initialization if:
    // 1. defaultAdminInitialized is false OR doesn't exist
    // 2. AND admin code is either the default or doesn't exist
    isInitializationMode = (!defaultAdminConfig || !defaultAdminConfig.value) && 
                          (!adminCode || adminCode.code === DEFAULT_ADMIN_CODE);

    if (isInitializationMode) {
      console.log('Server starting in initialization mode');
      // Create default admin code if none exists
      if (!adminCode) {
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

// ... (keep rest of the file the same) ...
