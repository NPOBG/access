class AdminPanel {
    constructor() {
        this.modal = document.getElementById('addCodeModal');
        this.addCodeForm = document.getElementById('addCodeForm');
        this.addCodeBtn = document.getElementById('addCodeBtn');
        this.codesList = document.getElementById('codesList');
        this.logsList = document.getElementById('logsList');

        this.setupEventListeners();
        this.refreshData();
    }

    setupEventListeners() {
        // Add code button
        this.addCodeBtn.addEventListener('click', () => this.openModal());

        // Form submission
        this.addCodeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCode();
        });

        // Refresh data every 30 seconds
        setInterval(() => this.refreshData(), 30000);
    }

    async refreshData() {
        try {
            await Promise.all([
                this.displayAccessCodes(),
                this.displayLogs()
            ]);
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    openModal() {
        this.modal.classList.add('active');
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.addCodeForm.reset();
    }

    async handleAddCode() {
        const code = document.getElementById('code').value;
        const user = document.getElementById('user').value;
        const unit = document.getElementById('unit').value;
        const isAdmin = document.getElementById('isAdmin').checked;

        // Validate code format
        if (!/^\d{4,6}$/.test(code)) {
            alert('Code must be 4-6 digits');
            return;
        }

        try {
            // Check if code already exists
            const existingCodes = await window.doorAPI.getAccessCodes();
            if (existingCodes.some(c => c.code === code)) {
                alert('This code already exists');
                return;
            }

            await window.doorAPI.addAccessCode(code, user, unit, isAdmin);
            this.closeModal();
            await this.displayAccessCodes();
        } catch (error) {
            console.error('Error adding code:', error);
            alert('Failed to add code. Please try again.');
        }
    }

    async displayAccessCodes() {
        try {
            const codes = await window.doorAPI.getAccessCodes();
            this.codesList.innerHTML = codes.map(code => `
                <div class="code-item">
                    <div>${code.code}</div>
                    <div>${code.user}</div>
                    <div>${code.unit}</div>
                    <button class="delete-btn" onclick="window.adminPanel.deleteCode('${code.code}')">
                        Delete
                    </button>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error displaying codes:', error);
            this.codesList.innerHTML = '<div class="error">Failed to load access codes</div>';
        }
    }

    async deleteCode(code) {
        try {
            // Prevent deleting the last admin code
            const codes = await window.doorAPI.getAccessCodes();
            const adminCodes = codes.filter(c => c.isAdmin);
            const targetCode = codes.find(c => c.code === code);

            if (targetCode.isAdmin && adminCodes.length === 1) {
                alert('Cannot delete the last admin code');
                return;
            }

            if (confirm('Are you sure you want to delete this code?')) {
                await window.doorAPI.removeAccessCode(code);
                await this.displayAccessCodes();
            }
        } catch (error) {
            console.error('Error deleting code:', error);
            alert('Failed to delete code. Please try again.');
        }
    }

    async displayLogs() {
        try {
            const logs = await window.doorAPI.getLogs();
            this.logsList.innerHTML = logs.map(log => `
                <div class="log-item">
                    <div class="timestamp">
                        ${new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div>
                        ${log.user} (${log.unit})
                    </div>
                    <div class="${log.success ? 'success' : 'failure'}">
                        ${log.success ? '✓ Access Granted' : '✗ Access Denied'}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error displaying logs:', error);
            this.logsList.innerHTML = '<div class="error">Failed to load access logs</div>';
        }
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded and parsed');
    
    // Check if user has admin access
    const urlParams = new URLSearchParams(window.location.search);
    const fromKeypad = urlParams.get('fromKeypad');
    
    if (!fromKeypad) {
        try {
            const codes = await window.doorAPI.getAccessCodes();
            const hasAdminCode = codes.some(code => code.isAdmin);
            
            if (!hasAdminCode) {
                alert('Access denied. Please use admin code at keypad.');
                window.location.href = 'index.html';
                return;
            }
        } catch (error) {
            console.error('Error checking admin access:', error);
            alert('Error checking admin access. Please try again.');
            return;
        }
    }

    console.log('Initializing AdminPanel...');
    window.adminPanel = new AdminPanel();
    console.log('AdminPanel initialized:', window.adminPanel);
});
