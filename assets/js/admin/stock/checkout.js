// Stock Manager Checkout Logic

let checkoutList = []; // Array of { item, requestedQty }

const checkoutBarcodeInput = document.getElementById('checkout-barcode-input');
const checkoutItemsList = document.getElementById('checkout-items-list');
const checkoutCount = document.getElementById('checkout-count');
const checkoutListEmpty = document.getElementById('checkout-list-empty');
const submitCheckoutBtn = document.getElementById('submit-checkout-btn');
const checkoutScanFeedback = document.getElementById('checkout-scan-feedback');

function updateCheckoutUI() {
    const totalUnits = checkoutList.reduce((acc, entry) => acc + entry.requestedQty, 0);
    if (checkoutCount) checkoutCount.textContent = totalUnits;
    if (checkoutListEmpty) checkoutListEmpty.style.display = checkoutList.length === 0 ? 'block' : 'none';
    if (submitCheckoutBtn) submitCheckoutBtn.disabled = checkoutList.length === 0;

    const itemsHtml = checkoutList.map(entry => {
        const item = entry.item;
        const stock = calculateStockAvailability(item);
        return `
            <div class="d-flex align-items-center justify-content-between p-3 border-bottom bg-white">
                <div class="d-flex flex-column">
                    <div class="fw-bold fs-6 text-dark">${item.article_no}</div>
                    <div class="text-muted small">Barcode: ${item.barcode} | ${stock.available} In Stock</div>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <div class="d-flex align-items-center border rounded-pill bg-light p-1" style="height: 38px;">
                         <button type="button" class="btn btn-sm btn-light rounded-circle px-2" onclick="updateRequestedQty('${item.id}', -1)">-</button>
                         <input type="number" class="border-0 bg-transparent text-center fw-bold" 
                                value="${entry.requestedQty}" min="1" max="${stock.available}"
                                style="width: 40px; font-size: 0.9rem; outline: none;"
                                onchange="onQtyInputChange('${item.id}', this.value)">
                         <button type="button" class="btn btn-sm btn-light rounded-circle px-2" onclick="updateRequestedQty('${item.id}', 1)">+</button>
                    </div>
                    <button type="button" class="btn btn-sm text-danger fs-5" onclick="removeFromCheckoutList('${item.id}')">&times;</button>
                </div>
            </div>
        `;
    }).join('');

    if (checkoutList.length > 0) {
        if (checkoutItemsList) checkoutItemsList.innerHTML = itemsHtml;
    } else {
        if (checkoutItemsList) checkoutItemsList.innerHTML = '<div class="text-muted text-center p-4 small" id="checkout-list-empty">No items added yet.</div>';
    }
}

async function addToCheckoutList(barcode) {
    if (!barcode) return;
    
    // Use the robust fetch function that checks local AND Supabase
    const item = await fetchStockItemByBarcode(barcode);
    
    if (!item) {
        if (checkoutScanFeedback) {
            checkoutScanFeedback.textContent = "Barcode not found";
            checkoutScanFeedback.className = "small mt-1 text-danger";
        }
        return;
    }

    const stock = calculateStockAvailability(item);
    if (stock.available === 0) {
        if (checkoutScanFeedback) {
            checkoutScanFeedback.textContent = `"${item.article_no}" is OUT OF STOCK`;
            checkoutScanFeedback.className = "small mt-1 text-danger";
        }
        return;
    }

    const existingIndex = checkoutList.findIndex(e => e.item.id === item.id);
    if (existingIndex !== -1) {
        const existing = checkoutList[existingIndex];
        if (existing.requestedQty < stock.available) {
            existing.requestedQty++;
            // Move to top
            checkoutList.splice(existingIndex, 1);
            checkoutList.unshift(existing);
        } else {
            if (checkoutScanFeedback) {
                checkoutScanFeedback.textContent = `Max limits reached for "${item.article_no}"`;
                checkoutScanFeedback.className = "small mt-1 text-warning";
            }
            return;
        }
    } else {
        checkoutList.unshift({ item, requestedQty: 1 });
    }

    updateCheckoutUI();
    if (checkoutBarcodeInput) {
        checkoutBarcodeInput.value = '';
        checkoutBarcodeInput.focus();
    }
    if (checkoutScanFeedback) {
        checkoutScanFeedback.textContent = `✅ Added ${item.article_no}`;
        checkoutScanFeedback.className = "small mt-1 text-success";
    }
}

