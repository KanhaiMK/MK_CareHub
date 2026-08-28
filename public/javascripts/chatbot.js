const toggleBtn = document.getElementById('chatbot-toggle');
const panel = document.getElementById('chatbot-panel');
const iconOpen = document.getElementById('chat-icon-open');
const iconClose = document.getElementById('chat-icon-close');
const messagesEl = document.getElementById('chatbot-messages');
const inputEl = document.getElementById('chatbot-input');
const sendBtn = document.getElementById('chatbot-send');

// Held only in memory - lost on refresh, exactly as intended
let conversationHistory = [];
let isWaitingForReply = false;

toggleBtn.addEventListener('click', () => {
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    iconOpen.style.display = isHidden ? 'none' : 'block';
    iconClose.style.display = isHidden ? 'block' : 'none';

    if (isHidden) {
        inputEl.focus();
    }
});

function addBubble(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
}

function showTypingIndicator() {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot typing';
    bubble.id = 'typing-indicator';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isWaitingForReply) return;

    addBubble(text, 'user');
    inputEl.value = '';
    isWaitingForReply = true;
    showTypingIndicator();

    try {
        const data = await apiRequest('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
            message: text,
            history: conversationHistory,
        }),
        });

        removeTypingIndicator();
        addBubble(data.reply, 'bot');
        conversationHistory = data.history; // update local memory with the AI's returned history
    } catch (error) {
        removeTypingIndicator();
        addBubble("Sorry, I'm having trouble responding right now. Please try again.", 'bot');
    } finally {
        isWaitingForReply = false;
    }
}

sendBtn.addEventListener('click', sendMessage);

inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});