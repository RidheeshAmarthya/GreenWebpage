// Stock Manager Modal Handlers

async function showStockDetail(id) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;

    const stock = calculateStockAvailability(item);
    let checkoutInfoHtml = '';
    
    if (item.checkouts && item.checkouts.length > 0) {
        // 1. Group Active Checkouts by Company
        const activeMap = new Map();
        const returnedCheckouts = item.checkouts.filter(c => !!c.returned_at).sort((a,b) => new Date(b.returned_at) - new Date(a.returned_at));
        const activeList = item.checkouts.filter(c => !c.returned_at).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        activeList.forEach(c => {
            const companyKey = c.company || 'Unknown';
            if (!activeMap.has(companyKey)) {
                activeMap.set(companyKey, { count: 1, names: new Set([c.name]), date: c.created_at });
            } else {
                const group = activeMap.get(companyKey);
                group.count++;
                if (c.name) group.names.add(c.name);
            }
        });

        const groupedActive = Array.from(activeMap.entries()).map(([company, data]) => ({
            company,
            count: data.count,
            name: Array.from(data.names).join(', '),
            created_at: data.date,
            returned_at: null
        }));

        const finalDisplayList = [...groupedActive, ...returnedCheckouts];

        checkoutInfoHtml = `
            <details class="mb-3 border rounded-3 overflow-hidden bg-white" style="border-color: #eee !important;">
                <summary class="p-2 px-3 d-flex align-items-center justify-content-between" style="list-style: none; cursor: pointer; outline: none; user-select: none;">
                    <div class="d-flex align-items-center gap-2">
                        <div class="rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: 20px; height: 20px;">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
                        </div>
                        <label class="text-muted small fw-bold text-uppercase mb-0" style="font-size: 0.55rem; letter-spacing: 0.5px; cursor: pointer;">CHECKOUT HISTORY (${stock.active}/${item.checkouts.length})</label>
                    </div>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="opacity-30"><polyline points="6 9 12 15 18 9"/></svg>
                </summary>
                <div class="px-3 pb-2 pt-0">
                    ${finalDisplayList.map(checkout => `
                        <div class="d-flex align-items-center justify-content-between border-top py-2" style="opacity: ${checkout.returned_at ? '0.4' : '1'}">
                            <div>
                                <div class="text-dark small fw-bold" style="font-size: 0.7rem; ${checkout.returned_at ? 'text-decoration: line-through;' : ''}">
                                    ${checkout.company}${checkout.count > 1 ? ` (${checkout.count} UNITS)` : ''}
                                    <span class="text-muted fw-normal"> &mdash; ${checkout.name}</span>
                                </div>
                                <div class="text-muted" style="font-size: 0.55rem;">
                                    ${checkout.returned_at ? `Returned: ${new Date(checkout.returned_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : `Out since: ${new Date(checkout.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                                </div>
                            </div>
                            ${checkout.returned_at ? 
                                `<span class="badge bg-success-subtle text-success border border-success-subtle py-0 px-2" style="font-size: 0.5rem; border-radius: 4px; font-weight: 800;">RETURNED</span>` : 
                                `<span class="badge bg-danger-subtle text-danger border border-danger-subtle py-0 px-2" style="font-size: 0.5rem; border-radius: 4px; font-weight: 800;">CHECKED OUT</span>`
                            }
                        </div>
                    `).join('')}
                </div>
            </details>
        `;
    }

    const modalEl = document.getElementById('stockDetailModal');
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) modal = new bootstrap.Modal(modalEl);
    const container = document.getElementById('stock-detail-content');
    
    container.innerHTML = `
        <div class="row g-0 overflow-hidden" style="border-radius: 28px; background: #fff;">
            <button type="button" class="btn-close detail-modal-close" data-bs-dismiss="modal" aria-label="Close"></button>
            <div class="col-lg-7 order-1 order-lg-2 p-4 p-md-5 d-flex flex-column position-relative border-bottom border-lg-bottom-0" style="background: #fff;">
                <div class="mb-4">
                    <h4 class="fw-bold text-dark mb-1" style="font-size: 1.8rem; letter-spacing: -1px;">${item.article_no}</h4>
                    <div class="d-flex align-items-center gap-2 text-muted small fw-bold">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        ADDED ON ${item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                    </div>
                </div>

                <div class="flex-grow-1 d-flex flex-column justify-content-center">
                    <h6 class="mb-3 fw-bold text-dark opacity-50" style="letter-spacing: 1px; font-size: 0.7rem; text-uppercase;">Zebra Label Preview</h6>
                    <div id="detail-label-preview-container" class="bg-white border rounded-4 shadow-sm overflow-hidden d-flex align-items-center justify-content-center position-relative w-100" style="aspect-ratio: 4 / 2; background: #fff !important; border-width: 2px !important;">
                        <div id="detail-label-preview-spinner" class="spinner-border text-green spinner-border-sm" style="display: none; position: absolute; z-index: 2;"></div>
                        <img id="detail-label-preview-img" src="" style="width: 100%; height: 100%; object-fit: contain; display: none;">
                        <div id="detail-label-preview-placeholder" class="text-center p-4">
                            <div class="spinner-grow text-green opacity-25"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 order-2 order-lg-3 p-3 p-md-4 border-top border-bottom border-lg-bottom-0 d-flex gap-2 gap-md-3 detail-actions-container" style="background: #fcfcfc;">
                <button class="btn btn-green flex-grow-1 py-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2" 
                        style="border-radius: 16px; font-size: 0.85rem;"
                        onclick="editFromDetail('${item.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span>EDIT RECORD</span>
                </button>
                <button class="btn btn-outline-danger px-3 px-md-4 fw-bold shadow-sm d-flex align-items-center justify-content-center" 
                        style="border-radius: 16px;" 
                        onclick="bootstrap.Modal.getInstance(document.getElementById('stockDetailModal')).hide(); deleteStockItem('${item.id}', '${item.article_no}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
                <button class="btn btn-light flex-grow-1 py-3 fw-bold border shadow-sm d-flex align-items-center justify-content-center gap-2" 
                        style="border-radius: 16px; font-size: 0.85rem;" 
                        onclick="generateStockPDF('${item.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>PRINT SWATCH</span>
                </button>
                <button class="btn btn-dark flex-grow-1 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow" 
                        style="border-radius: 16px; font-size: 0.85rem;"
                        onclick="printStockLabel('${item.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    <span>PRINT LABEL</span>
                </button>
            </div>

            <div class="col-lg-5 order-3 order-lg-1 d-flex flex-column p-4 border-lg-end" style="background: #f8f9fa;">
                <div class="d-flex align-items-center gap-2 mb-3 pt-1">
                    <span class="badge ${stock.available > 0 ? 'bg-success' : 'bg-warning text-dark'} px-2 py-1 fw-bold" style="border-radius: 6px; font-size: 0.55rem;">
                        ${!stock.isAvailable ? 'OUT OF STOCK' : (stock.available < stock.total ? `${stock.available} / ${stock.total} IN STOCK` : `${stock.available} IN STOCK`)}
                    </span>
                    <div class="badge bg-green text-white px-2 py-1 fw-bold text-uppercase" style="border-radius: 6px; font-size: 0.55rem; letter-spacing: 0.5px;">${item.type || '-'}</div>
                </div>
                ${checkoutInfoHtml}
                <div class="bg-white rounded-4 border shadow-sm position-relative overflow-hidden mb-3 d-flex align-items-center justify-content-center" 
                     id="detail-img-zoom-container"
                     style="height: 380px; cursor: zoom-in;"
                     onclick="openBigView('${item.resolved_url || placeholderImg}')">
                    <img src="${item.resolved_url || placeholderImg}" id="detail-img-stock" class="img-fluid" 
                         style="max-height: 350px; max-width: 95%; object-fit: contain; border-radius: 12px; transition: transform 0.1s ease-out;">
                    <div class="position-absolute bottom-0 start-50 translate-middle-x mb-2 text-muted fw-bold" style="font-size: 0.45rem; opacity: 0.4; letter-spacing: 0.5px;">CLICK FOR BIG VIEW</div>
                </div>
            </div>
        </div>
    `;

    const zoomContainer = container.querySelector('#detail-img-zoom-container');
    const zoomImg = container.querySelector('#detail-img-stock');
    updateModalLabelPreview(item, 'detail-label-preview');

    if (!item.resolved_url && item.image_url) {
        getCachedSignedUrl(item.image_url).then(url => {
            if (url && zoomImg) zoomImg.src = url;
        });
    }

    if (zoomContainer && zoomImg) {
        zoomContainer.addEventListener('mousemove', (e) => {
            const rect = zoomContainer.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            zoomImg.style.transformOrigin = `${x}% ${y}%`;
            zoomImg.style.transform = "scale(2.5)";
        });
        zoomContainer.addEventListener('mouseleave', () => {
            zoomImg.style.transform = "scale(1)";
            zoomImg.style.transformOrigin = "center";
        });
    }

    modal.show();
}

async function editFromDetail(id) {
    const detailModalEl = document.getElementById('stockDetailModal');
    const detailModal = bootstrap.Modal.getInstance(detailModalEl);
    
    // Smooth transition
    detailModalEl.addEventListener('hidden.bs.modal', function onDetailHidden() {
        detailModalEl.removeEventListener('hidden.bs.modal', onDetailHidden);
        openStockModal(id);
    }, { once: true });
    
    detailModal.hide();
}
