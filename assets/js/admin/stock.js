// Stock Manager Logic
const placeholderImg = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23eeeeee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20fill%3D%22%23aaaaaa%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E";

// Zebra Label Template (ZDesigner ZD230-8dpmm)
const ZPL_TEMPLATE = `^XA
~TA000
~JSN
^LT0
^MNW
^MTT
^PON
^PMN
^LH0,0
^JMA
^PR6,6
~SD15
^JUS
^LRN
^CI27
^PA0,1,1,0
^MMT
^PW831
^LL406
^LS0
^FT40,62^A0N,51,51^FH\\^CI28^FDGREEN INTERNATIONAL EXIMP^FS^CI27
^FT40,103^A0N,28,28^FH\\^CI28^FDArticle No ^FS^CI27
^FT40,138^A0N,28,28^FH\\^CI28^FDContent^FS^CI27
^FT40,173^A0N,28,28^FH\\^CI28^FDCount:^FS^CI27
^FT40,208^A0N,28,28^FH\\^CI28^FDDensity^FS^CI27
^FT40,243^A0N,28,28^FH\\^CI28^FDWidth^FS^CI27
^FT40,278^A0N,28,28^FH\\^CI28^FDWeight^FS^CI27
^FT40,313^A0N,28,28^FH\\^CI28^FDItem^FS^CI27
^FT40,348^A0N,28,28^FH\\^CI28^FDFinish^FS^CI27
^FT40,383^A0N,28,28^FH\\^CI28^FDRemark^FS^CI27
^FT156,103^A0N,28,28^FH\\^CI28^FD: {article_no}^FS^CI27
^FT156,138^A0N,28,28^FH\\^CI28^FD: {content}^FS^CI27
^FT156,173^A0N,28,28^FH\\^CI28^FD: {count}^FS^CI27
^FT156,208^A0N,28,28^FH\\^CI28^FD: {density}^FS^CI27
^FT156,243^A0N,28,28^FH\\^CI28^FD: {width}^FS^CI27
^FT156,278^A0N,28,28^FH\\^CI28^FD: {weight} GSM^FS^CI27
^FT156,313^A0N,28,28^FH\\^CI28^FD: {item}^FS^CI27
^FT156,348^A0N,28,28^FH\\^CI28^FD: {finish}^FS^CI27
^FT156,383^A0N,28,28^FH\\^CI28^FD: {remark}^FS^CI27
^BY2
^FO725,30^BCB,44,Y,N,N^FD{barcode}^FS
^FO440,310^GFA,1041,2001,29,:Z64:eJztlL9v00AUx7+2mziKqjoDEtkSKRKKWEglhgih2v0POpAZ9z/I0hVfG4QihDozVkyRB2bEAI76LyBYqGToErHUGx7cHO/d2c4F2Fg52e9+vPfxu/fenYH71GwWAI+HaPNCHMc0tyJqjoxkRBOSBZ5G8pkrpQwAj7r1jIRM4ZDMbV7g1Rzo8dhiZQa2z1kUSgA+KxkhSx7nXkWu2Q3ZKLJQX8l6FSkBWX92rQxzxgsmpdCMocz8mkwc+ca2Adu2HQk19n+Q8L7btkwd2lPZIkuqjoWbURymUp6uBXcsvJRfNzdIZSgr0stKJcUEf1ZUQ01mbEIJ5mXfUoZFRbqZZ5L5Npn/QVommXGOSlLVRgkmXSYpL8o8UnlaKqVJirUQQipSbJM0sW4nk4nckMmWT1lXdZtke6M2lkmunMq82JCJEWdUksWfcXKVtM/tDLkmKf+eW+1I/laVmqRlS55u19PNlJ9ImdNJgHkS3Nwp6jPgL/UZEhtSzudzyi0rE7miScRCx2nJ26srXZVeEtH4a49EoUkVoa6nl/rViV9rn+qUa9JL+Jrk+q5o8qNKqCZ7m1umyZ5B8g3JGgbpGT7rm12UpBVtSN5Axt+qSLzkH8eClG2B9jxeoBXHi/YF3bwF/rd/bUKgBX54xNJUTgJ0wI814WnjiaGz6KSOwY+jz+zaVEJh1Bwld82vOkJh1GwlW+Vbko1gn/odNNGgvkvvnQ3pZQ/Sm5Ev6D+b3ogu0lFkj1F56kzDo1FAZCc8If9BeOgelcq3GK/StJ+KvcVwtMJBnn47PS+DdQt0gmlynNAoHCXo5cHSel76tPv2u7QvBgJ7/XAk8KgfzgbnpbKJu1Pa7iHvN9gXGOHY+blTKvcwHicDcS0o/GQsMMTgRfyqVO6APB0yuYvgWGCKQbNO0x7CvrjGNdcmJc993GvWKSJPoVBkFwHJEA9dlSad6DS9nInLM87NpcDq4rFz9rpWniy/OEg+U25OqERR1rU+VWSLIvtgQ7ynfR5QYeKLIfIha34Baf92ow==:97FE
^FO500,165^GFA,497,1968,16,:Z64:eJyl1DGOxCAMBVCPKChzg8xFULgWBRLTpdwrIVHkGqzmEhQIr202k612QoYmegUK+BsjYtExYDRgERvgBQdyqou4ADgHoFJcFoD5vbE4p2ugvYttL3tjPzId6Lo1bhjtJ0asu+m+4EM15rj/f+Z6uu5XfZ33/qp5UT6pwrFGLHnp6FV6thvmYSOuJWyc75OOJn5ocVbtfsbUb9j3s6fC9a2qgpLLjZoCWovUxz7zJUPgeI3KNlNeo57ouaCsZtu9sbnip807H/4wHU9cjbTbuCdc1436FxbV5nnY+PVwYaO8I3D7jpvatfeH1ASwFKD81XnTZ0P866LpfKrRg5qH3e9XA71naZhhU74rNVtKdBrJZ9zU7kzc36+DkKJZwGZ4630e93kEx7xW18zvmeZZonkG9ruNm+dh1dFwYtfdy/Fr8DrRD/Itz2fNA1nq2Q00YJXMo2FLuSsYRfNtn+8DlvlMeaWUYa/3iH8A/30lLg==:2C57
^XZ`;

