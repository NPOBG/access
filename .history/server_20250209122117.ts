// ... (previous imports and initial setup remain the same) ...

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

// ... (rest of the file remains the same) ...
