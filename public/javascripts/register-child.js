document.getElementById('register-child-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorEl = document.getElementById('error-message');
    errorEl.textContent = '';

    // FormData automatically reads all named inputs from the form, including the file
    const formData = new FormData();
    formData.append('name', document.getElementById('name').value);
    formData.append('age', document.getElementById('age').value);
    formData.append('gender', document.getElementById('gender').value);
    formData.append('foundLocation', document.getElementById('foundLocation').value);
    formData.append('story', document.getElementById('story').value);
    formData.append('photo', document.getElementById('photo').files[0]);

    try {
        await apiRequest('/children', {
        method: 'POST',
        body: formData,
        });

        window.location.href = '/';
    } catch (error) {
        errorEl.textContent = error.message;
    }
});