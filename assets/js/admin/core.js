// Supabase Configuration
const SUPABASE_URL = window.ENV.SUPABASE_URL;
const SUPABASE_KEY = window.ENV.SUPABASE_KEY;
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// SILENT WARMUP: Pre-establishes TLS and CORS preflights to prevent 
// "Load Failed" on the first user transaction in mobile Safari.
setTimeout(() => {
    supabaseClient.from('Stock').select('id', { count: 'exact', head: true }).limit(1).then(() => {
        console.log("Supabase connection warmed up.");
    }).catch(e => console.warn("Warmup failed:", e));
}, 1000);

// State Profile
let user = null;
let orders = [];
let selectedOrder = null;
let currentSort = { column: 'order_id', direction: 'desc' };
let currentPage = 1;
const itemsPerPage = 10;
let currentColors = [];

// Auto-Sync Version with GitHub Commits
async function updateBuildVersion() {
    try {
        const response = await fetch('https://api.github.com/repos/RidheeshAmarthya/GreenWebpage/commits?per_page=1');
        const linkHeader = response.headers.get('Link');
        if (linkHeader) {
            const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
            if (lastPageMatch && lastPageMatch[1]) {
                const count = lastPageMatch[1];
                document.querySelectorAll('.js-build-version').forEach(el => {
                    el.textContent = `v1.${count}`;
                });
            }
        }
    } catch (e) { console.debug("Using static version fallback."); }
}
updateBuildVersion();

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

function updateCurrentScrollState() {
    if (history.state) {
        const newState = { ...history.state, scroll: window.scrollY };
        history.replaceState(newState, '', window.location.hash);
    }
}

function showHub(push = true) {
    if (selectionView.style.display === 'block') return; // Avoid scroll reset
    updateCurrentScrollState();
    selectionView.style.display = 'block';
    ordersListView.style.display = 'none';
    orderDetailView.style.display = 'none';
    stockManagerView.style.display = 'none';
    document.getElementById('stats-view').style.display = 'none';
    selectedOrder = null;
    if (push && window.location.hash !== '#hub') {
        history.pushState({ view: 'hub', scroll: 0 }, '', '#hub');
    }
}

function goToOrders() {
    if (ordersListView.style.display === 'block') return; // Avoid scroll reset
    updateCurrentScrollState();
    document.getElementById('stats-view').style.display = 'none';
    fetchOrders(); // This will fetch and then handle navigation
    if (window.location.hash !== '#orders') {
        history.pushState({ view: 'list', scroll: 0 }, '', '#orders');
    }
}

function returnToOrdersList(e, push = true) {
    if (e) e.preventDefault();
    if (ordersListView.style.display === 'block') return; // Avoid scroll reset
    updateCurrentScrollState();
    selectionView.style.display = 'none';
    ordersListView.style.display = 'block';
    orderDetailView.style.display = 'none';
    stockManagerView.style.display = 'none';
    document.getElementById('stats-view').style.display = 'none';
    selectedOrder = null;

    if (push && window.location.hash !== '#orders') {
        history.pushState({ view: 'list', scroll: 0 }, '', '#orders');
    }
}

// Modal History Handling (Global Integration)
let ignoreNextModalPush = false;
let ignoreNextPopstate = false;

document.addEventListener('show.bs.modal', (e) => {
    if (ignoreNextModalPush) {
        ignoreNextModalPush = false;
        return;
    }
    const currentHash = window.location.hash;
    updateCurrentScrollState();
    // Push new state for modal, maintaining the current view scroll in previous history
    history.pushState({ modalId: e.target.id, previousHash: currentHash, scroll: window.scrollY }, '', '#' + e.target.id);
});

document.addEventListener('hide.bs.modal', (e) => {
    // If we're closing the modal that corresponds to the current state, pop history
    if (history.state && history.state.modalId === e.target.id) {
        ignoreNextPopstate = true;
        history.back();
        // Reset flag after a short delay to catch the popstate event
        setTimeout(() => { ignoreNextPopstate = false; }, 100);
    }
});

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
    
    if (ignoreNextPopstate) {
        // This popstate was expected (triggered by manual Modal close)
        return;
    }

    // 1. Handle Modal Closing on Browser Back Button
    const openModals = document.querySelectorAll('.modal.show');
    if (openModals.length > 0) {
        openModals.forEach(modal => {
            const instance = bootstrap.Modal.getInstance(modal);
            if (instance) {
                // Hiding a modal from popstate shouldn't trigger history.back()
                // so we can just hide it. The loop guard in hide.bs.modal handles this.
                instance.hide();
            }
        });
        return; // Stopped modal from triggering further navigation
    }

    const state = event.state;
    if (state && state.view === 'detail') {
        const order = orders.find(o => o.order_uuid === state.order_uuid);
        if (order) showOrderDetail(order, false);
    } else if (state && state.view === 'list') {
        returnToOrdersList(null, false);
    } else if (state && state.view === 'stock') {
        if (typeof goToStock === 'function') goToStock(false);
    } else if (state && state.view === 'stats') {
        if (typeof showStats === 'function') showStats(false);
    } else if (state && state.view === 'hub') {
        showHub(false);
    } else {
        const hash = window.location.hash;
        if (hash === '#stock') {
            if (typeof goToStock === 'function') goToStock(false);
        } else if (hash === '#stats') {
            if (typeof showStats === 'function') showStats(false);
        } else if (hash === '#orders') {
            returnToOrdersList(null, false);
        } else if (hash === '#hub' || hash === '') {
            showHub(false);
        }
    }

    // Restore scroll position IF provided in state
    if (state && typeof state.scroll === 'number') {
        setTimeout(() => {
            window.scrollTo({ top: state.scroll, behavior: 'instant' });
        }, 10);
    }
});

// Final execution triggers after all scripts are loaded
window.addEventListener('load', () => {
    if (typeof initTemplates === 'function') initTemplates();
    init();
});
