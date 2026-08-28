const { chatWithAssistant } = require('../services/ai.service');

// @desc   Send a message to the AI assistant
// @route  POST /api/assistant/chat
exports.chat = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ message: 'A text message is required' });
        }

        // req.user comes from optionalAuth - AI works for guests too, but register_child needs login
        const userId = req.user ? req.user._id : null;

        const result = await chatWithAssistant(message, history || [], userId);

        res.status(200).json({
            reply: result.reply,
            history: result.updatedHistory,
        });
    } catch (error) {
        res.status(500).json({ message: 'AI assistant error', error: error.message });
    }
};