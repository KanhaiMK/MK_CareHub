const express = require('express');
const router = express.Router();
const { createDonationOrder, verifyDonation, getMyDonations } = require('../controllers/donation.controller');
const { optionalAuth } = require('../middleware/auth.middleware');
const { protect } = require('../middleware/auth.middleware');

router.post('/create-order', optionalAuth, createDonationOrder);
router.post('/verify', optionalAuth, verifyDonation);
router.get('/my', protect, getMyDonations);

module.exports = router;