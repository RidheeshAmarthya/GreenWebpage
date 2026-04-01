// Stock Manager Main Entry Point & Event Listeners

let stockItemModal = null;

// Initialize when DOM is ready (since scripts have 'defer')
document.addEventListener('DOMContentLoaded', () => {
    const stockItemModalElement = document.getElementById('stockItemModal');
    if (stockItemModalElement) {
        stockItemModal = new bootstrap.Modal(stockItemModalElement);
        
        // Ensure webcam stops when modal is closed
        stockItemModalElement.addEventListener('hidden.bs.modal', () => {
            if (typeof stopWebcam === 'function') stopWebcam();
            if (typeof isOcrProcessing !== 'undefined') isOcrProcessing = false;
            resetStockModalUI();
        });
    }

    // Initialization on Page Load
    if (window.innerWidth < 768) {
        if (typeof toggleStockView === 'function') toggleStockView('grid');
    }
});

function resetStockModalUI() {
    const el = (typeof getCamElements === 'function') ? getCamElements() : {};
    
    // Reset Visual Elements
    if (el.capturePreview) {
        el.capturePreview.style.display = 'none';
        el.capturePreview.src = '';
    }
    if (el.placeholder) el.placeholder.style.display = 'flex';
    if (el.video) el.video.style.display = 'none';
    if (el.sourcesContent) el.sourcesContent.style.display = 'block';

    // Reset camera controls
    if (el.startBtn) el.startBtn.style.display = 'inline-block';
    if (el.captureBtn) el.captureBtn.style.display = 'none';
    if (el.footerCaptureBtn) el.footerCaptureBtn.style.display = 'none';
    if (el.retakeBtn) el.retakeBtn.style.display = 'none';

    const form = document.getElementById('stock-item-form');
    if (form) form.reset();
    
    if (el.imgDataField) el.imgDataField.value = '';
    if (el.fileInput) el.fileInput.value = '';

    // Reset preview area
    const previewImg = document.getElementById('modal-label-preview-img');
    const placeholderEl = document.getElementById('modal-label-preview-placeholder');
    if (previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
    }
    if (placeholderEl) {
        placeholderEl.innerHTML = '<div class="text-muted small mb-2">Fetching live label...</div><div class="spinner-grow spinner-grow-sm text-green opacity-50"></div>';
        placeholderEl.style.display = 'block';
    }

    // Reset tabs to Camera
    const camTabTrigger = document.querySelector('#cam-tab');
    if (camTabTrigger) {
        let tab = bootstrap.Tab.getInstance(camTabTrigger);
        if (!tab) tab = new bootstrap.Tab(camTabTrigger);
        tab.show();
    }
}

