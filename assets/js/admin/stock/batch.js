// Stock Manager Batch Operations Logic

function toggleStockSelection(id) {
    const index = selectedStockIds.indexOf(id);
    const isSelectedNow = index === -1;

    if (isSelectedNow) {
        selectedStockIds.push(id);
    } else {
        selectedStockIds.splice(index, 1);
    }

    // Direct UI Feedback for Grid
    const cards = document.querySelectorAll(`.stock-card[data-id="${id}"]`);
    cards.forEach(card => {
        const cb = card.querySelector('.stock-checkbox');
        if (isSelectedNow) {
            card.classList.add('selected');
            if (cb) cb.checked = true;
        } else {
            card.classList.remove('selected');
            if (cb) cb.checked = false;
        }
    });

    // Direct UI Feedback for Table
    const rows = document.querySelectorAll(`.stock-row[data-id="${id}"]`);
    rows.forEach(row => {
        const cb = row.querySelector('.stock-checkbox');
        if (isSelectedNow) {
            row.classList.add('selected');
            if (cb) cb.checked = true;
        } else {
            row.classList.remove('selected');
            if (cb) cb.checked = false;
        }
    });

    updateBatchActionBar();
}

function updateBatchActionBar() {
    const bar = document.getElementById('stock-batch-bar');
    const countEl = document.getElementById('selected-count');
    if (!bar || !countEl) return;

    if (selectedStockIds.length > 0) {
        bar.style.display = 'block';
        countEl.textContent = selectedStockIds.length;
    } else {
        bar.style.display = 'none';
        const selectAll = document.getElementById('stock-select-all');
        if (selectAll) selectAll.checked = false;
    }
}

function clearStockSelection() {
    selectedStockIds = [];
    updateBatchActionBar();

    // Uncheck all checkboxes
    const boxes = document.querySelectorAll('.stock-checkbox');
    boxes.forEach(b => b.checked = false);

    const selectAll = document.getElementById('stock-select-all');
    if (selectAll) selectAll.checked = false;

    // Remove selection visuals from all cards and rows
    document.querySelectorAll('.stock-card, .stock-row').forEach(el => {
        el.classList.remove('selected');
    });
}

async function batchDeleteStock() {
    if (selectedStockIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedStockIds.length} selected articles?`)) return;

    showLoading(true);
    try {
        const { error } = await supabaseClient
            .from('Stock')
            .delete()
            .in('id', selectedStockIds);

        if (error) throw error;

        selectedStockIds = [];
        updateBatchActionBar();
        fetchStock();
        alert("Batch deletion successful");
    } catch (err) {
        alert("Batch delete failed: " + err.message);
    } finally {
        showLoading(false);
    }
}

async function batchPrintStockLabels() {
    if (selectedStockIds.length === 0) return;

    if (typeof BrowserPrint === 'undefined') {
        alert("Zebra BrowserPrint library not loaded.");
        return;
    }

    BrowserPrint.getDefaultDevice("printer", async function (device) {
        if (!device || !device.name) {
            alert("No Active Zebra Printer Found.");
            return;
        }

        const promises = selectedStockIds.map(id => {
            const item = stockItems.find(i => i.id === id);
            if (!item) return null;

            const zpl = fillZPLTemplate(item);
            return new Promise((resolve) => {
                device.send(zpl,
                    () => resolve({ success: true }),
                    (err) => resolve({ success: false, article: item.article_no, error: err })
                );
            });
        });

        const validPromises = promises.filter(p => p !== null);
        const results = await Promise.all(validPromises);

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            const errorReport = failed.map(f => `• ${f.article}: ${f.error}`).join('\n');
            alert(`Batch Results:\n✅ Sent: ${results.length - failed.length}\n❌ Failed: ${failed.length}\n\nErrors:\n${errorReport}`);
        } else {
            alert(`Successfully sent ${results.length} labels to ${device.name}.`);
        }
    }, function (error) {
        alert("Zebra Connection Failed: " + error);
    });
}

// Global Select All Listener
document.addEventListener('change', (e) => {
    if (e.target.id === 'stock-select-all') {
        const checkboxes = document.querySelectorAll('.stock-checkbox');
        const isChecked = e.target.checked;

        checkboxes.forEach(box => {
            box.checked = isChecked;
            const articleId = box.dataset.id || (box.onclick?.toString().match(/'([^']+)'/)?.[1]);
            // If dataset.id is not available, try to find the ID from the card it belongs to
            const parentId = box.closest('.stock-card, .stock-row')?.dataset.id;
            const finalId = articleId || parentId;

            if (finalId) {
                const index = selectedStockIds.indexOf(finalId);
                if (isChecked && index === -1) selectedStockIds.push(finalId);
                else if (!isChecked && index !== -1) selectedStockIds.splice(index, 1);
            }
        });
        updateBatchActionBar();
    }
});
