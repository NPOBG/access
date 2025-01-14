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
        const form = document.getElementById('addCodeForm');
        const submitButton = form.querySelector('.submit-button');
        const originalButtonText = submitButton.textContent;
        
        try {
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
                this.showError('Code must be 4-6 digits');
                return;
            }

            // Validate dates
            if (deactivation && deactivation <= activation) {
                this.showError('Deactivation date must be after activation date');
                return;
            }

            // Add loading state
            form.classList.add('form-loading');
            submitButton.textContent = 'Adding...';

            // Check if code exists
            const existingCodes = await window.doorAPI.getAccessCodes();
            if (existingCodes.some(c => c.code === code)) {
                this.showError('This code already exists');
                return;
            }

            // Add the code
            await window.doorAPI.addAccessCode({
                code,
                name,
                type,
                activation: activation.toISOString(),
                deactivation: deactivation ? deactivation.toISOString() : null,
                createdBy,
                createdOn: createdOn.toISOString()
            });

            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message slide-up';
            successMessage.textContent = 'Code added successfully!';
            form.insertBefore(successMessage, form.firstChild);

            // Close modal after delay
            setTimeout(() => {
                this.closeModal();
                this.displayAccessCodes();
            }, 1500);

        } catch (error) {
            console.error('Error adding code:', error);
            this.showError('Failed to add code. Please try again.');
        } finally {
            // Remove loading state
            form.classList.remove('form-loading');
            submitButton.textContent = originalButtonText;
        }
    }

    showError(message) {
        const form = document.getElementById('addCodeForm');
        const existingError = form.querySelector('.error');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error slide-up';
        errorDiv.textContent = message;
        form.insertBefore(errorDiv, form.firstChild);

        // Remove error after 3 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    async displayAccessCodes() {
        // Add loading state
        this.codesList.innerHTML = '<div class="loading"></div>';
        
        try {
            const codes = await window.doorAPI.getAccessCodes();
            
            if (codes.length === 0) {
                this.codesList.innerHTML = `
                    <div class="empty-state fade-in">
                        No access codes found. Click "Add New Code" to create one.
                    </div>
                `;
                return;
            }
            
            this.codesList.innerHTML = codes.map(code => {
                const activation = new Date(code.activation);
                const deactivation = code.deactivation ? new Date(code.deactivation) : null;
                const createdOn = new Date(code.createdOn);
                
                return `
                    <div class="code-item" data-code="${code.code}">
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
            // Create confirmation dialog
            const dialog = document.createElement('div');
            dialog.className = 'modal active';
            dialog.setAttribute('data-type', 'confirmation');
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-labelledby', 'dialog-title');
            dialog.setAttribute('aria-describedby', 'dialog-description');
            
            dialog.innerHTML = `
                <div class="modal-content confirmation-dialog">
                    <h3 id="dialog-title">Delete Access Code</h3>
                    <p id="dialog-description">Are you sure you want to delete this access code? This action cannot be undone.</p>
                    <div class="form-actions">
                        <button class="cancel-button" aria-label="Cancel deletion">Cancel</button>
                        <button class="delete-button" aria-label="Confirm deletion">Delete</button>
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);

            // Handle dialog actions
            const result = await new Promise((resolve) => {
                const cancelBtn = dialog.querySelector('.cancel-button');
                const deleteBtn = dialog.querySelector('.delete-button');

                // Focus the cancel button by default (safer option)
                cancelBtn.focus();

                const handleKeydown = (e) => {
                    if (e.key === 'Escape') {
                        dialog.remove();
                        resolve(false);
                    } else if (e.key === 'Enter' && document.activeElement === deleteBtn) {
                        dialog.remove();
                        resolve(true);
                    } else if (e.key === 'Tab') {
                        // Trap focus within dialog
                        if (!e.shiftKey && document.activeElement === deleteBtn) {
                            e.preventDefault();
                            cancelBtn.focus();
                        } else if (e.shiftKey && document.activeElement === cancelBtn) {
                            e.preventDefault();
                            deleteBtn.focus();
                        }
                    }
                };

                dialog.addEventListener('keydown', handleKeydown);
                
                cancelBtn.addEventListener('click', () => {
                    dialog.remove();
                    resolve(false);
                });

                deleteBtn.addEventListener('click', () => {
                    dialog.remove();
                    resolve(true);
                });

                // Click outside to cancel
                dialog.addEventListener('click', (e) => {
                    if (e.target === dialog) {
                        dialog.remove();
                        resolve(false);
                    }
                });
            });

            if (!result) return;

            // Check if it's the last admin code
            const codes = await window.doorAPI.getAccessCodes();
            const adminCodes = codes.filter(c => c.isAdmin);
            const targetCode = codes.find(c => c.code === code);

            if (targetCode.isAdmin && adminCodes.length === 1) {
                this.showError('Cannot delete the last admin code');
                return;
            }

            // Add loading state to the code item
            const codeItem = document.querySelector(`[data-code="${code}"]`);
            if (codeItem) {
                codeItem.classList.add('deleting');
            }

            // Delete the code
            await window.doorAPI.removeAccessCode(code);
            
            // Refresh the list
            await this.displayAccessCodes();

        } catch (error) {
            console.error('Error deleting code:', error);
            this.showError('Failed to delete code. Please try again.');
        }
    }

    async displayLogs() {
        // Add loading state
        this.logsList.innerHTML = '<div class="loading"></div>';
        
        try {
            const logs = await window.doorAPI.getLogs();
            
            if (logs.length === 0) {
                this.logsList.innerHTML = `
                    <div class="empty-state fade-in">
                        No access logs found yet.
                    </div>
                `;
                return;
            }
            
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
