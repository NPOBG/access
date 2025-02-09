const { MongoClient } = require('mongodb');

async function cleanDatabase() {
    const url = 'mongodb://localhost:27017';
    const dbName = 'dooraccess';
    
    try {
        const client = await MongoClient.connect(url);
        console.log('Connected to MongoDB');
        
        const db = client.db(dbName);
        
        // Drop the entire database
        await db.dropDatabase();
        console.log(`Database '${dbName}' has been dropped`);
        
        await client.close();
        console.log('MongoDB connection closed');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

cleanDatabase();
