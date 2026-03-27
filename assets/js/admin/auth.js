// Auth Logic
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errorDiv = document.getElementById('login-error');

    errorDiv.style.display = 'none';
    showLoading(true);

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    showLoading(false);
    if (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    } else {
        user = data.user;
        const now = Date.now().toString();
        localStorage.setItem('admin_login_time', now);
        localStorage.setItem('admin_last_activity', now);
        updateUI();
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
});
