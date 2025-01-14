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

    refreshData() {
        this.displayAccessCodes();
        this.displayLogs();
    }

    openModal() {
        this.modal.classList.add('active');
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.addCodeForm.reset();
    }

    handleAddCode() {
        const code = document.getElementById('code').value;
        const user = document.getElementById('user').value;
        const unit = document.getElementById('unit').value;
        const isAdmin = document.getElementById('isAdmin').checked;

        // Validate code format
        if (!/^\d{4,6}$/.test(code)) {
            alert('Code must be 4-6 digits');
            return;
        }

        // Check if code already exists
        const existingCodes = window.doorAPI.getAccessCodes();
        if (existingCodes.some(c => c.code === code)) {
            alert('This code already exists');
            return;
        }

        window.doorAPI.addAccessCode(code, user, unit, isAdmin);
        this.closeModal();
        this.displayAccessCodes();
    }

    displayAccessCodes() {
        const codes = window.doorAPI.getAccessCodes();
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
    }

    deleteCode(code) {
        // Prevent deleting the last admin code
        const codes = window.doorAPI.getAccessCodes();
        const adminCodes = codes.filter(c => c.isAdmin);
        const targetCode = codes.find(c => c.code === code);

        if (targetCode.isAdmin && adminCodes.length === 1) {
            alert('Cannot delete the last admin code');
            return;
        }

        if (confirm('Are you sure you want to delete this code?')) {
            window.doorAPI.removeAccessCode(code);
            this.displayAccessCodes();
        }
    }

    displayLogs() {
        const logs = window.doorAPI.getLogs();
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
