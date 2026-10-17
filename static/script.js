document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const sendBtn = document.getElementById('send-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const loadingTemplate = document.getElementById('loading-template');

    // Navigation elements
    const navChatBtn = document.getElementById('nav-chat-btn');
    const navHomeBtn = document.getElementById('nav-home-btn');
    const chatArea = document.querySelector('.chat-area');
    const dashboardArea = document.getElementById('dashboard-area');
    const refreshDevicesBtn = document.getElementById('refresh-devices-btn');

    // --- Navigation Logic ---
    navChatBtn.addEventListener('click', () => {
        navChatBtn.classList.add('active');
        navHomeBtn.classList.remove('active');
        chatArea.classList.remove('hidden');
        dashboardArea.classList.add('hidden');
    });

    navHomeBtn.addEventListener('click', () => {
        navHomeBtn.classList.add('active');
        navChatBtn.classList.remove('active');
        chatArea.classList.add('hidden');
        dashboardArea.classList.remove('hidden');
        fetchDeviceStates(); // Refresh state when opening tab
    });

    // --- Chat Logic ---
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';

        // Enable/disable send button based on input
        if (this.value.trim().length > 0) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    // Handle Enter key to send (Shift+Enter for new line)
    messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim().length > 0) {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    // Clear chat
    clearChatBtn.addEventListener('click', () => {
        // Keep only the first welcome message
        const welcomeMessage = chatMessages.firstElementChild;
        chatMessages.innerHTML = '';
        if (welcomeMessage) {
            chatMessages.appendChild(welcomeMessage);
        }
    });

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = messageInput.value.trim();
        if (!message) return;

        // Reset input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        // Add user message to UI
        appendMessage('user', message);

        // Show loading indicator
        const loadingNode = loadingTemplate.content.cloneNode(true);
        chatMessages.appendChild(loadingNode);
        scrollToBottom();

        try {
            // Send request to Python API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    conversation_id: 1
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Remove loading indicator
            removeLoadingIndicator();

            // Add assistant response to UI
            appendMessage('assistant', data.response);

        } catch (error) {
            console.error('Error fetching chat response:', error);
            removeLoadingIndicator();
            appendMessage('assistant', 'Sorry, I encountered an error. Please ensure the backend server is running and your API keys are configured correctly.');
        }
    });

    function appendMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        let avatarHtml = '';
        if (role === 'assistant') {
            avatarHtml = `
            <div class="avatar">
                <i class="ph-fill ph-robot"></i>
            </div>`;
        } else {
            avatarHtml = `
            <div class="avatar">
                <i class="ph-fill ph-user"></i>
            </div>`;
        }

        // Extremely basic markdown-like parsing for bold and code blocks
        // In a production app, use a proper markdown parser library like marked.js
        let formattedContent = content
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') // code blocks
            .replace(/`([^`]+)`/g, '<code>$1</code>') // inline code
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // bold
            .replace(/\n/g, '<br>'); // newlines

        messageDiv.innerHTML = `
            ${avatarHtml}
            <div class="message-content">
                <p>${formattedContent}</p>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function removeLoadingIndicator() {
        const loader = document.querySelector('.loading-message');
        if (loader) {
            loader.remove();
        }
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- Smart Home Logic ---
    async function fetchDeviceStates() {
        try {
            const response = await fetch('/api/devices');
            if (response.ok) {
                const devices = await response.json();
                updateDashboardUI(devices);
            }
        } catch (error) {
            console.error("Failed to fetch device states:", error);
        }
    }

    async function updateDeviceState(deviceId, newState) {
        try {
            const response = await fetch(`/api/devices/${deviceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: newState })
            });
            if (response.ok) {
                const data = await response.json();
                updateSingleDeviceUI(deviceId, data.device);
            }
        } catch (error) {
            console.error(`Failed to update device ${deviceId}:`, error);
            // Revert UI on failure by re-fetching all states
            fetchDeviceStates();
        }
    }

    function updateDashboardUI(devices) {
        for (const [id, data] of Object.entries(devices)) {
            updateSingleDeviceUI(id, data);
        }
    }

    function updateSingleDeviceUI(id, data) {
        const card = document.getElementById(`card-${id}`);
        if (!card) return;

        if (data.type === 'light' || data.type === 'camera') {
            const toggle = document.getElementById(`toggle-${id}`);
            const statusText = document.getElementById(`status-${id}`);
            const mapIcon = document.getElementById(`map-${id}`);

            const isOn = data.state.toLowerCase() === 'on';
            if (toggle) toggle.checked = isOn;

            if (statusText) {
                if (data.type === 'camera') {
                    statusText.textContent = isOn ? 'Active' : 'Standby';
                } else {
                    statusText.textContent = isOn ? 'On' : 'Off';
                }
            }

            if (isOn) {
                if (card) card.classList.add('active');
                if (mapIcon) mapIcon.classList.add('active');
            } else {
                if (card) card.classList.remove('active');
                if (mapIcon) mapIcon.classList.remove('active');
            }
        } else if (data.type === 'hvac') {
            const slider = document.getElementById(`slider-${id}`);
            const valText = document.getElementById(`val-${id}`);
            const mapIcon = document.getElementById(`map-${id}`);

            if (slider) slider.value = data.state;
            if (valText) valText.textContent = data.state;
            if (card) card.classList.add('active'); // Always active to show color
        } else if (data.type === 'lock') {
            const toggle = document.getElementById(`toggle-${id}`);
            const statusText = document.getElementById(`status-${id}`);
            const mapIcon = document.getElementById(`map-${id}`);

            const isLocked = data.state.toLowerCase() === 'locked';
            if (toggle) toggle.checked = isLocked;
            if (statusText) statusText.textContent = isLocked ? 'Locked' : 'Unlocked';

            if (card) {
                if (!isLocked) card.classList.add('active'); // active when unlocked
                else card.classList.remove('active');
            }

            if (mapIcon) {
                if (isLocked) mapIcon.classList.remove('unlocked');
                else mapIcon.classList.add('unlocked');
            }
        } else if (data.type === 'blinds') {
            const slider = document.getElementById(`slider-${id}`);
            const valText = document.getElementById(`val-${id}`);
            const mapIcon = document.getElementById(`map-${id}`);

            if (slider) slider.value = data.state;
            if (valText) valText.textContent = data.state;

            if (card) {
                if (data.state > 0) card.classList.add('active');
                else card.classList.remove('active');
            }

            if (mapIcon) {
                if (data.state > 0) mapIcon.classList.add('active');
                else mapIcon.classList.remove('active');
            }
        } else if (data.type === 'rgb') {
            const colorPicker = document.getElementById(`color-${id}`);
            const statusText = document.getElementById(`status-${id}`);
            const mapIcon = document.getElementById(`map-${id}`);

            if (colorPicker) colorPicker.value = data.state;
            if (statusText) statusText.textContent = data.state.toUpperCase();
            if (card) card.classList.add('active');

            if (mapIcon) {
                mapIcon.style.color = data.state;
                mapIcon.style.filter = `drop-shadow(0 0 10px ${data.state}80)`;
                mapIcon.classList.add('active');
            }
        }
    }

    // Attach event listeners to toggles
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const deviceId = e.target.getAttribute('data-device');
            let newState;
            // Check if it's a lock
            if (deviceId.includes('lock')) {
                newState = e.target.checked ? 'locked' : 'unlocked';
            } else {
                newState = e.target.checked ? 'on' : 'off';
            }
            updateDeviceState(deviceId, newState);
        });
    });

    // Attach event listeners to sliders
    document.querySelectorAll('.range-slider').forEach(slider => {
        slider.addEventListener('change', (e) => {
            const deviceId = e.target.getAttribute('data-device');
            const newState = parseInt(e.target.value, 10);
            updateDeviceState(deviceId, newState);
        });

        // Also update text immediately while dragging
        slider.addEventListener('input', (e) => {
            const deviceId = e.target.getAttribute('data-device');
            const valText = document.getElementById(`val-${deviceId}`);
            if (valText) valText.textContent = e.target.value;
        });
    });

    // Attach event listener to color pickers
    document.querySelectorAll('.color-picker').forEach(picker => {
        picker.addEventListener('change', (e) => {
            const deviceId = e.target.getAttribute('data-device');
            const newState = e.target.value;
            updateDeviceState(deviceId, newState);
        });
    });

    // --- Routines Logic ---
    const morningBtn = document.getElementById('routine-morning-btn');
    const nightBtn = document.getElementById('routine-night-btn');

    async function executeRoutine(routineName) {
        try {
            const response = await fetch(`/api/routines/${routineName}`, {
                method: 'POST'
            });
            if (response.ok) {
                const data = await response.json();
                updateDashboardUI(data.devices);
            }
        } catch (error) {
            console.error(`Failed to execute routine ${routineName}:`, error);
        }
    }

    if (morningBtn) morningBtn.addEventListener('click', () => executeRoutine('morning'));
    if (nightBtn) nightBtn.addEventListener('click', () => executeRoutine('night'));

    refreshDevicesBtn.addEventListener('click', fetchDeviceStates);

    // Initial load
    fetchDeviceStates();
});
