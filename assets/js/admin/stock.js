// Stock Manager Logic
const placeholderImg = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23eeeeee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20fill%3D%22%23aaaaaa%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E";
let stockItems = [];
let stockCurrentPage = 1;
const stockItemsPerPage = 12; // Grid friendly (3x4 or 4x3)
let stockSort = { column: 'created_at', direction: 'desc' };
let stockViewMode = 'grid';

// Image Caching to save bandwidth (Persistent 24h)
const CACHE_VALID_MS = 23.5 * 60 * 60 * 1000; 
let stockImageCache = JSON.parse(localStorage.getItem('stock_image_cache') || '{}');
const pendingRequests = new Map(); // Track ongoing requests to deduplicate

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

// Navigation
function goToStock(push = true) {
    selectionView.style.display = 'none';
    ordersListView.style.display = 'none';
    orderDetailView.style.display = 'none';
    stockManagerView.style.display = 'block';
    fetchStock();
    if (push) history.pushState({ view: 'stock' }, '', '#stock');
}

function returnToSelection() {
    stockManagerView.style.display = 'none';
    ordersListView.style.display = 'none';
    orderDetailView.style.display = 'none';
    selectionView.style.display = 'block';
    history.pushState({ view: 'hub' }, '', '#hub');
}

// Fetch Stock
async function fetchStock() {
    showLoading(true);
    const { data, error } = await supabaseClient
        .from('Stock')
        .select(`
            *,
            checkouts: Stock_Checkouts(name, company, created_at, returned_at)
        `);

    showLoading(false);
    if (error) {
        console.error(error);
        return;
    }

    stockItems = data;
    applyStockFilter();
}

