// Stock Manager Data Fetching & Handling

async function fetchStock() {
    showLoading(true);

    const rawSearch = (document.querySelector('#stock-search')?.value || '')
        .replace(/gsm/gi, '');

    const typeFilter = document.querySelector('#stock-type-filter')?.value || 'all';
    const statusFilter = document.querySelector('#stock-status-filter')?.value || 'all';
    const gieFilter = document.querySelector('#gie-quality-filter')?.value || 'all';
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
            const tokenized = term.split(/[^a-z0-9]+/).filter(Boolean);
            const separatorTolerant = tokenized.length ? `%${tokenized.join('%')}%` : '';

            let variants = [];
            if (term) variants.push(`%${term}%`);
            if (separatorTolerant && separatorTolerant !== `%${term}%`) variants.push(separatorTolerant);
            if (clean) variants.push(clean.length > 3 ? `%${clean.substring(0, clean.length - 1)}%` : `%${clean}%`);

            // Expand with synonyms
            if (clean && synonymMap[clean]) variants.push(`%${synonymMap[clean]}%`);

            // Deduplicate variants to keep the query compact
            variants = [...new Set(variants)];

            // Build OR conditions for text-searchable fields
            const conditions = variants.map(v =>
                `article_no.ilike.${v},content.ilike.${v},item.ilike.${v},finish.ilike.${v},remark.ilike.${v},count.ilike.${v},width.ilike.${v},weight.ilike.${v}`
            ).join(',');

            // Barcode is often numeric in DB views; use exact match instead of ilike.
            if (/^\d+$/.test(clean)) {
                query = query.or(`${conditions},barcode.eq.${clean}`);
            } else {
                query = query.or(conditions);
            }
        });
    }

    // 2. Basic Structured Filters
    if (typeFilter !== 'all') query = query.eq('type', typeFilter);
    if (gieFilter !== 'all') query = query.ilike('article_no', `${gieFilter}-%`);
    if (statusFilter === 'IN_STOCK') query = query.gt('available', 0);
    if (statusFilter === 'OUT_OF_STOCK') query = query.eq('available', 0);
    if (statusFilter === 'CHECKED_OUT') {
        const { data: activeCheckouts, error: checkoutError } = await supabaseClient
            .from('Stock_Checkouts')
            .select('barcode')
            .is('returned_at', null);

        if (checkoutError) {
            showLoading(false);
            console.error(checkoutError);
            return;
        }

        const activeBarcodes = [...new Set((activeCheckouts || []).map(c => c.barcode).filter(b => b !== null && b !== undefined && b !== ''))];

        // No active checkout means no checked-out stock to show.
        if (activeBarcodes.length === 0) {
            showLoading(false);
            stockItems = [];
            renderStockItems([], 0);
            return;
        }

        query = query.in('barcode', activeBarcodes);
    }

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
    let sortColumn = column;
    if (column === 'weight') sortColumn = 'weight_numeric';
    query = query.order(sortColumn, { ascending: order === 'asc', nullsFirst: false });

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
async function fetchStockItemByArticleNo(articleNo) {
    if (!articleNo) return null;
    
    // Check locally first (though unlikely to have all matches in current page)
    const localMatch = stockItems.find(i => String(i.article_no).toLowerCase() === String(articleNo).toLowerCase().trim());
    if (localMatch) return localMatch;

    const { data, error } = await supabaseClient
        .from('stock_availability_view')
        .select('*')
        .eq('article_no', articleNo.trim())
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error fetching item by article no:", error);
        return null;
    }

    return (data && data.length > 0) ? data[0] : null;
}
