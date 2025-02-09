class DoorAPI {
    constructor() {
        this.baseUrl = window.location.origin;
    }

    async verifyCode(code, adminCode = null) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (adminCode) {
                headers['x-admin-code'] = adminCode;
            }

            const response = await fetch(`${this.baseUrl}/api/verify`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ code })
            });

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async generateGuestCode() {
        try {
            const response = await fetch(`${this.baseUrl}/api/guest-codes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async toggleDoor() {
        try {
            const response = await fetch(`${this.baseUrl}/api/toggle-door`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async getAccessCodes(adminCode) {
        try {
            const response = await fetch(`${this.baseUrl}/api/access-codes`, {
                headers: {
                    'x-admin-code': adminCode
                }
            });

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async addAccessCode(code, name, type, adminCode) {
        try {
            const response = await fetch(`${this.baseUrl}/api/access-codes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-code': adminCode
                },
                body: JSON.stringify({ code, name, type })
            });

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async removeAccessCode(code, adminCode) {
        try {
            const response = await fetch(`${this.baseUrl}/api/access-codes/${code}`, {
                method: 'DELETE',
                headers: {
                    'x-admin-code': adminCode
                }
            });

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async getLogs(adminCode) {
        try {
            const response = await fetch(`${this.baseUrl}/api/logs`, {
                headers: {
                    'x-admin-code': adminCode
                }
            });

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}

// Initialize API and make it globally available
window.doorAPI = new DoorAPI();
