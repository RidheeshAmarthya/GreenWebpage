// Stock Manager Navigation Functions

function goToStock(push = true, filters = null) {
    console.log("[Navigation] goToStock triggered", { push, filters });
    if (typeof updateCurrentScrollState === 'function') updateCurrentScrollState();
    
    // Clear previous view states
    selectionView.style.display = 'none';
    ordersListView.style.display = 'none';
    orderDetailView.style.display = 'none';
    stockManagerView.style.display = 'block';
    if (document.getElementById('stats-view')) document.getElementById('stats-view').style.display = 'none';
    
    // Auto-switch to Grid View on Mobile for better UX
    if (window.innerWidth < 768 && typeof toggleStockView === 'function') {
        toggleStockView('grid');
    }

    // NEW: Reset all filters before applying the drill-down ones to avoid stacking
    if (filters && typeof clearStockFilters === 'function') {
        clearStockFilters(false); // Reset without fetching
    }

    // Apply Deep-Link Filters if provided
    if (filters) {
        if (filters.search !== undefined) {
            const searchInput = document.getElementById('stock-search');
            if (searchInput) searchInput.value = filters.search;
        }
        if (filters.type) {
            const typeFilter = document.getElementById('stock-type-filter');
            if (typeFilter) typeFilter.value = filters.type;
        }
        if (filters.gie) {
            const gieFilter = document.getElementById('gie-quality-filter');
            if (gieFilter) {
                // Ensure the option exists in the dropdown (it's a long list)
                let exists = Array.from(gieFilter.options).some(opt => opt.value === filters.gie);
                if (!exists) {
                    const newOpt = new Option(filters.gie, filters.gie);
                    gieFilter.add(newOpt);
                }
                gieFilter.value = filters.gie;
            }
        }
        if (filters.gsmMin !== undefined) {
            const minInput = document.getElementById('gsm-min-filter');
            if (minInput) minInput.value = filters.gsmMin;
        }
        if (filters.gsmMax !== undefined) {
            const maxInput = document.getElementById('gsm-max-filter');
            if (maxInput) maxInput.value = filters.gsmMax;
        }
        if (filters.status) {
            const statusFilter = document.getElementById('stock-status-filter');
            if (statusFilter) statusFilter.value = filters.status;
        }
        if (filters.partner) {
            window.currentPartnerFilter = filters.partner;
            const statusFilter = document.getElementById('stock-status-filter');
            if (statusFilter) statusFilter.value = 'CHECKED_OUT';
            updatePartnerBadge(filters.partner);
        }
    } else {
        // If navigating without filters, ensure partner filter is cleared
        window.currentPartnerFilter = null;
        updatePartnerBadge(null);
    }

    if (typeof fetchStock === 'function') {
        stockCurrentPage = 1; // Reset to page 1 for new filter context
        fetchStock();
    }

    if (push && window.location.hash !== '#stock') {
        history.pushState({ view: 'stock', scroll: 0 }, '', '#stock');
    }
}

function returnToSelection() {
    stockManagerView.style.display = 'none';
    ordersListView.style.display = 'none';
    orderDetailView.style.display = 'none';
    document.getElementById('stats-view').style.display = 'none';
    selectionView.style.display = 'block';
    history.pushState({ view: 'hub', scroll: 0 }, '', '#hub');
}

function updatePartnerBadge(name) {
    const container = document.getElementById('partner-filter-badge-area');
    if (!container) return;

    if (!name) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="badge bg-primary d-flex align-items-center gap-2 p-2 px-3 shadow-sm border-0" 
             style="border-radius: 10px; font-weight: 600; cursor: default;">
            <span style="font-size: 0.65rem; opacity: 0.8; text-transform: uppercase;">Holdings By:</span>
            <span>${name}</span>
            <button class="btn btn-sm p-0 border-0 text-white ms-1" onclick="clearPartnerFilter()" style="line-height:1;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
    `;
}

function clearPartnerFilter() {
    window.currentPartnerFilter = null;
    updatePartnerBadge(null);
    const statusFilter = document.getElementById('stock-status-filter');
    if (statusFilter) statusFilter.value = 'all';
    fetchStock();
}

window.clearPartnerFilter = clearPartnerFilter;
