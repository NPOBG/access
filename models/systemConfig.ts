import mongoose from 'mongoose';

export interface ISystemConfig {
    key: string;
    value: any;
}

const systemConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
});

export const SystemConfig = mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema);
