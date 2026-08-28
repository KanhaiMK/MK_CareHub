// Extract the child ID from the URL, e.g. /children/64f7a2... -> "64f7a2..."
const childId = window.location.pathname.split('/').pop();

async function loadChildDetails() {
    const container = document.getElementById('child-detail-content');

    try {
        const data = await apiRequest(`/children/${childId}`);
        const child = data.child;

        container.innerHTML = `
        <div class="child-detail-card">
            <img src="${child.photoUrl || '/images/placeholder-child.png'}" alt="${child.name}" class="child-detail-img" />
            <div class="child-detail-info">
            <h1>${child.name}</h1>
            <p class="child-meta">${child.age} years old &middot; ${child.gender}</p>
            <p class="child-story">${child.story || 'No additional details provided.'}</p>

            ${
                child.adoptionStatus === 'available'
                ? `<button id="adopt-btn" class="btn btn-primary">Apply to Adopt</button>`
                : `<p class="status-badge">${
                    child.adoptionStatus === 'adopted' ? 'Already adopted' : 'Adoption pending'
                    }</p>`
            }
            <p id="adopt-message" class="adopt-message"></p>
            </div>
        </div>
        `;

        const adoptBtn = document.getElementById('adopt-btn');
        if (adoptBtn) {
        adoptBtn.addEventListener('click', handleAdopt);
        }
    } catch (error) {
        container.innerHTML = `<p class="loading-text">Could not load this child's details.</p>`;
    }
}

async function handleAdopt() {
    const messageEl = document.getElementById('adopt-message');
    messageEl.textContent = '';

    try {
        await apiRequest('/adoptions', {
        method: 'POST',
        body: JSON.stringify({ childId }),
        });

        messageEl.textContent = 'Application submitted! Awaiting verification.';
        messageEl.classList.add('success-text');
        document.getElementById('adopt-btn').disabled = true;
    } catch (error) {
        if (error.message.includes('logged in') || error.message.includes('authorized')) {
        window.location.href = '/login';
        return;
        }
        messageEl.textContent = error.message;
    }
}

loadChildDetails();