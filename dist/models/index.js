"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Log = exports.AccessCode = exports.UserRole = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Enums
var UserRole;
(function (UserRole) {
    UserRole["Admin"] = "Admin";
    UserRole["Host"] = "Host";
    UserRole["Resident"] = "Resident";
    UserRole["Guest"] = "Guest";
})(UserRole || (exports.UserRole = UserRole = {}));
// Access Code Schema
const accessCodeSchema = new mongoose_1.default.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: (v) => /^\d{4,6}$/.test(v),
            message: 'Code must be 4-6 digits'
        }
    },
    name: { type: String, required: true },
    type: { type: String, required: true },
    activation: { type: Date, required: true },
    deactivation: { type: Date },
    createdBy: { type: String, required: true },
    createdOn: { type: Date, default: Date.now },
    isAdmin: { type: Boolean, default: false }
});
// Log Schema
const logSchema = new mongoose_1.default.Schema({
    timestamp: { type: Date, default: Date.now },
    name: { type: String, required: true },
    type: { type: String, required: true },
    success: { type: Boolean, required: true },
    details: { type: String }
});
// Create models
exports.AccessCode = mongoose_1.default.model('AccessCode', accessCodeSchema);
exports.Log = mongoose_1.default.model('Log', logSchema);