function updateRequestedQty(itemId, delta) {
    const entry = checkoutList.find(e => e.item.id === itemId);
    if (!entry) return;
    
    const stock = calculateStockAvailability(entry.item);
    const newQty = entry.requestedQty + delta;
    
    if (newQty >= 1 && newQty <= stock.available) {
        entry.requestedQty = newQty;
        updateCheckoutUI();
    }
}

function onQtyInputChange(itemId, value) {
    const qty = parseInt(value);
    const entry = checkoutList.find(e => e.item.id === itemId);
    if (!entry) return;
    
    const stock = calculateStockAvailability(entry.item);
    if (isNaN(qty) || qty < 1) entry.requestedQty = 1;
    else if (qty > stock.available) entry.requestedQty = stock.available;
    else entry.requestedQty = qty;
    
    updateCheckoutUI();
}

function removeFromCheckoutList(itemId) {
    checkoutList = checkoutList.filter(e => e.item.id !== itemId);
    updateCheckoutUI();
}

function clearCheckoutList() {
    checkoutList = [];
    if (checkoutScanFeedback) {
        checkoutScanFeedback.textContent = '';
        checkoutScanFeedback.className = '';
    }
    updateCheckoutUI();
}

document.getElementById('add-to-checkout-btn')?.addEventListener('click', () => {
    addToCheckoutList(checkoutBarcodeInput?.value);
});

checkoutBarcodeInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addToCheckoutList(checkoutBarcodeInput?.value);
    }
});

document.getElementById('clear-checkout-list')?.addEventListener('click', clearCheckoutList);

document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('checkout-name');
    const companyInput = document.getElementById('checkout-company');
    const name = nameInput ? nameInput.value : '';
    const company = companyInput ? companyInput.value : '';
    const batch_id = crypto.randomUUID();

    showLoading(true);
    
    // Flatten quantities into individual rows
    const rows = [];
    checkoutList.forEach(entry => {
        for (let i = 0; i < entry.requestedQty; i++) {
            rows.push({
                batch_id,
                name,
                company,
                barcode: entry.item.barcode
            });
        }
    });

    try {
        const { error } = await supabaseClient.from('Stock_Checkouts').insert(rows);
        if (error) throw error;
        
        const checkoutModalEl = document.getElementById('checkoutModal');
        const modalInstance = bootstrap.Modal.getInstance(checkoutModalEl);
        if (modalInstance) modalInstance.hide();
        
        const totalUnits = rows.length;
        alert(`Successfully checked out ${totalUnits} units across ${checkoutList.length} articles.`);
        
        clearCheckoutList();
        e.target.reset();
        if (typeof fetchStock === 'function') fetchStock();
    } catch (err) {
        alert("Checkout failed: " + err.message);
    } finally {
        showLoading(false);
    }
});

async function viewStockImage(path) {
    if (!path) return;
    showLoading(true);
    const { data } = await supabaseClient.storage.from('stock-images').createSignedUrl(path, 3600);
    showLoading(false);
    if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
    }
}

// Auto-focus when modal opens
document.getElementById('checkoutModal')?.addEventListener('shown.bs.modal', () => {
    checkoutBarcodeInput?.focus();
});

// Focus warning visibility
const checkoutScannerStatus = document.getElementById('checkout-scanner-status');
checkoutBarcodeInput?.addEventListener('focus', () => { if (checkoutScannerStatus) checkoutScannerStatus.style.display = 'none'; });
checkoutBarcodeInput?.addEventListener('blur', () => { 
    if (checkoutScannerStatus && document.getElementById('checkoutModal')?.classList.contains('show')) {
        checkoutScannerStatus.style.display = 'block';
    }
});