function applyStockFilter() {
    const searchTerm = document.getElementById('stock-search').value.toLowerCase();
    const typeFilter = document.getElementById('stock-type-filter').value;

    let filtered = stockItems.filter(item => {
        const matchesSearch = !searchTerm || 
            item.article_no?.toLowerCase().includes(searchTerm) || 
            item.content?.toLowerCase().includes(searchTerm) || 
            item.item?.toLowerCase().includes(searchTerm) ||
            item.barcode?.toString().includes(searchTerm);
        
        const matchesType = typeFilter === 'all' || item.type === typeFilter;

        return matchesSearch && matchesType;
    });

    // Sorting
    filtered.sort((a, b) => {
        let valA = a[stockSort.column] || '';
        let valB = b[stockSort.column] || '';
        
        if (stockSort.column.includes('date') || stockSort.column === 'created_at') {
            valA = valA ? new Date(valA) : new Date(0);
            valB = valB ? new Date(valB) : new Date(0);
        } else {
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
        }
        
        if (valA < valB) return stockSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return stockSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderStockItems(filtered);
}

// Read-Only Detail View
async function showStockDetail(id) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;

    let checkoutInfoHtml = '';
    if (item.status !== 'IN_STOCK' && item.checkouts) {
        // Find the active checkout (unreturned) locally from pre-fetched data
        const checkout = item.checkouts.find(c => !c.returned_at);

        if (checkout) {
            checkoutInfoHtml = `
                <details class="mb-2 border rounded-3 overflow-hidden bg-white" style="border-color: #eee !important;">
                    <summary class="p-2 px-3 d-flex align-items-center justify-content-between" style="list-style: none; cursor: pointer; outline: none; user-select: none;">
                        <div class="d-flex align-items-center gap-2">
                            <div class="rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: 20px; height: 20px;">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
                            </div>
                            <label class="text-muted small fw-bold text-uppercase mb-0" style="font-size: 0.55rem; letter-spacing: 0.5px; cursor: pointer;">History</label>
                        </div>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="opacity-30"><polyline points="6 9 12 15 18 9"/></svg>
                    </summary>
                    <div class="px-3 pb-3 pt-0">
                        <div class="d-flex align-items-center justify-content-between border-top pt-2 mt-1">
                            <div class="text-dark small fw-bold" style="font-size: 0.7rem;">${checkout.name} @ ${checkout.company}</div>
                            <div class="text-muted" style="font-size: 0.6rem;">${new Date(checkout.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                </details>
            `;
        }
    }

    const modal = new bootstrap.Modal(document.getElementById('stockDetailModal'));
    const container = document.getElementById('stock-detail-content');
    
    // Set content and styling for the detail view (Consistent Design)
    container.innerHTML = `
        <div class="row g-0 overflow-hidden" style="border-radius: 24px;">
            <!-- Left Side: Article Photo & Barcode -->
            <div class="col-lg-5 d-flex flex-column p-4 p-md-5 shadow-sm" style="background: #f8f8f8; min-height: 480px;">
                <!-- Header: Category & Badge (Aligned with Article No) -->
                <div class="mb-2 pt-2 d-flex justify-content-between align-items-center">
                    <span class="badge ${item.status === 'IN_STOCK' ? 'bg-success' : 'bg-warning text-dark'} px-3 py-2 fw-bold" style="border-radius: 6px; font-size: 0.65rem;">
                        ${item.status === 'IN_STOCK' ? 'IN STOCK' : 'OUT OF STOCK'}
                    </span>
                    <div class="badge bg-green text-white px-3 py-2 fw-bold text-uppercase" style="border-radius: 6px; font-size: 0.65rem; letter-spacing: 1px;">${item.type || '-'}</div>
                </div>

                <!-- Distribution info -->
                ${checkoutInfoHtml}

                <!-- Interactive Zoom Image Container -->
                <div class="d-flex align-items-center justify-content-center my-2 bg-white rounded-3 shadow-sm position-relative overflow-hidden" 
                     id="detail-img-zoom-container"
                     style="height: 260px; cursor: zoom-in;">
                    <img src="${placeholderImg}" id="detail-img-stock" class="img-fluid" 
                         style="max-height: 240px; max-width: 90%; object-fit: contain; border-radius: 12px; transition: transform 0.1s ease-out; transform-origin: center;">
                    <div class="position-absolute bottom-0 start-50 translate-middle-x mb-2 text-muted fw-bold" style="font-size: 0.5rem; opacity: 0.5; pointer-events: none;">MAGNIFY TO INSPECT</div>
                </div>
                
                <!-- Barcode Visualization (Aligned with Buttons) -->
                <div class="w-100 text-center py-2 bg-white rounded-3 border mt-auto">
                    <svg id="detail-barcode-svg" style="max-height: 40px; width: 100%;"></svg>
                    <div class="mt-1"><code class="text-muted" style="font-size: 0.65rem;">${item.barcode}</code></div>
                </div>
            </div>

            <!-- Right Side: Tech Details -->
            <div class="col-lg-7 p-4 p-md-5 bg-white position-relative d-flex flex-column shadow-sm">
                <button type="button" class="btn-close position-absolute top-0 end-0 m-4" data-bs-dismiss="modal"></button>
                
                <div class="mb-3 pt-2">
                    <div class="fw-bold text-dark mb-0" style="font-size: 1.6rem; word-break: break-all; line-height: 1.1;">${item.article_no}</div>
                </div>

                <!-- Specs List -->
                <div class="flex-grow-1 mb-3">
                    <div class="row g-0 py-2 border-bottom">
                        <div class="col-5 text-muted small fw-bold text-uppercase">Content</div>
                        <div class="col-7 text-dark small fw-bold">${item.content || '-'}</div>
                    </div>
                    <div class="row g-0 py-2 border-bottom">
                        <div class="col-5 text-muted small fw-bold text-uppercase">Count / Qty</div>
                        <div class="col-7 text-dark small fw-bold">${item.count || '-'}</div>
                    </div>
                    <div class="row g-0 py-2 border-bottom">
                        <div class="col-5 text-muted small fw-bold text-uppercase">Density</div>
                        <div class="col-7 text-dark small fw-bold">${item.density || '-'}</div>
                    </div>
                    <div class="row g-0 py-2 border-bottom">
                        <div class="col-5 text-muted small fw-bold text-uppercase">Width</div>
                        <div class="col-7 text-dark small fw-bold">${item.width || '-'}</div>
                    </div>
                    <div class="row g-0 py-2 border-bottom">
                        <div class="col-5 text-muted small fw-bold text-uppercase">Weight</div>
                        <div class="col-7 text-dark small fw-bold">${item.weight || '-'}</div>
                    </div>
                    <div class="row g-0 py-2 border-bottom">
                        <div class="col-5 text-muted small fw-bold text-uppercase">Item Name</div>
                        <div class="col-7 text-dark small fw-bold">${item.item || '-'}</div>
                    </div>
                    <div class="row g-0 py-2 border-bottom">
                        <div class="col-5 text-muted small fw-bold text-uppercase">Finishing</div>
                        <div class="col-7 text-dark small fw-bold">${item.finish || '-'}</div>
                    </div>
                    <div class="row g-0 py-2 border-bottom">
                        <div class="col-5 text-muted small fw-bold text-uppercase">Remarks</div>
                        <div class="col-7 text-dark small fw-bold text-muted" style="font-style: italic;">${item.remark || 'N/A'}</div>
                    </div>
                    <div class="row g-0 py-2 text-muted" style="opacity: 0.8;">
                        <div class="col-5 small fw-bold text-uppercase" style="font-size: 0.65rem;">System Entry</div>
                        <div class="col-7 small fw-bold" style="font-size: 0.65rem;">${item.created_at ? new Date(item.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="d-flex gap-2 mt-auto">
                    <button class="btn btn-green flex-grow-1 py-3 fw-bold" style="border-radius: 14px;"
                            onclick="bootstrap.Modal.getInstance(document.getElementById('stockDetailModal')).hide(); openStockModal('${item.id}')">
                        EDIT RECORD
                    </button>
                    <button class="btn btn-outline-danger px-4" style="border-radius: 14px;"
                            onclick="bootstrap.Modal.getInstance(document.getElementById('stockDetailModal')).hide(); deleteStockItem('${item.id}', '${item.article_no}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Initialize UI Refs for instant use
    const zoomContainer = container.querySelector('#detail-img-zoom-container');
    const zoomImg = container.querySelector('#detail-img-stock');

    // Generate Visual Barcode
    setTimeout(() => {
        try {
            JsBarcode("#detail-barcode-svg", item.barcode, {
                format: "CODE128",
                width: 1.5,
                height: 50,
                displayValue: false, // We show it separately below
                margin: 0,
                background: "transparent"
            });
        } catch (e) {
            console.error("Barcode generation failed", e);
        }
    }, 100);

    if (item.resolved_url) {
        if (zoomImg) zoomImg.src = item.resolved_url;
    } else if (item.image_url) {
        getCachedSignedUrl(item.image_url).then(url => {
            if (url && zoomImg) zoomImg.src = url;
        });
    }

    // Core Interactive Zoom Logic
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

document.getElementById('stock-search')?.addEventListener('input', () => {
    stockCurrentPage = 1;
    applyStockFilter();
});

document.getElementById('stock-type-filter')?.addEventListener('change', () => {
    stockCurrentPage = 1;
    applyStockFilter();
});

// View Toggle
function toggleStockView(mode) {
    stockViewMode = mode;
    
    // Update buttons
    document.getElementById('view-grid-btn').classList.toggle('active', mode === 'grid');
    document.getElementById('view-list-btn').classList.toggle('active', mode === 'list');
    
    // Update containers
    document.getElementById('stock-grid-view').style.display = mode === 'grid' ? 'flex' : 'none';
    document.getElementById('stock-list-view').style.display = mode === 'list' ? 'block' : 'none';
    
    applyStockFilter(); // Re-render current data
}

function renderStockItems(data) {
    const gridContainer = document.getElementById('stock-grid-view');
    const listBody = document.getElementById('stock-table-body');
    const emptyState = document.getElementById('stock-empty');
    
    gridContainer.innerHTML = '';
    listBody.innerHTML = '';
    
    if (data.length === 0) {
        emptyState.style.display = 'block';
        return;
    } 
    
    emptyState.style.display = 'none';

    const totalItemsCount = data.length;
    const totalPagesCount = Math.ceil(totalItemsCount / stockItemsPerPage);
    
    const startIndex = (stockCurrentPage - 1) * stockItemsPerPage;
    const endIndex = Math.min(startIndex + stockItemsPerPage, totalItemsCount);
    const paginatedData = data.slice(startIndex, endIndex);

    paginatedData.forEach(async (item) => {
        if (stockViewMode === 'grid') {
            const card = createStockCard(item);
            gridContainer.appendChild(card);
        } else {
            const row = createStockRow(item);
            listBody.appendChild(row);
        }
    });

    renderStockPagination(totalItemsCount, totalPagesCount);
}

function createStockCard(item) {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';
    
    const card = document.createElement('div');
    card.className = 'card h-100 border-0 shadow-sm stock-card position-relative overflow-hidden';
    card.style.borderRadius = '20px';
    card.style.transition = 'all 0.3s ease';
    card.style.cursor = 'pointer';
    card.onclick = () => showStockDetail(item.id);

    // Hover effect
    card.onmouseover = () => card.style.transform = 'translateY(-10px)';
    card.onmouseout = () => card.style.transform = 'translateY(0)';

    const badgeClass = item.status === 'IN_STOCK' ? 'bg-success' : 'bg-warning text-dark';
    const badgeText = item.status === 'IN_STOCK' ? 'In Stock' : 'Out of stock';

    card.innerHTML = `
        <div class="position-relative overflow-hidden" style="height: 200px; background: #f8f9fa;">
            <img src="${placeholderImg}" id="img-grid-${item.id}" class="w-100 h-100" style="object-fit: cover;">
            <!-- Top Left: Status Only -->
            <div class="position-absolute top-0 start-0 m-3">
                <span class="badge ${badgeClass} shadow-sm px-2 py-1 border-0 fw-bold text-uppercase" style="border-radius: 6px; font-size: 0.55rem; letter-spacing: 0.5px;">${badgeText}</span>
            </div>
        </div>
        <div class="card-body p-3 d-flex flex-column" style="gap: 10px;">
            <div class="mb-1">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="fw-bold text-dark fs-6" style="letter-spacing: -0.2px; word-break: break-all; line-height: 1.1;">${item.article_no}</div>
                    <span class="badge bg-green text-white px-2 py-1 fw-bold text-uppercase flex-shrink-0" style="border-radius: 6px; font-size: 0.55rem; letter-spacing: 0.5px;">${item.type}</span>
                </div>
            </div>
            
            <div class="flex-grow-1 d-flex flex-column" style="gap: 4px;">
                <!-- Line 1: Content & Date -->
                <div class="d-flex justify-content-between align-items-start">
                    <div class="text-success small fw-bold overflow-hidden" style="display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; line-height: 1.2;">
                        ${item.content || '-'}
                    </div>
                    <div class="text-muted fw-bold text-uppercase ps-2" style="font-size: 0.6rem; opacity: 0.6; letter-spacing: 0.5px; margin-top: 1px;">
                        ${item.created_at ? new Date(item.created_at).toLocaleString('en-IN', { month: 'short', year: 'numeric' }) : '-'}
                    </div>
                </div>
                <!-- Line 2: Count & GSM -->
                <div class="d-flex justify-content-between align-items-center text-muted fw-bold small" style="opacity: 0.85; letter-spacing: -0.1px;">
                    <div>${item.count || '-'}</div>
                    <div class="flex-shrink-0">${item.weight || '-'}</div>
                </div>
            </div>
        </div>
    `;

    if (item.image_url) {
        getCachedSignedUrl(item.image_url).then(url => {
            if (url) {
                item.resolved_url = url; // Persistent cache for modal reuse
                const img = card.querySelector(`#img-grid-${item.id}`);
                if (img) img.src = url;
            }
        });
    }

    col.appendChild(card);
    return col;
}

