import mongoose from 'mongoose';

export interface IAccessCode {
    code: string;
    name: string;
    type: 'Admin' | 'Host' | 'Resident' | 'Guest';
    isAdmin: boolean;
    properties?: string[];  // Property IDs this code can access
    units?: string[];      // Unit IDs this code can access
    doors?: string[];      // Door IDs this code can access
    createdBy?: string;    // Code ID of the user who created this code
    validFrom?: Date;      // When this code becomes active
    validUntil?: Date;     // When this code expires (especially for guests)
    lastUsed?: Date;       // Last time this code was used
    isActive: boolean;     // Whether this code is currently active
}

const accessCodeSchema = new mongoose.Schema<IAccessCode>({
    code: { 
        type: String, 
        required: true, 
        unique: true,
        validate: {
            validator: (v: string) => /^\d{6}$/.test(v),
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
        ref: 'Property'  // Reference to future Property model
    }],
    units: [{ 
        type: String,
        ref: 'Unit'      // Reference to future Unit model
    }],
    doors: [{ 
        type: String,
        ref: 'Door'      // Reference to future Door model
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
accessCodeSchema.pre('save', function(next) {
    if (this.isModified('type')) {
        this.isAdmin = this.type === 'Admin';
    }
    next();
});

// Method to check if code has access to a specific door
accessCodeSchema.methods.canAccessDoor = function(doorId: string): boolean {
    // Admins can access all doors
    if (this.type === 'Admin') return true;

    // Direct door access
    if (this.doors?.includes(doorId)) return true;

    // TODO: Check property and unit access when those models are implemented
    return false;
};

// Method to check if code can manage another code
accessCodeSchema.methods.canManage = function(otherCode: IAccessCode): boolean {
    const typeHierarchy = {
        'Admin': 4,
        'Host': 3,
        'Resident': 2,
        'Guest': 1
    };

    // Can't manage codes of same or higher level
    if (typeHierarchy[this.type] <= typeHierarchy[otherCode.type]) {
        return false;
    }

    // Admin can manage all codes
    if (this.type === 'Admin') return true;

    // Host can manage their property's codes
    if (this.type === 'Host') {
        return this.properties?.some(p => 
            otherCode.properties?.includes(p) || 
            otherCode.units?.some(u => this.units?.includes(u))
        );
    }

    // Resident can only manage their guests
    if (this.type === 'Resident') {
        return otherCode.type === 'Guest' && 
               this.units?.some(u => otherCode.units?.includes(u));
    }

    return false;
};

export const AccessCode = mongoose.model<IAccessCode>('AccessCode', accessCodeSchema);
