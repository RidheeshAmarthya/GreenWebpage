// Stock Manager Navigation Functions

function goToStock(push = true) {
    if (stockManagerView.style.display === 'block') return; // Avoid scroll reset
    
    if (typeof updateCurrentScrollState === 'function') updateCurrentScrollState();
    
    selectionView.style.display = 'none';
    ordersListView.style.display = 'none';
    orderDetailView.style.display = 'none';
    stockManagerView.style.display = 'block';
    
    // Auto-switch to Grid View on Mobile for better UX
    if (window.innerWidth < 768) {
        toggleStockView('grid');
    }

    fetchStock();

    if (push && window.location.hash !== '#stock') {
        history.pushState({ view: 'stock', scroll: 0 }, '', '#stock');
    }
}

function returnToSelection() {
    stockManagerView.style.display = 'none';
    ordersListView.style.display = 'none';
    orderDetailView.style.display = 'none';
    selectionView.style.display = 'block';
    history.pushState({ view: 'hub' }, '', '#hub');
}
