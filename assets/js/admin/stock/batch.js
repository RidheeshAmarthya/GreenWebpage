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

async function batchCheckOut() {
    if (selectedStockIds.length === 0) return;
    
    // 1. Clear current session
    if (typeof clearCheckoutList === 'function') clearCheckoutList();
    
    // 2. Add each selected item that has availability
    selectedStockIds.forEach(id => {
        const item = stockItems.find(i => i.id === id);
        if (item) {
            const stock = calculateStockAvailability(item);
            if (stock.available > 0) {
                checkoutList.push({ item, requestedQty: 1 });
            }
        }
    });

    if (checkoutList.length === 0) {
        alert("None of the selected items were available for checkout.");
        return;
    }

    // 3. Update UI and Open Modal
    if (typeof updateCheckoutUI === 'function') updateCheckoutUI();
    const modalEl = document.getElementById('checkoutModal');
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) modal = new bootstrap.Modal(modalEl);
    modal.show();
}

async function batchCheckIn() {
    if (selectedStockIds.length === 0) return;
    
    // 1. Get barcodes for selected items
    const barcodes = stockItems
        .filter(i => selectedStockIds.includes(i.id))
        .map(i => i.barcode);

    if (barcodes.length === 0) return;

    showLoading(true);
    try {
        // 2. Fetch ALL active checkouts for these barcodes
        const { data: activeCheckouts, error } = await supabaseClient
            .from('Stock_Checkouts')
            .select('*')
            .in('barcode', barcodes)
            .is('returned_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (activeCheckouts.length === 0) {
            alert("No active checkouts found for the selected articles.");
            return;
        }

        // 3. Render the specific selection list inside the Modal
        const listContainer = document.getElementById('batch-check-in-list');
        if (listContainer) {
            listContainer.innerHTML = activeCheckouts.map(checkout => {
                const item = stockItems.find(si => si.barcode == checkout.barcode);
                return `
                    <label class="form-check p-3 border rounded-4 d-flex align-items-center justify-content-start bg-white shadow-sm mb-2" 
                           style="transition: all 0.2s; cursor: pointer;" for="chk-${checkout.id}">
                        <input class="form-check-input ms-0 me-3 stock-return-checkbox" type="checkbox" 
                               value="${checkout.id}" id="chk-${checkout.id}">
                        <div class="d-flex flex-column pe-none">
                            <span class="fw-bold text-dark fs-6">${item ? item.article_no : 'Unknown'} &mdash; ${checkout.name}</span>
                            <span class="text-muted small" style="font-size: 0.7rem;">${checkout.company} | ${new Date(checkout.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                    </label>
                `;
            }).join('');
        }

        // 4. Open Modal
        const modalEl = document.getElementById('batchCheckInModal');
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) modal = new bootstrap.Modal(modalEl);
        modal.show();

    } catch (err) {
        alert("Fetch failed: " + err.message);
    } finally {
        showLoading(false);
    }
}

async function submitBatchCheckIn() {
    const checkboxes = document.querySelectorAll('.stock-return-checkbox:checked');
    const idsToReturn = Array.from(checkboxes).map(cb => cb.value);

    if (idsToReturn.length === 0) {
        alert("Please select at least one unit to return.");
        return;
    }

    showLoading(true);
    try {
        const { error } = await supabaseClient
            .from('Stock_Checkouts')
            .update({ returned_at: new Date().toISOString() })
            .in('id', idsToReturn);

        if (error) throw error;

        const modalEl = document.getElementById('batchCheckInModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        alert(`Successfully returned ${idsToReturn.length} units.`);
        
        clearStockSelection();
        if (typeof fetchStock === 'function') fetchStock();
    } catch (err) {
        alert("Batch check-in failed: " + err.message);
    } finally {
        showLoading(false);
    }
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
