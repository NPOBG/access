"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemConfig = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const systemConfigSchema = new mongoose_1.default.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose_1.default.Schema.Types.Mixed, required: true }
});
exports.SystemConfig = mongoose_1.default.model('SystemConfig', systemConfigSchema);
