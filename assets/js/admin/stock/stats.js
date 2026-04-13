/**
 * Stock Insights - Analytics & Visualization
 * Handles data aggregation and Chart.js integration for the warehouse dashboard.
 */

const GIE_NAMES = {
    "GIE001": "100% COTTON", "GIE002": "COTTON POLY", "GIE003": "COTTON NYLON",
    "GIE004": "100% POLYESTER", "GIE005": "VELVETTE", "GIE006": "LINEN BLENDS",
    "GIE007": "RAYON / VISCOSE", "GIE008": "POLY RAYON", "GIE009": "SILK BLENDS",
    "GIE010": "COTTON RAYON", "GIE011": "TENCEL BLENDS", "GIE012": "KNITTS",
    "GIE013": "DENIMS", "GIE014": "CORDUROY", "GIE015": "COATED FABRICS",
    "GIE016": "MULTI / JACQUARD", "GIE017": "BOUCKLE / BONDED", "GIE018": "WOOL BLENDS",
    "GIE019": "MOLESKEIN", "GIE020": "BURN OUT", "GIE021": "LACE / EMB"
};

let statsData = [];
let charts = {};
let currentGieFilter = 'all';

// Register DataLabels plugin
Chart.register(ChartDataLabels);

async function showStats(push = true) {
    if (document.getElementById('stats-view').style.display === 'block') return;

    if (typeof updateCurrentScrollState === 'function') updateCurrentScrollState();

    // Navigation
    document.getElementById('selection-view').style.display = 'none';
    document.getElementById('orders-list-view').style.display = 'none';
    document.getElementById('order-detail-view').style.display = 'none';
    document.getElementById('stock-manager-view').style.display = 'none';
    document.getElementById('stats-view').style.display = 'block';
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Load data with cache check
    await refreshStats(false);

    if (push && window.location.hash !== '#stats') {
        history.pushState({ view: 'stats', scroll: 0 }, '', '#stats');
    }
}

const STATS_CACHE_KEY = 'stock_insights_cache';
const STATS_CACHE_MS = 60 * 60 * 1000; // 1 Hour

async function refreshStats(force = true) {
    // 1. Check Cache if not forced
    if (!force) {
        const cached = localStorage.getItem(STATS_CACHE_KEY);
        if (cached) {
            try {
                const { timestamp, data } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                if (age < STATS_CACHE_MS && data && data.length > 0) {
                    console.log(`[Cache] Loading Stock Insights from cache (${(age/60000).toFixed(1)}m old)`);
                    statsData = data;
                    processStats();
                    return;
                }
            } catch (e) { console.warn("Cache corruption, clearing...", e); }
        }
    }

    showLoading(true);
    try {
        let allData = [];
        let from = 0;
        let limit = 1000;
        let hasMore = true;

        console.log("[Stats] Fetching fresh data from Supabase...");
        while (hasMore) {
            const { data, error } = await supabaseClient
                .from('stock_availability_view')
                .select('*')
                .range(from, from + limit - 1)
                .order('id', { ascending: true });

            if (error) throw error;
            
            allData = [...allData, ...data];
            from += limit;
            hasMore = data.length === limit;
        }
        
        statsData = allData;
        
        // 2. Save to Cache
        localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: statsData
        }));

        processStats();
    } catch (error) {
        console.error("Error refreshing stats:", error);
        alert("Failed to load dashboard data. Check connection.");
    } finally {
        showLoading(false);
    }
}

function processStats() {
    if (statsData.length === 0) return;
    
    // Populate GIE Filter if not already done
    populateGieFilter();

    renderDashboard();
}

function populateGieFilter() {
    const filter = document.getElementById('stats-gie-filter');
    if (filter.options.length > 1) return; // Already populated

    // Use common quality codes
    const qCodes = [
        "GIE001", "GIE002", "GIE003", "GIE004", "GIE005", "GIE006", "GIE007", 
        "GIE008", "GIE009", "GIE010", "GIE011", "GIE012", "GIE013", "GIE014", 
        "GIE015", "GIE016", "GIE017", "GIE018", "GIE019", "GIE020", "GIE021"
    ];
    
    // Handled in HTML but dynamic here just in case
}

// Event Listeners
document.getElementById('stats-gie-filter')?.addEventListener('change', (e) => {
    currentGieFilter = e.target.value;
    renderDashboard();
});

