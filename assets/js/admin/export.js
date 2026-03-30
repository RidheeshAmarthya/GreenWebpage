// Export & Print Logic

// Print Latest Status Summary (Compact Table)
document.getElementById('export-latest-btn')?.addEventListener('click', async () => {
    showLoading(true);
    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    let query = supabaseClient
        .from('Orders')
        .select('*, Colors (*, "Color-Logs" (*))')
        .order(currentSort.column, { ascending: currentSort.direction === 'asc' });

    if (searchTerm) {
        query = query.ilike('order_id', `%${searchTerm}%`);
    }

    const { data, error } = await query;
    showLoading(false);
    if (error) {
        alert(error.message);
        return;
    }

    const printSection = document.getElementById('print-section');
    printSection.innerHTML = '';

    let rowsHtml = '';
    data.forEach((order, orderIndex) => {
        const colorEntries = order.Colors && order.Colors.length > 0 ? order.Colors : [null];

        colorEntries.forEach((color, colorIndex) => {
            let latestDate = 'N/A';
            let latestNote = color ? 'No updates' : 'No colors added';

            if (color && color['Color-Logs'] && color['Color-Logs'].length > 0) {
                const logs = color['Color-Logs'];
                const sortedLogs = logs.sort((a, b) => new Date(b.date) - new Date(a.date));
                latestDate = formatDate(sortedLogs[0].date);
                latestNote = sortedLogs[0].note;
            }

            const rowClass = (colorIndex === 0 && orderIndex > 0) ? 'order-group-start' : '';

            rowsHtml += `
                <tr class="${rowClass}">
                    <td><strong>${order.order_id}</strong></td>
                    <td>${order.company || 'N/A'}</td>
                    <td class="text-nowrap">${formatDate(order.pi_date)}</td>
                    <td class="text-nowrap">${formatDate(order.delivery_date)}</td>
                    <td>${color ? color.color_name : 'N/A'}</td>
                    <td class="text-nowrap">${latestDate}</td>
                    <td>${linkifyTracking(latestNote)}</td>
                </tr>
            `;
        });
    });

    const reportHtml = `
        <div class="print-page compact-print">
            <style>
                .compact-print { font-size: 0.7rem !important; padding: 5mm !important; }
                .compact-print h2, .compact-print h3 { font-size: 1rem !important; margin-bottom: 5px !important; }
                .compact-print .print-table th, .compact-print .print-table td { padding: 3px 6px !important; font-size: 0.65rem !important; }
                .compact-print .print-header { margin-bottom: 10px !important; padding-bottom: 5px !important; }
                .col-id { width: 10%; }
                .col-co { width: 5%; }
                .col-pi { width: 10%; }
                .col-del { width: 10%; }
                .col-clr { width: 12%; border-right: 2px solid #aaa !important; }
                .col-date { width: 10%; }
                .col-update { width: 43%; }
                .order-group-start td { border-top: 12px solid #f9f9f9 !important; }
            </style>
            <div class="print-header" style="display: block;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <img src="assets/images/green-logo.png" style="height: 40px; width: auto; object-fit: contain; filter: brightness(0) saturate(100%);">
                    <div style="text-align: right;">
                        <h3 style="margin:0;">Latest Status Summary</h3>
                        <p style="margin:0; color:#666; font-size: 0.6rem;">Generated: ${new Date().toLocaleDateString('en-IN')}</p>
                    </div>
                </div>
            </div>
            
            <table class="print-table">
                <thead>
                    <tr>
                        <th class="col-id">Order ID</th>
                        <th class="col-co">Company</th>
                        <th class="col-pi">PI Date</th>
                        <th class="col-del">Est. Bulk Deliv.</th>
                        <th class="col-clr">Color Variant</th>
                        <th class="col-date">Latest Date</th>
                        <th class="col-update">Latest Update</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;

    printSection.innerHTML = reportHtml;
    setTimeout(() => { window.print(); }, 500);
});

// Export Bulk Excel Logic
document.getElementById('export-excel-btn')?.addEventListener('click', async () => {
    showLoading(true);
    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    let query = supabaseClient
        .from('Orders')
        .select('*, Colors (*, "Color-Logs" (*))')
        .order(currentSort.column, { ascending: currentSort.direction === 'asc' });

    if (searchTerm) {
        query = query.ilike('order_id', `%${searchTerm}%`);
    }

    const { data, error } = await query;
    showLoading(false);
    if (error) {
        alert(error.message);
        return;
    }

    const exportData = [];
    data.forEach(order => {
        if (order.Colors && order.Colors.length > 0) {
            order.Colors.forEach(color => {
                const logs = color['Color-Logs'] || [];
                const sortedLogs = logs.sort((a, b) => new Date(a.date) - new Date(b.date));

                const row = {
                    'Green Order ID': order.order_id,
                    'PI Date': formatDate(order.pi_date),
                    'Estimated Bulk Delivery': formatDate(order.delivery_date),
                    'Commercial Status': order.commercial || '---',
                    'Color Variant': color.color_name,
                    [`Est. Bulk Delivery ${color.color_name}`]: formatDate(color.tentativeBulkReadyDate),
                    'Latest Update': sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1].note : 'No updates'
                };

                row['Labdip Approval'] = formatDate(order.LD_S_HC_date);
                row['Order Confirmation'] = formatDate(order.order_confirm_date);
                row['Yarn Inhouse'] = formatDate(order.yarn_inhouse_date);
                row['Weaving Start'] = formatDate(order.weave_start_date);
                row['Weaving Complete'] = formatDate(order.weave_complete_date);
                row['Dyeing Start'] = formatDate(order.dye_processing_start_date);
                row['Dyeing Complete'] = formatDate(order.dye_processing_end_date);
                row['FOB Ready'] = formatDate(order.FOB_ready_date);
                row['FOB Approval'] = formatDate(order.FOB_approval_date);
                row['Finishing Complete'] = formatDate(order.inspection_finishing_complete_date);

                sortedLogs.forEach((log, index) => {
                    row[`Step ${index + 1} Date`] = formatDate(log.date);
                    row[`Step ${index + 1} Note`] = log.note;
                });

                exportData.push(row);
            });
        } else {
            exportData.push({
                'Green Order ID': order.order_id,
                'PI Date': formatDate(order.pi_date),
                'Delivery Date': formatDate(order.delivery_date),
                'Commercial Status': order.commercial || '---',
                'Color Variant': 'N/A',
                'Latest Update': 'No colors added',
                'Labdip Approval': formatDate(order.LD_S_HC_date),
                'Order Confirmation': formatDate(order.order_confirm_date),
                'Yarn Inhouse': formatDate(order.yarn_inhouse_date),
                'Weaving Start': formatDate(order.weave_start_date),
                'Weaving Complete': formatDate(order.weave_complete_date),
                'Dyeing Start': formatDate(order.dye_processing_start_date),
                'Dyeing Complete': formatDate(order.dye_processing_end_date),
                'FOB Ready': formatDate(order.FOB_ready_date),
                'FOB Approval': formatDate(order.FOB_approval_date),
                'Finishing Complete': formatDate(order.inspection_finishing_complete_date)
            });
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bulk Data");
    XLSX.writeFile(workbook, `Green_International_Bulk_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
});

