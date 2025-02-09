"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessCode = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const accessCodeSchema = new mongoose_1.default.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: (v) => /^\d{6}$/.test(v),
            message: 'Code must be exactly 6 digits'
        }
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['Admin', 'Host', 'Resident', 'Guest'],
        default: 'Guest'
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    properties: [{
            type: String,
            ref: 'Property' // Reference to future Property model
        }],
    units: [{
            type: String,
            ref: 'Unit' // Reference to future Unit model
        }],
    doors: [{
            type: String,
            ref: 'Door' // Reference to future Door model
        }],
    createdBy: {
        type: String,
        ref: 'AccessCode'
    },
    validFrom: {
        type: Date,
        default: Date.now
    },
    validUntil: {
        type: Date
    },
    lastUsed: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
});
// Middleware to automatically set isAdmin based on type
accessCodeSchema.pre('save', function (next) {
    if (this.isModified('type')) {
        this.isAdmin = this.type === 'Admin';
    }
    next();
});
// Type definitions for hierarchy levels
const typeHierarchy = {
    'Admin': 4,
    'Host': 3,
    'Resident': 2,
    'Guest': 1
};
// Method to check if code has access to a specific door
accessCodeSchema.methods.canAccessDoor = function (doorId) {
    var _a;
    // Admins can access all doors
    if (this.type === 'Admin')
        return true;
    // Direct door access
    if ((_a = this.doors) === null || _a === void 0 ? void 0 : _a.includes(doorId))
        return true;
    // TODO: Check property and unit access when those models are implemented
    return false;
};
// Method to check if code can manage another code
accessCodeSchema.methods.canManage = function (otherCode) {
    var _a, _b;
    // Can't manage codes of same or higher level
    if (typeHierarchy[this.type] <= typeHierarchy[otherCode.type]) {
        return false;
    }
    // Admin can manage all codes
    if (this.type === 'Admin')
        return true;
    // Host can manage their property's codes
    if (this.type === 'Host') {
        return (_a = this.properties) === null || _a === void 0 ? void 0 : _a.some((p) => {
            var _a, _b;
            return ((_a = otherCode.properties) === null || _a === void 0 ? void 0 : _a.includes(p)) ||
                ((_b = otherCode.units) === null || _b === void 0 ? void 0 : _b.some((u) => { var _a; return (_a = this.units) === null || _a === void 0 ? void 0 : _a.includes(u); }));
        });
    }
    // Resident can only manage their guests
    if (this.type === 'Resident') {
        return otherCode.type === 'Guest' &&
            ((_b = this.units) === null || _b === void 0 ? void 0 : _b.some((u) => { var _a; return (_a = otherCode.units) === null || _a === void 0 ? void 0 : _a.includes(u); }));
    }
    return false;
};
exports.AccessCode = mongoose_1.default.model('AccessCode', accessCodeSchema);
