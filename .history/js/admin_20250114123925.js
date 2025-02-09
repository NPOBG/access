class AdminPanel {
    constructor() {
        // UI Elements
        this.modal = document.getElementById('addCodeModal');
        this.addCodeForm = document.getElementById('addCodeForm');
        this.addCodeBtn = document.getElementById('addCodeBtn');
        this.codesList = document.getElementById('codesList');
        this.logsList = document.getElementById('logsList');
        
        // Status regions
        this.statusMessages = document.getElementById('statusMessages');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.codesStatus = document.getElementById('codesStatus');
        this.logsStatus = document.getElementById('logsStatus');
        
        // Container references
        this.codesContainer = this.codesList.parentElement;
        this.logsContainer = this.logsList.parentElement;

        this.setupEventListeners();
        this.refreshData();
    }

    // Status message handling
    showStatus(message, type = 'info', duration = 3000) {
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${type}`;
        statusDiv.textContent = message;
        this.statusMessages.appendChild(statusDiv);

        setTimeout(() => {
            statusDiv.remove();
        }, duration);
    }

    // Loading state handling
    setLoading(element, message) {
        element.classList.add('loading');
        const status = element === this.codesContainer ? this.codesStatus : this.logsStatus;
        status.textContent = message;
    }

    clearLoading(element) {
        element.classList.remove('loading');
        const status = element === this.codesContainer ? this.codesStatus : this.logsStatus;
        status.textContent = '';
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
            this.showStatus('Data refreshed successfully', 'success', 2000);
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showStatus('Failed to refresh data', 'error');
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
        
        // Format for datetime-local input in user's timezone
        const formatDateTime = (date) => {
            const offset = date.getTimezoneOffset() * 60000;
            const localDate = new Date(date.getTime() - offset);
            return localDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
        };

        // Set form defaults
        document.getElementById('createdBy').value = sessionStorage.getItem('adminUser') || 'Admin';
        document.getElementById('createdOn').value = now.toLocaleString();
        document.getElementById('activation').value = formatDateTime(activationDate);
        document.getElementById('name').value = 'Guest';
        
        // Remove Visitor option from dropdown
        const typeSelect = document.getElementById('type');
        const visitorOption = Array.from(typeSelect.options).find(opt => opt.value === 'Visitor');
        if (visitorOption) {
            typeSelect.removeChild(visitorOption);
        }
        
        // Set deactivation to tomorrow at 12:00
        const setDeactivationDate = () => {
            const activationValue = document.getElementById('activation').value;
            const activationDate = new Date(activationValue);
            
            const deactivationDate = new Date(activationDate);
            deactivationDate.setDate(deactivationDate.getDate() + 1);
            deactivationDate.setHours(12, 0, 0, 0);
            document.getElementById('deactivation').value = formatDateTime(deactivationDate);
        };

        // Set initial deactivation
        setDeactivationDate();

        // Add listener for type changes
        document.getElementById('type').addEventListener('change', setDeactivationDate);
        
        // Add listener for activation changes
        document.getElementById('activation').addEventListener('change', setDeactivationDate);

        // Show required fields message
        this.showStatus('Required fields: Code (4-6 digits), Name, Type, Activation Date', 'info', 5000);
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
                this.showError('Code must be 4-6 digits', true);
                return;
            }

            // Validate dates
            if (deactivation && deactivation <= activation) {
                this.showError('Deactivation date must be after activation date', true);
                return;
            }

            // Add loading state
            form.classList.add('form-loading');
            submitButton.textContent = 'Adding...';
            this.loadingIndicator.textContent = 'Adding new access code...';

            // Check if code exists
            const existingCodes = await window.doorAPI.getAccessCodes();
            if (existingCodes.some(c => c.code === code)) {
                this.showError('This code already exists', true);
                return;
            }

            // Create access code data matching schema
            const accessCodeData = {
                code,
                name,
                type,
                activation: activation.toISOString(),
                deactivation: deactivation ? deactivation.toISOString() : null,
                createdBy,
                createdOn: new Date().toISOString()
            };

            // Add the code
            await window.doorAPI.addAccessCode(accessCodeData);

            // Show success message
            this.showStatus('Access code added successfully', 'success');

            // Close modal after delay
            setTimeout(() => {
                this.closeModal();
                this.displayAccessCodes();
            }, 1500);

        } catch (error) {
            console.error('Error adding code:', error);
            this.showError('Failed to add code. Please try again.', true);
        } finally {
            // Remove loading state
            form.classList.remove('form-loading');
            submitButton.textContent = originalButtonText;
            this.loadingIndicator.textContent = '';
        }
    }

    showError(message, isForm = false) {
        // Show in status region
        this.showStatus(message, 'error');
        
        // Show in form if needed
        if (isForm) {
            const form = document.getElementById('addCodeForm');
            const existingError = form.querySelector('.error');
            if (existingError) {
                existingError.remove();
            }

            const errorDiv = document.createElement('div');
            errorDiv.className = 'error slide-up';
            errorDiv.textContent = message;
            form.insertBefore(errorDiv, form.firstChild);

            setTimeout(() => {
                errorDiv.remove();
            }, 3000);
        }
    }

    async displayAccessCodes() {
        this.setLoading(this.codesContainer, 'Loading access codes...');
        
        try {
            const allCodes = await window.doorAPI.getAccessCodes();
            const currentUser = sessionStorage.getItem('adminUser') || 'Guest';
            
            // Filter codes based on user type
            const userCode = allCodes.find(code => code.name === currentUser);
            let codes = [];
            
            if (userCode) {
                switch(userCode.role) {
                    case 'resident':
                        // Residents can see their own codes and their guests
                        codes = allCodes.filter(code => 
                            code.createdBy === currentUser || 
                            code.role === 'guest'
                        );
                        break;
                        
                    case 'host':
                        // Hosts can see their own codes, their residents, and guests
                        codes = allCodes.filter(code => 
                            code.createdBy === currentUser ||
                            code.role === 'resident' ||
                            code.role === 'guest'
                        );
                        break;
                        
                    case 'admin':
                        // Admins see all codes
                        codes = allCodes;
                        break;
                        
                    default:
                        codes = [];
                }
            }
            
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
                    <div class="code-item" data-code="${code.code}" role="listitem">
                        <div class="code-details">
                            <div class="code-main">
                                <span class="code-number" aria-label="Access code">${code.code}</span>
                                <span class="code-type ${code.role}" role="status">${code.role}</span>
                            </div>
                            <div class="code-info" role="list">
                                <div role="listitem">Name: <span class="info-value">${code.name}</span></div>
                                <div role="listitem">Created by: <span class="info-value">${code.createdBy}</span> on <time datetime="${createdOn.toISOString()}">${createdOn.toLocaleString()}</time></div>
                                <div role="listitem">Activation: <time datetime="${activation.toISOString()}">${activation.toLocaleString()}</time></div>
                                ${deactivation ? 
                                    `<div role="listitem">Deactivation: <time datetime="${deactivation.toISOString()}">${deactivation.toLocaleString()}</time></div>` : 
                                    `<div role="listitem">Deactivation: <span class="info-value">One-time use</span></div>`}
                            </div>
                        </div>
                        <button class="delete-btn" 
                                onclick="window.adminPanel.deleteCode('${code.code}')"
                                aria-label="Delete access code ${code.code}"
                                title="Delete this access code">
                            Delete
                        </button>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error displaying codes:', error);
            this.showError('Failed to load access codes');
            this.codesList.innerHTML = '<div class="error">Failed to load access codes</div>';
        } finally {
            this.clearLoading(this.codesContainer);
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
            const adminCodes = codes.filter(c => c.role === 'admin');
            const targetCode = codes.find(c => c.code === code);

            if (targetCode.role === 'admin' && adminCodes.length === 1) {
                this.showError('Cannot delete the last admin code');
                return;
            }

            // Add loading state
            const codeItem = document.querySelector(`[data-code="${code}"]`);
            if (codeItem) {
                codeItem.classList.add('deleting');
            }
            this.loadingIndicator.textContent = 'Deleting access code...';

            // Delete the code
            await window.doorAPI.removeAccessCode(code);
            
            // Show success message
            this.showStatus('Access code deleted successfully', 'success');
            
            // Refresh the list
            await this.displayAccessCodes();

        } catch (error) {
            console.error('Error deleting code:', error);
            this.showError('Failed to delete code. Please try again.');
        } finally {
            this.loadingIndicator.textContent = '';
        }
    }

    async displayLogs() {
        this.setLoading(this.logsContainer, 'Loading access logs...');
        
        try {
            const allLogs = await window.doorAPI.getLogs();
            const currentUser = sessionStorage.getItem('adminUser') || 'Guest';
            
            // Filter logs based on user type
            const userCode = await window.doorAPI.getAccessCodes()
                .then(codes => codes.find(code => code.name === currentUser));
                
            let logs = [];
            
            if (userCode) {
                switch(userCode.role) {
                    case 'resident':
                        // Residents can see their own logs and their guests
                        logs = allLogs.filter(log => 
                            log.name === currentUser ||
                            allLogs.some(code => 
                                code.name === log.name && 
                                code.createdBy === currentUser
                            )
                        );
                        break;
                        
                    case 'host':
                        // Hosts can see their own logs, their residents, and guests
                        logs = allLogs.filter(log => 
                            log.name === currentUser ||
                            allLogs.some(code => 
                                (code.role === 'resident' || code.role === 'guest') &&
                                code.createdBy === currentUser
                            )
                        );
                        break;
                        
                    case 'admin':
                        // Admins see all logs
                        logs = allLogs;
                        break;
                        
                    default:
                        logs = [];
                }
            }
            
            if (logs.length === 0) {
                this.logsList.innerHTML = `
                    <div class="empty-state fade-in">
                        No access logs found yet.
                    </div>
                `;
                return;
            }
            
            this.logsList.innerHTML = logs.map(log => `
                <div class="log-item" role="listitem">
                    <div class="timestamp">
                        <time datetime="${new Date(log.timestamp).toISOString()}">${new Date(log.timestamp).toLocaleString()}</time>
                    </div>
                    <div class="user-info">
                        <span class="user">${log.name}</span>
                        <span class="unit" aria-label="Unit">(${log.unit})</span>
                    </div>
                    <div class="${log.success ? 'success' : 'failure'}" role="status" aria-live="polite">
                        ${log.success ? '✓ Access Granted' : '✗ Access Denied'}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error displaying logs:', error);
            this.showError('Failed to load access logs');
            this.logsList.innerHTML = '<div class="error">Failed to load access logs</div>';
        } finally {
            this.clearLoading(this.logsContainer);
        }
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const code = prompt("Enter admin code:");
        if (code === "1234") {
            window.adminPanel = new AdminPanel();
        } else {
            alert("Access denied");
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Admin panel initialization error:', error);
        alert('Failed to initialize admin panel. Please try again.');
        window.location.href = 'index.html';
    }
});
