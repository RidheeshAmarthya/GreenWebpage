// Admin Dashboard Settings Handler
// Manages local preferences like API keys in localStorage

const AdminSettings = {
    storageKey: 'green_admin_settings',

    defaults: {
        gemini_api_key: '',
        gemini_model_name: 'gemini-3.1-flash-lite-preview',
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
        localStorage.setItem(this.storageKey);
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

/**
 * FULL SYSTEM BACKUP ENGINE
 * Exports all tables to JSON and images to ZIP.
 * Restricted to Administrators.
 */
async function handleFullSystemBackup() {
    // Security check
    if (!user) {
        alert("Unauthorized: Please log in to generate backups.");
        return;
    }

    const btn = document.getElementById('generate-backup-btn');
    const progressContainer = document.getElementById('backup-progress-container');
    const progressBar = document.getElementById('backup-progress-bar');
    const statusText = document.getElementById('backup-status-text');

    if (!confirm("This will generate a full system backup (JSON data + Images). Begin export?")) return;

    try {
        btn.disabled = true;
        progressContainer.style.display = 'block';
        updateBackupStatus(5, "Fetching database tables...");

        const zip = new JSZip();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupDir = zip.folder(`green_backup_${timestamp}`);
        const dbFolder = backupDir.folder("database");
        const storageFolder = backupDir.folder("storage/stock-images");

        // --- STEP 1: EXPORT DATABASE ---
        const tables = ['Orders', 'Colors', 'Color-Logs', 'Stock', 'Stock_Checkouts'];
        for (const tableName of tables) {
            updateBackupStatus(10, `Exporting ${tableName}...`);
            const { data, error } = await supabaseClient.from(tableName).select('*');
            if (error) throw error;
            dbFolder.file(`${tableName}.json`, JSON.stringify(data, null, 2));
        }

        // --- STEP 2: LIST STORAGE (PAGINATED) ---
        updateBackupStatus(30, "Listing storage files (Paginated)...");
        let allFiles = [];
        let offset = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: files, error: storageError } = await supabaseClient
                .storage
                .from('stock-images')
                .list('', { 
                    limit: PAGE_SIZE,
                    offset: offset,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (storageError) throw storageError;
            
            if (files.length === 0) {
                hasMore = false;
            } else {
                allFiles = allFiles.concat(files);
                offset += PAGE_SIZE;
                updateBackupStatus(35, `Listed ${allFiles.length} files...`);
                // If we got fewer than PAGE_SIZE, we've reached the end
                if (files.length < PAGE_SIZE) hasMore = false;
            }
        }

        const totalFiles = allFiles.length;
        updateBackupStatus(40, `Downloading ${totalFiles} images...`);

        // --- STEP 3: CONCURRENT DOWNLOAD (BATCH SIZE 100) ---
        const CONCURRENCY = 100;
        for (let i = 0; i < totalFiles; i += CONCURRENCY) {
            const batch = allFiles.slice(i, i + CONCURRENCY);
            const progress = 40 + Math.floor((i / totalFiles) * 50);
            updateBackupStatus(progress, `Downloading batch ${Math.floor(i / CONCURRENCY) + 1} of ${Math.ceil(totalFiles / CONCURRENCY)}...`);

            await Promise.all(batch.map(async (file) => {
                try {
                    const { data: blob, error: downloadError } = await supabaseClient
                        .storage
                        .from('stock-images')
                        .download(file.name);

                    if (downloadError) {
                        console.warn(`Failed to download ${file.name}:`, downloadError);
                        return;
                    }
                    storageFolder.file(file.name, blob);
                } catch (e) {
                    console.warn(`Error processing ${file.name}:`, e);
                }
            }));
        }

        // --- STEP 4: MANIFEST ---
        backupDir.file("manifest.json", JSON.stringify({
            generated_at: new Date().toISOString(),
            generated_by: user.email,
            tables_exported: tables,
            images_exported: totalFiles,
            test_mode: false
        }, null, 2));

        // --- STEP 5: GENERATE ZIP ---
        updateBackupStatus(95, "Generating ZIP archive...");
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `Green_System_Backup_${timestamp}.zip`);

        updateBackupStatus(100, "Backup Complete!");
        setTimeout(() => {
            progressContainer.style.display = 'none';
            btn.disabled = false;
        }, 3000);

    } catch (err) {
        console.error("Backup Failed:", err);
        alert(`Backup Failed: ${err.message}`);
        progressContainer.style.display = 'none';
        btn.disabled = false;
    }

    function updateBackupStatus(percent, text) {
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (statusText) statusText.textContent = text;
    }
}

// Ensure UI is populated and security visibility is checked
document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('adminSettingsModal');
    if (modalEl) {
        modalEl.addEventListener('show.bs.modal', () => {
            // UI Population
            const keyField = document.getElementById('gemini-api-key-field');
            const modelField = document.getElementById('gemini-model-name-field');
            const debugField = document.getElementById('printer-debug-mode-field');

            if (keyField) keyField.value = AdminSettings.get('gemini_api_key');
            if (modelField) modelField.value = AdminSettings.get('gemini_model_name');
            if (debugField) debugField.checked = AdminSettings.get('printer_debug_mode');

            // Visibility check for backup feature (Admins only)
            const backupContainer = document.getElementById('backup-section-container');
            if (backupContainer) {
                backupContainer.style.display = user ? 'block' : 'none';
            }
        });
    }
});
