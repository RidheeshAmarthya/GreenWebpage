// Stock Manager Utility Functions

function fillZPLTemplate(item) {
    let zpl = ZPL_TEMPLATE;

    // If barcode is empty, remove the barcode commands entirely from ZPL
    if (!item.barcode || String(item.barcode).trim() === "") {
        // Remove the scannable barcode horizontal bars command
        zpl = zpl.replace(/\^FO550,20\^BCN,60,Y,N,N\^FD{barcode}\^FS/g, "");
    }

    // Replace ALL occurrences of each placeholder using global regex
    zpl = zpl.replace(/{article_no}/g, item.article_no || '');
    zpl = zpl.replace(/{content}/g, item.content || '');
    zpl = zpl.replace(/{count}/g, item.count || '');
    zpl = zpl.replace(/{density}/g, item.density || '');
    zpl = zpl.replace(/{width}/g, item.width || '');
    
    const weightValue = (item.weight && String(item.weight).trim() !== "") ? item.weight : "      "; 
    zpl = zpl.replace(/{weight}/g, weightValue);
    zpl = zpl.replace(/{weight_unit}/g, item.weight_unit || 'GSM');
    zpl = zpl.replace(/{item}/g, item.item || '');
    zpl = zpl.replace(/{finish}/g, item.finish || '');
    zpl = zpl.replace(/{remark}/g, item.remark || '');
    zpl = zpl.replace(/{barcode}/g, String(item.barcode || '').trim());

    return zpl;
}

let labelPreviewDebounceTimer;
function triggerLabelPreviewDebounce() {
    clearTimeout(labelPreviewDebounceTimer);
    labelPreviewDebounceTimer = setTimeout(updateModalLabelPreview, 1000); // 1-second debounce to protect API
}

async function getCachedSignedUrl(path) {
    if (!path) return null;
    const now = Date.now();

    // 1. Check if we already have a valid local URL
    if (stockImageCache[path] && stockImageCache[path].expires > now) {
        return stockImageCache[path].url;
    }

    // 2. Check if there's already an active request for this path
    if (pendingRequests.has(path)) {
        return pendingRequests.get(path);
    }

    // 3. Create a new request and track it
    const requestPromise = (async () => {
        try {
            const { data, error } = await supabaseClient.storage.from('stock-images').createSignedUrl(path, 86400);
            if (error) throw error;

            stockImageCache[path] = {
                url: data.signedUrl,
                expires: Date.now() + CACHE_VALID_MS
            };

            localStorage.setItem('stock_image_cache', JSON.stringify(stockImageCache));
            return data.signedUrl;
        } catch (err) {
            console.error("Cache fetch failed:", err);
            return null;
        } finally {
            pendingRequests.delete(path); // Clean up after completion
        }
    })();

    pendingRequests.set(path, requestPromise);
    return requestPromise;
}

async function updateModalLabelPreview(item = null, containerPrefix = 'modal-label-preview') {
    let finalItem = item;
    const form = document.getElementById('stock-item-form');

    if (!finalItem && form) {
        const formData = new FormData(form);
        finalItem = Object.fromEntries(formData.entries());
    }

    if (!finalItem) return;

    const previewImg = document.getElementById(`${containerPrefix}-img`);
    const previewSpinner = document.getElementById(`${containerPrefix}-spinner`);
    const placeholder = document.getElementById(`${containerPrefix}-placeholder`);

    if (previewSpinner) previewSpinner.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';

    try {
        const zpl = fillZPLTemplate(finalItem);
        const url = "https://api.labelary.com/v1/printers/8dpmm/labels/4x2/0/";
        const encoder = new TextEncoder();
        const data = encoder.encode(zpl);

        const response = await fetch(url, { method: "POST", body: data });
        if (!response.ok) throw new Error("API status: " + response.status);

        const blob = await response.blob();
        const localUrl = URL.createObjectURL(blob);

        if (previewImg) {
            previewImg.src = localUrl;
            previewImg.style.display = 'block';
        }
    } catch (err) {
        console.warn("Label Preview failed:", err, "ZPL Data:", fillZPLTemplate(finalItem));
        if (placeholder) {
            placeholder.innerHTML = `
                <div class="text-danger small fw-bold">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-1"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    <br>Preview Failed (API)<br><span class="text-decoration-underline text-primary" style="cursor: pointer;">Click to Retry</span>
                </div>`;
            placeholder.style.display = 'block';
            placeholder.onclick = (e) => {
                e.stopPropagation();
                updateModalLabelPreview(item, containerPrefix);
            };
        }
        if (previewImg) previewImg.style.display = 'none';
    } finally {
        if (previewSpinner) previewSpinner.style.display = 'none';
    }
}

/**
 * Calculates quantitative stock availability
 * @param {Object} item Stock item with 'checkouts' array
 * @returns {total, active, available, isAvailable}
 */
function calculateStockAvailability(item) {
    const totalQty = parseFloat(item.quantity) || 0;
    const activeCheckouts = item.checkouts ? item.checkouts.filter(c => !c.returned_at).length : 0;
    const availableQty = Math.max(0, totalQty - activeCheckouts);
    return {
        total: totalQty,
        active: activeCheckouts,
        available: availableQty,
        isAvailable: availableQty > 0
    };
}
