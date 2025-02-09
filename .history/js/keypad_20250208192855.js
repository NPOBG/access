class Keypad {
    constructor() {
        this.currentCode = '';
        this.display = document.getElementById('display');
        this.displayText = document.getElementById('displayText');
        this.defaultAdminCode = '123456';
        this.isChangingAdminCode = false;
        this.newAdminCode = '';
    }

    addDigit(digit) {
        if (this.currentCode.length < 6) {
            this.currentCode += digit;
            this.updateDisplay();
        }
    }

    clear() {
        this.currentCode = '';
        this.updateDisplay();
    }

    updateDisplay() {
        if (this.display) {
            this.display.textContent = '*'.repeat(this.currentCode.length);
        }
        if (this.displayText) {
            if (this.isChangingAdminCode) {
                this.displayText.textContent = this.newAdminCode ? 'Confirm new admin code' : 'Enter new admin code';
            } else {
                this.displayText.textContent = 'Enter code';
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
}

// Initialize keypad
const keypad = new Keypad();

// Add event listeners for keypad buttons
document.querySelectorAll('.keypad-button').forEach(button => {
    button.addEventListener('click', () => {
        const digit = button.textContent;
        if (digit === 'Clear') {
            keypad.clear();
        } else if (digit === 'Enter') {
            keypad.submitCode();
        } else {
            keypad.addDigit(digit);
        }
    });
});