function createStockRow(item) {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = (e) => {
        if (!e.target.closest('button')) showStockDetail(item.id);
    };

    const badgeClass = item.status === 'IN_STOCK' ? 'bg-success-subtle text-success border-success' : 'bg-warning-subtle text-warning border-warning';
    const badgeText = item.status === 'IN_STOCK' ? 'In Stock' : 'Out of stock';

    tr.innerHTML = `
        <td class="ps-4">
            <div style="width: 45px; height: 45px; border-radius: 10px; overflow: hidden; background: #f0f0f0;">
                <img src="${placeholderImg}" id="img-list-${item.id}" class="w-100 h-100" style="object-fit: cover;">
            </div>
        </td>
        <td class="fw-bold text-dark">${item.article_no}</td>
        <td><span class="badge bg-light text-dark border px-2">${item.type}</span></td>
        <td class="small fw-bold">${item.count || '-'}</td>
        <td class="small fw-bold">${item.weight || '-'}</td>
        <td class="text-muted small">${item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
        <td><span class="badge ${badgeClass} border px-2">${badgeText}</span></td>
        <td><code>${item.barcode}</code></td>
        <td class="text-end pe-4">
            <div class="d-flex justify-content-end gap-2">
                <button class="btn btn-sm btn-green px-3 py-1 shadow-sm fw-bold border-0" style="border-radius: 8px; font-size: 0.7rem;" onclick="openStockModal('${item.id}')">
                    EDIT
                </button>
                <button class="btn btn-sm btn-outline-danger px-2 border-0" style="border-radius: 8px;" onclick="deleteStockItem('${item.id}', '${item.article_no}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        </td>
    `;

    if (item.image_url) {
        getCachedSignedUrl(item.image_url).then(url => {
            if (url) {
                item.resolved_url = url; // Persistent cache for modal reuse
                const img = tr.querySelector(`#img-list-${item.id}`);
                if (img) img.src = url;
            }
        });
    }

    return tr;
}

