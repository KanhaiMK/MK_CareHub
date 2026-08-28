const express = require('express');
const router = express.Router();
const {
    createChild,
    getAllChildren,
    getChildById,
    getPendingChildren,
    verifyChild,
    getMyRegisteredChildren
} = require('../controllers/child.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// IMPORTANT: specific/static routes MUST come before dynamic '/:id' routes
router.get('/pending', protect, restrictTo('system_user'), getPendingChildren);

router.get('/my/registrations', protect, getMyRegisteredChildren);

// Public routes
router.get('/', getAllChildren);
router.get('/:id', getChildById);

// Protected routes
router.post('/', protect, upload.single('photo'), createChild);
router.patch('/:id/verify', protect, restrictTo('system_user'), verifyChild);

module.exports = router;