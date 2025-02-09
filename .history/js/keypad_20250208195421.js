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
    }

    addDigit(digit) {
        if (this.currentCode.length < 6) {
            this.currentCode += digit;
            this.updateDisplay();
        }
    }

    clear() {
        if (this.currentCode.length > 0) {
            this.currentCode = this.currentCode.slice(0, -1);
            this.updateDisplay();
        }
    }

    updateDisplay() {
        if (this.display) {
            // Clear existing dots
            this.display.innerHTML = '';
            // Add dots for each digit
            for (let i = 0; i < 6; i++) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                if (i < this.currentCode.length) {
                    dot.classList.add('active');
                }
                this.display.appendChild(dot);
            }
        }
        if (this.displayText) {
            if (this.isChangingAdminCode) {
                this.displayText.textContent = this.newAdminCode ? 'Confirm new admin code' : 'Enter new admin code';
            } else {
                this.displayText.textContent = 'Enter Access Code';
            }
        }
    }

    async submitCode() {
        try {
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

            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-code': this.currentCode
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
                if (this.currentCode === this.defaultAdminCode) {
                    this.isChangingAdminCode = true;
                    this.currentCode = '';
                    this.updateDisplay();
                } else if (this.isChangingAdminCode) {
                    alert('Admin code updated successfully');
                    this.isChangingAdminCode = false;
                    this.newAdminCode = '';
                    this.currentCode = '';
                    this.updateDisplay();
                } else {
                    // Normal code verification success
                    if (result.isAdmin) {
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
            if (!this.isChangingAdminCode) {
                this.currentCode = '';
                this.updateDisplay();
            }
        }
    }

    setAdminMode(value) {
        this.isAdminMode = value;
        this.displayText.textContent = value ? 'Enter Admin Code' : 'Enter Access Code';
    }

    setGuestMode(value) {
        this.isGuestMode = value;
        this.displayText.textContent = value ? 'Enter Guest Code' : 'Enter Access Code';
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
        } else {
            keypad.addDigit(key);
        }
    });
});

// Initialize display
keypad.updateDisplay();
