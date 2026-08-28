const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null, // allow anonymous donations
    },
    amount: {
        type: Number,
        required: [true, 'Donation amount is required'],
        min: [1, 'Amount must be at least 1'],
    },
    currency: {
        type: String,
        default: 'INR',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
    },
    paymentId: {
        type: String, // ID returned by payment gateway (Razorpay/Stripe)
        default: '',
    },
},
{ timestamps: true }
);

module.exports = mongoose.model('Donation', donationSchema);