function renderDashboard() {
    // Filter data based on global dashboard GIE filter
    let filtered = statsData;
    if (currentGieFilter !== 'all') {
        filtered = statsData.filter(item => item.article_no && item.article_no.startsWith(currentGieFilter + '-'));
    }

    // 1. Update KPI Cards
    updateKPIs(filtered);

    // 2. Aggregate Data for Charts
    const mixData = aggregateBy(filtered, 'type');
    const gieData = aggregateGIE(filtered);
    const partnerData = aggregatePartners(filtered);
    const finishData = aggregateBy(filtered, 'finish', true); // Normalized
    const compositionData = aggregateComposition(filtered);
    const weightData = aggregateGSM(filtered);
    const healthData = aggregateHealth(filtered);

    // 3. Render/Update Charts
    updateChart('chart-stock-mix', 'doughnut', mixData);
    updateChart('chart-gie-mix', 'bar', gieData, 'Items');
    updateChart('chart-partners', 'bar', partnerData, 'Outstanding Items', true); // Horizontal
    updateChart('chart-finishes', 'bar', finishData, 'Articles');
    updateChart('chart-composition', 'bar', compositionData, 'Frequency', true);
    updateChart('chart-weights', 'bar', weightData, 'Count');
    updateChart('chart-data-health', 'radar', healthData, 'Completeness %');

    // 4. Render Technical DNA Matrix
    renderTechnicalDNA(filtered);

    // 5. Update Restock List
    renderRestockList(filtered);
}

function updateKPIs(data) {
    const totalUnits = data.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const activeCheckouts = data.reduce((sum, item) => sum + (parseInt(item.active_checkouts) || 0), 0);
    const restockNeeded = data.filter(item => (parseFloat(item.available) || 0) <= 0).length;

    document.getElementById('stat-total-units').textContent = Math.round(totalUnits).toLocaleString();
    document.getElementById('stat-total-articles').textContent = data.length.toLocaleString();
    document.getElementById('stat-active-checkouts').textContent = activeCheckouts.toLocaleString();
    document.getElementById('stat-restock-needed').textContent = restockNeeded.toLocaleString();
    document.getElementById('badge-restock-count').textContent = restockNeeded;
}

/** Aggregation Helpers **/

function aggregateBy(data, key, normalize = false) {
    const counts = {};
    data.forEach(item => {
        let val = item[key] || 'Unknown';
        if (normalize) val = val.trim().toUpperCase();
        counts[val] = (counts[val] || 0) + 1;
    });
    return Object.keys(counts)
        .sort((a,b) => counts[b] - counts[a])
        .slice(0, 8)
        .map(k => ({ label: k, value: counts[k] }));
}

function aggregateGIE(data) {
    const counts = {};
    data.forEach(item => {
        if (!item.article_no) return;
        const match = item.article_no.match(/^(GIE\d+)/);
        if (match) {
            const code = match[1];
            counts[code] = (counts[code] || 0) + 1;
        }
    });
    return Object.keys(counts)
        .sort((a,b) => {
            const numA = parseInt(a.replace(/[^\d]/g, '')) || 0;
            const numB = parseInt(b.replace(/[^\d]/g, '')) || 0;
            return numA - numB;
        })
        .map(k => ({ label: k, value: counts[k] }));
}

function aggregatePartners(data) {
    const counts = {};
    data.forEach(item => {
        // 'checkouts' array in stock_availability_view contains active checkouts
        if (item.checkouts && Array.isArray(item.checkouts)) {
            item.checkouts.forEach(c => {
                if (!c.returned_at) {
                    const partner = c.company || 'Unknown';
                    counts[partner] = (counts[partner] || 0) + 1;
                }
            });
        }
    });
    return Object.keys(counts)
        .sort((a,b) => counts[b] - counts[a])
        .slice(0, 10)
        .map(k => ({ label: k, value: counts[k] }));
}

function aggregateComposition(data) {
    const counts = {};
    data.forEach(item => {
        const content = item.content || '';
        // Extract main keywords: COTTON, POLY, LINEN, RAYON, SPANDEX
        const keywords = ['COTTON', 'POLY', 'LINEN', 'RAYON', 'SPANDEX', 'SILK', 'WOOL', 'NYLON'];
        keywords.forEach(kw => {
            if (content.toUpperCase().includes(kw)) {
                counts[kw] = (counts[kw] || 0) + 1;
            }
        });
    });
    return Object.keys(counts)
        .sort((a,b) => counts[b] - counts[a])
        .map(k => ({ label: k, value: counts[k] }));
}

