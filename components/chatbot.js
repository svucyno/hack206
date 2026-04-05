// chatbot.js

document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    const chatHistory = document.getElementById('chat-history');
    const chatChips = document.querySelectorAll('.chat-chip');

    const API_URL = window.CONFIG ? window.CONFIG.BACKEND_URL : 'http://localhost:4000/api';

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}`;
        msgDiv.innerHTML = `<p>${text}</p>`;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    async function processQuery(query) {
        if (!query.trim()) return;

        // Add user message
        appendMessage(query, 'user');
        chatInput.value = '';

        // Add loading indicator
        const loadingId = 'ai-loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message bot`;
        msgDiv.id = loadingId;
        msgDiv.innerHTML = `<p><i class="fa-solid fa-ellipsis fa-fade"></i> Crisis AI is thinking...</p>`;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            // Call Backend Proxy for OpenAI
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: query })
            });

            const data = await response.json();
            
            // Remove loading and show response
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();

            if (data.response) {
                appendMessage(data.response, 'bot');
            } else {
                throw new Error('No response from AI');
            }

        } catch (err) {
            console.error('Chatbot API error:', err);
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();
            
            appendMessage("I'm having trouble connecting to my AI core. Please check your internet or try again later. (English & Telugu support coming soon)", 'bot');
        }
    }

    // Event Listeners
    if (sendBtn) {
        sendBtn.addEventListener('click', () => processQuery(chatInput.value));
    }
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') processQuery(chatInput.value);
        });
    }

    chatChips.forEach(chip => {
        chip.addEventListener('click', () => {
            processQuery(chip.textContent);
        });
    });
});
