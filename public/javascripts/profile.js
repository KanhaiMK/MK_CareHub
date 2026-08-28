const tabs = document.querySelectorAll('.tab-btn');
const contentEl = document.getElementById('tab-content');

const tabConfig = {
    registrations: {
        endpoint: '/children/my/registrations',
        key: 'children',
        render: (item) => `
        <div class="record-card">
            <div>
            <div class="record-card-title">${item.name}</div>
            <div class="record-card-sub">${item.age} yrs &middot; ${item.gender} &middot; Found at ${item.foundLocation}</div>
            </div>
            <span class="status-pill status-${item.verificationStatus}">${item.verificationStatus}</span>
        </div>
        `,
    },
    adoptions: {
        endpoint: '/adoptions/my',
        key: 'adoptions',
        render: (item) => `
        <div class="record-card">
            <div>
            <div class="record-card-title">${item.child?.name || 'Child'}</div>
            <div class="record-card-sub">Applied ${new Date(item.createdAt).toLocaleDateString()}</div>
            </div>
            <span class="status-pill status-${item.status}">${item.status}</span>
        </div>
        `,
    },
    donations: {
        endpoint: '/donations/my',
        key: 'donations',
        render: (item) => `
        <div class="record-card">
            <div>
            <div class="record-card-title">₹${item.amount}</div>
            <div class="record-card-sub">${new Date(item.createdAt).toLocaleDateString()}</div>
            </div>
            <span class="status-pill status-${item.paymentStatus}">${item.paymentStatus}</span>
        </div>
        `,
    },
};

async function loadTab(tabName) {
    contentEl.innerHTML = '<p class="loading-text">Loading...</p>';
    const config = tabConfig[tabName];

    try {
        const data = await apiRequest(config.endpoint);
        const items = data[config.key];

        if (items.length === 0) {
        contentEl.innerHTML = '<p class="loading-text">Nothing here yet.</p>';
        return;
        }

        contentEl.innerHTML = `<div class="record-list">${items.map(config.render).join('')}</div>`;
    } catch (error) {
        contentEl.innerHTML = `<p class="loading-text">${error.message}</p>`;
    }
}

tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        loadTab(tab.dataset.tab);
    });
});

// Guard: redirect to login if not authenticated, then load default tab
(async function init() {
    try {
        const user = await apiRequest('/auth/me');
        document.getElementById('profile-greeting').textContent = `Welcome, ${user.name}`;
        loadTab('registrations');
    } catch (error) {
        window.location.href = '/login';
    }
})();