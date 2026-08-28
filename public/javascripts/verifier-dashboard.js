const tabs = document.querySelectorAll('.tab-btn');
const contentEl = document.getElementById('tab-content');

document.getElementById('navbar-toggle').addEventListener('click', () => {
    document.getElementById('navbar-links').classList.toggle('open');
});

async function loadChildrenTab() {
    contentEl.innerHTML = '<p class="loading-text">Loading...</p>';

    try {
        const data = await apiRequest('/children/pending');

        if (data.children.length === 0) {
        contentEl.innerHTML = '<p class="loading-text">No pending children.</p>';
        return;
        }

        contentEl.innerHTML = data.children
        .map(
            (child) => `
            <div class="verify-card" id="child-${child._id}">
            <div class="verify-card-header">
                <div>
                <div class="verify-card-title">${child.name}</div>
                <div class="verify-card-sub">${child.age} yrs &middot; ${child.gender} &middot; Found at ${child.foundLocation}</div>
                <div class="verify-card-sub">Submitted by ${child.registeredBy?.name || 'Unknown'} (${child.registeredBy?.email || ''})</div>
                </div>
            </div>
            <div class="verify-actions">
                <button class="btn-approve" onclick="verifyChild('${child._id}', 'approved')">Approve</button>
                <button class="btn-reject" onclick="verifyChild('${child._id}', 'rejected')">Reject</button>
            </div>
            </div>
        `
        )
        .join('');
    } catch (error) {
        contentEl.innerHTML = `<p class="loading-text">${error.message}</p>`;
    }
}

async function verifyChild(id, decision) {
    try {
        await apiRequest(`/children/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ decision }),
        });
        document.getElementById(`child-${id}`).remove();
    } catch (error) {
        alert(error.message);
    }
}

async function loadAdoptionsTab() {
    contentEl.innerHTML = '<p class="loading-text">Loading...</p>';

    try {
        const data = await apiRequest('/adoptions/pending');

        if (data.adoptions.length === 0) {
        contentEl.innerHTML = '<p class="loading-text">No pending adoptions.</p>';
        return;
        }

        contentEl.innerHTML = data.adoptions
        .map(
            (adoption) => `
            <div class="verify-card" id="adoption-${adoption._id}">
            <div class="verify-card-header">
                <div>
                <div class="verify-card-title">${adoption.child?.name || 'Child'}</div>
                <div class="verify-card-sub">Applicant: ${adoption.adopter?.name || 'Unknown'} (${adoption.adopter?.email || ''})</div>
                </div>
            </div>
            <div class="verify-actions">
                <button class="btn-approve" onclick="verifyAdoption('${adoption._id}', 'approved')">Approve</button>
                <button class="btn-reject" onclick="verifyAdoption('${adoption._id}', 'rejected')">Reject</button>
            </div>
            </div>
        `
        )
        .join('');
    } catch (error) {
        contentEl.innerHTML = `<p class="loading-text">${error.message}</p>`;
    }
}

async function verifyAdoption(id, decision) {
    try {
        await apiRequest(`/adoptions/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ decision }),
        });
        document.getElementById(`adoption-${id}`).remove();
    } catch (error) {
        alert(error.message);
    }
}

tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        tab.dataset.tab === 'children' ? loadChildrenTab() : loadAdoptionsTab();
    });
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    window.location.href = '/verifier-login';
});

// Guard: must be logged in AND a system_user
(async function init() {
    try {
        const user = await apiRequest('/auth/me');
        if (user.role !== 'system_user') {
        window.location.href = '/';
        return;
        }
        loadChildrenTab();
    } catch (error) {
        window.location.href = '/verifier-login';
    }
})();