function aggregateGSM(data) {
    const ranges = {
        '0-100': 0, '101-150': 0, '151-200': 0, '201-250': 0, '251-300': 0, '300+': 0
    };
    data.forEach(item => {
        const gsm = parseFloat(item.weight_numeric);
        if (!gsm) return;
        if (gsm <= 100) ranges['0-100']++;
        else if (gsm <= 150) ranges['101-150']++;
        else if (gsm <= 200) ranges['151-200']++;
        else if (gsm <= 250) ranges['201-250']++;
        else if (gsm <= 300) ranges['251-300']++;
        else ranges['300+']++;
    });
    return Object.keys(ranges).map(k => ({ label: k, value: ranges[k] }));
}



function aggregateHealth(data) {
    if (data.length === 0) return [];
    
    // Tracking completeness of optional but important fields
    const fields = [
        { key: 'image_url', label: 'Photos' },
        { key: 'weight', label: 'GSM' },
        { key: 'content', label: 'Composition' },
        { key: 'finish', label: 'Finishes' },
        { key: 'barcode', label: 'Barcodes' },
        { key: 'width', label: 'Width' },
        { key: 'density', label: 'Density' },
        { key: 'count', label: 'Count' },
        { key: 'item', label: 'Item Name' },
        { key: 'remark', label: 'Remarks' }
    ];

    const results = fields.map(f => {
        const filled = data.filter(item => {
            const val = item[f.key];
            return val !== null && val !== undefined && val !== '' && val !== 0 && val !== 'Unknown';
        }).length;
        return {
            label: f.label,
            value: Math.round((filled / data.length) * 100)
        };
    });

    return results;
}

/** Chart Management **/

function updateChart(canvasId, type, dataArray, datasetLabel = 'Count', horizontal = false) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = dataArray.map(d => d.label);
    const values = dataArray.map(d => d.value);

    // Color palettes
    const palettes = {
        primary: ['#007bff', '#6610f2', '#6f42c1', '#e83e8c', '#dc3545', '#fd7e14', '#ffc107', '#28a745', '#20c997', '#17a2b8'],
        vibrant: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796', '#5a5c69', '#2e59d9', '#17a673', '#2c9faf'],
        health: ['rgba(0, 123, 255, 0.6)']
    };

    if (charts[canvasId]) {
        charts[canvasId].data.labels = labels;
        charts[canvasId].data.datasets[0].data = values;
        
        // Force refresh core options to ensure connectivity patches take effect
        charts[canvasId].options.indexAxis = horizontal ? 'y' : 'x';
        charts[canvasId].options.onClick = (evt, elements, chart) => {
            // Using getElementsAtEventForMode for maximum reliability in Chart.js 4/3
            const activeElements = chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
            if (activeElements && activeElements.length > 0) {
                const index = activeElements[0].index;
                const label = chart.data.labels[index];
                const value = chart.data.datasets[0].data[index];
                console.log(`[Smart Drill-Down] Clicking: ${label} on ${canvasId}`);
                handleChartClick(canvasId, label, value);
            }
        };
        
        charts[canvasId].update();
        return;
    }

    const config = {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: datasetLabel,
                data: values,
                backgroundColor: palettes.primary,
                borderColor: type === 'line' ? '#007bff' : 'white',
                borderWidth: type === 'line' ? 3 : 1,
                fill: type === 'line' ? 'start' : false,
                tension: 0.4
            }]
        },
        options: {
            indexAxis: horizontal ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            onHover: (evt, elements, chart) => {
                const active = chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
                evt.native.target.style.cursor = (active && active.length > 0) ? 'pointer' : 'default';
            },
            onClick: (evt, elements, chart) => {
                const activeElements = chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
                if (activeElements && activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const label = chart.data.labels[index];
                    const value = chart.data.datasets[0].data[index];
                    console.log(`[Smart Drill-Down] Clicking: ${label} on ${canvasId}`);
                    handleChartClick(canvasId, label, value);
                }
            },
            interaction: {
                mode: 'index',
                intersect: false,
                axis: horizontal ? 'y' : 'x'
            },
            plugins: {
                datalabels: {
                    color: type === 'doughnut' || type === 'pie' ? '#fff' : '#666',
                    anchor: type === 'doughnut' || type === 'pie' ? 'center' : 'end',
                    align: type === 'doughnut' || type === 'pie' ? 'center' : 'end',
                    offset: 4,
                    font: { weight: 'bold', size: 10 },
                    formatter: (value) => {
                        if (value === 0) return '';
                        return value.toLocaleString();
                    },
                    display: (context) => {
                        // Hide internal numbers for Radar chart to prevent overlap
                        if (canvasId === 'chart-data-health') return false;
                        
                        // Only show if value is > 5% of total for doughnuts
                        if (type === 'doughnut' || type === 'pie') {
                           const total = context.dataset.data.reduce((a, b) => a + b, 0);
                           return (context.dataset.data[context.dataIndex] / total) > 0.05;
                        }
                        return true;
                    }
                },
                legend: {
                    display: type === 'doughnut' || type === 'pie' || type === 'radar',
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 10, weight: 'bold' } }
                },
                tooltip: {
                    padding: 12,
                    borderRadius: 8,
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.formattedValue;
                            let res = `${label}: ${value}`;
                            
                            // For GIE chart, add the common name
                            if (canvasId === 'chart-gie-mix') {
                                const gieCode = context.label;
                                const name = GIE_NAMES[gieCode] || GIE_NAMES[gieCode.replace('00', '0')] || '';
                                if (name) return [res, `Quality: ${name}`];
                            }
                            return res;
                        }
                    }
                }
            },
            scales: (type === 'doughnut' || type === 'pie' || type === 'radar') ? {} : {
                y: { 
                    beginAtZero: true, 
                    grid: { display: false }, 
                    ticks: { font: { size: 10 } },
                    grace: horizontal ? 0 : '15%' // Add space for labels on top
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { font: { size: 10 } },
                    grace: horizontal ? '15%' : 0 // Add space for labels on right
                }
            }
        }
    };

    if (type === 'radar') {
        config.options.scales = {
            r: { 
                min: 0, 
                max: 100, 
                ticks: { display: false },
                pointLabels: {
                    font: { size: 10, weight: 'bold' },
                    padding: 20 // Extra padding to prevent overlap
                }
            }
        };
        config.data.datasets[0].backgroundColor = 'rgba(0, 123, 255, 0.2)';
        config.data.datasets[0].borderColor = '#007bff';
    }

    charts[canvasId] = new Chart(ctx, config);
}