function fillZPLTemplate(item) {
    let zpl = ZPL_TEMPLATE;
    // Replace placeholders with item data. Use empty string for null/undefined to prevent ZPL errors.
    // Note: If item properties can contain ZPL control characters (like '^', '~'),
    // they might need to be escaped or handled specifically to avoid breaking the ZPL command structure.
    zpl = zpl.replace('{article_no}', item.article_no || '');
    zpl = zpl.replace('{content}', item.content || '');
    zpl = zpl.replace('{count}', item.count || '');
    zpl = zpl.replace('{density}', item.density || '');
    zpl = zpl.replace('{width}', item.width || '');
    zpl = zpl.replace('{weight}', item.weight || '');
    zpl = zpl.replace('{item}', item.item || '');
    zpl = zpl.replace('{finish}', item.finish || '');
    zpl = zpl.replace('{remark}', item.remark || '');
    zpl = zpl.replace('{barcode}', item.barcode || '');
    return zpl;
}

// Print Stock Label (ID-based)
async function printStockLabel(id) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;
    return await printStockLabelFromData(item);
}

// Print Stock Label (Data-based) - Returns a promise for sequencing
function printStockLabelFromData(item) {
    return new Promise((resolve, reject) => {
        if (!item) {
            alert("No data available for printing.");
            return reject("No item data");
        }

        const zpl = fillZPLTemplate(item);

        if (typeof BrowserPrint === 'undefined') {
            const errorMsg = "Zebra BrowserPrint library not loaded. Please ensure the JS files are correctly included.";
            alert(errorMsg);
            return reject(errorMsg);
        }

        BrowserPrint.getDefaultDevice("printer", function (device) {
            if (device && device.name) {
                device.send(zpl, function () {
                    console.log("Printed successfully to: " + device.name);
                    resolve();
                }, function (error) {
                    const errorMsg = "Printer Offline or Error: " + error + "\n\nPlease ensure the Zebra printer is switched on, connected to your computer, and selected as the default in the Zebra Browser Print app.";
                    alert(errorMsg);
                    reject(errorMsg);
                });
            } else {
                const errorMsg = "No Active Zebra Printer Found.\n\nPlease check:\n1. Zebra Browser Print app is running (tray icon).\n2. Printer is plugged in and turned on.\n3. Printer is selected as default in the Browser Print settings.";
                alert(errorMsg);
                reject(errorMsg);
            }
        }, function (error) {
            const errorMsg = "BrowserPrint Connection Failed.\n\nError: " + error + "\n\nPlease ensure the Zebra Browser Print desktop application is running and accessible.";
            alert(errorMsg);
            reject(errorMsg);
        });
    });
}

function previewStockLabel(id) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;

    const zpl = fillZPLTemplate(item);

    // Labelary API - 8 dpmm (203 DPI), 4x2 inches label
    const url = "https://api.labelary.com/v1/printers/8dpmm/labels/4.09x2/0/";

    // Encode to binary to avoid browser adding charset=UTF-8 which Labelary rejects
    const encoder = new TextEncoder();
    const data = encoder.encode(zpl);

    fetch(url, {
        method: "POST",
        body: data
    }).then(response => {
        if (!response.ok) throw new Error("Labelary API error");
        return response.blob();
    }).then(blob => {
        const fileURL = URL.createObjectURL(blob);
        const win = window.open(fileURL, '_blank');
        if (!win) alert("Pop-up blocked! Please allow pop-ups to see the label preview.");
    }).catch(err => {
        console.error("Preview failed", err);
        alert("Preview failed. Check console for details.");
    });
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

        const url = "https://api.labelary.com/v1/printers/8dpmm/labels/4.09x2/0/";
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
        console.warn("Label Preview failed:", err);
        if (placeholder) {
            placeholder.innerHTML = '<div class="text-danger small">Preview Failed<br>Click Refresh</div>';
            placeholder.style.display = 'block';
        }
        if (previewImg) previewImg.style.display = 'none';
    } finally {
        if (previewSpinner) previewSpinner.style.display = 'none';
    }
}

// Debounce for live label preview
let labelPreviewDebounceTimer;
function triggerLabelPreviewDebounce() {
    clearTimeout(labelPreviewDebounceTimer);
    labelPreviewDebounceTimer = setTimeout(updateModalLabelPreview, 1000); // 1-second debounce to protect API
}
let stockItems = [];
let stockCurrentPage = 1;
const stockItemsPerPage = 12; // Grid friendly (3x4 or 4x3)
let stockSort = { column: 'created_at', direction: 'desc' };
let stockViewMode = 'grid'; // 'grid' | 'list'
let stockCurrentQuery = '';
let stockCurrentType = 'all';