function renderStockPagination(totalItems, totalPages) {
    const container = document.getElementById('stock-pagination-container');
    const startRange = (stockCurrentPage - 1) * stockItemsPerPage + 1;
    const endRange = Math.min(stockCurrentPage * stockItemsPerPage, totalItems);

    container.innerHTML = `
        <div class="text-muted small">
            Showing <strong>${startRange}-${endRange}</strong> of <strong>${totalItems}</strong> items
        </div>
        <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" ${stockCurrentPage === 1 ? 'disabled' : ''} onclick="changeStockPage(${stockCurrentPage - 1})">
                Previous
            </button>
            <div class="d-flex align-items-center px-2 small fw-bold text-success">
                Page ${stockCurrentPage} of ${totalPages}
            </div>
            <button class="btn btn-sm btn-outline-secondary" ${stockCurrentPage === totalPages ? 'disabled' : ''} onclick="changeStockPage(${stockCurrentPage + 1})">
                Next
            </button>
        </div>
    `;
}

function changeStockPage(page) {
    stockCurrentPage = page;
    applyStockFilter();
}

// Generators
function generateBarcode() {
    // Generate a 12-digit numeric barcode (Code 128 style)
    // Starting with 88 (or any prefix) then timestamp-based random digits
    const prefix = "88"; 
    const timestamp = Date.now().toString().slice(-7); // Last 7 digits
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return prefix + timestamp + random;
}

