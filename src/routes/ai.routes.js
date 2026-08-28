const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/ai.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.post('/chat', optionalAuth, chat);

module.exports = router;