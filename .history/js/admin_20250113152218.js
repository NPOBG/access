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
        // Set default values
        const now = new Date();
        const defaultTime = '14:00';
        
        // Set activation to current date with default time
        const activationDate = new Date(now);
        const [hours, minutes] = defaultTime.split(':');
        activationDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Format for datetime-local input
        const formatDateTime = (date) => {
            return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
        };

        // Set form defaults
        document.getElementById('createdBy').value = sessionStorage.getItem('adminUser') || 'Admin';
        document.getElementById('createdOn').value = now.toLocaleString();
        document.getElementById('activation').value = formatDateTime(activationDate);
        
        // Set deactivation based on type
        const setDeactivationDate = () => {
            const type = document.getElementById('type').value;
            const activationValue = document.getElementById('activation').value;
            const activationDate = new Date(activationValue);
            
            if (type === 'Guest') {
                // For guests: next day at 12:00
                const deactivationDate = new Date(activationDate);
                deactivationDate.setDate(deactivationDate.getDate() + 1);
                deactivationDate.setHours(12, 0, 0, 0);
                document.getElementById('deactivation').value = formatDateTime(deactivationDate);
            } else if (['Admin', 'Host', 'Resident'].includes(type)) {
                // For admin/host/resident: no default deactivation
                document.getElementById('deactivation').value = '';
            } else {
                // For visitors: same as activation (one-time use)
                document.getElementById('deactivation').value = document.getElementById('activation').value;
            }
        };

        // Set initial deactivation
        setDeactivationDate();

        // Add listener for type changes
        document.getElementById('type').addEventListener('change', setDeactivationDate);
        
        // Add listener for activation changes
        document.getElementById('activation').addEventListener('change', setDeactivationDate);

        this.modal.classList.add('active');
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.addCodeForm.reset();
        
        // Remove event listeners
        document.getElementById('type').removeEventListener('change', this.setDeactivationDate);
        document.getElementById('activation').removeEventListener('change', this.setDeactivationDate);
    }

    async handleAddCode() {
        const code = document.getElementById('code').value;
        const name = document.getElementById('name').value;
        const type = document.getElementById('type').value;
        const activation = new Date(document.getElementById('activation').value);
        const deactivationInput = document.getElementById('deactivation').value;
        const deactivation = deactivationInput ? new Date(deactivationInput) : null;
        const createdBy = document.getElementById('createdBy').value;
        const createdOn = new Date(document.getElementById('createdOn').value);

        // Validate code format
        if (!/^\d{4,6}$/.test(code)) {
            alert('Code must be 4-6 digits');
            return;
        }

        // Validate dates
        if (deactivation && deactivation <= activation) {
            alert('Deactivation date must be after activation date');
            return;
        }

        try {
            // Check if code already exists
            const existingCodes = await window.doorAPI.getAccessCodes();
            if (existingCodes.some(c => c.code === code)) {
                alert('This code already exists');
                return;
            }

            await window.doorAPI.addAccessCode({
                code,
                name,
                type,
                activation: activation.toISOString(),
                deactivation: deactivation ? deactivation.toISOString() : null,
                createdBy,
                createdOn: createdOn.toISOString()
            });
            
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
            this.codesList.innerHTML = codes.map(code => {
                const activation = new Date(code.activation);
                const deactivation = code.deactivation ? new Date(code.deactivation) : null;
                const createdOn = new Date(code.createdOn);
                
                return `
                    <div class="code-item">
                        <div class="code-details">
                            <div class="code-main">
                                <span class="code-number">${code.code}</span>
                                <span class="code-type ${code.type.toLowerCase()}">${code.type}</span>
                            </div>
                            <div class="code-info">
                                <div>Name: ${code.name}</div>
                                <div>Created by: ${code.createdBy} on ${createdOn.toLocaleString()}</div>
                                <div>Activation: ${activation.toLocaleString()}</div>
                                ${deactivation ? `<div>Deactivation: ${deactivation.toLocaleString()}</div>` : 
                                               `<div>Deactivation: One-time use</div>`}
                            </div>
                        </div>
                        <button class="delete-btn" onclick="window.adminPanel.deleteCode('${code.code}')">
                            Delete
                        </button>
                    </div>
                `;
            }).join('');
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
