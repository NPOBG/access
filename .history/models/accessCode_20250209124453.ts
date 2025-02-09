import mongoose from 'mongoose';

export interface IAccessCode {
    code: string;
    name: string;
    type: string;
    isAdmin?: boolean;
}

const accessCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }
});

export const AccessCode = mongoose.model<IAccessCode>('AccessCode', accessCodeSchema);
