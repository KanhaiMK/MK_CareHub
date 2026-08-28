document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('error-message');

    errorEl.textContent = '';

    try {
        await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        });

        window.location.href = '/';
    } catch (error) {
        errorEl.textContent = error.message;
    }
});