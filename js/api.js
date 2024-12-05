class DoorAPI {
    constructor() {
        this.tasmotaUrl = 'https://door12.rsl7.eu';
        this.accessCodes = this.loadAccessCodes();
        this.logs = this.loadLogs();
        this.guestCodes = this.loadGuestCodes();
    }

    // Load access codes from local storage
    loadAccessCodes() {
        const codes = localStorage.getItem('accessCodes');
        return codes ? JSON.parse(codes) : [
            // Default admin code
            {
                code: '1234',
                user: 'Admin',
                unit: 'Admin',
                isAdmin: true
            }
        ];
    }

    // Load guest codes from local storage
    loadGuestCodes() {
        const codes = localStorage.getItem('guestCodes');
        return codes ? JSON.parse(codes) : [];
    }

    // Load logs from local storage
    loadLogs() {
        const logs = localStorage.getItem('accessLogs');
        return logs ? JSON.parse(logs) : [];
    }

    // Save access codes to local storage
    saveAccessCodes(codes) {
        localStorage.setItem('accessCodes', JSON.stringify(codes));
        this.accessCodes = codes;
    }

    // Save guest codes to local storage
    saveGuestCodes(codes) {
        localStorage.setItem('guestCodes', JSON.stringify(codes));
        this.guestCodes = codes;
    }

    // Save logs to local storage
    saveLogs(logs) {
        localStorage.setItem('accessLogs', JSON.stringify(logs));
        this.logs = logs;
    }

    // Generate a random 6-digit code
    generateGuestCode() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    // Create a new guest code
    createGuestCode() {
        // Clean up expired guest codes first
        this.cleanupGuestCodes();

        const code = this.generateGuestCode();
        const guestCode = {
            code: code,
            user: 'Guest',
            unit: 'Guest Access',
            created: new Date().toISOString(),
            used: false
        };
        
        const codes = this.loadGuestCodes();
        codes.push(guestCode);
        this.saveGuestCodes(codes);
        
        return code;
    }

    // Clean up expired guest codes
    cleanupGuestCodes() {
        const codes = this.loadGuestCodes();
        // Remove used codes
        const activeCodes = codes.filter(code => !code.used);
        this.saveGuestCodes(activeCodes);
    }

    // Verify access code
    verifyCode(code) {
        // First check regular access codes
        const accessCode = this.accessCodes.find(ac => ac.code === code);
        if (accessCode) {
            this.logAccess(accessCode, true);
            return accessCode;
        }

        // Then check guest codes
        const guestCodes = this.loadGuestCodes();
        const guestCode = guestCodes.find(gc => gc.code === code && !gc.used);
        
        if (guestCode) {
            // Mark guest code as used
            guestCode.used = true;
            guestCode.usedAt = new Date().toISOString();
            this.saveGuestCodes(guestCodes);
            
            this.logAccess({
                code: code,
                user: 'Guest',
                unit: 'Guest Access'
            }, true);
            
            return guestCode;
        }

        // Log failed attempt
        this.logAccess({ code }, false);
        return null;
    }

    // Log access attempt
    logAccess(accessCode, success) {
        const log = {
            timestamp: new Date().toISOString(),
            code: accessCode.code,
            user: accessCode.user || 'Unknown',
            unit: accessCode.unit || 'Unknown',
            success: success
        };
        
        const logs = this.loadLogs();
        logs.unshift(log);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.pop();
        }
        
        this.saveLogs(logs);
    }

    // Toggle door lock via Tasmota switch
    async toggleDoor() {
        try {
            // Send toggle command to Tasmota switch
            const response = await fetch(`${this.tasmotaUrl}/cm?cmnd=Power%20TOGGLE`, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-cache',
                credentials: 'omit',
                headers: {
                    'Accept': '*/*'
                }
            });
            
            console.log('Door toggled successfully');
            return true;
        } catch (error) {
            console.error('Door toggle error:', error);
            return false;
        }
    }

    // Add new access code
    addAccessCode(code, user, unit, isAdmin = false) {
        const codes = this.loadAccessCodes();
        codes.push({ code, user, unit, isAdmin });
        this.saveAccessCodes(codes);
    }

    // Remove access code
    removeAccessCode(code) {
        const codes = this.loadAccessCodes().filter(ac => ac.code !== code);
        this.saveAccessCodes(codes);
    }

    // Get all logs
    getLogs() {
        return this.loadLogs();
    }

    // Get all access codes
    getAccessCodes() {
        return this.loadAccessCodes();
    }

    // Get all guest codes
    getGuestCodes() {
        return this.loadGuestCodes();
    }
}

// Create global instance
window.doorAPI = new DoorAPI();
