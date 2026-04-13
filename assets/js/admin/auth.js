const loginForm = document.getElementById('login-form');
const loginErrorDiv = document.getElementById('login-error');
const adminTurnstileContainer = document.getElementById('admin-turnstile-container');

const ADMIN_TURNSTILE_SITEKEY = '0x4AAAAAAC8qtP_bidRys_gg';
const ADMIN_TURNSTILE_BYPASS = window.location.protocol === 'file:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
const USE_ADMIN_TURNSTILE = !ADMIN_TURNSTILE_BYPASS;

let adminTurnstileWidgetId = null;

function setAdminTurnstileVisibility(show) {
    if (!adminTurnstileContainer) return;
    adminTurnstileContainer.classList.toggle('d-none', !show);
    adminTurnstileContainer.classList.toggle('d-flex', show);
    adminTurnstileContainer.hidden = !show;
}

function resetAdminTurnstile() {
    if (!USE_ADMIN_TURNSTILE || typeof turnstile === 'undefined') return;
    if (adminTurnstileWidgetId === null) return;
    try {
        turnstile.reset(adminTurnstileWidgetId);
    } catch (err) {
        console.warn('Admin Turnstile reset failed:', err);
    }
}

async function waitForTurnstileApi(maxWaitMs = 10000) {
    const start = Date.now();
    while (typeof window.turnstile === 'undefined') {
        if (Date.now() - start > maxWaitMs) return false;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return true;
}

async function initAdminTurnstile() {
    if (!USE_ADMIN_TURNSTILE) {
        setAdminTurnstileVisibility(false);
        return;
    }

    const hasApi = await waitForTurnstileApi();
    if (!hasApi) {
        setAdminTurnstileVisibility(false);
        console.warn('Cloudflare Turnstile API unavailable on admin login.');
        return;
    }

    setAdminTurnstileVisibility(true);
    if (adminTurnstileWidgetId !== null) return;

    adminTurnstileWidgetId = turnstile.render('#admin-turnstile-widget', {
        sitekey: ADMIN_TURNSTILE_SITEKEY,
        callback: () => {
            loginErrorDiv.style.display = 'none';
        },
        'expired-callback': () => {
            loginErrorDiv.textContent = 'Security check expired. Please verify again.';
            loginErrorDiv.style.display = 'block';
            resetAdminTurnstile();
        },
        'error-callback': () => {
            loginErrorDiv.textContent = 'Security check failed to load. Please refresh and try again.';
            loginErrorDiv.style.display = 'block';
        }
    });
}

initAdminTurnstile();

// Auth Logic
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    loginErrorDiv.style.display = 'none';

    if (USE_ADMIN_TURNSTILE) {
        if (adminTurnstileWidgetId === null || typeof turnstile === 'undefined') {
            loginErrorDiv.textContent = 'Security check is still loading. Please wait a moment and try again.';
            loginErrorDiv.style.display = 'block';
            return;
        }

        const captchaToken = turnstile.getResponse(adminTurnstileWidgetId);
        if (!captchaToken) {
            loginErrorDiv.textContent = 'Please complete the security check.';
            loginErrorDiv.style.display = 'block';
            return;
        }
    }

    showLoading(true);

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    showLoading(false);
    if (error) {
        loginErrorDiv.textContent = error.message;
        loginErrorDiv.style.display = 'block';
        resetAdminTurnstile();
    } else {
        user = data.user;
        const now = Date.now().toString();
        localStorage.setItem('admin_login_time', now);
        localStorage.setItem('admin_last_activity', now);
        resetAdminTurnstile();
        updateUI();
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
});
