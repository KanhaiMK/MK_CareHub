async function renderNavbar() {
    const container = document.getElementById('navbar-links');
    if (!container) return;

    try {
        const user = await apiRequest('/auth/me');

        container.innerHTML = `
        <a href="/profile">Profile</a>
        <button id="logout-btn" class="btn-link">Logout</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', async () => {
        await apiRequest('/auth/logout', { method: 'POST' });
        window.location.href = '/';
        });
    } catch (error) {
        // 401 from /auth/me means not logged in - this is expected, not a real error
        container.innerHTML = `
        <a href="/login">Login</a>
        <a href="/register">Register</a>
        `;
    }
}

renderNavbar();

document.getElementById('navbar-toggle').addEventListener('click', () => {
    document.getElementById('navbar-links').classList.toggle('open');
});