function handleChartClick(canvasId, label, value) {
    const filters = {};
    if (canvasId === 'chart-stock-mix') filters.type = label;
    if (canvasId === 'chart-gie-mix') filters.gie = label;
    if (canvasId === 'chart-finishes') filters.search = label;
    if (canvasId === 'chart-composition') filters.search = label;
    if (canvasId === 'chart-partners') filters.partner = label;
    if (canvasId === 'chart-weights') {
        if (label === '300+') { filters.gsmMin = 300; }
        else {
            const parts = label.split('-');
            filters.gsmMin = parts[0];
            filters.gsmMax = parts[1];
        }
    }
    
    if (Object.keys(filters).length > 0) {
        goToStock(true, filters);
    }
}

function renderTechnicalDNA(data) {
    const constructionList = document.getElementById('tech-construction-profiles');
    const widthList = document.getElementById('tech-width-dist');
    const matrixList = document.getElementById('tech-composition-finish');

    if (!constructionList || !widthList || !matrixList) return;

    // 1. Construction Profiles (Count + Density)
    const constructions = {};
    data.forEach(item => {
        const c = (item.count || '').trim();
        const d = (item.density || '').trim();
        if (c && d && c !== '**' && d !== '**' && c !== 'UNKNOWN' && d !== 'UNKNOWN') {
            const key = `${c} | ${d}`;
            const comp = (item.content || '').toUpperCase();
            const color = comp.includes('COTTON') ? '#ff851b' : 
                          comp.includes('POLY') ? '#007bff' : 
                          comp.includes('LINEN') ? '#28a745' : '#6c757d';
            
            if (!constructions[key]) constructions[key] = { count: 0, color: color, c: c, d: d };
            constructions[key].count++;
        }
    });

    const sortedConstruction = Object.entries(constructions)
        .sort((a,b) => b[1].count - a[1].count)
        .slice(0, 7);

    constructionList.innerHTML = sortedConstruction.map(([label, info]) => {
        const safeLabel = label.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const comp = (info.c + info.d).toUpperCase(); // We need to check fiber here
        const fiber = info.color === '#ff851b' ? 'COTTON' : 
                      info.color === '#007bff' ? 'POLY' : 
                      info.color === '#28a745' ? 'LINEN' : 'OTHER';
        const badgeClass = fiber === 'COTTON' ? 'bg-warning' : fiber === 'POLY' ? 'bg-primary' : fiber === 'LINEN' ? 'bg-success' : 'bg-secondary';
        
        return `
            <div class="p-2 rounded-3 border bg-white mb-2 d-flex gap-2 align-items-center shadow-sm" 
                 onclick="goToStock(true, {search: '${info.c} ${info.d}'})" style="cursor: pointer;">
                <span class="badge ${badgeClass}" style="font-size: 0.55rem; min-width: 50px;">${fiber}</span>
                <div class="small text-muted flex-grow-1 text-truncate fw-bold">${label}</div>
                <div class="badge bg-success text-white fw-bold ms-auto" style="font-size: 0.7rem; min-width: 35px;">${info.count}</div>
            </div>
        `;
    }).join('') || '<div class="text-muted small p-2">No construction data</div>';

    // 2. Width Distribution
    const widths = {};
    data.forEach(item => {
        const w = (item.width || '').trim().toUpperCase();
        if (w && w !== 'UNKNOWN' && w !== '**') {
            widths[w] = (widths[w] || 0) + 1;
        }
    });
    const sortedWidths = Object.entries(widths).sort((a,b) => b[1] - a[1]).slice(0, 7);
    
    widthList.innerHTML = sortedWidths.map(([label, count]) => {
        const safeSearch = label.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        return `
            <div class="p-2 bg-white rounded-3 border mb-2 shadow-sm d-flex gap-2 align-items-center" 
                 onclick="goToStock(true, {search: '${safeSearch}'})" style="cursor: pointer;">
                <div class="small text-muted flex-grow-1 text-truncate fw-bold">${label}</div>
                <div class="badge bg-success text-white fw-bold ms-auto" style="font-size: 0.7rem; min-width: 35px;">${count}</div>
            </div>
        `;
    }).join('') || '<div class="text-muted small p-2">No width data</div>';

    // 3. Composition & Finish Correlation
    const pairs = {};
    data.forEach(item => {
        const f = (item.finish || '').trim().toUpperCase();
        const c = (item.content || '').toUpperCase();
        const fiber = c.includes('COTTON') ? 'COTTON' : 
                      c.includes('POLY') ? 'POLY' : 
                      c.includes('LINEN') ? 'LINEN' : 
                      c.includes('SILK') ? 'SILK' : 'OTHER';
        
        if (f && f !== 'NORMAL' && f !== '**' && f !== 'UNKNOWN' && f !== 'REGULAR FINISH') {
            const key = `${fiber} + ${f}`;
            pairs[key] = (pairs[key] || 0) + 1;
            pairs[key].finish = f;
            pairs[key].fiber = fiber;
        }
    });
    const sortedPairs = Object.entries(pairs).sort((a,b) => b[1] - a[1]).slice(0, 7);

    matrixList.innerHTML = sortedPairs.map(([label, count]) => {
        const parts = label.split(' + ');
        const safeSearch = `${parts[0]} ${parts[1]}`.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        return `
            <div class="p-2 rounded-3 border bg-white mb-2 d-flex gap-2 align-items-center shadow-sm" 
                 onclick="goToStock(true, {search: '${safeSearch}'})" style="cursor: pointer;">
                <span class="badge ${parts[0] === 'COTTON' ? 'bg-warning' : parts[0] === 'POLY' ? 'bg-primary' : parts[0] === 'LINEN' ? 'bg-success' : 'bg-secondary'}" style="font-size: 0.55rem; min-width: 50px;">${parts[0]}</span>
                <div class="small text-muted flex-grow-1 text-truncate fw-bold">${parts[1]}</div>
                <div class="badge bg-success text-white fw-bold ms-auto" style="font-size: 0.7rem; min-width: 35px;">${count}</div>
            </div>
        `;
    }).join('') || '<div class="text-muted small p-2 text-center">No correlation found</div>';
}

