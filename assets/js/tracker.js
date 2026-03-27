const API_URL = 'https://eyuynhchvxxthdseqvhx.supabase.co/rest/v1/rpc/get_order_details';
const API_KEY = 'sb_publishable_vXpTof6au1ODkQFS-I8YxQ_IYE5S_a_';

// Cache to minimize API calls
const orderCache = new Map();

const orderInput = document.getElementById('order-id-input');
const trackBtn = document.getElementById('track-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const errorBox = document.getElementById('error-box');
const resultCard = document.getElementById('result-card');
const colorSelect = document.getElementById('color-select');
const timeline = document.getElementById('timeline');
const tnaBtn = document.getElementById('tna-btn');
const tnaTimeline = document.getElementById('tna-timeline');



let currentOrderData = null;

async function trackOrder() {
    const orderId = orderInput.value.trim().toUpperCase();
    if (!orderId) {
        showError('Please enter a valid Green Order ID.');
        return;
    }

    hideError();
    resultCard.style.display = 'none';

    if (orderCache.has(orderId)) {
        displayOrder(orderCache.get(orderId));
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'apikey': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_order_id: orderId })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch order details. Please try again later.');
        }

        const data = await response.json();
        console.log('API Response:', data);

        let normalizedData = null;
        if (Array.isArray(data)) {
            normalizedData = data[0];
        } else {
            normalizedData = data;
        }

        if (!normalizedData || !normalizedData.order_id) {
            showError('Green Order ID not found. Please check and try again.');
            return;
        }

        orderCache.set(orderId, normalizedData);
        displayOrder(normalizedData);

        // Update URL to match current order
        // Using ?id= format for 100% compatibility with GitHub Pages static hosting
        const newUrl = `tracker.html?id=${orderId}`;
        window.history.replaceState({ orderId }, '', newUrl);

    } catch (error) {
        console.error('API Error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

function displayOrder(data) {
    currentOrderData = data;

    document.getElementById('disp-order-id').textContent = `Green Order ID: ${data.order_id}`;
    document.getElementById('disp-pi-date').textContent = formatDate(data.pi_date);
    document.getElementById('disp-delivery-date').textContent = formatDate(data.delivery_date);
    document.getElementById('disp-commercial').textContent = data.commercial;

    // Setup color selector
    colorSelect.innerHTML = '';
    if (data.colors && data.colors.length > 0) {
        data.colors.forEach((colorObj, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = colorObj.color;
            colorSelect.appendChild(opt);
        });
        document.getElementById('color-selector-container').style.display = 'block';
        renderTimeline(0);
    } else {
        document.getElementById('color-selector-container').style.display = 'none';
        timeline.innerHTML = '<p class="text-muted">No status updates available for this order.</p>';
    }

    resultCard.style.display = 'block';
}

function renderTimeline(colorIndex) {
    const colorObj = currentOrderData.colors[colorIndex];
    timeline.innerHTML = '';

    if (!colorObj.logs || colorObj.logs.length === 0) {
        timeline.innerHTML = '<p class="text-muted">No updates for this color.</p>';
        return;
    }

    // Sort logs by date descending (newest first)
    const sortedLogs = [...colorObj.logs].sort((a, b) => {
        const dateDiff = new Date(b.log_date) - new Date(a.log_date);
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    sortedLogs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
         <div class="timeline-date">${formatDate(log.log_date)}</div>
         <div class="timeline-dot"></div>
         <div class="timeline-content">
             <div class="timeline-note">${linkifyTracking(log.note)}</div>
         </div>
     `;
        timeline.appendChild(item);
    });

    // Display tentative bulk ready date inline
    const bulkReadyInline = document.getElementById('bulk-ready-inline');
    const bulkDateDisp = document.getElementById('disp-bulk-ready-date');
    
    if (colorObj.tentativeBulkReadyDate) {
        document.getElementById('bulk-ready-label').textContent = `Est. Bulk Delivery ${colorObj.color}`;
        bulkDateDisp.textContent = formatDate(colorObj.tentativeBulkReadyDate);
        bulkReadyInline.style.display = 'inline-flex';
    } else {
        bulkReadyInline.style.display = 'none';
    }
}

function renderTNATimeline() {
    if (!currentOrderData) return;
    tnaTimeline.innerHTML = '';

    TNA_FIELDS.forEach(field => {
        const dateVal = currentOrderData[field.key];
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <div class="timeline-date">${formatDate(dateVal)}</div>
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-note"><strong>${field.label}</strong></div>
            </div>
        `;
        tnaTimeline.appendChild(item);
    });
}



function showLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
    trackBtn.disabled = show;
}

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
    showLoading(false);
}