function openStockModal(id = null) {
    const form = document.getElementById('stock-item-form');
    if (!form) return;
    
    resetStockModalUI();
    if (typeof stopWebcam === 'function') stopWebcam();

    // PERSISTENCE FOR NEW ARTICLES (Sticky Fields)
    if (!id && form) {
        const lastType = localStorage.getItem('last_article_type');
        const lastQty = localStorage.getItem('last_article_quantity');
        if (lastType) {
            const typeField = form.querySelector('[name="type"]');
            if (typeField) typeField.value = lastType;
        }
        if (lastQty) {
            const qtyField = form.querySelector('[name="quantity"]');
            if (qtyField) qtyField.value = lastQty;
        } else {
            const qtyField = form.querySelector('[name="quantity"]');
            if (qtyField) qtyField.value = "1.00";
        }
        
        const lastWeightUnit = localStorage.getItem('last_article_weight_unit');
        if (lastWeightUnit) {
            const wuField = form.querySelector('[name="weight_unit"]');
            if (wuField) wuField.value = lastWeightUnit;
        }
    }

    const el = (typeof getCamElements === 'function') ? getCamElements() : {};

    if (id) {
        const item = stockItems.find(i => i.id === id);
        if (!item) return;

        document.getElementById('stock-modal-submit-btn').textContent = "Update";
        document.getElementById('save-print-article-btn').textContent = "Update & Print";
        document.getElementById('stock-item-id').value = item.id;

        // Fill fields
        form.querySelector('[name="article_no"]').value = item.article_no;
        form.querySelector('[name="barcode"]').value = item.barcode;
        form.querySelector('[name="item"]').value = item.item;
        form.querySelector('[name="type"]').value = item.type;
        form.querySelector('[name="content"]').value = item.content || '';
        form.querySelector('[name="count"]').value = item.count || '';
        form.querySelector('[name="density"]').value = item.density || '';
        form.querySelector('[name="width"]').value = item.width || '';
        form.querySelector('[name="weight"]').value = item.weight || '';
        form.querySelector('[name="weight_unit"]').value = item.weight_unit || 'GSM';
        form.querySelector('[name="quantity"]').value = item.quantity || '';
        form.querySelector('[name="finish"]').value = item.finish || '';
        form.querySelector('[name="remark"]').value = item.remark || '';

        if (item.image_url) {
            const img = document.getElementById(`img-stock-${item.id}`);
            if (img && img.src && !img.src.includes('data:image')) {
                if (el.capturePreview) {
                    el.capturePreview.src = img.src;
                    el.capturePreview.style.display = 'block';
                }
                if (el.sourcesContent) el.sourcesContent.style.display = 'none';
                if (el.retakeBtn) el.retakeBtn.style.display = 'inline-block';
                if (el.startBtn) el.startBtn.style.display = 'none';
            }
        }
    } else {
        document.getElementById('stock-modal-submit-btn').textContent = "Save";
        document.getElementById('save-print-article-btn').textContent = "Save & Print";
        document.getElementById('stock-item-id').value = '';
        
        const barcodeInput = document.getElementById('add-stock-barcode');
        if (barcodeInput && typeof generateBarcode === 'function') barcodeInput.value = generateBarcode();
    }

    if (typeof updateAddBarcodeVisualization === 'function') updateAddBarcodeVisualization();
    if (typeof updateModalLabelPreview === 'function') updateModalLabelPreview();
    
    if (stockItemModal) stockItemModal.show();
}

// Attach live preview updates to form inputs
document.addEventListener('input', (e) => {
    if (e.target.closest('#stock-item-form') && typeof triggerLabelPreviewDebounce === 'function') {
        triggerLabelPreviewDebounce();
    }
});

// Save Stock
async function saveStockItem(event, isRetry = false) {
    if (event) event.preventDefault();
    const form = document.getElementById('stock-item-form');
    if (!form || !form.checkValidity()) {
        form?.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const stockData = Object.fromEntries(formData.entries());
    const itemId = stockData.id;
    const imageData = stockData.image_data;

    delete stockData.id;
    delete stockData.image_data;

    showLoading(true);
    try {
        let finalImageUrl = null;

        if (imageData && imageData.startsWith('data:image')) {
            const fileName = `stock-${Date.now()}.webp`;
            const blob = (typeof dataURLToBlob === 'function') ? dataURLToBlob(imageData) : null;

            if (itemId) {
                const oldItem = stockItems.find(i => i.id === itemId);
                if (oldItem?.image_url) {
                    const { error: rErr } = await supabaseClient.storage.from('stock-images').remove([oldItem.image_url]);
                    if (rErr) console.warn("Failed to delete stale replaced image:", rErr);
                    
                    if (typeof stockImageCache !== 'undefined') delete stockImageCache[oldItem.image_url];
                }
            }

            if (blob) {
                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                    .from('stock-images')
                    .upload(fileName, blob);

                if (uploadError) throw uploadError;
                finalImageUrl = uploadData.path;
                if (typeof stockImageCache !== 'undefined') {
                    delete stockImageCache[finalImageUrl];
                    localStorage.setItem('stock_image_cache', JSON.stringify(stockImageCache));
                }
            }
        }

        if (finalImageUrl) stockData.image_url = finalImageUrl;

        let error;
        if (itemId) {
            const { error: updateError } = await supabaseClient.from('Stock').update(stockData).eq('id', itemId);
            error = updateError;
        } else {
            const { error: insertError } = await supabaseClient.from('Stock').insert([stockData]);
            error = insertError;
        }

        if (error) throw error;

        // Persist specific fields for easy next-article entry
        if (stockData.type) localStorage.setItem('last_article_type', stockData.type);
        if (stockData.quantity) localStorage.setItem('last_article_quantity', stockData.quantity);
        if (stockData.weight_unit) localStorage.setItem('last_article_weight_unit', stockData.weight_unit);

        if (stockItemModal) stockItemModal.hide();
        if (typeof fetchStock === 'function') fetchStock();
    } catch (err) {
        // AUTOMATIC RETRY FOR SAFARI "LOAD FAILED"
        if (!isRetry && err.message && err.message.toLowerCase().includes('load failed')) {
            console.warn("Safari Load Failed detected. Automatically retrying save...");
            await new Promise(r => setTimeout(r, 300));
            return saveStockItem(null, true);
        }

        alert("Operation failed: " + err.message);
    } finally {
        showLoading(false);
    }
}

// Attach the save handler to the form's submit event (for keyboard Enter)
// but also expose it for manual button clicks to bypass Safari's submit state machine
document.getElementById('stock-item-form')?.addEventListener('submit', saveStockItem);

document.getElementById('save-print-article-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const form = document.getElementById('stock-item-form');
    if (!form || !form.checkValidity()) {
        form?.reportValidity();
        return;
    }
    const formData = new FormData(form);
    const itemData = Object.fromEntries(formData.entries());
    try {
        if (typeof printStockLabelFromData === 'function') {
            await printStockLabelFromData(itemData);
            // Manually trigger the save instead of using requestSubmit() which fails on some Safari versions
            saveStockItem();
        }
    } catch (err) { console.error(err); }
});