// Batch Operations State
let selectedStockIds = [];

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

// Fetch Stock (Server-Side Filtered & Paginated)
async function fetchStock() {
    showLoading(true);

    const rawSearch = (document.querySelector('#stock-search')?.value || '')
        .replace(/gsm/gi, ''); // Strip 'gsm' as it's a frontend-only suffix
    const fuzzySearch = rawSearch.trim().replace(/[^a-zA-Z0-9]+/g, '%');
    const searchTerm = `%${fuzzySearch}%`;

    const typeFilter = document.querySelector('#stock-type-filter')?.value || 'all';
    const statusFilter = document.querySelector('#stock-status-filter')?.value || 'all';
    const gsmMin = document.querySelector('#gsm-min-filter')?.value;
    const gsmMax = document.querySelector('#gsm-max-filter')?.value;
    const sortVal = document.querySelector('#stock-sort-select')?.value || 'created_at-desc';
    const [column, order] = sortVal.split('-');

    // Build Supabase Query
    let query = supabaseClient
        .from('Stock')
        .select(`
            *,
            checkouts: Stock_Checkouts(name, company, created_at, returned_at)
        `, { count: 'exact' });

    // 1. Fuzzy Search (Article No, Content, Item Name, Finish, Remark, Count, Width)
    if (rawSearch.trim()) {
        query = query.or(`article_no.ilike.${searchTerm},content.ilike.${searchTerm},item.ilike.${searchTerm},finish.ilike.${searchTerm},remark.ilike.${searchTerm},count.ilike.${searchTerm},width.ilike.${searchTerm}%`);
    }

    // 2. Structured Filters
    if (typeFilter !== 'all') query = query.eq('type', typeFilter);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (gsmMin) query = query.gte('weight', gsmMin);
    if (gsmMax) query = query.lte('weight', gsmMax);

    // 3. Sorting
    query = query.order(column, { ascending: order === 'asc' });

    // 4. Pagination
    const from = (stockCurrentPage - 1) * stockItemsPerPage;
    const to = from + stockItemsPerPage - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    showLoading(false);
    if (error) {
        console.error(error);
        return;
    }

    stockItems = data;
    renderStockItems(stockItems, count);
}

// Redirect all filter changes to fetchStock
function applyStockFilter() {
    stockCurrentPage = 1; // Reset to page 1 on new filter
    fetchStock();
}

function updateStockSort(value) {
    stockCurrentPage = 1;
    fetchStock();
}

