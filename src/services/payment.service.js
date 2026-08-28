const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Creates an order on Razorpay's side
exports.createOrder = async (amount, currency = 'INR') => {
    const options = {
        amount: amount * 100, // Razorpay expects amount in paise (smallest unit), not rupees
        currency,
        receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);
    return order;
};

// Verifies that a payment confirmation genuinely came from Razorpay
exports.verifySignature = (orderId, paymentId, signature) => {
    const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

    return generatedSignature === signature;
};