async function deleteStockItem(id, articleNo) {
    if (!confirm(`Delete ${articleNo}?`)) return;
    showLoading(true);
    try {
        const item = stockItems.find(i => i.id === id);
        if (item?.image_url) {
            const { error: dErr } = await supabaseClient.storage.from('stock-images').remove([item.image_url]);
            if (dErr) console.error('Failed to delete image:', dErr);
            
            if (typeof stockImageCache !== 'undefined') delete stockImageCache[item.image_url];
            localStorage.setItem('stock_image_cache', JSON.stringify(stockImageCache));
        }
        await supabaseClient.from('Stock').delete().eq('id', id);
        if (typeof fetchStock === 'function') fetchStock();
    } catch (err) { alert(err.message); }
    finally { showLoading(false); }
}

async function shareStockItem(id) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;
    const summary = `*Green International*\nArticle: ${item.article_no}\nContent: ${item.content || '-'}\nCount: ${item.count || '-'}`;
    try {
        await navigator.clipboard.writeText(summary);
        const btn = document.querySelector(`button[onclick*="shareStockItem('${id}')"]`);
        if (btn) {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `Copied!`;
            setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
        }
    } catch (err) { console.error(err); }
}

function clearStockFilters() {
    ['stock-search', 'gsm-min-filter', 'gsm-max-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const typeFilter = document.getElementById('stock-type-filter');
    if (typeFilter) typeFilter.value = 'all';
    const statusFilter = document.getElementById('stock-status-filter');
    if (statusFilter) statusFilter.value = 'all';
    const unitFilter = document.getElementById('weight-unit-filter');
    if (unitFilter) unitFilter.value = 'All';
    const sortSelect = document.getElementById('stock-sort-select');
    if (sortSelect) sortSelect.value = 'created_at-desc';

    stockCurrentPage = 1;
    if (typeof applyStockFilter === 'function') applyStockFilter();
}

// Search & Filter Listeners (delegate if needed or wait for DOM)
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('stock-search')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { 
            stockCurrentPage = 1; 
            if (typeof fetchStock === 'function') fetchStock(); 
        }
    });

    ['stock-type-filter', 'stock-status-filter', 'weight-unit-filter'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            stockCurrentPage = 1;
            if (typeof applyStockFilter === 'function') applyStockFilter();
        });
    });

    ['gsm-min-filter', 'gsm-max-filter'].forEach(id => {
        document.getElementById(id)?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { 
                stockCurrentPage = 1; 
                if (typeof fetchStock === 'function') fetchStock(); 
            }
        });
    });
});
