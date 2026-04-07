// Admin Dashboard Settings Handler
// Manages local preferences like API keys in localStorage

const AdminSettings = {
    storageKey: 'green_admin_settings',
    
    defaults: {
        gemini_api_key: '',
        gemini_model_name: 'gemini-flash-latest',
        printer_debug_mode: false // Default to false
    },

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : { ...this.defaults };
        } catch (e) {
            console.error("Failed to load settings:", e);
            return { ...this.defaults };
        }
    },

    save(settings) {
        localStorage.setItem(this.storageKey, JSON.stringify(settings));
    },

    get(key) {
        const settings = this.load();
        return settings[key] !== undefined ? settings[key] : this.defaults[key];
    },

    set(key, value) {
        const settings = this.load();
        settings[key] = value;
        this.save(settings);
    }
};

/**
 * UI Bridge for the Settings Modal
 */
function saveAdminSettings() {
    const keyField = document.getElementById('gemini-api-key-field');
    const modelField = document.getElementById('gemini-model-name-field');
    const debugField = document.getElementById('printer-debug-mode-field');
    
    const key = keyField ? keyField.value.trim() : '';
    const model = modelField ? modelField.value.trim() : AdminSettings.defaults.gemini_model_name;
    const isDebug = debugField ? debugField.checked : AdminSettings.defaults.printer_debug_mode;
    
    AdminSettings.set('gemini_api_key', key);
    AdminSettings.set('gemini_model_name', model || AdminSettings.defaults.gemini_model_name);
    AdminSettings.set('printer_debug_mode', isDebug);
    
    window.dispatchEvent(new CustomEvent('settingsUpdated', { 
        detail: { key: 'printer_debug_mode', value: isDebug } 
    }));
    
    // Close modal using Bootstrap instance
    const modalEl = document.getElementById('adminSettingsModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
        modal.hide();
    }
    
    // Simple UI feedback
    console.log("Settings updated.");
}

// Ensure UI is populated when modal opens
document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('adminSettingsModal');
    if (modalEl) {
        modalEl.addEventListener('show.bs.modal', () => {
            const keyField = document.getElementById('gemini-api-key-field');
            const modelField = document.getElementById('gemini-model-name-field');
            const debugField = document.getElementById('printer-debug-mode-field');
            
            if (keyField) keyField.value = AdminSettings.get('gemini_api_key');
            if (modelField) modelField.value = AdminSettings.get('gemini_model_name');
            if (debugField) debugField.checked = AdminSettings.get('printer_debug_mode');
        });
    }
});
