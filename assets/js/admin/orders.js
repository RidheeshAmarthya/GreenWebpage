// Orders Logic
async function fetchOrders() {
    showLoading(true);
    const { data, error } = await supabaseClient
        .from('Orders')
        .select('*');

    showLoading(false);
    if (error) {
        console.error(error);
        return;
    }

    orders = data;
    applySort();
    handleHashNavigation();
}

function handleHashNavigation() {
    const hash = window.location.hash;
    if (hash.startsWith('#order-')) {
        const orderId = decodeURIComponent(hash.replace('#order-', ''));
        const order = orders.find(o => o.order_id === orderId);
        if (order) {
            showOrderDetail(order, false);
        } else {
            returnToOrdersList();
        }
    } else if (hash === '#orders' || hash === '') {
        returnToOrdersList(null, false);
    }
}

function handleSort(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    currentPage = 1;
    applySort();
}

function applySort() {
    const { column, direction } = currentSort;

    orders.sort((a, b) => {
        let valA = a[column] || '';
        let valB = b[column] || '';

        if (column.includes('date')) {
            valA = valA ? new Date(valA) : new Date(0);
            valB = valB ? new Date(valB) : new Date(0);
        } else {
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.textContent = '⇅';
        icon.classList.remove('active');
    });

    const activeIcon = document.getElementById(`sort-${column}`);
    if (activeIcon) {
        activeIcon.textContent = direction === 'asc' ? '↑' : '↓';
        activeIcon.classList.add('active');
    }

    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    if (searchTerm) {
        const filtered = orders.filter(order =>
            order.order_id.toLowerCase().includes(searchTerm)
        );
        renderOrdersTable(filtered);
    } else {
        renderOrdersTable(orders);
    }
}

function renderOrdersTable(dataToRender) {
    const tbody = document.getElementById('orders-tbody');
    const emptyState = document.getElementById('orders-empty');
    const table = document.getElementById('orders-table');
    const paginationContainer = document.getElementById('pagination-container');

    tbody.innerHTML = '';
    if (dataToRender.length === 0) {
        emptyState.style.display = 'block';
        table.style.display = 'none';
        paginationContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    table.style.display = 'table';
    paginationContainer.style.display = 'flex';

    const totalItems = dataToRender.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedData = dataToRender.slice(startIndex, endIndex);

    paginatedData.forEach(order => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4"><strong>${order.order_id}</strong></td>
            <td>${order.company || '<span class="text-muted small">N/A</span>'}</td>
            <td>${formatDate(order.pi_date)}</td>
            <td>${formatDate(order.delivery_date)}</td>
            <td>${order.commercial}</td>
            <td class="text-end pe-4 text-nowrap">
                <button class="btn btn-sm btn-outline-dark me-2" onclick="printOrderFromTable('${order.order_id}', event)">Print Full Report</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteOrder('${order.order_uuid}', event)">Delete</button>
            </td>
        `;
        tr.onclick = () => showOrderDetail(order);
        tbody.appendChild(tr);
    });

    renderPaginationControls(totalItems, totalPages);
}

function renderPaginationControls(totalItems, totalPages) {
    const container = document.getElementById('pagination-container');
    const startRange = (currentPage - 1) * itemsPerPage + 1;
    const endRange = Math.min(currentPage * itemsPerPage, totalItems);

    container.innerHTML = `
        <div class="text-muted small">
            Showing <strong>${startRange}-${endRange}</strong> of <strong>${totalItems}</strong> orders
        </div>
        <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(currentPage - 1)">
                Previous
            </button>
            <div class="d-flex align-items-center px-2 small fw-bold text-success">
                Page ${currentPage} of ${totalPages}
            </div>
            <button class="btn btn-sm btn-outline-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(currentPage + 1)">
                Next
            </button>
        </div>
    `;
}

function changePage(page) {
    currentPage = page;
    applySort();
}

// Search Logic
document.getElementById('order-search').addEventListener('input', (e) => {
    currentPage = 1;
    const searchTerm = e.target.value.toLowerCase();
    const filtered = orders.filter(order =>
        order.order_id.toLowerCase().includes(searchTerm)
    );
    renderOrdersTable(filtered);
});

// Order ID Generation Logic
function generateOrderID() {
    const now = new Date();
    const yearDigit = now.getFullYear().toString().slice(-1);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return yearDigit + month + random;
}

const addOrderModalEl = document.getElementById('addOrderModal');
if (addOrderModalEl) {
    addOrderModalEl.addEventListener('show.bs.modal', () => {
        document.getElementById('add-order-id').value = generateOrderID();
    });
}

document.getElementById('regenerate-order-id')?.addEventListener('click', () => {
    document.getElementById('add-order-id').value = generateOrderID();
});

// Add Order
document.getElementById('add-order-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newOrder = Object.fromEntries(formData.entries());

    for (const key in newOrder) {
        if (newOrder[key] === '') newOrder[key] = null;
    }

    showLoading(true);
    const { error } = await supabaseClient.from('Orders').insert([newOrder]);
    showLoading(false);

    if (error) {
        alert(error.message);
    } else {
        const modal = bootstrap.Modal.getInstance(document.getElementById('addOrderModal'));
        modal.hide();
        e.target.reset();
        fetchOrders();
    }
});

async function deleteOrder(uuid, event) {
    if (event) event.stopPropagation();
    if (!confirm('Are you sure you want to delete this order? All associated colors and logs will be lost.')) return;

    showLoading(true);
    const { error } = await supabaseClient.from('Orders').delete().eq('order_uuid', uuid);
    showLoading(false);

    if (error) {
        alert(error.message);
    } else {
        if (orderDetailView.style.display === 'block') {
            returnToOrdersList();
        }
        fetchOrders();
    }
}

// Edit Order Form Submission
document.getElementById('edit-order-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedData = Object.fromEntries(formData.entries());

    for (const key in updatedData) {
        if (updatedData[key] === '') updatedData[key] = null;
    }

    showLoading(true);
    const { error } = await supabaseClient
        .from('Orders')
        .update(updatedData)
        .eq('order_uuid', selectedOrder.order_uuid);

    showLoading(false);

    if (error) {
        alert(error.message);
    } else {
        const modalElement = document.getElementById('editOrderModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();

        selectedOrder = { ...selectedOrder, ...updatedData };
        showOrderDetail(selectedOrder, false);
        fetchOrders();
    }
});