// Barcode Refresh Listener
function updateAddBarcodeVisualization() {
    const val = document.getElementById('add-stock-barcode').value;
    if (!val) {
        document.getElementById('add-stock-barcode-svg').style.display = 'none';
        return;
    }
    document.getElementById('add-stock-barcode-svg').style.display = 'block';
    try {
        JsBarcode("#add-stock-barcode-svg", val, {
            format: "CODE128",
            width: 1.5,
            height: 40,
            displayValue: false,
            margin: 0,
            background: "transparent"
        });
    } catch (e) {
        console.error("Barcode generation failed", e);
    }
}

document.getElementById('regenerate-stock-barcode')?.addEventListener('click', () => {
    document.getElementById('add-stock-barcode').value = generateBarcode();
    updateAddBarcodeVisualization();
});

document.getElementById('add-stock-barcode')?.addEventListener('input', updateAddBarcodeVisualization);

// Webcam Logic
let webcamStream = null;
const video = document.getElementById('webcam-preview');
const capturePreview = document.getElementById('webcam-capture-preview');
const placeholder = document.getElementById('webcam-placeholder');
const startBtn = document.getElementById('start-webcam-btn');
const captureBtn = document.getElementById('capture-photo-btn');
const retakeBtn = document.getElementById('retake-photo-btn');

async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        webcamStream = stream;
        video.srcObject = stream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        capturePreview.style.display = 'none';
        startBtn.style.display = 'none';
        captureBtn.style.display = 'inline-block';
        retakeBtn.style.display = 'none';
        
        video.play();
    } catch (err) {
        alert('Could not access webcam: ' + err.message);
    }
}

function stopWebcam() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
}

