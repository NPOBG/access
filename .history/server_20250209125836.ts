// ... (keep all existing imports and code until the dev routes) ...

// Setup development routes first (these work even in initialization mode)
setupDevRoutes(app, isInitializationMode, checkInitializationMode);

// All other endpoints are disabled in initialization mode
const normalModeOnly = (req: Request, res: Response, next: Function) => {
  if (isInitializationMode) {
    return res.status(503).json({ 
      error: 'System is in initialization mode. Please set up admin code first.' 
    });
  }
  next();
};

// Apply normal mode middleware to all non-dev routes
app.use('/api', normalModeOnly);

// ... (keep all existing routes and server start code) ...
