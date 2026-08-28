const Child = require('../models/child.model');
const { 
    getCachedChildren, setCachedChildren, invalidateChildrenCache,
    getCachedChild, setCachedChild, invalidateChildCache
} = require('../utils/cache');

// @desc   Register a new child (goes into pending verification)
// @route  POST /api/children
exports.createChild = async (req, res) => {
    try {
        const { name, age, gender, story, foundLocation } = req.body;

        // req.file is populated by our Multer/Cloudinary middleware
        const photoUrl = req.file ? req.file.path : '';

        const child = await Child.create({
            name,
            age,
            gender,
            story,
            foundLocation,
            photoUrl,
            registeredBy: req.user._id, // comes from `protect` middleware
        });

        res.status(201).json({
            message: 'Child registered successfully. Awaiting verification.',
            child,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc   Get all approved children (public homepage listing)
// @route  GET /api/children
exports.getAllChildren = async (req, res) => {
    try {
        // 1. Try cache first
        const cached = await getCachedChildren();
        if (cached) {
            return res.status(200).json(cached);
        }

        // 2. Cache miss - hit MongoDB
        const children = await Child.find({ verificationStatus: 'approved' }).sort({ createdAt: -1 });

        const responseData = {
            count: children.length,
            children,
        };

        // 3. Populate cache for next time
        await setCachedChildren(responseData);

        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc   Get single child details
// @route  GET /api/children/:id
exports.getChildById = async (req, res) => {
    try {
        const cached = await getCachedChild(req.params.id);
        if (cached) {
            return res.status(200).json(cached);
        }

        const child = await Child.findById(req.params.id);

        if (!child) {
            return res.status(404).json({ message: 'Child not found' });
        }

        const responseData = { child };
        await setCachedChild(req.params.id, responseData);

        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc   Get all children pending verification (for system_user)
// @route  GET /api/children/pending
exports.getPendingChildren = async (req, res) => {
    try {
        const children = await Child.find({ verificationStatus: 'pending' })
        .populate('registeredBy', 'name email')
        .sort({ createdAt: 1 });

        res.status(200).json({ count: children.length, children });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc   Approve or reject a child listing
// @route  PATCH /api/children/:id/verify
exports.verifyChild = async (req, res) => {
    try {
        const { decision } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ message: 'Decision must be either approved or rejected' });
        }

        const child = await Child.findById(req.params.id);
        if (!child) {
            return res.status(404).json({ message: 'Child not found' });
        }

        child.verificationStatus = decision;
        child.verifiedBy = req.user._id;
        await child.save();

        await invalidateChildrenCache(); // a child just became visible/invisible
        await invalidateChildCache(child._id);

        res.status(200).json({ message: `Child listing ${decision}`, child });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc   Get children registered by the logged-in user
// @route  GET /api/children/my/registrations
exports.getMyRegisteredChildren = async (req, res) => {
    try {
        const children = await Child.find({ registeredBy: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ count: children.length, children });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};