function renderStockItems(items, totalCount = 0) {
    const gridContainer = document.getElementById('stock-grid-view');
    const listBody = document.getElementById('stock-table-body');
    const emptyState = document.getElementById('stock-empty');

    gridContainer.innerHTML = '';
    listBody.innerHTML = '';

    if (items.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    items.forEach(async (item) => {
        if (stockViewMode === 'grid') {
            const card = createStockCard(item);
            gridContainer.appendChild(card);
        } else {
            const row = createStockRow(item);
            listBody.appendChild(row);
        }
    });

    const totalPages = Math.ceil(totalCount / stockItemsPerPage);
    renderStockPagination(totalCount, totalPages);
}

// Read-Only Detail View
async function showStockDetail(id) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;

    let checkoutInfoHtml = '';
    if (item.status !== 'IN_STOCK' && item.checkouts) {
        const checkout = item.checkouts.find(c => !c.returned_at);
        if (checkout) {
            checkoutInfoHtml = `
                <details class="mb-3 border rounded-3 overflow-hidden bg-white" style="border-color: #eee !important;">
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
    // Set content and styling for the detail view (3-Column Layout)
    container.innerHTML = `
        <div class="row g-0 overflow-hidden" style="border-radius: 28px; background: #fff;">
            <!-- Column 1: Media & Status (lg-5) -->
            <div class="col-lg-5 d-flex flex-column p-4 border-end" style="background: #f8f9fa;">
                <div class="d-flex align-items-center gap-2 mb-3 pt-1">
                    <span class="badge ${item.status === 'IN_STOCK' ? 'bg-success' : 'bg-warning text-dark'} px-2 py-1 fw-bold" style="border-radius: 6px; font-size: 0.55rem;">
                        ${item.status === 'IN_STOCK' ? 'IN STOCK' : 'OUT STOCK'}
                    </span>
                    <div class="badge bg-green text-white px-2 py-1 fw-bold text-uppercase" style="border-radius: 6px; font-size: 0.55rem; letter-spacing: 0.5px;">${item.type || '-'}</div>
                </div>

                <!-- History info if applicable -->
                ${checkoutInfoHtml}

                <!-- Interactive Zoom Image -->
                <div class="bg-white rounded-4 border shadow-sm position-relative overflow-hidden mb-3 d-flex align-items-center justify-content-center" 
                     id="detail-img-zoom-container"
                     style="height: 380px; cursor: zoom-in;"
                     onclick="openBigView('${item.resolved_url || placeholderImg}')">
                    <img src="${item.resolved_url || placeholderImg}" id="detail-img-stock" class="img-fluid" 
                         style="max-height: 350px; max-width: 95%; object-fit: contain; border-radius: 12px; transition: transform 0.1s ease-out;">
                    <div class="position-absolute bottom-0 start-50 translate-middle-x mb-2 text-muted fw-bold" style="font-size: 0.45rem; opacity: 0.4; letter-spacing: 0.5px;">CLICK FOR BIG VIEW</div>
                </div>
            </div>

            <!-- Column 2: Label Header & Preview (lg-7) -->
            <div class="col-lg-7 p-4 p-md-5 d-flex flex-column position-relative" style="background: #fff;">
                <button type="button" class="btn-close position-absolute top-0 end-0 m-4" data-bs-dismiss="modal"></button>
                
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

            <!-- Aligned Action Footer (Unified Row) -->
            <div class="col-12 p-4 border-top d-flex gap-3" style="background: #fcfcfc; border-bottom-left-radius: 28px; border-bottom-right-radius: 28px;">
                <button class="btn btn-green flex-grow-1 py-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2" 
                        style="border-radius: 16px; font-size: 0.85rem;"
                        onclick="bootstrap.Modal.getInstance(document.getElementById('stockDetailModal')).hide(); openStockModal('${item.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    EDIT RECORD
                </button>
                <button class="btn btn-outline-danger px-4 fw-bold shadow-sm d-flex align-items-center justify-content-center" 
                        style="border-radius: 16px;" 
                        onclick="bootstrap.Modal.getInstance(document.getElementById('stockDetailModal')).hide(); deleteStockItem('${item.id}', '${item.article_no}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
                <div class="border-end mx-1" style="opacity: 0.2; width: 1px;"></div>
                <button class="btn btn-light flex-grow-1 py-3 fw-bold border shadow-sm d-flex align-items-center justify-content-center gap-2" 
                        style="border-radius: 16px; font-size: 0.85rem;" 
                        onclick="generateStockPDF('${item.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    PRINT SWATCH
                </button>
                <button class="btn btn-dark flex-grow-1 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow" 
                        style="border-radius: 16px; font-size: 0.85rem;"
                        onclick="printStockLabel('${item.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    PRINT LABEL
                </button>
            </div>
        </div>
    `;

    // Initialize UI Refs for instant use
    const zoomContainer = container.querySelector('#detail-img-zoom-container');
    const zoomImg = container.querySelector('#detail-img-stock');

    // Initial label preview load
    updateModalLabelPreview(item, 'detail-label-preview');

    if (!item.resolved_url && item.image_url) {
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

document.getElementById('stock-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        stockCurrentPage = 1;
        fetchStock();
    }
});

document.getElementById('stock-type-filter')?.addEventListener('change', () => {
    stockCurrentPage = 1;
    applyStockFilter();
});

document.getElementById('stock-status-filter')?.addEventListener('change', () => {
    stockCurrentPage = 1;
    applyStockFilter();
});

document.getElementById('gsm-min-filter')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        stockCurrentPage = 1;
        fetchStock();
    }
});

document.getElementById('gsm-max-filter')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        stockCurrentPage = 1;
        fetchStock();
    }
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



function createStockCard(item) {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

    const card = document.createElement('div');
    card.className = 'card h-100 border-0 shadow-sm stock-card position-relative overflow-hidden';
    card.style.borderRadius = '24px';
    card.style.transition = 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
    card.style.cursor = 'pointer';
    card.style.background = '#fff';
    card.onclick = () => showStockDetail(item.id);

    const isSelected = selectedStockIds.includes(item.id);
    const statusBg = item.status === 'IN_STOCK' ? '#28a745' : '#ffc107';
    const statusText = item.status === 'IN_STOCK' ? 'IN STOCK' : 'OUT STOCK';

    card.innerHTML = `
        <div class="position-relative overflow-hidden" style="height: 240px; background: #fdfdfd;">
            <!-- Main Image -->
            <img src="${placeholderImg}" id="img-grid-${item.id}" class="w-100 h-100" style="object-fit: cover; transition: transform 0.6s ease;">
            
            <!-- Floating Checkbox Over Image -->
            <div class="position-absolute top-0 start-0 m-3" style="z-index: 10;">
                <input type="checkbox" class="form-check-input stock-checkbox" 
                       style="width: 22px; height: 22px; cursor: pointer; border-radius: 8px; border: 2.5px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: ${isSelected ? '#28a745' : 'rgba(255,255,255,0.7)'};"
                       onclick="event.stopPropagation(); toggleStockSelection('${item.id}')"
                       ${isSelected ? 'checked' : ''}>
            </div>

            <!-- Status Pill Float -->
            <div class="position-absolute top-0 end-0 m-3" style="z-index: 10;">
                <div style="background: ${statusBg}; color: ${item.status === 'IN_STOCK' ? '#fff' : '#111'}; padding: 4px 10px; border-radius: 100px; font-size: 0.55rem; font-weight: 800; letter-spacing: 0.8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    ${statusText}
                </div>
            </div>

            <!-- Dark Overlay for bottom text readability -->
            <div class="position-absolute bottom-0 start-0 w-100" style="height: 40%; background: linear-gradient(to top, rgba(0,0,0,0.3), transparent); pointer-events: none;"></div>
            
            <!-- Type Pill (Bottom Left Float) -->
            <div class="position-absolute bottom-0 start-0 m-3" style="z-index: 10;">
                <div style="background: rgba(255,255,255,0.9); color: #333; padding: 3px 8px; border-radius: 6px; font-size: 0.55rem; font-weight: 800; letter-spacing: 0.5px; backdrop-filter: blur(4px);">
                    ${item.type || 'FABRIC'}
                </div>
            </div>
        </div>
        
        <div class="card-body p-3 pt-4 d-flex flex-column" style="gap: 12px;">
            <div class="position-relative">
                <div class="article-no-display fw-bold text-dark" style="font-size: 1.1rem; letter-spacing: -0.5px; line-height: 1.1; margin-bottom: 4px;">
                    ${item.article_no}
                </div>
                <div class="d-flex align-items-center gap-2">
                    <div class="text-success small fw-bold" style="font-size: 0.7rem; opacity: 0.9;">
                        ${item.content || 'Premium Quality'}
                    </div>
                </div>
            </div>
            
            <div class="mt-auto border-top pt-3 d-flex justify-content-between align-items-center">
                <div class="d-flex flex-column gap-1">
                    <span class="text-muted fw-bold text-uppercase" style="font-size: 0.55rem; letter-spacing: 1px; opacity: 0.5;">Specification</span>
                    <div class="d-flex align-items-center gap-2 text-dark fw-bold" style="font-size: 0.85rem;">
                        <span>${item.weight ? item.weight + ' GSM' : '-'}</span>
                        <span style="width: 1px; height: 10px; background: #eee;"></span>
                        <span class="opacity-50" style="font-weight: 400;">${item.count || '-'}</span>
                    </div>
                </div>
                <div class="text-muted fw-bold text-uppercase text-end" style="font-size: 0.62rem; opacity: 0.7; letter-spacing: 0.5px; line-height: 1.2;">
                    <div style="opacity: 0.5; font-size: 0.5rem; margin-bottom: 2px;">ADDED ON</div>
                    ${item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '-'}
                </div>
            </div>
        </div>
        
        <style>
            .stock-card:hover { transform: translateY(-8px) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.12) !important; }
            .stock-card:hover img { transform: scale(1.05); }
        </style>
    `;

    if (item.image_url) {
        getCachedSignedUrl(item.image_url).then(url => {
            if (url) {
                item.resolved_url = url;
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
    tr.className = 'align-middle';
    tr.style.cursor = 'pointer';
    tr.style.transition = 'background 0.2s ease';
    tr.onmouseover = () => tr.style.background = '#fcfcfc';
    tr.onmouseout = () => tr.style.background = 'transparent';
    tr.onclick = (e) => {
        if (!e.target.closest('button') && !e.target.closest('.stock-checkbox')) showStockDetail(item.id);
    };

    const statusBg = item.status === 'IN_STOCK' ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)';
    const statusColor = item.status === 'IN_STOCK' ? '#28a745' : '#856404';
    const statusText = item.status === 'IN_STOCK' ? 'IN STOCK' : 'OUT STOCK';

    const isSelected = selectedStockIds.includes(item.id);

    tr.innerHTML = `
        <td class="ps-4">
            <input type="checkbox" class="form-check-input stock-checkbox" 
                   style="width: 20px; height: 20px; cursor: pointer; border-radius: 7px; border: 2px solid #ddd;"
                   onclick="event.stopPropagation(); toggleStockSelection('${item.id}')"
                   ${isSelected ? 'checked' : ''}>
        </td>
        <td>
            <div style="width: 48px; height: 48px; border-radius: 12px; overflow: hidden; background: #f8f9fa; border: 1px solid #eee;">
                <img src="${placeholderImg}" id="img-list-${item.id}" class="w-100 h-100" style="object-fit: cover;">
            </div>
        </td>
        <td>
            <div class="fw-bold text-dark fs-6" style="letter-spacing: -0.3px;">${item.article_no}</div>
        </td>
        <td>
            <div class="text-success small fw-bold" style="font-size: 0.75rem;">${item.content || '-'}</div>
        </td>
        <td>
            <span class="badge bg-light text-muted border px-2 py-1 fw-bold text-uppercase" style="border-radius: 6px; font-size: 0.55rem; letter-spacing: 0.5px;">${item.type || 'FABRIC'}</span>
        </td>
        <td class="small fw-bold text-dark opacity-75">${item.count || '-'}</td>
        <td class="small fw-bold text-dark opacity-75">${item.weight ? item.weight + ' GSM' : '-'}</td>
        <td class="text-muted fw-bold text-uppercase" style="font-size: 0.62rem; letter-spacing: 0.5px;">
            <div style="opacity: 0.4; font-size: 0.5rem; margin-bottom: 2px;">ADDED ON</div>
            ${item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '-'}
        </td>
        <td>
            <span class="badge border-0 px-2 py-1 fw-bold text-uppercase" style="background: ${statusBg}; color: ${statusColor}; border-radius: 6px; font-size: 0.55rem; letter-spacing: 0.8px;">${statusText}</span>
        </td>
        <td>
            <div class="text-muted overflow-hidden opacity-50" style="font-size: 0.6rem; letter-spacing: 0.5px; width: 60px;">${item.barcode ? String(item.barcode).substring(0, 8) + '...' : '-'}</div>
        </td>
        <td class="text-end pe-4">
            <div class="d-flex justify-content-end gap-1">
                <button class="btn btn-light btn-sm p-1 px-2 border rounded-3 pulse-on-hover" onclick="event.stopPropagation(); generateStockPDF('${item.id}')" title="Print Swatch">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2.5"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                </button>
                <button class="btn btn-light btn-sm p-1 px-2 border rounded-3 pulse-on-hover" onclick="event.stopPropagation(); shareStockItem('${item.id}')" title="Copy Details">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </button>
                <button class="btn btn-light btn-sm p-1 px-2 border rounded-3 pulse-on-hover" onclick="event.stopPropagation(); openStockModal('${item.id}')" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-light btn-sm p-1 px-2 border rounded-3 pulse-on-hover text-danger" onclick="event.stopPropagation(); deleteStockItem('${item.id}', '${item.article_no}')" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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
    fetchStock();
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

    // Extract absolute resolution from the live stream
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Exact mapping to prevent shifting or distortion
    canvas.width = vWidth;
    canvas.height = vHeight;

    // Explicitly draw the full frame to the full canvas
    ctx.drawImage(video, 0, 0, vWidth, vHeight, 0, 0, vWidth, vHeight);

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

    // Toggle action controls
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-block';

    document.getElementById('stock-image-data').value = dataUrl;
    stopWebcam();
}

if (startBtn) startBtn.onclick = startWebcam;
if (captureBtn) captureBtn.onclick = capturePhoto;
if (retakeBtn) retakeBtn.onclick = () => {
    capturePreview.style.display = 'none';
    document.getElementById('stock-sources-content').style.display = 'block';
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
const stockItemModalElement = document.getElementById('stockItemModal');
const stockItemModal = new bootstrap.Modal(stockItemModalElement);

// Ensure webcam stops when modal is closed
stockItemModalElement?.addEventListener('hidden.bs.modal', () => {
    stopWebcam();
});

function openStockModal(id = null) {
    const form = document.getElementById('stock-item-form');
    form.reset();
    document.getElementById('stock-image-data').value = '';

    // Kill any hanging stream
    stopWebcam();

    // Reset Visual Elements
    capturePreview.style.display = 'none';
    capturePreview.src = '';
    placeholder.style.display = 'block';
    video.style.display = 'none';
    document.getElementById('stock-sources-content').style.display = 'block';

    // Reset camera controls
    startBtn.style.display = 'inline-block';
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'none';

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
        document.getElementById('stock-modal-submit-btn').textContent = "Save";
        document.getElementById('save-print-article-btn').textContent = "Save & Print";
        document.getElementById('stock-item-id').value = '';
        document.getElementById('add-stock-barcode').value = generateBarcode();
    }

    updateAddBarcodeVisualization();

    // Trigger the full label preview for the initial state
    updateModalLabelPreview();

    stockItemModal.show();
}

// Attach live preview updates to form inputs
document.getElementById('stock-item-form')?.addEventListener('input', triggerLabelPreviewDebounce);
document.getElementById('stock-item-form')?.addEventListener('change', triggerLabelPreviewDebounce);

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

    // Reset preview area
    const previewImg = document.getElementById('modal-label-preview-img');
    const placeholder = document.getElementById('modal-label-preview-placeholder');
    if (previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
    }
    if (placeholder) {
        placeholder.innerHTML = '<div class="text-muted small mb-2">Fetching live label...</div><div class="spinner-grow spinner-grow-sm text-green opacity-50"></div>';
        placeholder.style.display = 'block';
    }

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

// Save & Print Article Combination
document.getElementById('save-print-article-btn')?.addEventListener('click', async () => {
    const form = document.getElementById('stock-item-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Capture current form data for printing
    const formData = new FormData(form);
    const itemData = Object.fromEntries(formData.entries());

    // Explicitly add gsm suffix if needed for preview/template consistency
    if (itemData.weight) {
        // itemData.weight_gsm = itemData.weight + " GSM"; // We use {weight} + " GSM" in template
    }

    // Attempt print first
    try {
        await printStockLabelFromData(itemData);
        // Only if print succeeds, trigger the form submit to perform the database save
        form.requestSubmit();
    } catch (err) {
        // Error already alerted in printStockLabelFromData
        console.error("Save cancelled because print failed.");
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

function updateStockSort(value) {
    stockCurrentPage = 1;
    applyStockFilter();
}

function clearStockFilters() {
    document.getElementById('stock-search').value = '';
    document.getElementById('stock-type-filter').value = 'all';
    document.getElementById('stock-status-filter').value = 'all';
    document.getElementById('gsm-min-filter').value = '';
    document.getElementById('gsm-max-filter').value = '';
    document.getElementById('stock-sort-select').value = 'created_at-desc';

    stockCurrentPage = 1;
    applyStockFilter();
}

async function generateStockPDF(id) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;

    const zpl = fillZPLTemplate(item);
    const labelImageUrl = `http://api.labelary.com/v1/printers/8dpmm/labels/4x2/0/${encodeURIComponent(zpl)}`;
    const imgUrl = item.resolved_url || placeholderImg;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');

    printWindow.document.write(`
        <html>
        <head>
            <title>Spec Sheet - ${item.article_no}</title>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                
                body { font-family: 'Inter', sans-serif; margin: 0; padding: 10px; background: #fff; color: #111; }
                
                .spec-card { border: 1.5px solid #28a745; border-radius: 12px; overflow: hidden; max-width: 650px; margin: 0 auto; display: flex; flex-direction: column; background: #fff; }
                
                .card-header { background: #28a745; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; color: #fff; flex-shrink: 0; }
                .logo { height: 35px; }
                .brand-title { font-weight: 800; letter-spacing: 1px; font-size: 16px; text-transform: uppercase; }
                
                .info-section { padding: 15px 20px; flex-shrink: 0; background: #fff; border-bottom: 2px dashed #eee; }
                .header-row { display: flex; gap: 20px; align-items: center; }
                .header-left { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
                .contact-row { font-size: 9.5px; line-height: 1.5; color: #444; font-weight: 500; word-break: break-word; }
                .contact-row b { color: #111; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; margin-right: 5px; font-size: 10px; }
                .header-right { width: 310px; display: flex; flex-direction: column; flex-shrink: 0; }
                
                .label-preview-box { background: #fff; width: 100%; }
                .label-preview-box img { width: 100%; height: auto; border-radius: 0; }
                
                .image-section { padding: 5px 15px 15px 15px; background: #fcfcfc; display: flex; align-items: center; justify-content: center; flex-grow: 1; }
                .image-section img { width: 100%; max-height: 800px; object-fit: contain; background: #fff; padding: 3px; border-radius: 12px; }
                
                @page { size: A4; margin: 0; }
                @media print {
                    body { padding: 0; background: none; }
                    .spec-card { border: none; max-width: 100%; width: 100%; height: 297mm; border-radius: 0; box-shadow: none; display: flex; flex-direction: column; }
                    .card-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 25px 40px; }
                    .logo { height: 50px; }
                    .brand-title { font-size: 22px; }
                    .info-section { padding: 30px 40px; }
                    .header-row { gap: 40px; }
                    .header-right { width: 380px; }
                    .contact-row { font-size: 12px; }
                    .image-section { flex-grow: 1; padding: 30px 40px; }
                    .image-section img { max-height: 250mm; }
                }
            </style>
        </head>
        <body>
            <div class="spec-card">
                <div class="card-header">
                    <img class="logo" src="assets/images/green-logo.png">
                    <div class="brand-title">Green International</div>
                </div>
                
                <div class="info-section">
                    <div class="header-row">
                        <div class="header-left">
                            <div class="contact-row">
                                <b>India Office:</b> 326, 3rd Floor, Tower B, Spazedge, Sohna Road, Sector 47, Gurugram, India 122018
                            </div>
                            <div class="contact-row">
                                <b>China Office:</b> Hutang Jiangcun, Gesi Industrial Zone, Wujin, Changzhou, China-213100
                            </div>
                            <div class="contact-row">
                                <b>Contact:</b> +91 9810639056<br>
                                +91 0124-4799566<br>
                                sales@greeninternationalindia.com<br>
                                www.greeninternationalindia.com
                            </div>
                        </div>
                        <div class="header-right">
                             <div class="label-preview-box">
                                <img src="${labelImageUrl}">
                             </div>
                        </div>
                    </div>
                </div>
                
                <div class="image-section">
                    <img src="${imgUrl}" crossorigin="anonymous">
                </div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Batch Operations Logic
function toggleStockSelection(id) {
    const index = selectedStockIds.indexOf(id);
    if (index === -1) {
        selectedStockIds.push(id);
    } else {
        selectedStockIds.splice(index, 1);
    }
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
    const boxes = document.querySelectorAll('.stock-checkbox');
    boxes.forEach(b => b.checked = false);
}

async function batchDeleteStock() {
    if (selectedStockIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedStockIds.length} selected articles?`)) return;

    showLoading(true);
    try {
        // Find items to delete images if necessary (optional improvement)
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
        alert("Zebra BrowserPrint library not loaded. Please ensure the JS files are correctly included.");
        return;
    }

    BrowserPrint.getDefaultDevice("printer", async function (device) {
        if (!device || !device.name) {
            alert("No Active Zebra Printer Found.\n\nPlease ensure the Zebra Browser Print desktop app is running and a printer is selected as the default.");
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

        // Filter out any null promises (items not found)
        const validPromises = promises.filter(p => p !== null);
        const results = await Promise.all(validPromises);

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            const errorReport = failed.map(f => `• ${f.article}: ${f.error}`).join('\n');
            alert(`Batch Results:\n✅ Sent: ${results.length - failed.length}\n❌ Failed: ${failed.length}\n\nErrors:\n${errorReport}\n\nNote: Please ensure the printer is online and connected.`);
        } else {
            alert(`Successfully sent ${results.length} labels to ${device.name}.`);
        }
    }, function (error) {
        alert("Zebra Browser Print Connection Failed.\n\nError: " + error + "\n\nPlease ensure the Desktop App is running.");
    });
}

async function generateBatchStockPDF() {
    if (selectedStockIds.length === 0) return;

    showLoading(true);
    try {
        const selectedItems = stockItems.filter(i => selectedStockIds.includes(i.id));
        if (selectedItems.length === 0) return;

        const baseUrl = window.location.href.split('#')[0].split('?')[0].substring(0, window.location.href.lastIndexOf('/') + 1);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <base href="${baseUrl}">
                <title>Green Batch Spec Report</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                    
                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #fff; }
                    
                    .page-container { page-break-after: always; min-height: 285mm; display: flex; align-items: center; justify-content: center; padding: 10px; box-sizing: border-box; }
                    .page-container:last-child { page-break-after: auto; }

                    .spec-card { border: 1.5px solid #28a745; border-radius: 12px; overflow: hidden; max-width: 650px; width: 100%; margin: 0 auto; display: flex; flex-direction: column; background: #fff; }
                    
                    .card-header { background: #28a745; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; color: #fff; flex-shrink: 0; }
                    .logo { height: 35px; }
                    .brand-title { font-weight: 800; letter-spacing: 1px; font-size: 16px; text-transform: uppercase; }
                    
                    .info-section { padding: 15px 20px; flex-shrink: 0; background: #fff; border-bottom: 2px dashed #eee; }
                    .header-row { display: flex; gap: 20px; align-items: center; }
                    .header-left { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
                    .contact-row { font-size: 9.5px; line-height: 1.5; color: #444; font-weight: 500; word-break: break-word; }
                    .contact-row b { color: #111; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; margin-right: 5px; font-size: 10px; }
                    .header-right { width: 310px; display: flex; flex-direction: column; flex-shrink: 0; }
                    
                    .label-preview-box { background: #fff; width: 100%; }
                    .label-preview-box img { width: 100%; height: auto; border-radius: 0; }
                    
                    .image-section { padding: 5px 15px 15px 15px; background: #fcfcfc; display: flex; align-items: center; justify-content: center; flex-grow: 1; }
                    .image-section img { width: 100%; max-height: 800px; object-fit: contain; background: #fff; padding: 3px; border-radius: 12px; }
                    
                    @page { size: A4; margin: 0; }
                    @media print {
                        body { padding: 0; }
                        .page-container { padding: 0; height: 297mm; display: block; overflow: hidden; }
                        .spec-card { border: none; max-width: 100%; width: 100%; height: 297mm; border-radius: 0; box-shadow: none; display: flex; flex-direction: column; }
                        .card-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 25px 40px; }
                        .logo { height: 50px; }
                        .brand-title { font-size: 22px; }
                        .info-section { padding: 30px 40px; }
                        .header-row { gap: 40px; }
                        .header-right { width: 380px; }
                        .contact-row { font-size: 12px; }
                        .image-section { flex-grow: 1; padding: 30px 40px; }
                        .image-section img { max-height: 250mm; }
                    }
                </style>
            </head>
            <body>
                ${selectedItems.map(item => `
                    <div class="page-container">
                        <div class="spec-card">
                            <div class="card-header">
                                <img class="logo" src="assets/images/green-logo.png">
                                <div class="brand-title">Green International</div>
                            </div>
                            <div class="info-section">
                                <div class="header-row">
                                    <div class="header-left">
                                        <div class="contact-row">
                                            <b>India Office:</b> 326, 3rd Floor, Tower B, Spazedge, Sohna Road, Sector 47, Gurugram, India 122018
                                        </div>
                                        <div class="contact-row">
                                            <b>China Office:</b> Hutang Jiangcun, Gesi Industrial Zone, Wujin, Changzhou, China-213100
                                        </div>
                                        <div class="contact-row">
                                            <b>Contact:</b> +91 9810639056<br>
                                            +91 0124-4799566<br>
                                            sales@greeninternationalindia.com<br>
                                            www.greeninternationalindia.com
                                        </div>
                                    </div>
                                    <div class="header-right">
                                        <div class="label-preview-box">
                                            <img src="http://api.labelary.com/v1/printers/8dpmm/labels/4x2/0/${encodeURIComponent(fillZPLTemplate(item))}">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="image-section">
                                <img src="${item.resolved_url || placeholderImg}" crossorigin="anonymous">
                            </div>
                        </div>
                    </div>
                `).join('')}
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            // window.print();
                        }, 1000);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        clearStockSelection();
    } catch (err) {
        alert("Batch report failed: " + err.message);
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
            const articleId = box.onclick.toString().match(/'([^']+)'/)[1];

            const index = selectedStockIds.indexOf(articleId);
            if (isChecked && index === -1) selectedStockIds.push(articleId);
            else if (!isChecked && index !== -1) selectedStockIds.splice(index, 1);
        });
        updateBatchActionBar();
    }
});

async function shareStockItem(id) {
    const item = stockItems.find(i => i.id === id);
    if (!item) return;

    const summary = `*Green International Collections*\nTechnical Spec Card\n\nArticle: ${item.article_no}\nContent: ${item.content || '-'}\nCount: ${item.count || '-'}\nWeight: ${item.weight ? item.weight + ' GSM' : '-'}\nWidth: ${item.width || '-'}\nFinish: ${item.finish || '-'}\n\nGenerated via Green Admin Portal`;

    try {
        await navigator.clipboard.writeText(summary);
        const btn = document.querySelector(`button[onclick*="shareStockItem('${id}')"]`);
        if (btn) {
            const originalHtml = btn.innerHTML;
            const originalClass = btn.className;
            const isSmall = btn.classList.contains('btn-sm');

            btn.innerHTML = `<svg width="${isSmall ? 14 : 18}" height="${isSmall ? 14 : 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> ${isSmall ? 'Copied' : 'Copied'}`;
            btn.classList.remove('btn-light', 'btn-green');
            btn.classList.add('btn-success', 'text-white');

            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.className = originalClass;
            }, 2000);
        }
    } catch (err) {
        console.error('Share failed:', err);
    }
}

// Fullscreen Lightbox for Big View
function openBigView(src) {
    if (!src || src === placeholderImg) return;
    const overlay = document.createElement('div');
    overlay.className = 'fadeIn';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.92)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.cursor = 'zoom-out';
    overlay.style.backdropFilter = 'blur(10px)';
    overlay.onclick = () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
    };

    const img = document.createElement('img');
    img.src = src;
    img.className = 'shadow-lg';
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '24px';
    img.style.transition = 'transform 0.3s ease';
    img.style.border = '1px solid rgba(255,255,255,0.1)';

    overlay.appendChild(img);
    document.body.appendChild(overlay);
}
