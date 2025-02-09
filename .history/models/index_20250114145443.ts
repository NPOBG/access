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
  role: UserRole;
  unit: string;
  activationDate: Date;
  deactivationDate?: Date;
  createdBy: string;
  createdOn: Date;
}

export interface ILog extends Document {
  timestamp: Date;
  name: string;
  unit: string;
  role: UserRole;
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
  role: { 
    type: String, 
    required: true,
    enum: Object.values(UserRole)
  },
  unit: { type: String, required: true },
  activationDate: { type: Date, required: true },
  deactivationDate: { type: Date },
  createdBy: { type: String, required: true },
  createdOn: { type: Date, default: Date.now }
});

// Log Schema
const logSchema = new mongoose.Schema<ILog>({
  timestamp: { type: Date, default: Date.now },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  role: { 
    type: String,
    enum: Object.values(UserRole)
  },
  success: { type: Boolean, required: true },
  details: { type: String }
});

// Create models
export const AccessCode = mongoose.model<IAccessCode>('AccessCode', accessCodeSchema);
export const Log = mongoose.model<ILog>('Log', logSchema);
