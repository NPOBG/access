const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config');

async function cleanDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all collections
        const collections = await mongoose.connection.db.collections();

        // Drop each collection
        for (let collection of collections) {
            await collection.drop();
            console.log(`Dropped collection: ${collection.collectionName}`);
        }

        console.log('Database cleaned successfully');
    } catch (error) {
        console.error('Error cleaning database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

cleanDatabase();
