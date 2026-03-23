// Supabase Configuration
const SUPABASE_URL = 'https://eyuynhchvxxthdseqvhx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vXpTof6au1ODkQFS-I8YxQ_IYE5S_a_';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Profile
let user = null;
let orders = [];
let selectedOrder = null;
let currentSort = { column: 'order_id', direction: 'desc' };
let currentPage = 1;
const itemsPerPage = 10;
let currentColors = [];

// Session Configuration
const SESSION_TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours absolute limit
const INACTIVITY_TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours inactivity limit

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const orderDetailView = document.getElementById('order-detail-view');
const ordersListView = document.getElementById('orders-list-view');
const selectionView = document.getElementById('selection-view');
const stockManagerView = document.getElementById('stock-manager-view');
const loadingOverlay = document.getElementById('loading-overlay');

// Session Management
function resetInactivityTimer() {
    if (user) {
        localStorage.setItem('admin_last_activity', Date.now().toString());
    }
}

async function checkSessionExpiration() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return null;

    const now = Date.now();
    const loginTime = parseInt(localStorage.getItem('admin_login_time') || '0');
    const lastActivity = parseInt(localStorage.getItem('admin_last_activity') || '0');

    let reason = '';
    if (loginTime && (now - loginTime > SESSION_TIMEOUT)) {
        reason = 'Session expired (max duration reached).';
    } else if (lastActivity && (now - lastActivity > INACTIVITY_TIMEOUT)) {
        reason = 'Session expired due to inactivity.';
    }

    if (reason) {
        console.warn(reason);
        await logout();
        alert(reason);
        return null;
    }

    return session.user;
}

async function logout() {
    await supabaseClient.auth.signOut();
    user = null;
    localStorage.removeItem('admin_login_time');
    localStorage.removeItem('admin_last_activity');
    updateUI();
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

function updateUI() {
    if (user) {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        document.getElementById('user-display').textContent = user.email;
        resetInactivityTimer();
        
        // Handle initial view based on hash
        const hash = window.location.hash;
        if (hash.startsWith('#order-') || hash === '#orders') {
            fetchOrders();
        } else if (hash === '#stock') {
            if (typeof goToStock === 'function') goToStock();
            else window.addEventListener('load', () => { if(window.location.hash === '#stock') goToStock(); }, { once: true });
        } else {
            showHub();
        }
    } else {
        loginContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
    }
}

function showHub(push = true) {
    selectionView.style.display = 'block';
    ordersListView.style.display = 'none';
    orderDetailView.style.display = 'none';
    stockManagerView.style.display = 'none';
    selectedOrder = null;
    if (push && window.location.hash !== '#hub') {
        history.pushState({ view: 'hub' }, '', '#hub');
    }
}

function goToOrders() {
    fetchOrders(); // This will fetch and then handle navigation
    if (window.location.hash !== '#orders') {
        history.pushState({ view: 'list' }, '', '#orders');
    }
}

function returnToOrdersList(e, push = true) {
    if (e) e.preventDefault();
    selectionView.style.display = 'none';
    ordersListView.style.display = 'block';
    orderDetailView.style.display = 'none';
    stockManagerView.style.display = 'none';
    selectedOrder = null;

    if (push && window.location.hash !== '#orders') {
        history.pushState({ view: 'list' }, '', '#orders');
    }
}

// Initialization
async function init() {
    user = await checkSessionExpiration();

    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(name => {
        document.addEventListener(name, resetInactivityTimer, { passive: true });
    });

    setInterval(() => { if (user) checkSessionExpiration(); }, 60000);

    document.getElementById('navbar-logo-btn')?.addEventListener('click', (e) => {
        if (user) {
            e.preventDefault();
            showHub(true);
        }
    });

    updateUI();
}

// Routing & History
window.addEventListener('popstate', (event) => {
    if (!user) return;
    
    const state = event.state;
    if (state && state.view === 'detail') {
        const order = orders.find(o => o.order_uuid === state.order_uuid);
        if (order) showOrderDetail(order, false);
    } else if (state && state.view === 'list') {
        returnToOrdersList(null, false);
    } else if (state && state.view === 'stock') {
        goToStock(false);
    } else if (state && state.view === 'hub') {
        showHub(false);
    } else {
        const hash = window.location.hash;
        if (hash === '#stock') {
            goToStock(false);
        } else {
            handleHashNavigation();
        }
    }
});

// Final execution triggers after all scripts are loaded
window.addEventListener('load', () => {
    if (typeof initTemplates === 'function') initTemplates();
    init();
});
