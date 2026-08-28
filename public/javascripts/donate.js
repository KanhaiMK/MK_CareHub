document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.getElementById('amount').value = btn.dataset.amount;

        document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.getElementById('donate-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount = document.getElementById('amount').value;
    const messageEl = document.getElementById('donate-message');
    messageEl.textContent = '';
    messageEl.classList.remove('success-text');

    try {
        // Step 1: create the order on our backend
        const orderData = await apiRequest('/donations/create-order', {
        method: 'POST',
        body: JSON.stringify({ amount }),
        });

        // Step 2: open Razorpay's checkout widget
        const options = {
        key: orderData.key,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'OrphanCare Platform',
        description: 'Donation for child welfare',
        order_id: orderData.order.id,
        handler: async function (response) {
            // Step 3: verify payment on our backend after successful checkout
            try {
            await apiRequest('/donations/verify', {
                method: 'POST',
                body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                donationId: orderData.donationId,
                }),
            });

            messageEl.textContent = 'Thank you! Your donation was successful.';
            messageEl.classList.add('success-text');
            } catch (verifyError) {
            messageEl.textContent = 'Payment succeeded but verification failed. Please contact support.';
            }
        },
        theme: {
            color: '#C86B5C', // matches your Chestnut Rose theme
        },
        };

        const razorpayInstance = new Razorpay(options);
        razorpayInstance.open();
    } catch (error) {
        messageEl.textContent = error.message;
    }
});