import mongoose, { Document } from 'mongoose';

// Enums
export enum UserRole {
  Admin = 'Admin',
  Host = 'Host',
  Resident = 'Resident',
  Guest = 'Guest'
}

// Interfaces
export interface IAccessCode extends Document {
  code: string;
  name: string;
  type: string;
  activation: Date;
  deactivation?: Date;
  createdBy: string;
  createdOn: Date;
  isAdmin?: boolean;
}

export interface ILog extends Document {
  timestamp: Date;
  name: string;
  type: string;
  success: boolean;
  details?: string;
}

// Access Code Schema
const accessCodeSchema = new mongoose.Schema<IAccessCode>({
  code: { 
    type: String, 
    required: true, 
    unique: true,
    validate: {
      validator: (v: string) => /^\d{4,6}$/.test(v),
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
const logSchema = new mongoose.Schema<ILog>({
  timestamp: { type: Date, default: Date.now },
  name: { type: String, required: true },
  type: { type: String, required: true },
  success: { type: Boolean, required: true },
  details: { type: String }
});

// Create models
export const AccessCode = mongoose.model<IAccessCode>('AccessCode', accessCodeSchema);
export const Log = mongoose.model<ILog>('Log', logSchema);
