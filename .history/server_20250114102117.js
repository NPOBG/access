const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = 8000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/door-access', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// MongoDB Models
const AccessCode = mongoose.model('AccessCode', new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    user: { type: String, required: true },
    unit: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }
}));

const GuestCode = mongoose.model('GuestCode', new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    user: { type: String, default: 'Guest' },
    unit: { type: String, default: 'Guest Access' },
    created: { type: Date, default: Date.now },
    used: { type: Boolean, default: false }
}));

const Log = mongoose.model('Log',
