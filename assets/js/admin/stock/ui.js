// Stock Manager UI Rendering

function toggleStockView(mode) {
    stockViewMode = mode;

    // Update buttons
    document.getElementById('view-grid-btn')?.classList.toggle('active', mode === 'grid');
    document.getElementById('view-list-btn')?.classList.toggle('active', mode === 'list');

    // Update containers
    const gridView = document.getElementById('stock-grid-view');
    const listView = document.getElementById('stock-list-view');
    if (gridView) gridView.style.display = mode === 'grid' ? 'flex' : 'none';
    if (listView) listView.style.display = mode === 'list' ? 'block' : 'none';

    applyStockFilter(); // Re-render current data
}

function renderStockItems(items, totalCount = 0) {
    const gridContainer = document.getElementById('stock-grid-view');
    const listBody = document.getElementById('stock-table-body');
    const emptyState = document.getElementById('stock-empty');

    if (gridContainer) gridContainer.innerHTML = '';
    if (listBody) listBody.innerHTML = '';

    if (items.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    items.forEach(async (item) => {
        if (stockViewMode === 'grid') {
            const card = createStockCard(item);
            gridContainer?.appendChild(card);
        } else {
            const row = createStockRow(item);
            listBody?.appendChild(row);
        }
    });

    const totalPages = Math.ceil(totalCount / stockItemsPerPage);
    renderStockPagination(totalCount, totalPages);
}

function createStockCard(item) {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

    const card = document.createElement('div');
    card.setAttribute('data-id', item.id);
    const isSelected = selectedStockIds.includes(item.id);
    card.className = `card h-100 border-0 shadow-sm stock-card position-relative overflow-hidden ${isSelected ? 'selected' : ''}`;
    card.style.borderRadius = '24px';
    card.style.transition = 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
    card.style.cursor = 'pointer';
    card.style.background = '#fff';
    card.onclick = () => showStockDetail(item.id);

    const stock = calculateStockAvailability(item);

    card.innerHTML = `
        <div class="position-relative overflow-hidden" style="height: 240px; background: #fdfdfd;">
            <img src="${placeholderImg}" id="img-grid-${item.id}" class="w-100 h-100" style="object-fit: cover; transition: transform 0.6s ease;">
            <div class="position-absolute top-0 start-0 m-3" style="z-index: 10;">
                <input type="checkbox" class="form-check-input stock-checkbox" 
                       style="width: 22px; height: 22px; cursor: pointer; border-radius: 8px; border: 2.5px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: ${isSelected ? '#28a745' : 'rgba(255,255,255,0.7)'};"
                       onclick="event.stopPropagation(); toggleStockSelection('${item.id}')"
                       ${isSelected ? 'checked' : ''}>
            </div>
            <div class="position-absolute top-0 end-0 m-3" style="z-index: 10;">
                <div style="background: ${stock.available > 0 ? '#28a745' : '#ffc107'}; color: ${stock.available > 0 ? '#fff' : '#111'}; padding: 4px 10px; border-radius: 100px; font-size: 0.55rem; font-weight: 800; letter-spacing: 0.8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    ${!stock.isAvailable ? 'OUT OF STOCK' : (stock.available < stock.total ? stock.available + ' / ' + stock.total + ' IN STOCK' : stock.available + ' IN STOCK')}
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
            .stock-card.selected { border: 2.5px solid #28a745 !important; box-shadow: 0 10px 30px rgba(40,167,69,0.15) !important; padding: -2.5px; }
            .stock-card.selected .stock-checkbox { background: #28a745 !important; }
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
    tr.setAttribute('data-id', item.id);
    const isSelected = selectedStockIds.includes(item.id);
    tr.className = `align-middle stock-row ${isSelected ? 'selected' : ''}`;
    tr.style.cursor = 'pointer';
    tr.style.transition = 'background 0.2s ease';
    tr.onmouseover = () => tr.style.background = '#fcfcfc';
    tr.onmouseout = () => tr.style.background = 'transparent';
    tr.onclick = (e) => {
        if (!e.target.closest('button') && !e.target.closest('.stock-checkbox')) showStockDetail(item.id);
    };

    const stock = calculateStockAvailability(item);
    const statusBg = stock.available > 0 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)';
    const statusColor = stock.available > 0 ? '#28a745' : '#856404';
    const statusText = !stock.isAvailable ? 'OUT OF STOCK' : (stock.available < stock.total ? `${stock.available} / ${stock.total} IN STOCK` : `${stock.available} IN STOCK`);

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
        <td class="small fw-bold text-success">${stock.available} / ${stock.total}</td>
        <td class="small fw-bold text-primary">${stock.active}</td>
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
                item.resolved_url = url; 
                const img = tr.querySelector(`#img-list-${item.id}`);
                if (img) img.src = url;
            }
        });
    }

    return tr;
}

function renderStockPagination(totalItems, totalPages) {
    const container = document.getElementById('stock-pagination-container');
    if (!container) return;
    const startRange = (stockCurrentPage - 1) * stockItemsPerPage + 1;
    const endRange = Math.min(stockCurrentPage * stockItemsPerPage, totalItems);

    container.innerHTML = `
        <div class="text-muted small text-center text-sm-start">
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

function openBigView(src) {
    const overlay = document.createElement('div');
    overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    overlay.style.background = 'rgba(0,0,0,0.9)';
    overlay.style.zIndex = '9999';
    overlay.style.cursor = 'zoom-out';
    overlay.onclick = () => overlay.remove();

    const img = document.createElement('img');
    img.src = src;
    img.style.maxWidth = '95%';
    img.style.maxHeight = '95%';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '12px';
    img.style.boxShadow = '0 30px 60px rgba(0,0,0,0.5)';

    overlay.appendChild(img);
    document.body.appendChild(overlay);
}