function hideError() {
    errorBox.style.display = 'none';
}

trackBtn.addEventListener('click', trackOrder);
orderInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') trackOrder();
});

tnaBtn.addEventListener('click', () => {
    renderTNATimeline();
    const modal = new bootstrap.Modal(document.getElementById('tnaModal'));
    modal.show();
});

colorSelect.addEventListener('change', (e) => {
    renderTimeline(e.target.value);
});

document.getElementById('share-btn').addEventListener('click', async () => {
    if (!currentOrderData) return;
    const orderId = currentOrderData.order_id;
    // Use production domain for the share link
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
            const btn = document.getElementById('share-btn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        }
    } catch (err) {
        console.error('Error sharing:', err);
    }
});

// Printing Logic
function printOrderReport(order) {
    if (!order) return;
    showLoading(true);
    const printSection = document.getElementById('print-section');
    printSection.innerHTML = '';

    const tnaHtml = TNA_FIELDS.map(f => `
        <tr>
            <td style="width: 60%;">${f.label}</td>
            <td>${formatDate(order[f.key])}</td>
        </tr>
    `).join('');

    const colors = order.colors || [];
    let colorsHtml = colors.map(colorObj => {
        const logsHtml = (colorObj.logs || [])
            .sort((a, b) => {
                const dateDiff = new Date(b.log_date) - new Date(a.log_date);
                if (dateDiff !== 0) return dateDiff;
                return new Date(b.created_at) - new Date(a.created_at);
            })
            .map(log => `
                 <tr>
                     <td>${formatDate(log.log_date)}</td>
                     <td>${linkifyTracking(log.note)}</td>
                 </tr>
            `).join('') || '<tr><td colspan="2" class="text-center">No logs recorded</td></tr>';

        return `
            <div class="print-page">
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
                <h4 style="background: #f8f9fa; padding: 10px; border-left: 5px solid #28a745; margin-top: 10px;">
                    Color Variant: ${colorObj.color}
                    ${colorObj.tentativeBulkReadyDate ? `<span style="float: right; font-size: 0.8rem; color: #155724;">Est. Bulk Delivery ${colorObj.color}: ${formatDate(colorObj.tentativeBulkReadyDate)}</span>` : ''}
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
                    <div style="font-size: 0.70rem; color: #555; text-align: center; font-style: italic; margin-top: 5px;">
                        <strong>Disclaimer:</strong> Dates and statuses are for reference only. For exact details, contact us.
                    </div>
                    <div class="footer-text">
                        Green International Tracking - Confidential Color Variant Status Report
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
                        <tr>
                            <th>Milestone</th>
                            <th>Status / Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tnaHtml}
                    </tbody>
                </table>
            </div>
            <div class="print-contact">
                <div class="contact-details">
                    <span>www.greeninternationalindia.com</span>
                    <span>sales@greeninternationalindia.com</span>
                </div>
                <div style="font-size: 0.70rem; color: #555; text-align: center; font-style: italic; margin-top: 5px;">
                    <strong>Disclaimer:</strong> Dates and statuses are for reference only. For exact details, contact us.
                </div>
                <div class="footer-text">
                    Green International Tracking - Confidential Production Milestone Report
                </div>
            </div>
        </div>

        ${colorsHtml}
    `;

    printSection.innerHTML = reportHtml;
    showLoading(false);

    setTimeout(() => {
        window.print();
    }, 500);
}

async function printSingleColor() {
    if (!currentOrderData) return;
    const selectedIndex = colorSelect.value;
    const colorObj = currentOrderData.colors[selectedIndex];
    if (!colorObj) return;

    showLoading(true);
    const printSection = document.getElementById('print-section');
    printSection.innerHTML = '';

    const logsHtml = (colorObj.logs || [])
        .sort((a, b) => {
            const dateDiff = new Date(b.log_date) - new Date(a.log_date);
            if (dateDiff !== 0) return dateDiff;
            return new Date(b.created_at) - new Date(a.created_at);
        })
        .map(log => `
             <tr>
                 <td>${formatDate(log.log_date)}</td>
                 <td>${linkifyTracking(log.note)}</td>
             </tr>
        `).join('') || '<tr><td colspan="2" class="text-center">No logs recorded</td></tr>';

    const reportHtml = `
        <div class="print-page">
            <div class="print-header" style="display: block; padding-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <img src="assets/images/green-logo.png" style="height: 60px; width: auto; object-fit: contain; filter: brightness(0) saturate(100%);">
                    <div style="text-align: right;">
                        <h3 style="margin:0;">Green Order ID: ${currentOrderData.order_id}</h3>
                        <p style="margin:0; color:#666; font-size: 0.8rem;">Generated: ${new Date().toLocaleDateString('en-IN')}</p>
                    </div>
                </div>
                <h2 style="margin:0; color:#28a745;">Order Report</h2>
            </div>
            <h4 style="background: #f8f9fa; padding: 10px; border-left: 5px solid #28a745; margin-top: 10px;">
                Color Variant: ${colorObj.color}
                ${colorObj.tentativeBulkReadyDate ? `<span style="float: right; font-size: 0.8rem; color: #155724;">Est. Bulk Delivery ${colorObj.color}: ${formatDate(colorObj.tentativeBulkReadyDate)}</span>` : ''}
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
                <div style="font-size: 0.70rem; color: #555; text-align: center; font-style: italic; margin-top: 5px;">
                    <strong>Disclaimer:</strong> Dates and statuses are for reference only. For exact details, contact us.
                </div>
                <div class="footer-text">
                    Green International Tracking - Individual Color Tracking Report
                </div>
            </div>
        </div>
    `;

    printSection.innerHTML = reportHtml;
    showLoading(false);
    setTimeout(() => { window.print(); }, 500);
}

async function printTNAFromModal() {
    if (!currentOrderData) return;

    showLoading(true);
    const printSection = document.getElementById('print-section');
    printSection.innerHTML = '';

    const tnaHtml = TNA_FIELDS.map(f => `
        <tr>
            <td style="width: 60%;">${f.label}</td>
            <td>${formatDate(currentOrderData[f.key])}</td>
        </tr>
    `).join('');

    const reportHtml = `
        <div class="print-page">
            <div class="print-header" style="display: block; padding-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <img src="assets/images/green-logo.png" style="height: 60px; width: auto; object-fit: contain; filter: brightness(0) saturate(100%);">
                    <div style="text-align: right;">
                        <h3 style="margin:0;">Green Order ID: ${currentOrderData.order_id}</h3>
                        <p style="margin:0; color:#666; font-size: 0.8rem;">Generated: ${new Date().toLocaleDateString('en-IN')}</p>
                    </div>
                </div>
                <h2 style="margin:0; color:#28a745;">Order Report (TNA)</h2>
            </div>
            <div class="print-grid" style="margin-top: 15px;">
                <div class="print-item">
                    <label>PI Date</label>
                    <span>${formatDate(currentOrderData.pi_date)}</span>
                </div>
                <div class="print-item">
                    <label>Estimated Bulk Delivery</label>
                    <span>${formatDate(currentOrderData.delivery_date)}</span>
                </div>
                <div class="print-item">
                    <label>Commercial Status</label>
                    <span>${currentOrderData.commercial}</span>
                </div>
            </div>
            <div style="max-width: 600px; margin-bottom: 30px;">
                <h4>Production Milestones (TNA)</h4>
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Milestone</th>
                            <th>Status / Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tnaHtml}
                    </tbody>
                </table>
            </div>
            <div class="print-contact">
                <div class="contact-details">
                    <span>www.greeninternationalindia.com</span>
                    <span>sales@greeninternationalindia.com</span>
                </div>
                <div style="font-size: 0.70rem; color: #555; text-align: center; font-style: italic; margin-top: 5px;">
                    <strong>Disclaimer:</strong> Dates and statuses are for reference only. For exact details, contact us.
                </div>
                <div class="footer-text">
                    Green International Tracking - Confidential Production Milestone Report (TNA)
                </div>
            </div>
        </div>
    `;

    printSection.innerHTML = reportHtml;
    showLoading(false);
    setTimeout(() => { window.print(); }, 500);
}

document.getElementById('print-order-btn').addEventListener('click', () => {
    printOrderReport(currentOrderData);
});

document.getElementById('print-color-btn').addEventListener('click', printSingleColor);

// Keep navbar in scrolled state on tracker page
const navbar = document.querySelector('.cid-uXjz86JSEW');
if (navbar) navbar.classList.add('scrolled');

// Check for ID in URL on load
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');
    
    // Check for hyphenated ID: tracker-001
    const pathName = window.location.pathname;
    let idFromPath = null;
    if (pathName.includes('tracker-')) {
        idFromPath = pathName.split('tracker-').pop();
    }
    
    // Check for hash: #001
    const hashId = window.location.hash.substring(1);
    
    const targetId = idFromUrl || idFromPath || hashId;
    
    if (targetId && targetId !== 'tracker.html') {
        const orderInput = document.getElementById('order-id-input');
        if (orderInput) {
            orderInput.value = targetId;
            trackOrder();
        }
    }
});
