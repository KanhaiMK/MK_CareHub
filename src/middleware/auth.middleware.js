const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// 1. Checks if a valid token is present — attaches user to req if so
exports.protect = async (req, res, next) => {
    try {
        let token;

        // Prefer cookie; fall back to header (keeps Thunder Client testing working too)
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
    }
};

// 2. Checks if the logged-in user's role is allowed
exports.restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'You do not have permission to perform this action' });
        }
        next();
    };
};

// 3. Attaches req.user if a valid token is present, but never blocks the request
exports.optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            req.user = null;
            return next(); // no token? fine, continue as anonymous
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        req.user = user || null; // if token is somehow invalid/user deleted, fall back to anonymous
        next();
    } catch (error) {
        req.user = null; // invalid/expired token? still don't block — just treat as anonymous
        next();
    }
};