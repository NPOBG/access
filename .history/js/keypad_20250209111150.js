class Keypad {
    constructor() {
        this.currentCode = '';
        this.display = document.querySelector('.display-dots');
        this.displayText = document.getElementById('displayText');
        this.defaultAdminCode = '123456';
        this.isChangingAdminCode = false;
        this.newAdminCode = '';
        this.isAdminMode = false;
        this.isGuestMode = false;
        
        // Initialize display dots
        this.initializeDisplayDots();
    }

    initializeDisplayDots() {
        if (this.display) {
            // Create 6 dots (for 6-digit codes)
            for (let i = 0; i < 6; i++) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                this.display.appendChild(dot);
            }
        }
    }

    addDigit(digit) {
        if (this.currentCode.length < 6) {
            this.currentCode += digit;
            this.updateDisplay();
            // Add pressed animation to the key
            const key = document.querySelector(`[data-key="${digit}"]`);
            if (key) {
                key.classList.add('pressed');
                setTimeout(() => key.classList.remove('pressed'), 100);
            }
        }
    }

    clear() {
        if (this.currentCode.length > 0) {
            this.currentCode = this.currentCode.slice(0, -1);
            this.updateDisplay();
            // Add pressed animation to clear button
            const clearButton = document.querySelector('[data-key="clear"]');
            if (clearButton) {
                clearButton.classList.add('pressed');
                setTimeout(() => clearButton.classList.remove('pressed'), 100);
            }
        }
    }

    updateDisplay() {
        const dots = this.display.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            if (index < this.currentCode.length) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });

        if (this.displayText) {
            if (this.isChangingAdminCode) {
                this.displayText.textContent = this.newAdminCode ? 'Confirm new admin code' : 'Enter new admin code';
            } else if (this.isAdminMode) {
                this.displayText.textContent = 'Enter Admin Code';
            } else {
                this.displayText.textContent = 'Enter Access Code';
            }
        }
    }

    async submitCode() {
        try {
            // If entering default admin code for the first time
            if (this.currentCode === this.defaultAdminCode && !this.isChangingAdminCode) {
                this.isChangingAdminCode = true;
                this.currentCode = '';
                this.updateDisplay();
                return;
            }

            // If in the process of changing admin code
            if (this.isChangingAdminCode) {
                if (!this.newAdminCode) {
                    // First entry of new admin code
                    this.newAdminCode = this.currentCode;
                    this.currentCode = '';
                    this.updateDisplay();
                    return;
                } else {
                    // Confirm new admin code
                    if (this.currentCode !== this.newAdminCode) {
                        alert('Codes do not match. Please try again.');
                        this.isChangingAdminCode = false;
                        this.newAdminCode = '';
                        this.currentCode = '';
                        this.updateDisplay();
                        return;
                    }
                }
            }

            // Send code to server
            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-code': this.isChangingAdminCode ? this.defaultAdminCode : this.currentCode
                },
                body: JSON.stringify({
                    code: this.currentCode,
                    newCode: this.isChangingAdminCode ? this.newAdminCode : undefined,
                    confirmCode: this.isChangingAdminCode ? this.currentCode : undefined
                })
            });

            const result = await response.json();

            if (result.error) {
                alert(result.error);
            } else {
                if (this.isChangingAdminCode) {
                    alert('Admin code updated successfully');
                    this.isChangingAdminCode = false;
                    // Store the new admin code in session storage
                    sessionStorage.setItem('adminCode', this.newAdminCode);
                    this.newAdminCode = '';
                    window.location.href = '/admin.html';
                } else {
                    // Normal code verification success
                    if (result.isAdmin) {
                        // Store the admin code in session storage
                        sessionStorage.setItem('adminCode', this.currentCode);
                        window.location.href = '/admin.html';
                    } else {
                        // Handle regular access
                        alert('Access granted');
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            this.currentCode = '';
            this.updateDisplay();
        }
    }

    setAdminMode(value) {
        this.isAdminMode = value;
        const displayElement = document.querySelector('.display');
        if (value) {
            displayElement.classList.add('admin-mode');
        } else {
            displayElement.classList.remove('admin-mode');
        }
        this.updateDisplay();
    }

    setGuestMode(value) {
        this.isGuestMode = value;
        const displayElement = document.querySelector('.display');
        if (value) {
            displayElement.classList.add('guest-mode');
        } else {
            displayElement.classList.remove('guest-mode');
        }
        this.updateDisplay();
    }
}

// Initialize keypad
const keypad = new Keypad();
window.keypad = keypad; // Make keypad accessible globally

// Add event listeners for keypad buttons
document.querySelectorAll('.key').forEach(button => {
    button.addEventListener('click', () => {
        const key = button.getAttribute('data-key');
        if (key === 'clear') {
            keypad.clear();
        } else if (key === 'enter') {
            keypad.submitCode();
            // Add pressed animation
            button.classList.add('pressed');
            setTimeout(() => button.classList.remove('pressed'), 100);
        } else {
            keypad.addDigit(key);
        }
    });
});

// Initialize display
keypad.updateDisplay();