async function capturePhoto() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set internal resolution (reasonable for 50KB)
    canvas.width = 640;
    canvas.height = 480;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Compression Loop to ensure < 50KB (Now using WebP)
    let quality = 0.8;
    let dataUrl = '';
    
    while (quality > 0.1) {
        dataUrl = canvas.toDataURL('image/webp', quality);
        const sizeInBytes = (dataUrl.length * 0.75); // Estimation
        if (sizeInBytes < 50000) break;
        quality -= 0.1;
    }

    capturePreview.src = dataUrl;
    capturePreview.style.display = 'block';
    document.getElementById('stock-sources-content').style.display = 'none';
    document.getElementById('photo-action-overlay').style.display = 'block';
    
    document.getElementById('stock-image-data').value = dataUrl;
    stopWebcam();
}

if (startBtn) startBtn.onclick = startWebcam;
if (captureBtn) captureBtn.onclick = capturePhoto;
if (retakeBtn) retakeBtn.onclick = () => {
    capturePreview.style.display = 'none';
    document.getElementById('stock-sources-content').style.display = 'block';
    document.getElementById('photo-action-overlay').style.display = 'none';
    document.getElementById('stock-image-data').value = '';
    document.getElementById('stock-file-input').value = '';
    
    // If on camera tab, start webcam again
    if (document.getElementById('cam-tab').classList.contains('active')) {
        startWebcam();
    }
};

// File Upload Compression
document.getElementById('stock-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Max dimensions for 50KB target
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            let quality = 0.8;
            let dataUrl = '';
            while (quality > 0.05) {
                dataUrl = canvas.toDataURL('image/webp', quality);
                const sizeInBytes = dataUrl.length * 0.75;
                if (sizeInBytes < 50000) break;
                quality -= 0.05;
            }

            capturePreview.src = dataUrl;
            capturePreview.style.display = 'block';
            document.getElementById('stock-sources-content').style.display = 'none';
            document.getElementById('photo-action-overlay').style.display = 'block';
            document.getElementById('stock-image-data').value = dataUrl;
            
            showLoading(false);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    showLoading(false);
});

// Modal Handlers
const stockItemModal = new bootstrap.Modal(document.getElementById('stockItemModal'));

function openStockModal(id = null) {
    const form = document.getElementById('stock-item-form');
    form.reset();
    document.getElementById('stock-image-data').value = '';
    capturePreview.style.display = 'none';
    document.getElementById('stock-sources-content').style.display = 'block';
    document.getElementById('photo-action-overlay').style.display = 'none';

    if (id) {
        const item = stockItems.find(i => i.id === id);
        if (!item) return;

        document.getElementById('stock-modal-submit-btn').textContent = "Update Article";
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
        form.querySelector('[name="finish"]').value = item.finish || '';
        form.querySelector('[name="remark"]').value = item.remark || '';

        if (item.image_url) {
            const img = document.getElementById(`img-stock-${item.id}`);
            if (img && img.src && !img.src.includes('data:image')) {
                capturePreview.src = img.src;
                capturePreview.style.display = 'block';
                document.getElementById('stock-sources-content').style.display = 'none';
                document.getElementById('photo-action-overlay').style.display = 'block';
            }
        }
    } else {
        document.getElementById('stock-modal-submit-btn').textContent = "Save Article";
        document.getElementById('stock-item-id').value = '';
        document.getElementById('add-stock-barcode').value = generateBarcode();
    }
    
    updateAddBarcodeVisualization();
    stockItemModal.show();
}

// Modals Reset
document.getElementById('stockItemModal')?.addEventListener('hidden.bs.modal', () => {
    stopWebcam();
    capturePreview.style.display = 'none';
    document.getElementById('stock-sources-content').style.display = 'block';
    document.getElementById('photo-action-overlay').style.display = 'none';
    startBtn.style.display = 'inline-block';
    captureBtn.style.display = 'none';
    
    document.getElementById('stock-item-form').reset();
    document.getElementById('stock-image-data').value = '';
    document.getElementById('stock-file-input').value = '';
    
    // Reset tabs to Camera
    const camTabTrigger = document.querySelector('#cam-tab');
    if (camTabTrigger) {
        bootstrap.Tab.getOrCreateInstance(camTabTrigger).show();
    }
});

