const express = require('express');
const router = express.Router();
const {
    applyForAdoption,
    getMyAdoptions,
    getPendingAdoptions,
    verifyAdoption,
} = require('../controllers/adoption.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Specific routes before dynamic ones
router.get('/pending', protect, restrictTo('system_user'), getPendingAdoptions);
router.get('/my', protect, getMyAdoptions);

router.post('/', protect, applyForAdoption);
router.patch('/:id/verify', protect, restrictTo('system_user'), verifyAdoption);

module.exports = router;