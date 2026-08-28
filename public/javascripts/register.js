document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('error-message');

    errorEl.textContent = '';

    try {
        await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
        });

        window.location.href = '/';
    } catch (error) {
        errorEl.textContent = error.message;
    }
});