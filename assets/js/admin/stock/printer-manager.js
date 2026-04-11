/**
 * PrinterManager V2 - Stability & Precision Overhaul
 * Features: Passive Monitoring, Atomic Job Locking, and Just-In-Time Handshaking
 */

const PrinterManager = {
    device: null,
    status: 'connecting', // 'online' (blue-detected), 'ready' (green-active), 'offline' (red), 'error' (gray)
    lastStatusMsg: '',
    isProcessing: false, // Atomic lock for ALL hardware commands
    suppressChecksUntil: 0, // Temporarily pause discovery checks during print bursts
    postJobRecheckTimer: null,
    lastHandshakeAt: 0,
    handshakeCooldownMs: 2500, // Balance stability with frequent enough readiness checks
    jobsSinceHandshake: 0,
    maxJobsWithoutHandshake: 3,
    idleTimeout: null,
    isIdle: false,
    isDebug: false, // DEBUG MODE: Logs to console instead of sending to hardware
    
    init() {
        console.log("PrinterManager V2: Initializing (Eco-Friendly)...");
        
        // Load initial debug state from settings
        if (typeof AdminSettings !== 'undefined') {
            this.isDebug = AdminSettings.get('printer_debug_mode');
        }

        this.setupListeners();
        this.startHeartbeat();
        this.checkConnection(true);
    },

    setupListeners() {
        // 1. Visibility: Stop pings if the user isn't even looking at the tab
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log("PrinterManager: Tab hidden. Pausing background tasks.");
                this.stopHeartbeat();
            } else {
                console.log("PrinterManager: Tab visible. Resuming...");
                this.startHeartbeat();
                this.checkConnection(true);
            }
        });

        // 2. Idle Detection: Back-off if the user hasn't moved for 15 mins
        const resetIdle = () => {
            if (this.isIdle) {
                this.isIdle = false;
                console.log("PrinterManager: User active. Switching to High-Frequency mode.");
                this.startHeartbeat();
            }
            if (this.idleTimeout) clearTimeout(this.idleTimeout);
            this.idleTimeout = setTimeout(() => {
                this.isIdle = true;
                console.log("PrinterManager: User idle for 15m. Switching to Low-Frequency mode.");
                this.startHeartbeat();
            }, 15 * 60 * 1000); // 15 mins
        };

        window.addEventListener('mousemove', resetIdle);
        window.addEventListener('keydown', resetIdle);
        resetIdle();

        // 3. Settings Listener: Catch toggle changes from the modal
        window.addEventListener('settingsUpdated', (e) => {
            if (e.detail.key === 'printer_debug_mode') {
                this.isDebug = e.detail.value;
                console.log(`PrinterManager: Debug Mode ${this.isDebug ? 'Enabled' : 'Disabled'}`);
                this.checkConnection(true);
            }
        });
    },

    startHeartbeat() {
        this.stopHeartbeat();
        if (document.hidden) return;

        // Adaptive Interval: 10s for active, 60s for idle
        const interval = this.isIdle ? 60000 : 10000;
        
        this.heartbeatInterval = setInterval(() => {
            this.checkConnection();
        }, interval); 
    },

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    },

    /**
     * PASSIVE HEARTBEAT: Only talks to the BrowserPrint service (GET). 
     * Never sends ZPL/Writes to the printer head during heartbeat.
     */
    async checkConnection(isInitial = false) {
        if (this.isDebug) {
            this.updateStatus('online', 'DEBUG MODE ACTIVE');
            return;
        }

        if (typeof BrowserPrint === 'undefined') {
            this.updateStatus('error', 'App Not Running');
            return;
        }

        // If we are currently printing (or just finished a burst), don't interrupt with discovery scans.
        if (this.isProcessing || Date.now() < this.suppressChecksUntil) return;

        BrowserPrint.getLocalDevices((devices) => {
            // Ignore stale callback if printing started while this async scan was in flight.
            if (this.isProcessing || Date.now() < this.suppressChecksUntil) return;

            let zebraPrinters = (devices || []).filter(d => 
                d.deviceType === 'printer' && 
                (d.name.toLowerCase().includes('zebra') || d.name.toLowerCase().includes('zd'))
            );

            // FALLBACK FOR WINDOWS: If no 'zebra/zd' named printer is found, but there IS a printer
            // (Windows sometimes identifies them by weird serial numbers/UIDs)
            if (zebraPrinters.length === 0) {
                zebraPrinters = (devices || []).filter(d => 
                    d.deviceType === 'printer' && 
                    !d.name.toLowerCase().includes('pdf') && 
                    !d.name.toLowerCase().includes('microsoft') &&
                    !d.name.toLowerCase().includes('onenote')
                );
            }

            if (zebraPrinters.length > 0) {
                // We found hardware!
                // If we don't have a device handle yet, grab the first one
                if (!this.device) {
                    this.device = zebraPrinters[0];
                    this.updateStatus('online', `Linked: ${this.device.name}`);
                } else {
                    // Just verify our current device is still in the active list
                    const stillPresent = zebraPrinters.some(p => p.name === this.device.name);
                    if (stillPresent) {
                        // We stay 'online' (Cyan/Blue). We only go 'ready' (Green) during an active print session.
                        this.updateStatus('online', `Linked: ${this.device.name}`);
                    } else {
                        this.device = null;
                        this.updateStatus('offline', 'Hardware Unplugged');
                    }
                }
            } else {
                this.device = null;
                this.updateStatus('offline', 'No Printer Found');
            }
        }, (error) => {
            if (this.isProcessing || Date.now() < this.suppressChecksUntil) return;
            this.updateStatus('error', 'App Not Running');
        }, "printer");
    },

    scheduleConnectionRecheck(delayMs = 3000) {
        if (this.postJobRecheckTimer) {
            clearTimeout(this.postJobRecheckTimer);
            this.postJobRecheckTimer = null;
        }
        this.postJobRecheckTimer = setTimeout(() => {
            this.postJobRecheckTimer = null;
            this.checkConnection();
        }, delayMs);
    },

    async waitForIdle(timeoutMs = 15000) {
        const start = Date.now();
        while (this.isProcessing) {
            if (Date.now() - start > timeoutMs) {
                throw new Error("Printer remained busy for too long. Please try again.");
            }
            await new Promise(resolve => setTimeout(resolve, 75));
        }
    },

    /**
     * ACTIVE HANDSHAKE: Only called Just-In-Time when a print is requested.
     */
    async ensureReady() {
        if (this.isDebug) {
            console.log("PrinterManager [DEBUG]: Ensuring printer is ready...");
            this.updateStatus('ready', 'DEBUG READY');
            return true;
        }

        if (!this.device) {
            // Force a proactive scan if we're currently offline
            await new Promise(resolve => {
                this.autoDiscover();
                setTimeout(resolve, 2000);
            });
        }

        if (!this.device) throw new Error("No Zebra printer detected. Please check cables.");

        // Avoid hammering ~HS on rapid back-to-back prints (can destabilize some desktop units).
        const recentlyHandshook = (Date.now() - this.lastHandshakeAt) < this.handshakeCooldownMs;
        if (
            recentlyHandshook &&
            this.jobsSinceHandshake < this.maxJobsWithoutHandshake &&
            (this.status === 'ready' || this.status === 'online')
        ) {
            return true;
        }

        // Handshake: Send ~HS to verify the hardware is actually responsive
        return new Promise((resolve, reject) => {
            this.updateStatus('connecting', 'Waking Printer...');
            this.device.send("~HS", (s) => {
                const hsText = String(s || '').toLowerCase();
                const warning = this.parsePrinterWarning(hsText);
                if (warning) {
                    return reject(new Error(`Printer warning: ${warning}`));
                }
                if (hsText.includes('head open') || hsText.includes('top open')) {
                    return reject(new Error("Printer reports top/head open."));
                }
                this.lastHandshakeAt = Date.now();
                this.jobsSinceHandshake = 0;
                this.updateStatus('ready', 'PRINTER READY');
                resolve(true);
            }, (err) => {
                this.device = null; // Stale handle
                const msg = err ? (err.message || String(err)) : "Printer not responding. Try again in 5 seconds.";
                reject(new Error(msg));
            });
        });
    },

    parsePrinterWarning(text) {
        if (!text) return null;
        if (text.includes('head open') || text.includes('top open') || text.includes('cover open')) return 'TOP/HEAD OPEN';
        if (text.includes('pause')) return 'PAUSED (resume/feed on printer)';
        if (text.includes('paper out') || text.includes('media out') || text.includes('label out')) return 'MEDIA OUT';
        if (text.includes('ribbon out')) return 'RIBBON OUT';
        return null;
    },

    isTransientTopOpenError(error) {
        const msg = String(error?.message || error || '').toLowerCase();
        return msg.includes('head open') || msg.includes('top open');
    },

    async sendJob(zpl) {
        if (this.isDebug) {
            this.isProcessing = true;
            try {
                // Extract article info from ZPL. It follows the pattern ^FD: {article_no}^FS
                const articleMatch = zpl.match(/\^FD: (.*?)\^FS/);
                const article = articleMatch ? articleMatch[1].replace(/^:\s*/, '') : "Unknown";
                console.log(`PRINTING: ${article}`);
                
                this.updateStatus('ready', 'Debug Success');
                setTimeout(() => { if (!this.isProcessing) this.checkConnection(); }, 1000);
                return true;
            } finally {
                this.isProcessing = false;
            }
        }

        // PRE-FLIGHT CHECK: Ensure we are actually connected before trying
        if (typeof BrowserPrint === 'undefined' || this.status === 'error') {
            this.updateStatus('error', 'App Not Running');
            throw new Error("Zebra Browser Print Service is not running on your computer. Please open the Zebra app and try again.");
        }
        if (this.status === 'offline') {
            throw new Error("No Zebra printer detected. Please check that the USB cable is connected and the printer is powered on.");
        }

        // ATOMIC LOCK: serialize overlapping commands rather than failing immediately.
        if (this.isProcessing) {
            console.warn("PrinterManager: Busy, waiting for previous request to finish...");
            await this.waitForIdle();
        }

        try {
            this.isProcessing = true;
            this.suppressChecksUntil = Date.now() + 2000;

            // 1. Just-in-Time wake up + 2. Send data (with one retry for transient false head-open)
            const maxAttempts = 2;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    await this.ensureReady();
                    await new Promise((resolve, reject) => {
                        this.device.send(zpl, (s) => {
                            const warning = this.parsePrinterWarning(String(s || '').toLowerCase());
                            if (warning) {
                                return reject(new Error(`Printer warning: ${warning}`));
                            }
                            resolve(s);
                        }, (err) => {
                            const msg = err ? (err.message || String(err)) : "Disconnected mid-print";
                            reject(new Error(msg));
                        });
                    });
                    this.jobsSinceHandshake += 1;
                    break;
                } catch (attemptError) {
                    const isRetryable = this.isTransientTopOpenError(attemptError);
                    if (!isRetryable || attempt === maxAttempts) throw attemptError;
                    console.warn("PrinterManager: transient top/head-open detected, retrying once...");
                    this.device = null;
                    await new Promise(resolve => setTimeout(resolve, 700));
                    await new Promise(resolve => {
                        this.autoDiscover();
                        setTimeout(resolve, 900);
                    });
                }
            }

            this.updateStatus('ready', 'Success');
            // Debounced passive recheck after bursts settle
            this.suppressChecksUntil = Date.now() + 2500;
            this.scheduleConnectionRecheck(3500);
            return true;
        } catch (error) {
            console.error("PrinterManager V2 Error:", error);
            this.device = null; // Clear stale state
            this.updateStatus('error', error.message || 'Print Failed');
            this.suppressChecksUntil = Date.now() + 2000;
            this.scheduleConnectionRecheck(4000);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    },

    autoDiscover() {
        if (typeof BrowserPrint === 'undefined') return;
        BrowserPrint.getLocalDevices((devices) => {
            const zebraPrinters = (devices || []).filter(d => 
                d.deviceType === 'printer' && 
                (d.name.toLowerCase().includes('zebra') || d.name.toLowerCase().includes('zd'))
            );

            let printer = zebraPrinters.length > 0 ? zebraPrinters[0] : null;

            // FALLBACK FOR WINDOWS weird names
            if (!printer) {
                printer = (devices || []).find(d => 
                    d.deviceType === 'printer' && 
                    !d.name.toLowerCase().includes('pdf') && 
                    !d.name.toLowerCase().includes('microsoft') &&
                    !d.name.toLowerCase().includes('onenote')
                );
            }

            if (printer) {
                this.device = printer;
                this.updateStatus('online', `Detected: ${printer.name}`);
            }
        }, null, "printer");
    },

    updateStatus(status, msg) {
        if (this.status !== status || this.lastStatusMsg !== msg) {
            this.status = status;
            this.lastStatusMsg = msg;
            this.broadcastStatus();
        }
    },

    broadcastStatus() {
        const event = new CustomEvent('printerStatusChange', { 
            detail: { status: this.status, message: this.lastStatusMsg } 
        });
        window.dispatchEvent(event);
        this.updateUI(this.status, this.lastStatusMsg);
    },

    updateUI(status, msg) {
        const dot = document.getElementById('printer-status-dot');
        const text = document.getElementById('printer-status-text');
        const box = document.getElementById('printer-status-box');
        if (!dot || !text) return;

        // Reset (Crucially preserving the 'd-none d-lg-inline' for mobile)
        dot.className = 'rounded-circle me-1 me-md-2';
        text.className = 'small fw-bold text-muted d-none d-lg-inline';
        
        switch(status) {
            case 'ready': // ACTIVE GREEN
            case 'online': // DETECTED GREEN
                dot.style.display = 'inline-block';
                dot.className = 'rounded-circle me-2 bg-success';
                dot.style.width = '8px';
                dot.style.height = '8px';
                dot.style.animation = 'none';
                if (this.isDebug) {
                    text.innerText = 'DEBUG MODE';
                    text.classList.add('text-primary');
                    if (box) box.style.borderColor = '#007bff';
                } else {
                    text.innerText = status === 'ready' ? 'PRINTER READY' : 'PRINTER ONLINE';
                    text.classList.add('text-success');
                    if (box) box.style.borderColor = '#28a745';
                }
                break;
            case 'offline': // HARDWARE DISCONNECT RED
                dot.style.display = 'inline-block';
                dot.className = 'rounded-circle me-2 bg-danger';
                dot.style.width = '8px';
                dot.style.height = '8px';
                dot.style.animation = 'none';
                text.innerText = 'PRINTER OFFLINE';
                text.classList.add('text-danger');
                if (box) box.style.borderColor = '#dc3545';
                break;
            case 'connecting': // YELLOW PULSE
                dot.style.display = 'inline-block';
                dot.className = 'spinner-grow spinner-grow-sm me-2 text-warning';
                text.innerText = 'WAKING UP...';
                text.classList.add('text-warning');
                if (box) box.style.borderColor = '#ffc107';
                break;
            case 'error': // APP MISSING GRAY
                dot.style.display = 'inline-block';
                dot.className = 'rounded-circle me-2 bg-secondary';
                dot.style.width = '8px';
                dot.style.height = '8px';
                dot.style.animation = 'none';
                text.innerText = msg.toUpperCase();
                text.classList.add('text-muted');
                if (box) box.style.borderColor = '#333';
                break;
        }
    }
};

window.addEventListener('load', () => {
    setTimeout(() => PrinterManager.init(), 2000);
});
