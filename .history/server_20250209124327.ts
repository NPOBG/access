// ... (keep all previous code until the development endpoints) ...

// Development endpoints - only available in development mode
if (process.env.NODE_ENV !== 'production') {
    app.post('/dev/reset-db', async (req: Request, res: Response) => {
        try {
            // Check if we have a database connection
            if (!mongoose.connection.db) {
                throw new Error('No database connection');
            }

            // Get all collections
            const collections = await mongoose.connection.db.collections();

            // Drop each collection
            for (let collection of collections) {
                await collection.drop();
                console.log(`Dropped collection: ${collection.collectionName}`);
            }

            // Reinitialize the default admin code
            await AccessCode.create({
                code: DEFAULT_ADMIN_CODE,
                name: 'Default Admin',
                type: 'Admin',
                isAdmin: true
            });

            // Reset initialization flag
            await SystemConfig.updateOne(
                { key: 'defaultAdminInitialized' },
                { key: 'defaultAdminInitialized', value: false },
                { upsert: true }
            );

            // Force server into initialization mode
            isInitializationMode = true;

            // Rerun initialization check
            await checkInitializationMode();

            console.log('Database reset successfully');
            res.json({ 
                success: true, 
                message: 'Database reset successfully. System is in initialization mode.'
            });
        } catch (error) {
            console.error('Error resetting database:', error);
            res.status(500).json({ 
                error: 'Failed to reset database', 
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // Add a status endpoint to check current mode
    app.get('/dev/status', async (req: Request, res: Response) => {
        try {
            if (!mongoose.connection.db) {
                throw new Error('No database connection');
            }

            const adminCode = await AccessCode.findOne({ isAdmin: true });
            const config = await SystemConfig.findOne({ key: 'defaultAdminInitialized' });
            
            res.json({
                initializationMode: isInitializationMode,
                defaultAdminInitialized: config?.value || false,
                currentAdminCode: adminCode?.code || 'none',
                isDefaultCode: adminCode?.code === DEFAULT_ADMIN_CODE,
                databaseConnected: true
            });
        } catch (error) {
            console.error('Error getting status:', error);
            res.status(500).json({ 
                error: 'Failed to get status',
                details: error instanceof Error ? error.message : 'Unknown error',
                databaseConnected: false
            });
        }
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (isInitializationMode) {
        console.log('NOTICE: Server is in initialization mode. Please set up admin code.');
    }
});