// Save Stock
document.getElementById('stock-item-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const stockData = Object.fromEntries(formData.entries());
    const itemId = stockData.id;
    const imageData = stockData.image_data;
    
    delete stockData.id;
    delete stockData.image_data;

    showLoading(true);
    try {
        let finalImageUrl = null;
        
        // Handle New Image if provided
        if (imageData && imageData.startsWith('data:image')) {
            const fileName = `stock-${Date.now()}.webp`;
            const blob = await (await fetch(imageData)).blob();
            
            // If editing, try to delete old image first
            if (itemId) {
                const oldItem = stockItems.find(i => i.id === itemId);
                if (oldItem?.image_url) {
                    await supabaseClient.storage.from('stock-images').remove([oldItem.image_url]);
                    delete stockImageCache[oldItem.image_url]; // Clear cache for old image
                }
            }

            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('stock-images')
                .upload(fileName, blob);
            
            if (uploadError) throw uploadError;
            finalImageUrl = uploadData.path;
            delete stockImageCache[finalImageUrl]; // Ensure new image isn't stale
            localStorage.setItem('stock_image_cache', JSON.stringify(stockImageCache));
        }

        if (finalImageUrl) stockData.image_url = finalImageUrl;

        let error;
        if (itemId) {
            // Update
            const { error: updateError } = await supabaseClient
                .from('Stock')
                .update(stockData)
                .eq('id', itemId);
            error = updateError;
        } else {
            // Insert
            const { error: insertError } = await supabaseClient
                .from('Stock')
                .insert([stockData]);
            error = insertError;
        }

        if (error) throw error;
        
        stockItemModal.hide();
        fetchStock();
    } catch (err) {
        alert("Operation failed: " + err.message);
    } finally {
        showLoading(false);
    }
});

// Checkout Logic
let checkoutList = [];

const checkoutBarcodeInput = document.getElementById('checkout-barcode-input');
const checkoutItemsList = document.getElementById('checkout-items-list');
const checkoutCount = document.getElementById('checkout-count');
const checkoutListEmpty = document.getElementById('checkout-list-empty');
const submitCheckoutBtn = document.getElementById('submit-checkout-btn');
const checkoutScanFeedback = document.getElementById('checkout-scan-feedback');

function updateCheckoutUI() {
    checkoutCount.textContent = checkoutList.length;
    checkoutListEmpty.style.display = checkoutList.length === 0 ? 'block' : 'none';
    submitCheckoutBtn.disabled = checkoutList.length === 0;

    const itemsHtml = checkoutList.map(item => `
        <div class="d-flex align-items-center justify-content-between p-2 border-bottom">
            <div class="d-flex align-items-center gap-2">
                <div class="fw-bold small">${item.article_no}</div>
                <div class="text-muted" style="font-size: 0.7rem;">(${item.barcode})</div>
            </div>
            <button type="button" class="btn btn-sm text-danger" onclick="removeFromCheckoutList('${item.barcode}')">×</button>
        </div>
    `).join('');
    
    // Preserve the empty state message if needed
    if (checkoutList.length > 0) {
        checkoutItemsList.innerHTML = itemsHtml;
    } else {
        checkoutItemsList.innerHTML = '<div class="text-muted text-center p-4 small" id="checkout-list-empty">No items added yet.</div>';
    }
}

function addToCheckoutList(barcode) {
    if (!barcode) return;
    
    const item = stockItems.find(i => i.barcode.toString() === barcode.toString());
    if (!item) {
        checkoutScanFeedback.textContent = "Barcode not found";
        checkoutScanFeedback.className = "small mt-1 text-danger";
        return;
    }
    
    if (item.status !== 'IN_STOCK') {
        checkoutScanFeedback.textContent = "Item is already out";
        checkoutScanFeedback.className = "small mt-1 text-danger";
        return;
    }

    if (checkoutList.find(i => i.barcode.toString() === barcode.toString())) {
        checkoutScanFeedback.textContent = "Already in list";
        checkoutScanFeedback.className = "small mt-1 text-warning";
        return;
    }

    checkoutList.push(item);
    updateCheckoutUI();
    checkoutBarcodeInput.value = '';
    checkoutBarcodeInput.focus();
    checkoutScanFeedback.textContent = `✅ Added ${item.article_no}`;
    checkoutScanFeedback.className = "small mt-1 text-success";
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
    addToCheckoutList(checkoutBarcodeInput.value);
});

checkoutBarcodeInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addToCheckoutList(checkoutBarcodeInput.value);
    }
});

