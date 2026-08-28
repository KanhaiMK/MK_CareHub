const Donation = require('../models/donation.model');
const paymentService = require('../services/payment.service');

// @desc   Create a donation order (Step 1 of payment flow)
// @route  POST /api/donations/create-order
exports.createDonationOrder = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount < 1) {
            return res.status(400).json({ message: 'Please provide a valid donation amount' });
        }

        const order = await paymentService.createOrder(amount);

        // Create a donation record in 'pending' state — we update it after verification
        const donation = await Donation.create({
            donor: req.user ? req.user._id : null, // supports anonymous donations
            amount,
            paymentStatus: 'pending',
            paymentId: order.id, // storing Razorpay's order_id here temporarily
        });

        res.status(201).json({
            order,
            donationId: donation._id,
            key: process.env.RAZORPAY_KEY_ID, // frontend needs this public key to open checkout
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc   Verify payment after user completes checkout (Step 2)
// @route  POST /api/donations/verify
exports.verifyDonation = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, donationId } = req.body;

        const isValid = paymentService.verifySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            await Donation.findByIdAndUpdate(donationId, { paymentStatus: 'failed' });
            return res.status(400).json({ message: 'Payment verification failed' });
        }

        const donation = await Donation.findByIdAndUpdate(
            donationId,
            { paymentStatus: 'completed', paymentId: razorpay_payment_id },
            { new: true }
        );

        res.status(200).json({ message: 'Donation successful. Thank you!', donation });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc   Get donations made by the logged-in user
// @route  GET /api/donations/my
exports.getMyDonations = async (req, res) => {
    try {
        const donations = await Donation.find({ donor: req.user._id, paymentStatus: 'completed' }).sort({
        createdAt: -1,
        });
        res.status(200).json({ count: donations.length, donations });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};