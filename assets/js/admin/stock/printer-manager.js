/**
 * PrinterManager V2 - Stability & Precision Overhaul
 * Features: Passive Monitoring, Atomic Job Locking, and Just-In-Time Handshaking
 */

const PrinterManager = {
    device: null,
    status: 'connecting', // 'online' (blue-detected), 'ready' (green-active), 'offline' (red), 'error' (gray)
    lastStatusMsg: '',
    isProcessing: false, // Atomic lock for ALL hardware commands
    idleTimeout: null,
    isIdle: false,
    
    init() {
        console.log("PrinterManager V2: Initializing (Eco-Friendly)...");
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
        if (typeof BrowserPrint === 'undefined') {
            this.updateStatus('error', 'App Not Running');
            return;
        }

        // If we are currently printing, don't interrupt with a scan
        if (this.isProcessing) return;

        BrowserPrint.getLocalDevices((devices) => {
            const zebraPrinters = (devices || []).filter(d => 
                d.deviceType === 'printer' && 
                (d.name.toLowerCase().includes('zebra') || d.name.toLowerCase().includes('zd'))
            );

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
            this.updateStatus('error', 'App Not Running');
        }, "printer");
    },

    /**
     * ACTIVE HANDSHAKE: Only called Just-In-Time when a print is requested.
     */
    async ensureReady() {
        if (!this.device) {
            // Force a proactive scan if we're currently offline
            await new Promise(resolve => {
                this.autoDiscover();
                setTimeout(resolve, 2000);
            });
        }

        if (!this.device) throw new Error("No Zebra printer detected. Please check cables.");

        // Handshake: Send ~HS to verify the hardware is actually responsive
        return new Promise((resolve, reject) => {
            this.updateStatus('connecting', 'Waking Printer...');
            this.device.send("~HS", (s) => {
                this.updateStatus('ready', 'PRINTER READY');
                resolve(true);
            }, (err) => {
                this.device = null; // Stale handle
                reject(new Error("Printer not responding. Try again in 5 seconds."));
            });
        });
    },

    async sendJob(zpl) {
        // PRE-FLIGHT CHECK: Ensure we are actually connected before trying
        if (typeof BrowserPrint === 'undefined' || this.status === 'error') {
            this.updateStatus('error', 'App Not Running');
            throw new Error("Zebra Browser Print Service is not running on your computer. Please open the Zebra app and try again.");
        }
        if (this.status === 'offline') {
            throw new Error("No Zebra printer detected. Please check that the USB cable is connected and the printer is powered on.");
        }

        // ATOMIC LOCK: Prevent overlapping commands
        if (this.isProcessing) {
            console.warn("PrinterManager: Busy processing a previous request.");
            throw new Error("Printer is currently busy processing another job. Please wait a second.");
        }

        try {
            this.isProcessing = true;

            // 1. Just-in-Time wake up
            await this.ensureReady();

            // 2. Send actual data (Exactly Once)
            await new Promise((resolve, reject) => {
                this.device.send(zpl, (s) => resolve(s), (err) => {
                    const msg = err ? (err.message || String(err)) : "Disconnected mid-print";
                    reject(new Error(msg));
                });
            });

            this.updateStatus('ready', 'Success');
            // Return to 'online' status after a short delay
            setTimeout(() => { if (!this.isProcessing) this.checkConnection(); }, 3000);
            return true;
        } catch (error) {
            console.error("PrinterManager V2 Error:", error);
            this.device = null; // Clear stale state
            this.updateStatus('error', error.message || 'Print Failed');
            throw error;
        } finally {
            this.isProcessing = false;
        }
    },

    autoDiscover() {
        if (typeof BrowserPrint === 'undefined') return;
        BrowserPrint.getLocalDevices((devices) => {
            const printer = (devices || []).find(d => 
                d.deviceType === 'printer' && 
                (d.name.toLowerCase().includes('zebra') || d.name.toLowerCase().includes('zd'))
            );
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
                text.innerText = status === 'ready' ? 'PRINTER READY' : 'PRINTER ONLINE';
                text.classList.add('text-success');
                if (box) box.style.borderColor = '#28a745';
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
