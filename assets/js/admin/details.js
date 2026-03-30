// Details View Logic
async function showOrderDetail(order, push = true) {
    selectedOrder = order;
    selectionView.style.display = 'none';
    ordersListView.style.display = 'none';
    stockManagerView.style.display = 'none';
    orderDetailView.style.display = 'block';
    document.getElementById('breadcrumb-order-id').textContent = order.order_id;

    document.getElementById('detail-order-id').textContent = `Green Order ID: ${order.order_id}`;
    document.getElementById('detail-company').textContent = order.company || 'N/A';
    document.getElementById('detail-pi-date').textContent = formatDate(order.pi_date);
    document.getElementById('detail-delivery-date').textContent = formatDate(order.delivery_date);
    document.getElementById('detail-commercial').textContent = order.commercial;

    fetchColors(order.order_uuid);

    if (push) {
        history.pushState({ view: 'detail', order_uuid: order.order_uuid }, '', '#order-' + encodeURIComponent(order.order_id));
    }
}

document.getElementById('detail-delete-order-btn')?.addEventListener('click', (e) => {
    if (selectedOrder) {
        deleteOrder(selectedOrder.order_uuid, e);
    }
});

function renderTNATimeline() {
    if (!selectedOrder) return;
    const tnaTimeline = document.getElementById('tna-timeline');
    tnaTimeline.innerHTML = '';

    const sortedTNA = [...TNA_FIELDS].sort((a, b) => {
        const valA = selectedOrder[a.key];
        const valB = selectedOrder[b.key];
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return new Date(valB) - new Date(valA);
    });

    sortedTNA.forEach(field => {
        const dateVal = selectedOrder[field.key];
        const item = document.createElement('div');
        item.className = 'timeline-item-match';
        item.innerHTML = `
            <div class="timeline-date">${formatDate(dateVal)}</div>
            <div class="timeline-dot"></div>
            <div class="timeline-content-match">
                <div class="timeline-note"><strong>${field.label}</strong></div>
            </div>
        `;
        tnaTimeline.appendChild(item);
    });
}

document.getElementById('detail-tna-btn') ? (document.getElementById('detail-tna-btn').onclick = () => {
    renderTNATimeline();
    const modal = new bootstrap.Modal(document.getElementById('tnaModal'));
    modal.show();
}) : null;

document.getElementById('back-to-orders') ? (document.getElementById('back-to-orders').onclick = returnToOrdersList) : null;

// Edit Order Event Listeners
document.getElementById('edit-order-btn') ? (document.getElementById('edit-order-btn').onclick = () => {
    if (!selectedOrder) return;

    document.getElementById('edit-order-id').value = selectedOrder.order_id;
    document.getElementById('edit-company').value = selectedOrder.company || '';
    document.getElementById('edit-pi-date').value = selectedOrder.pi_date;
    document.getElementById('edit-delivery-date').value = selectedOrder.delivery_date;
    document.getElementById('edit-commercial').value = selectedOrder.commercial;

    TNA_FIELDS.forEach(field => {
        const el = document.getElementById(`edit-${field.key}`);
        if (el) el.value = selectedOrder[field.key] || '';
    });

    const modal = new bootstrap.Modal(document.getElementById('editOrderModal'));
    modal.show();
}) : null;

// Colors & Logs Logic
async function fetchColors(orderUuid) {
    const { data, error } = await supabaseClient
        .from('Colors')
        .select('*, "Color-Logs"(*)')
        .eq('order_uuid', orderUuid);

    if (error) {
        console.error(error);
        return;
    }
    currentColors = data;
    renderColors(data);
}

function renderColors(colors) {
    const container = document.getElementById('colors-list');
    container.innerHTML = '';

    if (colors.length === 0) {
        container.innerHTML = '<div class="alert alert-light text-center border">No colors added yet. Click "+ Add Color" to begin.</div>';
    }

    colors.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-card-admin';

        let logsHtml = (color['Color-Logs'] || []).sort((a, b) => {
            const dateDiff = new Date(b.date) - new Date(a.date);
            if (dateDiff !== 0) return dateDiff;
            return new Date(b.created_at) - new Date(a.created_at);
        }).map(log => `
            <div class="timeline-item-match">
                <div class="timeline-date">${formatDate(log.date)}</div>
                <div class="timeline-dot"></div>
                <div class="timeline-content-match">
                    <div class="timeline-note">${linkifyTracking(log.note)}</div>
                    <div class="log-actions">
                        <button class="btn btn-sm btn-light px-2" style="font-size: 1.1rem;" onclick='editLogPrompt(${JSON.stringify(log)})' title="Edit Status">✎</button>
                        <button class="btn btn-sm btn-light px-2 text-danger" style="font-size: 1.1rem;" onclick="deleteLog('${log.color_logs_uuid}')" title="Delete Status">×</button>
                    </div>
                </div>
            </div>
        `).join('');

        colorDiv.innerHTML = `
            <div class="color-card-header">
                <div class="d-flex align-items-center flex-wrap gap-3">
                    <h5 class="mb-0 fw-bold">${color.color_name}</h5>
                    ${color.tentativeBulkReadyDate ? `
                    <div style="background: #e8f5e9; padding: 0 15px; height: 50px; border-radius: 10px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start;">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; line-height: 1.2; letter-spacing: 0.5px; opacity: 0.8;">Est. Bulk Delivery ${color.color_name}</div>
                        <span class="text-success fw-bold" style="font-size: 0.95rem; line-height: 1.2;">${formatDate(color.tentativeBulkReadyDate)}</span>
                    </div>` : ''}
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-light-print fw-bold px-3" style="height: 50px; border-radius: 10px; font-size: 0.85rem;" onclick="printSingleColor('${color.colors_uuid}')">⎙ Print</button>
                    <button class="btn btn-sm btn-outline-primary fw-bold px-3" style="height: 50px; border-radius: 10px; font-size: 0.85rem;" onclick='editColorPrompt(${JSON.stringify({ uuid: color.colors_uuid, name: color.color_name, date: color.tentativeBulkReadyDate })})'>Edit</button>
                    <button class="btn btn-sm btn-outline-success fw-bold px-3" style="height: 50px; border-radius: 10px; font-size: 0.85rem;" onclick="addLogPrompt('${color.colors_uuid}')">+ Add Status</button>
                    <button class="btn btn-sm btn-outline-danger fw-bold px-3" style="height: 50px; border-radius: 10px; font-size: 0.85rem;" onclick="deleteColor('${color.colors_uuid}')">Delete</button>
                </div>
            </div>
            <div class="p-4 px-5">
                <div class="timeline-match">
                    ${logsHtml || '<p class="text-muted small mb-0">No tracking logs for this color yet.</p>'}
                </div>
            </div>
        `;
        container.appendChild(colorDiv);
    });
}

