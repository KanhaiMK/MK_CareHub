const mongoose = require('mongoose');

const childSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Child name is required'],
        trim: true,
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: 0,
        max: 18,
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true,
    },
    story: {
        type: String,
        trim: true,
        default: '',
    },
    photoUrl: {
        type: String,
        default: '', // will hold cartoon placeholder or uploaded image link
    },
    foundLocation: {
        type: String,
        trim: true,
        default: '', // relevant only if street-registered
    },
    registeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    adoptionStatus: {
        type: String,
        enum: ['available', 'adopted', 'pending_adoption'],
        default: 'available',
    },
},
{ timestamps: true }
);

module.exports = mongoose.model('Child', childSchema);