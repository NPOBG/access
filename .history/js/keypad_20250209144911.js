class Keypad {
    constructor() {
        this.currentCode = '';
        this.display = document.querySelector('.display-dots');
        this.displayText = document.getElementById('displayText');
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
            // Send code to server
            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: this.currentCode,
                    isAdminMode: this.isAdminMode,
                    isChangingAdminCode: this.isChangingAdminCode,
                    newCode: this.isChangingAdminCode ? this.newAdminCode : undefined,
                    confirmCode: this.isChangingAdminCode ? this.currentCode : undefined
                })
            });

            const result = await response.json();

            if (result.error) {
                alert(result.error);
                this.currentCode = '';
                if (this.isChangingAdminCode) {
                    this.isChangingAdminCode = false;
                    this.newAdminCode = '';
                }
                this.updateDisplay();
                return;
            }

            // Handle initialization mode
            if (result.requiresChange) {
                if (!this.isChangingAdminCode) {
                    // Start the code change process
                    this.isChangingAdminCode = true;
                    this.currentCode = '';
                    this.updateDisplay();
                    return;
                }
            }

            // Handle success during initialization
            if (result.success && result.message.includes('restart')) {
                alert('Admin code updated successfully. System will restart.');
                window.location.reload();
                return;
            }

            // Handle admin panel access
            if (this.isAdminMode && result.isAdmin) {
                sessionStorage.setItem('adminCode', this.currentCode);
                window.location.href = '/admin.html';
                return;
            }

            // Handle normal door access
            if (result.success) {
                alert('Access granted');
                // Here you would trigger the door opening mechanism
            }

            // Reset state
            this.currentCode = '';
            this.isChangingAdminCode = false;
            this.newAdminCode = '';
            this.isAdminMode = false;
            this.updateDisplay();

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
            this.currentCode = '';
            this.isChangingAdminCode = false;
            this.newAdminCode = '';
            this.isAdminMode = false;
            this.updateDisplay();
        }
    }

    setAdminMode(value) {
        this.isAdminMode = value;
        this.currentCode = ''; // Clear any existing code
        const displayElement = document.querySelector('.display');
        if (value) {
            displayElement.classList.add('admin-mode');
        } else {
            displayElement.classList.remove('admin-mode');
        }
        this.updateDisplay();
    }

    setGuestMode(value) {
        // Guest mode is disabled during initialization
        if (this.isChangingAdminCode) {
            alert('Please complete admin code setup first.');
            return;
        }
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
            if (keypad.isChangingAdminCode && !keypad.newAdminCode) {
                // First entry of new code
                keypad.newAdminCode = keypad.currentCode;
                keypad.currentCode = '';
                keypad.updateDisplay();
            } else {
                keypad.submitCode();
            }
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