function renderRestockList(data) {
    const list = document.getElementById('list-restock-alerts');
    const outOfStock = data.filter(item => (parseFloat(item.available) || 0) <= 0);
    
    if (outOfStock.length === 0) {
        list.innerHTML = '<div class="text-center py-5 text-muted small w-100"><div class="h4 mb-2">🎉</div>All items are in stock.</div>';
        return;
    }

    list.innerHTML = outOfStock.map(item => `
        <div class="col">
            <div class="restock-item-card p-3 rounded-3 bg-white border h-100 d-flex flex-column justify-content-center shadow-sm" 
                 onclick="goToStock(true, {search: '${item.article_no}'})" style="cursor: pointer;">
                <div class="fw-bold text-dark text-truncate small">${item.article_no}</div>
                <div class="text-muted text-truncate mb-1" style="font-size: 0.65rem;">${item.item || 'Generic Item'}</div>
                <div class="text-danger fw-bold" style="font-size: 0.65rem;">${parseFloat(item.quantity) === 0 ? 'NOT IN STOCK' : 'ALL CHECKED OUT'}</div>
            </div>
        </div>
    `).join('');
}

function viewArticle(id) {
    // Helper to jump to Stock Manager and show this item
    showHub(); // Temporary reset
    setTimeout(() => {
        goToStock();
        // Here we could trigger a search or open modal
    }, 100);
}


