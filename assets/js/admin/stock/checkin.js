// Stock Manager Check In Logic (Return to Stock)

let lastUsedReturner = null; // Stores { name, company }

const checkInForm = document.getElementById('check-in-form');
const checkInBarcodeInput = document.getElementById('check-in-barcode-input');
const checkInFeedback = document.getElementById('check-in-feedback');
const checkInSelection = document.getElementById('check-in-selection');

async function processCheckIn(barcode) {
    if (!barcode) {
        showCheckInFeedback("Please enter a valid barcode.", "danger");
        return;
    }

    // Reset previous selection UI
    if (checkInSelection) {
        checkInSelection.innerHTML = '';
        checkInSelection.style.display = 'none';
    }

    showLoading(true);
    try {
        const item = await fetchStockItemByBarcode(barcode);
        if (!item) throw new Error("Barcode not found in database.");

        const stock = calculateStockAvailability(item);
        if (stock.active === 0) {
            showCheckInFeedback(`"${item.article_no}" is already fully Returned / In-Stock.`, "warning");
            return;
        }

        // 2. Find ALL active checkout records for this barcode
        const { data: activeCheckouts, error: fetchError } = await supabaseClient
            .from('Stock_Checkouts')
            .select('id, name, company, created_at')
            .eq('barcode', barcode)
            .is('returned_at', null)
            .order('created_at', { ascending: true });

        if (fetchError || !activeCheckouts || activeCheckouts.length === 0) {
            throw new Error("No active checkout records found.");
        }

        // 3. Handle Ambiguity: Multiple people have it
        if (activeCheckouts.length > 1) {
            showCheckInSelectionList(item, activeCheckouts);
            showCheckInFeedback(`${activeCheckouts.length} units currently out. Select returning users.`, "info");
        } else {
            // Only one unit is out, process it automatically
            const c = activeCheckouts[0];
            lastUsedReturner = { name: c.name, company: c.company };
            await performReturn(c.id, item.article_no);
        }

    } catch (err) {
        showCheckInFeedback(err.message, "danger");
    } finally {
        showLoading(false);
    }
}

async function performReturn(checkoutId, articleNo) {
    try {
        const { error } = await supabaseClient
            .from('Stock_Checkouts')
            .update({ returned_at: new Date().toISOString() })
            .eq('id', checkoutId);
        if (error) throw error;
        showCheckInFeedback(`✅ Successfully Returned: ${articleNo}`, "success");
        if (checkInBarcodeInput) checkInBarcodeInput.value = '';
        if (checkInSelection) { checkInSelection.innerHTML = ''; checkInSelection.style.display = 'none'; }
        if (typeof fetchStock === 'function') fetchStock();
    } catch (err) {
        showCheckInFeedback(err.message, "danger");
    }
}

async function performBulkIndividualReturn(articleNo, checkouts) {
    const checkboxes = document.querySelectorAll('.individual-return-checkbox:checked');
    const idsToReturn = Array.from(checkboxes).map(cb => cb.value);

    if (idsToReturn.length === 0) {
        showCheckInFeedback("Please select at least one unit to return.", "warning");
        return;
    }

    // Remember the first selected one as the primary returner for the next scan
    const firstId = idsToReturn[0];
    const firstMatch = checkouts.find(c => c.id == firstId);
    if (firstMatch) {
        lastUsedReturner = { name: firstMatch.name, company: firstMatch.company };
    }

    showLoading(true);
    try {
        const { error } = await supabaseClient
            .from('Stock_Checkouts')
            .update({ returned_at: new Date().toISOString() })
            .in('id', idsToReturn);

        if (error) throw error;

        showCheckInFeedback(`✅ Returned ${idsToReturn.length} units of ${articleNo}`, "success");
        if (checkInBarcodeInput) checkInBarcodeInput.value = '';
        if (checkInSelection) { checkInSelection.innerHTML = ''; checkInSelection.style.display = 'none'; }
        if (typeof fetchStock === 'function') fetchStock();
    } catch (err) {
        showCheckInFeedback(err.message, "danger");
    } finally {
        showLoading(false);
    }
}

function showCheckInSelectionList(item, checkouts) {
    if (!checkInSelection) return;
    checkInSelection.style.display = 'block';
    
    checkInSelection.innerHTML = `
        <label class="text-muted fw-bold d-block mb-3 small opacity-50 text-uppercase" style="letter-spacing: 1px;">Confirm Returning Users</label>
        <div class="d-flex flex-column gap-2 mb-3">
            ${checkouts.map(checkout => {
                // Auto-select if this matches the last used returner in this session
                const isAutoSelect = lastUsedReturner && 
                                   lastUsedReturner.name === checkout.name && 
                                   lastUsedReturner.company === checkout.company;
                
                return `
                    <label class="form-check p-3 border rounded-4 d-flex align-items-center justify-content-start bg-white shadow-sm mb-0" 
                           style="transition: all 0.2s; cursor: pointer; border-color: ${isAutoSelect ? '#28a745' : '#eee'} !important; ${isAutoSelect ? 'background: #f8fff9 !important;' : ''}" 
                           for="indv-chk-${checkout.id}">
                        <input class="form-check-input ms-0 me-3 individual-return-checkbox" type="checkbox" 
                               value="${checkout.id}" id="indv-chk-${checkout.id}" ${isAutoSelect ? 'checked' : ''}>
                        <div class="d-flex flex-column pe-none">
                            <span class="fw-bold text-dark fs-6 font-primary">${checkout.name}</span>
                            <span class="text-muted small" style="font-size: 0.7rem;">${checkout.company} | Out ${new Date(checkout.created_at).toLocaleDateString('en-IN')}</span>
                            ${isAutoSelect ? '<span class="text-success fw-bold mt-1" style="font-size: 0.5rem; letter-spacing: 0.5px;">LAST USED (AUTO-SELECTED)</span>' : ''}
                        </div>
                    </label>
                `;
            }).join('')}
        </div>
        <button type="button" class="btn btn-green w-100 fw-bold py-3" 
                onclick='performBulkIndividualReturn("${item.article_no}", ${JSON.stringify(checkouts).replace(/'/g, "&apos;")})'
                style="border-radius: 12px; font-size: 0.85rem;">CHECK IN SELECTED</button>
    `;
}

function showCheckInFeedback(msg, type) {
    if (!checkInFeedback) return;
    checkInFeedback.textContent = msg;
    checkInFeedback.style.display = 'block';
    checkInFeedback.className = `p-3 rounded-4 mt-2 fw-bold text-center`;
    if (type === 'success') {
        checkInFeedback.style.background = '#d4edda'; checkInFeedback.style.color = '#155724';
        setTimeout(() => { if (checkInFeedback) checkInFeedback.style.display = 'none'; }, 3000);
    } else if (type === 'warning' || type === 'info') {
        checkInFeedback.style.background = '#fff3cd'; checkInFeedback.style.color = '#856404';
    } else {
        checkInFeedback.style.background = '#f8d7da'; checkInFeedback.style.color = '#721c24';
    }
}

checkInForm?.addEventListener('submit', (e) => { e.preventDefault(); processCheckIn(checkInBarcodeInput?.value); });
checkInBarcodeInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); processCheckIn(checkInBarcodeInput.value); } });