// Full Report Printing Logic
async function printOrderReport(order) {
    if (!order) return;

    showLoading(true);
    const { data: colors, error } = await supabaseClient
        .from('Colors')
        .select('*, "Color-Logs" (*)')
        .eq('order_uuid', order.order_uuid)
        .order('color_name', { ascending: true });

    if (error) {
        alert(error.message);
        showLoading(false);
        return;
    }

    const printSection = document.getElementById('print-section');
    printSection.innerHTML = '';

    const sortedTNA = [...TNA_FIELDS].sort((a, b) => {
        const valA = order[a.key];
        const valB = order[b.key];
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return new Date(valB) - new Date(valA);
    });

    const tnaHtml = sortedTNA.map(f => `
        <tr>
            <td style="width: 60%;">${f.label}</td>
            <td>${formatDate(order[f.key])}</td>
        </tr>
    `).join('');

    let colorsHtml = colors.map(color => {
        const logsHtml = (color['Color-Logs'] || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(log => `
                <tr>
                    <td>${formatDate(log.date)}</td>
                    <td>${linkifyTracking(log.note)}</td>
                </tr>
            `).join('') || '<tr><td colspan="2" class="text-center">No logs recorded</td></tr>';

        return `
            <div class="print-page">
                <div class="print-header">
                    <div>
                        <img src="assets/images/green-logo.png" style="height: 50px; width: auto; object-fit: contain; margin-bottom: 5px; filter: brightness(0) saturate(100%);">
                        <h2 style="margin:0; font-size: 1.2rem;">Tracking Summary - ${order.order_id}</h2>
                    </div>
                </div>
                <h4 style="background: #f8f9fa; padding: 10px; border-left: 5px solid #28a745; margin-top: 10px;">
                    Color Variant: ${color.color_name}
                </h4>
                <table class="print-table">
                    <thead>
                        <tr>
                            <th style="width: 150px;">Date</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logsHtml}
                    </tbody>
                </table>
                <div class="print-contact">
                    <div class="contact-details">
                        <span>www.greeninternationalindia.com</span>
                        <span>sales@greeninternationalindia.com</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const reportHtml = `
        <div class="print-page first-page">
            <div class="print-header" style="display: block; padding-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <img src="assets/images/green-logo.png" style="height: 60px; width: auto; object-fit: contain; filter: brightness(0) saturate(100%);">
                    <div style="text-align: right;">
                        <h3 style="margin:0;">Green Order ID: ${order.order_id}</h3>
                        <p style="margin:0; color:#666; font-size: 0.8rem;">Generated: ${new Date().toLocaleDateString('en-IN')}</p>
                    </div>
                </div>
                <h2 style="margin:0; color:#28a745;">Order Report</h2>
            </div>
            <div class="print-grid" style="margin-top: 15px;">
                <div class="print-item">
                    <label>PI Date</label>
                    <span>${formatDate(order.pi_date)}</span>
                </div>
                <div class="print-item">
                    <label>Estimated Bulk Delivery</label>
                    <span>${formatDate(order.delivery_date)}</span>
                </div>
                <div class="print-item">
                    <label>Commercial Status</label>
                    <span>${order.commercial}</span>
                </div>
            </div>
            <div style="max-width: 600px; margin-bottom: 30px;">
                <h4>Production Milestones (TNA)</h4>
                <table class="print-table">
                    <thead>
                        <tr><th>Milestone</th><th>Status / Date</th></tr>
                    </thead>
                    <tbody>${tnaHtml}</tbody>
                </table>
            </div>
        </div>
        ${colorsHtml}
    `;

    printSection.innerHTML = reportHtml;
    showLoading(false);
    setTimeout(() => { window.print(); }, 500);
}

function printOrderFromTable(orderId, event) {
    if (event) event.stopPropagation();
    const order = orders.find(o => o.order_id === orderId);
    if (order) printOrderReport(order);
}

// Single Color Printing
async function printSingleColor(colorUuid) {
    const color = currentColors.find(c => c.colors_uuid === colorUuid);
    if (!selectedOrder || !color) return;

    showLoading(true);
    const printSection = document.getElementById('print-section');
    printSection.innerHTML = '';

    const logsHtml = (color['Color-Logs'] || [])
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(log => `
            <tr>
                <td>${formatDate(log.date)}</td>
                <td>${linkifyTracking(log.note)}</td>
            </tr>
        `).join('') || '<tr><td colspan="2" class="text-center">No logs recorded</td></tr>';

    const reportHtml = `
        <div class="print-page">
            <div class="print-header">
                <div>
                    <img src="assets/images/green-logo.png" style="height: 50px; width: auto; object-fit: contain; margin-bottom: 5px; filter: brightness(0) saturate(100%);">
                    <h2 style="margin:0; font-size: 1.2rem;">Tracking Summary - ${selectedOrder.order_id}</h2>
                </div>
            </div>
            <h4 style="background: #f8f9fa; padding: 10px; border-left: 5px solid #28a745; margin-top: 10px;">
                Color Variant: ${color.color_name}
                ${color.tentativeBulkReadyDate ? `<span style="float: right; font-size: 0.8rem; color: #155724;">Est. Bulk Delivery: ${formatDate(color.tentativeBulkReadyDate)}</span>` : ''}
            </h4>
            <table class="print-table">
                <thead><tr><th>Date</th><th>Note</th></tr></thead>
                <tbody>${logsHtml}</tbody>
            </table>
        </div>
    `;

    printSection.innerHTML = reportHtml;
    showLoading(false);
    setTimeout(() => { window.print(); }, 500);
}

// Share Logic
document.getElementById('admin-share-btn')?.addEventListener('click', async () => {
    if (!selectedOrder) return;
    const orderId = selectedOrder.order_id;
    const domain = (window.location.origin === 'null' || window.location.origin.includes('file:')) 
        ? 'https://www.greeninternationalindia.com' 
        : window.location.origin;
    const shareUrl = `${domain}/tracker.html?id=${orderId}`;
    
    try {
        if (navigator.share) {
            await navigator.share({
                title: `Track Order: ${orderId}`,
                text: `Check the latest status of Green Order ID ${orderId}`,
                url: shareUrl
            });
        } else {
            await navigator.clipboard.writeText(shareUrl);
            const btn = document.getElementById('admin-share-btn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied';
            setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
        }
    } catch (err) { console.error('Error sharing:', err); }
});

document.getElementById('print-order-btn')?.addEventListener('click', () => {
    printOrderReport(selectedOrder);
});
