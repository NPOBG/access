class AdminPanel {
    constructor() {
        this.api = new DoorAPI();
        this.codesList = document.getElementById('codesList');
        this.logsList = document.getElementById('logsList');
        this.addCodeForm = document.getElementById('addCodeForm');
        this.modal = document.getElementById('addCodeModal');
        
        // Initialize
        this.setupEventListeners();
        this.loadCodes();
        this.loadLogs();
        
        // Set created by and created on fields
        document.getElementById('createdBy').value = 'Admin';
        document.getElementById('createdOn').value = new Date().toLocaleString();
        
        // Set default activation time to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('activation').value = now.toISOString().slice(0, 16);
    }

    setupEventListeners() {
        // Add code button
        document.getElementById('addCodeBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Form submission
        this.addCodeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addNewCode();
        });
    }

    async loadCodes() {
        try {
            const adminCode = sessionStorage.getItem('adminCode');
            const response = await fetch('/api/access-codes', {
                headers: {
                    'x-admin-code': adminCode
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load access codes');
            }

            const codes = await response.json();
            this.renderCodes(codes);
        } catch (error) {
            console.error('Error loading codes:', error);
            this.showError('Failed to load access codes');
        }
    }

    async loadLogs() {
        try {
            const adminCode = sessionStorage.getItem('adminCode');
            const response = await fetch('/api/logs', {
                headers: {
                    'x-admin-code': adminCode
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load access logs');
            }

            const logs = await response.json();
            this.renderLogs(logs);
        } catch (error) {
            console.error('Error loading logs:', error);
            this.showError('Failed to load access logs');
        }
    }

    renderCodes(codes) {
        this.codesList.innerHTML = '';
        codes.forEach(code => {
            const codeElement = document.createElement('div');
            codeElement.className = 'code-item';
            codeElement.innerHTML = `
                <div class="code-info">
                    <span class="code">${code.code}</span>
                    <span class="name">${code.name}</span>
                    <span class="type">${code.type}</span>
                </div>
                <button class="delete-button" onclick="adminPanel.deleteCode('${code.code}')">
                    Delete
                </button>
            `;
            this.codesList.appendChild(codeElement);
        });
    }

    renderLogs(logs) {
        this.logsList.innerHTML = '';
        logs.forEach(log => {
            const logElement = document.createElement('div');
            logElement.className = 'log-item';
            logElement.innerHTML = `
                <div class="log-info">
                    <span class="time">${new Date(log.timestamp).toLocaleString()}</span>
                    <span class="code">${log.code}</span>
                    <span class="name">${log.name}</span>
                    <span class="type">${log.type}</span>
                    <span class="status ${log.success ? 'success' : 'failure'}">
                        ${log.success ? 'Success' : 'Failure'}
                    </span>
                </div>
            `;
            this.logsList.appendChild(logElement);
        });
    }

    async addNewCode() {
        try {
            const code = document.getElementById('code').value;
            const name = document.getElementById('name').value;
            const type = document.getElementById('type').value;
            
            const adminCode = sessionStorage.getItem('adminCode');
            const response = await fetch('/api/access-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-code': adminCode
                },
                body: JSON.stringify({ code, name, type })
            });

            if (!response.ok) {
                throw new Error('Failed to add new code');
            }

            await this.loadCodes();
            this.closeModal();
            this.showSuccess('New code added successfully');
        } catch (error) {
            console.error('Error adding code:', error);
            this.showError('Failed to add new code');
        }
    }

    async deleteCode(code) {
        if (!confirm('Are you sure you want to delete this code?')) {
            return;
        }

        try {
            const adminCode = sessionStorage.getItem('adminCode');
            const response = await fetch(`/api/access-codes/${code}`, {
                method: 'DELETE',
                headers: {
                    'x-admin-code': adminCode
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete code');
            }

            await this.loadCodes();
            this.showSuccess('Code deleted successfully');
        } catch (error) {
            console.error('Error deleting code:', error);
            this.showError('Failed to delete code');
        }
    }

    openModal() {
        this.modal.style.display = 'flex';
        document.getElementById('code').focus();
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.addCodeForm.reset();
    }

    showError(message) {
        const status = document.getElementById('statusMessages');
        status.textContent = message;
        status.className = 'status error';
        setTimeout(() => {
            status.className = 'status';
        }, 3000);
    }

    showSuccess(message) {
        const status = document.getElementById('statusMessages');
        status.textContent = message;
        status.className = 'status success';
        setTimeout(() => {
            status.className = 'status';
        }, 3000);
    }
}

// Initialize admin panel
const adminPanel = new AdminPanel();
window.adminPanel = adminPanel;
