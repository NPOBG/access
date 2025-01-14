class Keypad {
    constructor() {
        this.currentCode = '';
        this.display = document.getElementById('display');
        this.displayText = document.getElementById('displayText');
        this.displayDots = this.display.querySelector('.display-dots');
        this.status = document.getElementById('status');
        this.maxCodeLength = 6;
        this.isProcessing = false;
        this.isAdminMode = false;
        this.isGuestMode = false;
        this.submitTimeout = null;
        this.submitDelay = 1500; // 1.5 seconds
        
        this.setupEventListeners();
        this.updateDots();
    }

    setupEventListeners() {
        document.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', (e) => {
                if (this.isProcessing) return;
                this.provideHapticFeedback();
                this.animateKeyPress(e.target);
                this.handleKeyPress(e);
            });

            key.addEventListener('touchstart', () => {
                if (this.isProcessing) return;
                key.classList.add('active');
            });

            key.addEventListener('touchend', () => {
                key.classList.remove('active');
            });
        });

        document.addEventListener('keydown', (e) => {
            if (this.isProcessing) return;
            const key = document.querySelector(`[data-key="${e.key}"]`);
            if (key) {
                key.classList.add('active');
                this.animateKeyPress(key);
            }

            if (e.key >= '0' && e.key <= '9') {
                this.addDigit(e.key);
            } else if (e.key === 'Enter') {
                this.submitCode();
            } else if (e.key === 'Escape' || e.key === 'Backspace') {
                if (e.key === 'Escape' && (this.isAdminMode || this.isGuestMode)) {
                    this.resetMode();
                } else {
                    this.clearLastDigit();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = document.querySelector(`[data-key="${e.key}"]`);
            if (key) {
                key.classList.remove('active');
            }
        });
    }

    resetMode() {
        this.isAdminMode = false;
        this.isGuestMode = false;
        this.currentCode = '';
        this.updateDots();
        this.clearSubmitTimeout();
        this.displayText.textContent = 'Enter Access Code';
        this.display.classList.remove('admin-mode', 'guest-mode');
        document.querySelector('.admin-button')?.classList.remove('active');
        document.querySelector('.guest-button')?.classList.remove('active');
        this.animateDisplay();
    }

    setAdminMode(enabled) {
        this.resetMode();
        if (enabled) {
            this.isAdminMode = true;
            this.displayText.textContent = 'Enter Admin Code';
            this.display.classList.add('admin-mode');
            document.querySelector('.admin-button').classList.add('active');
            this.animateDisplay();
        }
    }

    setGuestMode(enabled) {
        this.resetMode();
        if (enabled) {
            this.isGuestMode = true;
            this.displayText.textContent = 'Enter Admin Code for Guest Access';
            this.display.classList.add('guest-mode');
            document.querySelector('.guest-button').classList.add('active');
            this.animateDisplay();
        }
    }

    clearSubmitTimeout() {
        if (this.submitTimeout) {
            clearTimeout(this.submitTimeout);
            this.submitTimeout = null;
        }
    }

    startSubmitTimeout() {
        this.clearSubmitTimeout();
        if (this.currentCode.length > 0) {
            this.submitTimeout = setTimeout(() => {
                this.submitCode();
            }, this.submitDelay);
        }
    }

    animateKeyPress(key) {
        key.classList.add('pressed');
        setTimeout(() => {
            key.classList.remove('pressed');
        }, 150);
    }

    provideHapticFeedback() {
        if ('vibrate' in navigator) {
            navigator.vibrate(30);
        }
    }

    handleKeyPress(e) {
        const key = e.target.dataset.key;
        
        if (key === 'clear') {
            this.clearLastDigit();
        } else if (key === 'enter') {
            this.submitCode();
        } else {
            this.addDigit(key);
        }
    }

    addDigit(digit) {
        if (this.currentCode.length < this.maxCodeLength && !this.isProcessing) {
            this.currentCode += digit;
            this.updateDots();
            this.animateDisplay();
            
            this.clearSubmitTimeout();

            if (this.currentCode.length === this.maxCodeLength) {
                this.submitCode();
            } else {
                this.startSubmitTimeout();
            }
        }
    }

    clearLastDigit() {
        if (this.currentCode.length > 0 && !this.isProcessing) {
            this.currentCode = this.currentCode.slice(0, -1);
            this.updateDots();
            this.animateDisplay();
            this.startSubmitTimeout();
        }
    }

    updateDots() {
        const dots = Array(this.maxCodeLength)
            .fill('<span class="dot"></span>')
            .map((dot, index) => {
                return index < this.currentCode.length ? 
                    '<span class="dot filled"></span>' : dot;
            })
            .join('');
        
        this.displayDots.innerHTML = dots;
    }

    animateDisplay() {
        this.display.classList.add('pulse');
        setTimeout(() => {
            this.display.classList.remove('pulse');
        }, 200);
    }

    async submitCode() {
        if (this.currentCode.length === 0 || this.isProcessing) return;

        this.clearSubmitTimeout();
        this.isProcessing = true;
        
        try {
            const accessCode = await window.doorAPI.verifyCode(this.currentCode);

            if (this.isGuestMode) {
                if (accessCode && accessCode.isAdmin) {
                    const guestCode = await window.doorAPI.createGuestCode();
                    const modal = document.getElementById('guestCodeModal');
                    const codeDisplay = document.getElementById('guestCode');
                    
                    this.showStatus('Guest code generated', 'success');
                    this.provideSuccessFeedback();
                    
                    codeDisplay.textContent = guestCode;
                    modal.classList.add('active');
                    this.resetMode();
                } else {
                    this.showStatus('Invalid admin code', 'error');
                    this.provideErrorFeedback();
                    setTimeout(() => this.resetMode(), 2000);
                }
            } else if (this.isAdminMode) {
                // Verify admin code before storing session
                try {
                    const verified = await window.doorAPI.verifyCode(this.currentCode);
                    if (verified && verified.isAdmin) {
                        // Store admin session with expiration
                        const sessionData = {
                            code: this.currentCode,
                            timestamp: new Date().getTime(),
                            expires: new Date().getTime() + (8 * 60 * 60 * 1000), // 8 hours
                            type: 'Admin'
                        };
                        sessionStorage.setItem('adminSession', JSON.stringify(sessionData));
                        
                        this.showStatus('Access granted', 'success');
                        this.provideSuccessFeedback();
                        setTimeout(() => {
                            window.location.href = 'admin.html';
                        }, 1000);
                    } else {
                        throw new Error('Invalid admin code');
                    }
                } catch (error) {
                    if (error.message.includes('Access denied')) {
                        this.showStatus('Access denied: No permissions', 'error');
                    } else if (error.message.includes('Invalid')) {
                        this.showStatus('Invalid admin code', 'error');
                    } else {
                        this.showStatus('System error', 'error');
                    }
                    this.provideErrorFeedback();
                    sessionStorage.removeItem('adminSession');
                    this.resetMode();
                }
            } else {
                this.showStatus('Verifying...', 'processing');
                try {
                    const success = await window.doorAPI.toggleDoor();
                    if (success) {
                        this.showStatus(`Welcome, ${accessCode.user}`, 'success');
                        this.provideSuccessFeedback();
                    } else {
                        this.showStatus('Door system error', 'error');
                        this.provideErrorFeedback();
                    }
                } catch (error) {
                    this.showStatus('System error', 'error');
                    this.provideErrorFeedback();
                }
            }
        } catch (error) {
            this.showStatus('Invalid code', 'error');
            this.provideErrorFeedback();
        }

        this.currentCode = '';
        this.updateDots();
        setTimeout(() => this.clearStatus(), 3000);
        this.isProcessing = false;
    }

    showStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        this.status.classList.add('animate-in');
        
        if ('vibrate' in navigator) {
            if (type === 'success') {
                navigator.vibrate([100, 50, 100]);
            } else if (type === 'error') {
                navigator.vibrate([250, 100, 250]);
            } else if (type === 'processing') {
                navigator.vibrate(50);
            }
        }
    }

    provideSuccessFeedback() {
        this.display.classList.add('success');
        setTimeout(() => {
            this.display.classList.remove('success');
        }, 1500);
        
        if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
        }
    }

    provideErrorFeedback() {
        this.display.classList.add('error');
        setTimeout(() => {
            this.display.classList.remove('error');
        }, 1500);
        
        if ('vibrate' in navigator) {
            navigator.vibrate([250, 100, 250]);
        }
    }

    clearStatus() {
        this.status.classList.remove('animate-in');
        setTimeout(() => {
            this.status.className = 'status';
            this.status.textContent = '';
        }, 300);
    }
}

// Initialize keypad when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.keypad = new Keypad();
});
