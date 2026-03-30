// Stock Manager Data Fetching & Handling

async function fetchStock() {
    showLoading(true);

    const rawSearch = (document.querySelector('#stock-search')?.value || '')
        .replace(/gsm/gi, '');
    const fuzzySearch = rawSearch.trim().replace(/[^a-zA-Z0-9]+/g, '%');
    const searchTerm = `%${fuzzySearch}%`;

    const typeFilter = document.querySelector('#stock-type-filter')?.value || 'all';
    const statusFilter = document.querySelector('#stock-status-filter')?.value || 'all';
    const gsmMin = document.querySelector('#gsm-min-filter')?.value;
    const gsmMax = document.getElementById('gsm-max-filter')?.value;
    const unitFilter = document.querySelector('#weight-unit-filter')?.value || 'All';
    const sortVal = document.querySelector('#stock-sort-select')?.value || 'created_at-desc';
    const [column, order] = sortVal.split('-');

    // Build Supabase Query using the optimized View
    let query = supabaseClient
        .from('stock_availability_view')
        .select('*', { count: 'exact' });

    // 1. Multi-keyword Intelligent Search
    const searchTerms = rawSearch.trim().toLowerCase().split(/\s+/).filter(k => k.length > 0);
    const synonymMap = {
        'spx': 'spandex',
        'poly': 'polyester',
        'cot': 'cotton',
        'vis': 'viscose',
        'ny': 'nylon',
        'tw': 'twill'
    };

    if (searchTerms.length > 0) {
        searchTerms.forEach(term => {
            const clean = term.replace(/[^a-z0-9]+/g, '');
            let variants = [clean];
            
            // Expand with synonyms
            if (synonymMap[clean]) variants.push(synonymMap[clean]);
            
            // Robust Fuzzy conditions
            const conditions = variants.map(v => {
                const fuzzy = v.length > 3 ? `%${v.substring(0, v.length - 1)}%` : `%${v}%`;
                return `article_no.ilike.${fuzzy},content.ilike.${fuzzy},item.ilike.${fuzzy},finish.ilike.${fuzzy},remark.ilike.${fuzzy},count.ilike.${fuzzy},width.ilike.${fuzzy},weight.ilike.${fuzzy}`;
            }).join(',');

            query = query.or(conditions);
        });
    }

    // 2. Basic Structured Filters
    if (typeFilter !== 'all') query = query.eq('type', typeFilter);
    if (statusFilter === 'IN_STOCK') query = query.gt('available', 0);
    if (statusFilter === 'OUT_OF_STOCK') query = query.eq('available', 0);

    // 3. Weight (GSM/MM/OZ) Filters using View's numeric column
    if (gsmMin) {
        const minVal = parseFloat(gsmMin);
        if (!isNaN(minVal)) query = query.gte('weight_numeric', minVal);
    }
    if (gsmMax) {
        const maxVal = parseFloat(gsmMax);
        if (!isNaN(maxVal)) query = query.lte('weight_numeric', maxVal);
    }
    if (unitFilter !== 'All') {
        query = query.eq('weight_unit', unitFilter);
    }

    // 4. Sorting
    query = query.order(column, { ascending: order === 'asc' });

    // 5. Server-side Pagination
    const from = (stockCurrentPage - 1) * stockItemsPerPage;
    const to = from + stockItemsPerPage - 1;
    query = query.range(from, to);

    const { data: paginatedItems, error, count: totalCount } = await query;

    if (error) {
        showLoading(false);
        console.error(error);
        return;
    }

    showLoading(false);
    stockItems = paginatedItems;
    renderStockItems(stockItems, totalCount);
}

function applyStockFilter() {
    stockCurrentPage = 1; // Reset to page 1 on new filter
    fetchStock();
}

function updateStockSort(value) {
    stockCurrentPage = 1;
    fetchStock();
}

/**
 * Fetches a single stock item by its barcode directly from the database.
 * This is used for check-in/check-out to find items that might not be on the current paginated page.
 */
async function fetchStockItemByBarcode(barcode) {
    if (!barcode) return null;
    
    // First, check if it's already in the currently loaded stockItems
    const localMatch = stockItems.find(i => String(i.barcode) === String(barcode));
    if (localMatch) return localMatch;

    // If not found locally, fetch from Supabase View
    const { data, error } = await supabaseClient
        .from('stock_availability_view')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

    if (error) {
        console.error("Error fetching item by barcode:", error);
        return null;
    }

    return data;
}
