// Stock Manager Checkout Logic

let checkoutList = [];

const checkoutBarcodeInput = document.getElementById('checkout-barcode-input');
const checkoutItemsList = document.getElementById('checkout-items-list');
const checkoutCount = document.getElementById('checkout-count');
const checkoutListEmpty = document.getElementById('checkout-list-empty');
const submitCheckoutBtn = document.getElementById('submit-checkout-btn');
const checkoutScanFeedback = document.getElementById('checkout-scan-feedback');

function updateCheckoutUI() {
    if (checkoutCount) checkoutCount.textContent = checkoutList.length;
    if (checkoutListEmpty) checkoutListEmpty.style.display = checkoutList.length === 0 ? 'block' : 'none';
    if (submitCheckoutBtn) submitCheckoutBtn.disabled = checkoutList.length === 0;

    const itemsHtml = checkoutList.map(item => `
        <div class="d-flex align-items-center justify-content-between p-2 border-bottom">
            <div class="d-flex align-items-center gap-2">
                <div class="fw-bold small">${item.article_no}</div>
                <div class="text-muted" style="font-size: 0.7rem;">(${item.barcode})</div>
            </div>
            <button type="button" class="btn btn-sm text-danger" onclick="removeFromCheckoutList('${item.barcode}')">×</button>
        </div>
    `).join('');

    if (checkoutList.length > 0) {
        if (checkoutItemsList) checkoutItemsList.innerHTML = itemsHtml;
    } else {
        if (checkoutItemsList) checkoutItemsList.innerHTML = '<div class="text-muted text-center p-4 small" id="checkout-list-empty">No items added yet.</div>';
    }
}

function addToCheckoutList(barcode) {
    if (!barcode) return;
    const item = stockItems.find(i => i.barcode.toString() === barcode.toString());
    if (!item) {
        if (checkoutScanFeedback) {
            checkoutScanFeedback.textContent = "Barcode not found";
            checkoutScanFeedback.className = "small mt-1 text-danger";
        }
        return;
    }
    if (item.status !== 'IN_STOCK') {
        if (checkoutScanFeedback) {
            checkoutScanFeedback.textContent = "Item is already out";
            checkoutScanFeedback.className = "small mt-1 text-danger";
        }
        return;
    }
    if (checkoutList.find(i => i.barcode.toString() === barcode.toString())) {
        if (checkoutScanFeedback) {
            checkoutScanFeedback.textContent = "Already in list";
            checkoutScanFeedback.className = "small mt-1 text-warning";
        }
        return;
    }
    checkoutList.push(item);
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

function removeFromCheckoutList(barcode) {
    checkoutList = checkoutList.filter(i => i.barcode.toString() !== barcode.toString());
    updateCheckoutUI();
}

function clearCheckoutList() {
    checkoutList = [];
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
    const rows = checkoutList.map(item => ({ batch_id, name, company, barcode: item.barcode }));

    try {
        const { error } = await supabaseClient.from('Stock_Checkouts').insert(rows);
        if (error) throw error;
        const checkoutModalInstance = bootstrap.Modal.getInstance(document.getElementById('checkoutModal'));
        if (checkoutModalInstance) checkoutModalInstance.hide();
        alert(`Successfully checked out ${checkoutList.length} items.`);
        clearCheckoutList();
        e.target.reset();
        fetchStock();
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
