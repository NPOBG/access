import mongoose, { Document } from 'mongoose';

// Interfaces
export interface IAccessCode extends Document {
  code: string;
  user: string;
  unit: string;
  isAdmin: boolean;
}

export interface IGuestCode extends Document {
  code: string;
  user: string;
  unit: string;
  created: Date;
  used: boolean;
}

export interface ILog extends Document {
  timestamp: Date;
  code: string;
  user: string;
  unit: string;
  success: boolean;
}

// Access Code Schema
const accessCodeSchema = new mongoose.Schema<IAccessCode>({
  code: { type: String, required: true, unique: true },
  user: { type: String, required: true },
  unit: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }
});

// Guest Code Schema
const guestCodeSchema = new mongoose.Schema<IGuestCode>({
  code: { type: String, required: true, unique: true },
  user: { type: String, required: true },
  unit: { type: String, required: true },
  created: { type: Date, default: Date.now },
  used: { type: Boolean, default: false }
});

// Log Schema
const logSchema = new mongoose.Schema<ILog>({
  timestamp: { type: Date, default: Date.now },
  code: { type: String, required: true },
  user: { type: String, required: true },
  unit: { type: String, required: true },
  success: { type: Boolean, required: true }
});

// Create models
export const AccessCode = mongoose.model<IAccessCode>('AccessCode', accessCodeSchema);
export const GuestCode = mongoose.model<IGuestCode>('GuestCode', guestCodeSchema);
export const Log = mongoose.model<ILog>('Log', logSchema);
