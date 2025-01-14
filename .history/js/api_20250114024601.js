class DoorAPI {
    constructor() {
        this.tasmotaUrl = 'https://door12.rsl7.eu';
        this.apiBaseUrl = window.location.origin;
    }

    // Helper method for API calls
    async fetchAPI(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Add admin session token if available
        const adminSession = sessionStorage.getItem('adminSession');
        if (adminSession) {
            const sessionData = JSON.parse(adminSession);
            headers['X-Admin-Session'] = sessionData.code;
            headers['X-Admin-Timestamp'] = sessionData.timestamp;
        }

        const response = await fetch(`${this.apiBaseUrl}/api/${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }

        return response.json();
    }

    // Verify access code
    async verifyCode(code) {
        try {
            // Get current session data
            const session = JSON.parse(sessionStorage.getItem('currentSession') || '{}');
            
            const result = await this.fetchAPI('verify', {
                method: 'POST',
                body: JSON.stringify({ code }),
                headers: {
                    'X-Session-Id': session.id || '',
                    'X-Session-Timestamp': session.timestamp || Date.now()
                }
            });
            
            // Update session storage with new session data
            if (result.session) {
                sessionStorage.setItem('currentSession', JSON.stringify(result.session));
            }
            
            return result;
        } catch (error) {
            if (error.message.includes('401')) {
                console.error('Authentication failed - please try again');
                sessionStorage.removeItem('currentSession');
                throw new Error('Authentication failed');
            }
            console.error('Verification error:', error);
            throw error;
        }
    }

    // Create a new guest code
    async createGuestCode() {
        try {
            const result = await this.fetchAPI('guest-codes', {
                method: 'POST'
            });
            return result.code;
        } catch (error) {
            console.error('Guest code creation error:', error);
            return null;
        }
    }

    // Add new access code (admin only)
    async addAccessCode(codeData) {
        try {
            await this.fetchAPI('access-codes', {
                method: 'POST',
                body: JSON.stringify({
                    code: codeData.code,
                    name: codeData.name,
                    type: codeData.type,
                    activation: codeData.activation,
                    deactivation: codeData.deactivation,
                    createdBy: codeData.createdBy,
                    createdOn: codeData.createdOn,
                    isAdmin: codeData.type === 'Admin'
                })
            });
        } catch (error) {
            console.error('Add access code error:', error);
            throw error;
        }
    }

    // Remove access code (admin only)
    async removeAccessCode(code) {
        try {
            await this.fetchAPI(`access-codes/${code}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Remove access code error:', error);
            throw error;
        }
    }

    // Get all logs (admin only)
    async getLogs() {
        try {
            return await this.fetchAPI('logs');
        } catch (error) {
            console.error('Get logs error:', error);
            return [];
        }
    }

    // Get all access codes (admin only)
    async getAccessCodes() {
        try {
            const response = await this.fetchAPI('access-codes');
            if (!Array.isArray(response)) {
                console.error('Invalid access codes response:', response);
                return [];
            }
            return response;
        } catch (error) {
            console.error('Get access codes error:', error);
            return [];
        }
    }

    // Get all guest codes (admin only)
    async getGuestCodes() {
        try {
            return await this.fetchAPI('guest-codes');
        } catch (error) {
            console.error('Get guest codes error:', error);
            return [];
        }
    }

    // Toggle door lock via Tasmota switch
    async toggleDoor() {
        try {
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
}

// Create global instance
window.doorAPI = new DoorAPI();
