const Adoption = require('../models/adoption.model');
const Child = require('../models/child.model');
const { invalidateChildrenCache, invalidateChildCache } = require('../utils/cache');
// @desc   Apply to adopt a child
// @route  POST /api/adoptions
exports.applyForAdoption = async (req, res) => {
    try {
        const { childId } = req.body;

        const child = await Child.findById(childId);
        if (!child) {
            return res.status(404).json({ message: 'Child not found' });
        }

        if (child.verificationStatus !== 'approved') {
            return res.status(400).json({ message: 'This child is not available for adoption yet' });
        }

        if (child.adoptionStatus !== 'available') {
            return res.status(400).json({ message: 'This child is already adopted or has a pending application' });
        }

        const adoption = await Adoption.create({
            child: childId,
            adopter: req.user._id,
        });

        // Mark child as having a pending adoption, so others can't also apply simultaneously
        child.adoptionStatus = 'pending_adoption';
        await child.save();

        await invalidateChildrenCache(); // adoptionStatus changed
        await invalidateChildCache(childId);

        res.status(201).json({
            message: 'Adoption application submitted. Awaiting verification.',
            adoption,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc   Get logged-in user's own adoption applications
// @route  GET /api/adoptions/my
exports.getMyAdoptions = async (req, res) => {
    try {
        const adoptions = await Adoption.find({ adopter: req.user._id })
        .populate('child', 'name age gender photoUrl')
        .sort({ createdAt: -1 });

        res.status(200).json({ count: adoptions.length, adoptions });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc   Get all pending adoption applications (for system_user)
// @route  GET /api/adoptions/pending
exports.getPendingAdoptions = async (req, res) => {
    try {
        const adoptions = await Adoption.find({ status: 'pending' })
        .populate('child', 'name age gender photoUrl')
        .populate('adopter', 'name email')
        .sort({ createdAt: 1 });

        res.status(200).json({ count: adoptions.length, adoptions });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc   Approve or reject an adoption application
// @route  PATCH /api/adoptions/:id/verify
exports.verifyAdoption = async (req, res) => {
    try {
        const { decision, reviewNote } = req.body; // decision: 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ message: 'Decision must be either approved or rejected' });
        }

        const adoption = await Adoption.findById(req.params.id);
        if (!adoption) {
            return res.status(404).json({ message: 'Adoption application not found' });
        }

        adoption.status = decision;
        adoption.reviewedBy = req.user._id;
        adoption.reviewNote = reviewNote || '';
        await adoption.save();

        // Update the child's adoption status based on decision
        const child = await Child.findById(adoption.child);
        if (child) {
            child.adoptionStatus = decision === 'approved' ? 'adopted' : 'available';
            await child.save();

            await invalidateChildrenCache(); // adoptionStatus changed
            await invalidateChildCache(child._id);
        }

        res.status(200).json({ message: `Adoption ${decision}`, adoption });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};