document.getElementById('clear-checkout-list')?.addEventListener('click', clearCheckoutList);

document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('checkout-name').value;
    const company = document.getElementById('checkout-company').value;
    const batch_id = crypto.randomUUID();

    showLoading(true);

    const rows = checkoutList.map(item => ({
        batch_id,
        name,
        company,
        barcode: item.barcode
    }));

    try {
        const { error } = await supabaseClient.from('Stock_Checkouts').insert(rows);
        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('checkoutModal')).hide();
        alert(`Successfully checked out ${checkoutList.length} items.`);
        
        // Reset
        clearCheckoutList();
        e.target.reset();
        fetchStock(); // Refresh quantities in table
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

async function deleteStockItem(id, articleNo) {
    if (!confirm(`Are you sure you want to delete ${articleNo}?`)) return;
    
    showLoading(true);
    try {
        const item = stockItems.find(i => i.id === id);
        if (item?.image_url) {
            // Delete image from storage first
            await supabaseClient.storage.from('stock-images').remove([item.image_url]);
            
            // Clear from persistent cache
            delete stockImageCache[item.image_url];
            localStorage.setItem('stock_image_cache', JSON.stringify(stockImageCache));
        }

        const { error } = await supabaseClient.from('Stock').delete().eq('id', id);
        if (error) throw error;
        
        fetchStock();
    } catch (err) {
        alert("Delete failed: " + err.message);
    } finally {
        showLoading(false);
    }
}

// Check In Logic
const checkInInput = document.getElementById('check-in-barcode-input');
const checkInFeedback = document.getElementById('check-in-feedback');

checkInInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        // Form submit listener will handle it
    }
});

document.getElementById('check-in-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const barcode = checkInInput.value;
    if (!barcode) return;
    
    showLoading(true);
    try {
        const { data, error } = await supabaseClient
            .from('Stock_Checkouts')
            .select('*')
            .eq('barcode', barcode)
            .is('returned_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            const item = stockItems.find(i => i.barcode.toString() === barcode.toString());
            if (item && item.status === 'IN_STOCK') {
                showCheckInFeedback("Already in stock", "alert-info");
            } else if (!item) {
                showCheckInFeedback("Barcode not found in system", "alert-danger");
            } else {
                const { error: updateError } = await supabaseClient
                    .from('Stock')
                    .update({ status: 'IN_STOCK' })
                    .eq('barcode', barcode);
                
                if (updateError) throw updateError;
                showCheckInFeedback("Item returned to stock (No distribution log found)", "alert-success");
                fetchStock();
            }
        } else {
            const { error: updateError } = await supabaseClient
                .from('Stock_Checkouts')
                .update({ returned_at: new Date().toISOString() })
                .eq('id', data[0].id);

            if (updateError) throw updateError;
            showCheckInFeedback(`Successfully checked in article ${barcode}`, "alert-success");
            fetchStock();
        }
    } catch (err) {
        showCheckInFeedback("Error: " + err.message, "alert-danger");
    } finally {
        showLoading(false);
        checkInInput.value = '';
        checkInInput.focus();
    }
});

function showCheckInFeedback(msg, className) {
    checkInFeedback.textContent = msg;
    checkInFeedback.className = `p-3 rounded-3 mt-3 alert ${className}`;
    checkInFeedback.style.display = 'block';
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        checkInFeedback.style.display = 'none';
    }, 3000);
}

document.getElementById('checkInModal')?.addEventListener('shown.bs.modal', () => {
    checkInInput.focus();
});

// Add/Checkout Modal Resets
document.getElementById('checkoutModal')?.addEventListener('hidden.bs.modal', () => {
    document.getElementById('checkout-form').reset();
    if (typeof checkoutList !== 'undefined') checkoutList = [];
    if (typeof updateCheckoutUI === 'function') updateCheckoutUI();
    const feedback = document.getElementById('checkout-scan-feedback');
    if (feedback) {
        feedback.textContent = '';
        feedback.className = 'small mt-1';
    }
});

document.getElementById('checkInModal')?.addEventListener('hidden.bs.modal', () => {
    document.getElementById('check-in-form').reset();
    const feedback = document.getElementById('check-in-feedback');
    if (feedback) feedback.innerHTML = '';
});
