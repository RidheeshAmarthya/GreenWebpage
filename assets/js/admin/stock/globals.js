// Stock Manager Global State
let stockItems = [];
let stockCurrentPage = 1;
const stockItemsPerPage = 12; // Grid friendly (3x4 or 4x3)
let stockSort = { column: 'created_at', direction: 'desc' };
let stockViewMode = 'grid'; // 'grid' | 'list'
let stockCurrentQuery = '';
let stockCurrentType = 'all';

// Batch Operations State
let selectedStockIds = [];

// Image Caching to save bandwidth (Persistent 24h)
const CACHE_VALID_MS = 23.5 * 60 * 60 * 1000;
let stockImageCache = JSON.parse(localStorage.getItem('stock_image_cache') || '{}');
const pendingRequests = new Map(); // Track ongoing requests to deduplicate
