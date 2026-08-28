document.getElementById('verifier-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = '';

    try {
        const user = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        });

        if (user.role !== 'system_user') {
        errorEl.textContent = 'This account does not have verifier access.';
        // Log them out immediately since we did set a valid cookie for their (non-verifier) account
        await apiRequest('/auth/logout', { method: 'POST' });
        return;
        }

        window.location.href = '/verifier-dashboard';
    } catch (error) {
        errorEl.textContent = error.message;
    }
});