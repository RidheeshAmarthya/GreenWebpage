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
    const gsmMax = document.querySelector('#gsm-max-filter')?.value;
    const sortVal = document.querySelector('#stock-sort-select')?.value || 'created_at-desc';
    const [column, order] = sortVal.split('-');

    // Build Supabase Query (Exclude GSM and Pagination from DB query to handle numeric logic in JS)
    let query = supabaseClient
        .from('Stock')
        .select(`
            *,
            checkouts: Stock_Checkouts(name, company, created_at, returned_at)
        `);

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
    // (Status filter is now handled in JS for accurate quantity calculation)

    // 3. Sorting (Still handled by DB)
    query = query.order(column, { ascending: order === 'asc' });

    const { data: allMatches, error } = await query;

    if (error) {
        showLoading(false);
        console.error(error);
        return;
    }

    // 4. Robust Numeric GSM Filtering in JavaScript
    filteredData = allMatches.filter(item => {
        const stock = calculateStockAvailability(item);
        
        // GSM Filter
        if (gsmMin || gsmMax) {
            const minVal = gsmMin ? parseFloat(gsmMin) : -Infinity;
            const maxVal = gsmMax ? parseFloat(gsmMax) : Infinity;
            if (!item.weight) return false;
            const itemVal = parseFloat(item.weight.toString().replace(/[^0-9.]/g, ''));
            if (isNaN(itemVal)) return false;
            if (itemVal < minVal || itemVal > maxVal) return false;
        }

        // Availability (Status) Filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'IN_STOCK' && stock.available === 0) return false;
            if (statusFilter === 'OUT_OF_STOCK' && stock.available > 0) return false;
        }

        return true;
    });

    const totalCount = filteredData.length;

    // 5. Manual Pagination after JS Filtering
    const from = (stockCurrentPage - 1) * stockItemsPerPage;
    const to = from + stockItemsPerPage;
    const paginatedItems = filteredData.slice(from, to);

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
