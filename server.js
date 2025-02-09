"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var mongoose = require("mongoose");
var cors = require("cors");
var config_1 = require("./config");
var app = express();
// Middleware
app.use(cors({
    origin: 'http://localhost:8000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-admin-code', 'x-session-id']
}));
app.use(express.json());
app.use(express.static('.'));
// Admin access middleware
var verifyAdmin = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var code, adminCode, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                code = req.headers['x-admin-code'] || req.query.code || req.body.code;
                console.log('Received admin code:', code);
                if (!code) {
                    console.log('No admin code provided');
                    return [2 /*return*/, res.status(401).json({ error: 'Admin code required' })];
                }
                return [4 /*yield*/, AccessCode.findOne({ code: code, isAdmin: true })];
            case 1:
                adminCode = _a.sent();
                if (!adminCode) {
                    console.log('Invalid admin code:', code);
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid admin code' })];
                }
                console.log('Admin code verified successfully');
                next();
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('Admin verification error:', error_1);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
// Connect to MongoDB
mongoose.connect(config_1.MONGODB_URI)
    .then(function () { return console.log('Connected to MongoDB'); })
    .catch(function (err) { return console.error('MongoDB connection error:', err); });
var AccessCode = mongoose.model('AccessCode', new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }
}));
var Log = mongoose.model('Log', new mongoose.Schema({
    code: String,
    name: String,
    type: String,
    success: Boolean,
    timestamp: { type: Date, default: Date.now }
}));
// Verify access code
app.post('/api/verify', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var code, sessionId, sessionTimestamp, accessCode, session, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                code = req.body.code;
                sessionId = req.headers['x-session-id'] || '';
                sessionTimestamp = req.headers['x-session-timestamp'] || Date.now();
                // Validate code format
                if (!code || typeof code !== 'string' || code.length < 4 || code.length > 6 || !/^\d+$/.test(code)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid code format' })];
                }
                return [4 /*yield*/, AccessCode.findOne({ code: code })];
            case 1:
                accessCode = _a.sent();
                if (!!accessCode) return [3 /*break*/, 3];
                return [4 /*yield*/, Log.create({ code: code, name: 'Unknown', type: 'Unknown', success: false })];
            case 2:
                _a.sent();
                return [2 /*return*/, res.status(401).json({ error: 'Invalid code' })];
            case 3: return [4 /*yield*/, Log.create({
                    code: accessCode.code,
                    name: accessCode.name,
                    type: accessCode.type,
                    success: true
                })];
            case 4:
                _a.sent();
                session = {
                    id: sessionId || Math.random().toString(36).substring(2, 15),
                    timestamp: Date.now()
                };
                res.json(__assign(__assign({}, accessCode.toObject()), { session: session }));
                return [3 /*break*/, 6];
            case 5:
                error_2 = _a.sent();
                console.error('Error verifying code:', error_2);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Create guest code
app.post('/api/guest-codes', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var code, guestCode, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                code = Math.floor(100000 + Math.random() * 900000).toString();
                return [4 /*yield*/, AccessCode.create({
                        code: code,
                        name: 'Guest',
                        type: 'Temporary',
                        isAdmin: false
                    })];
            case 1:
                guestCode = _a.sent();
                res.json(guestCode);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('Error creating guest code:', error_3);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Toggle door state
app.post('/api/toggle-door', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        try {
            // Simulate door toggle
            res.json({ success: true, message: 'Door toggled successfully' });
        }
        catch (error) {
            console.error('Error toggling door:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
        return [2 /*return*/];
    });
}); });
// Get all access codes (admin only)
app.get('/api/access-codes', verifyAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var accessCodes, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, AccessCode.find()];
            case 1:
                accessCodes = _a.sent();
                res.json(accessCodes);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('Error getting access codes:', error_4);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Add new access code (admin only)
app.post('/api/access-codes', verifyAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, code, name_1, type, newCode, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, code = _a.code, name_1 = _a.name, type = _a.type;
                // Validate input
                if (!code || !name_1 || !type) {
                    return [2 /*return*/, res.status(400).json({ error: 'Missing required fields' })];
                }
                return [4 /*yield*/, AccessCode.create({ code: code, name: name_1, type: type })];
            case 1:
                newCode = _b.sent();
                res.json(newCode);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _b.sent();
                console.error('Error adding access code:', error_5);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Remove access code (admin only)
app.delete('/api/access-codes/:code', verifyAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var code, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                code = req.params.code;
                return [4 /*yield*/, AccessCode.findOneAndDelete({ code: code })];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                console.error('Error removing access code:', error_6);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Get access logs (admin only)
app.get('/api/logs', verifyAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var logs, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, Log.find().sort({ timestamp: -1 })];
            case 1:
                logs = _a.sent();
                res.json(logs);
                return [3 /*break*/, 3];
            case 2:
                error_7 = _a.sent();
                console.error('Error getting logs:', error_7);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Start server
app.listen(config_1.PORT, function () {
    console.log("Server running on port ".concat(config_1.PORT));
});
