async function loadChildren() {
    const grid = document.getElementById('children-grid');

    try {
        const data = await apiRequest('/children');

        if (data.children.length === 0) {
        grid.innerHTML = '<p class="loading-text">No children listed yet. Check back soon.</p>';
        return;
        }

        grid.innerHTML = data.children
        .map(
            (child) => `
            <div class="child-card" onclick="window.location.href='/children/${child._id}'">
            <img src="${child.photoUrl || '/images/placeholder-child.png'}" alt="${child.name}" />
            <div class="child-card-info">
                <h3>${child.name}</h3>
                <p>${child.age} years old &middot; ${child.gender}</p>
            </div>
            </div>
        `
        )
        .join('');
    } catch (error) {
        grid.innerHTML = `<p class="loading-text">Failed to load children: ${error.message}</p>`;
    }
}

document.getElementById('register-child-btn').addEventListener('click', async () => {
    try {
        await apiRequest('/auth/me');
        window.location.href = '/register-child';
    } catch (error) {
        window.location.href = '/login';
    }
});

document.getElementById('donate-btn').addEventListener('click', () => {
    window.location.href = '/donate';
});

loadChildren();