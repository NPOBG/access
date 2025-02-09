// ... (keep all imports and initial setup) ...

// Check system initialization state
async function checkInitializationMode(): Promise<void> {
  try {
    // First, ensure we have a default admin code
    let adminCode = await AccessCode.findOne({ isAdmin: true });
    if (!adminCode) {
      console.log('Creating default admin code...');
      adminCode = await AccessCode.create({
        code: DEFAULT_ADMIN_CODE,
        name: 'Default Admin',
        type: 'Admin',
        isAdmin: true
      });
    }

    // Check if system has been initialized
    const defaultAdminConfig = await SystemConfig.findOne({ key: 'defaultAdminInitialized' });
    
    // System needs initialization if:
    // 1. defaultAdminInitialized flag is false/missing OR
    // 2. current admin code is the default one
    isInitializationMode = !defaultAdminConfig?.value || adminCode.code === DEFAULT_ADMIN_CODE;

    if (isInitializationMode) {
      console.log('Server starting in initialization mode');
      console.log('Please set up admin code using the default code (123456)');
    } else {
      console.log('Server starting in normal mode');
    }
  } catch (error) {
    console.error('Error checking initialization mode:', error);
    process.exit(1); // Exit if we can't determine the mode
  }
}

// ... (keep rest of the file the same) ...