document.getElementById('add-color-btn') ? (document.getElementById('add-color-btn').onclick = () => {
    const modal = new bootstrap.Modal(document.getElementById('addColorModal'));
    modal.show();
}) : null;

document.getElementById('add-color-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const colorName = formData.get('color_name');

    showLoading(true);
    const { error } = await supabaseClient.from('Colors').insert([{
        order_uuid: selectedOrder.order_uuid,
        color_name: colorName,
        tentativeBulkReadyDate: formData.get('tentativeBulkReadyDate') || null
    }]);
    showLoading(false);

    if (error) {
        alert(error.message);
    } else {
        const modal = bootstrap.Modal.getInstance(document.getElementById('addColorModal'));
        modal.hide();
        e.target.reset();
        fetchColors(selectedOrder.order_uuid);
    }
});

async function deleteColor(uuid) {
    if (!confirm('Delete this color and all logs?')) return;
    showLoading(true);
    await supabaseClient.from('Colors').delete().eq('colors_uuid', uuid);
    showLoading(false);
    fetchColors(selectedOrder.order_uuid);
}

function editColorPrompt(color) {
    document.getElementById('edit-color-uuid').value = color.uuid;
    document.getElementById('edit-color-name').value = color.name;
    document.getElementById('edit-color-date').value = color.date || '';
    const modal = new bootstrap.Modal(document.getElementById('editColorModal'));
    modal.show();
}

document.getElementById('edit-color-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const uuid = formData.get('colors_uuid');
    const color_name = formData.get('color_name');
    const tentativeBulkReadyDate = formData.get('tentativeBulkReadyDate');

    showLoading(true);
    const { error } = await supabaseClient.from('Colors').update({ color_name, tentativeBulkReadyDate: tentativeBulkReadyDate || null }).eq('colors_uuid', uuid);
    showLoading(false);

    if (error) {
        alert(error.message);
    } else {
        bootstrap.Modal.getInstance(document.getElementById('editColorModal')).hide();
        fetchColors(selectedOrder.order_uuid);
    }
});

function addLogPrompt(colorUuid) {
    document.getElementById('log-color-uuid').value = colorUuid;
    document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
    const modal = new bootstrap.Modal(document.getElementById('addLogModal'));
    modal.show();
}

document.getElementById('add-log-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const logData = Object.fromEntries(formData.entries());

    showLoading(true);
    const { error } = await supabaseClient.from('Color-Logs').insert([logData]);
    showLoading(false);

    if (error) {
        alert(error.message);
    } else {
        const modal = bootstrap.Modal.getInstance(document.getElementById('addLogModal'));
        modal.hide();
        e.target.reset();
        fetchColors(selectedOrder.order_uuid);
    }
});

function editLogPrompt(log) {
    document.getElementById('edit-log-uuid').value = log.color_logs_uuid;
    document.getElementById('edit-log-date').value = log.date;
    document.getElementById('edit-log-note').value = log.note;
    const modal = new bootstrap.Modal(document.getElementById('editLogModal'));
    modal.show();
}

document.getElementById('edit-log-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const uuid = formData.get('color_logs_uuid');
    const updatedData = {
        date: formData.get('date'),
        note: formData.get('note')
    };

    showLoading(true);
    const { error } = await supabaseClient.from('Color-Logs').update(updatedData).eq('color_logs_uuid', uuid);
    showLoading(false);

    if (error) {
        alert(error.message);
    } else {
        bootstrap.Modal.getInstance(document.getElementById('editLogModal')).hide();
        fetchColors(selectedOrder.order_uuid);
    }
});

async function deleteLog(uuid) {
    if (!confirm('Delete this log?')) return;
    showLoading(true);
    await supabaseClient.from('Color-Logs').delete().eq('color_logs_uuid', uuid);
    showLoading(false);
    fetchColors(selectedOrder.order_uuid);
}

// Populate Template Dropdowns dynamically
function initTemplates() {
    const datalist = document.getElementById('logNoteOptions');
    if (datalist) {
        const options = Array.from(datalist.options).map(o => o.value);
        document.querySelectorAll('.template-dropdown-menu').forEach(menu => {
            options.forEach(opt => {
                const li = document.createElement('li');
                li.innerHTML = `<a class="dropdown-item py-2" href="#" style="border-bottom: 1px solid #f0f0f0; white-space: normal;" onclick="const container=this.closest('.mb-3'); const i=container?container.querySelector('textarea, input'):null; if(i){i.value=this.dataset.val; i.focus();} return false;" data-val="${opt.replace(/"/g, '&quot;')}">${opt}</a>`;
                menu.appendChild(li);
            });
        });
    }
}
