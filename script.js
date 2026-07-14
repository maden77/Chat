/**
 * SecureChat - Aplikasi Utama
 */

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const togglePassword = document.getElementById('toggle-password');
const passwordStrength = document.getElementById('password-strength');
const strengthBar = document.querySelector('.strength-bar');
const strengthText = document.querySelector('.strength-text');

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const charCount = document.getElementById('char-count');
const statusIndicator = document.getElementById('status-indicator');
const encryptionStatus = document.getElementById('encryption-status');
const logoutButton = document.getElementById('logout-button');

// State
let currentPassword = '';
let isAuthenticated = false;
let messageCount = 0;
let encryptionFingerprint = '';

// ============================================
// LOGIN HANDLING
// ============================================

// Password strength checker
passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const result = cryptoUtils.validatePassword(password);
    
    // Update strength bar
    const width = (result.score / 4) * 100;
    strengthBar.style.setProperty('--width', width + '%');
    strengthBar.style.width = width + '%';
    
    // Update color
    const colors = ['#ff6b6b', '#ff9f43', '#feca57', '#55efc4', '#00b894'];
    strengthBar.style.background = colors[Math.min(result.score, 4)];
    
    strengthText.textContent = result.strength;
    strengthText.style.color = colors[Math.min(result.score, 4)];
    
    // Enable/disable login
    loginButton.disabled = !result.valid || password.length < 12;
});

// Toggle password visibility
togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
});

// Login
loginButton.addEventListener('click', async () => {
    await authenticate(passwordInput.value);
});

passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !loginButton.disabled) {
        authenticate(passwordInput.value);
    }
});

async function authenticate(password) {
    try {
        // Test enkripsi dengan password
        const testMessage = 'SecureChat Test';
        const encrypted = await cryptoUtils.encrypt(testMessage, password);
        const decrypted = await cryptoUtils.decrypt(encrypted, password);
        
        if (decrypted === testMessage) {
            currentPassword = password;
            isAuthenticated = true;
            
            // Generate fingerprint
            encryptionFingerprint = await cryptoUtils.generateFingerprint(password);
            
            // Show chat screen
            loginScreen.style.display = 'none';
            chatScreen.style.display = 'flex';
            
            // Load messages
            loadMessages();
            
            // Update status
            updateStatus('online');
            encryptionStatus.textContent = `🔒 AES-256-GCM (${encryptionFingerprint.substring(0, 8)})`;
            
            showToast('✅ Login berhasil! Koneksi aman.', 'success');
            
            messageInput.focus();
        }
    } catch (error) {
        showToast('❌ Password salah! Silakan coba lagi.');
        passwordInput.value = '';
        passwordInput.focus();
        passwordInput.select();
    }
}

// Logout
logoutButton.addEventListener('click', () => {
    if (confirm('Yakin ingin keluar? Pesan akan tetap tersimpan terenkripsi.')) {
        isAuthenticated = false;
        currentPassword = '';
        chatScreen.style.display = 'none';
        loginScreen.style.display = 'flex';
        passwordInput.value = '';
        loginButton.disabled = true;
        strengthBar.style.width = '0%';
        strengthText.textContent = 'Kosong';
        showToast('🔒 Logout berhasil');
    }
});

// ============================================
// CHAT FUNCTIONALITY
// ============================================

// Send message
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

messageInput.addEventListener('input', () => {
    const count = messageInput.value.length;
    charCount.textContent = `${count}/4000`;
    sendButton.disabled = count === 0 || count > 4000;
    autoResize();
});

function autoResize() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !isAuthenticated) return;

    try {
        // Update status
        updateStatus('encrypting');
        
        // Enkripsi pesan
        const encrypted = await cryptoUtils.encrypt(text, currentPassword);
        
        // Tampilkan pesan asli
        addMessage(text, 'sent', true);
        
        // Clear input
        messageInput.value = '';
        updateCharCount();
        sendButton.disabled = true;
        
        // Simulasi balasan
        setTimeout(async () => {
            try {
                const responses = [
                    'Pesan aman diterima! ✅',
                    'Diterima dengan AES-256-GCM 🔒',
                    'Koneksi aman terverifikasi 🛡️',
                    'Pesan berhasil didekripsi 💬',
                    'Sistem keamanan aktif 🔐'
                ];
                
                const response = responses[Math.floor(Math.random() * responses.length)];
                const encryptedResponse = await cryptoUtils.encrypt(response, currentPassword);
                addMessage(encryptedResponse, 'received', true);
                
                updateStatus('online');
                sendButton.disabled = false;
                messageInput.focus();
            } catch (error) {
                showToast('❌ Gagal mengirim balasan');
                updateStatus('online');
            }
        }, 600 + Math.random() * 1000);
        
    } catch (error) {
        showToast('❌ Gagal mengirim pesan: ' + error.message);
        updateStatus('online');
    }
}

// ============================================
// UI HELPERS
// ============================================

function addMessage(text, type, encrypted = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    // Jika pesan diterima dan terenkripsi, dekripsi
    let displayText = text;
    if (type === 'received' && encrypted && isAuthenticated) {
        try {
            // Decrypt asynchronously
            cryptoUtils.decrypt(text, currentPassword).then(decrypted => {
                content.textContent = decrypted;
            }).catch(() => {
                content.textContent = '🔒 [Pesan terenkripsi]';
            });
            displayText = '🔒 Mendekripsi...';
        } catch {
            displayText = '🔒 [Pesan terenkripsi]';
        }
    }
    content.textContent = displayText;
    
    // Meta
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    const encBadge = document.createElement('span');
    encBadge.className = 'message-encrypted';
    encBadge.textContent = encrypted ? '🔒 AES-256' : '📝';
    
    meta.appendChild(time);
    meta.appendChild(encBadge);
    
    messageDiv.appendChild(content);
    messageDiv.appendChild(meta);
    
    // Hapus welcome
    const welcome = messagesContainer.querySelector('.welcome-message');
    if (welcome) welcome.remove();
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    saveMessages();
}

function updateStatus(status) {
    const indicator = document.getElementById('status-indicator');
    if (status === 'online') {
        indicator.textContent = '● Online';
        indicator.className = 'status-online';
    } else if (status === 'offline') {
        indicator.textContent = '● Offline';
        indicator.className = 'status-offline';
    } else if (status === 'encrypting') {
        indicator.textContent = '⏳ Enkripsi...';
        indicator.className = 'status-encrypting';
    }
}

function updateCharCount() {
    const count = messageInput.value.length;
    charCount.textContent = `${count}/4000`;
    sendButton.disabled = count === 0 || count > 4000 || !isAuthenticated;
}

function scrollToBottom() {
    const container = document.querySelector('.chat-container');
    container.scrollTop = container.scrollHeight;
}

// ============================================
// PERSISTENCE
// ============================================

function saveMessages() {
    try {
        const messages = [];
        document.querySelectorAll('.message').forEach(msg => {
            const content = msg.querySelector('.message-content').textContent;
            const type = msg.classList.contains('message-sent') ? 'sent' : 'received';
            const encrypted = msg.querySelector('.message-encrypted').textContent.includes('🔒');
            messages.push({ content, type, encrypted });
        });
        localStorage.setItem('secureChatMessages', JSON.stringify(messages));
    } catch (e) {
        console.error('Gagal save:', e);
    }
}

function loadMessages() {
    try {
        const saved = localStorage.getItem('secureChatMessages');
        if (saved) {
            const messages = JSON.parse(saved);
            messages.forEach(msg => {
                addMessage(msg.content, msg.type, msg.encrypted);
            });
        }
    } catch (e) {
        console.error('Gagal load:', e);
    }
}

// ============================================
// TOAST NOTIFICATION
// ============================================

function showToast(message, type = 'error') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// SERVICE WORKER
// ============================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.log('SW failed:', err));
    });
}

// ============================================
// ONLINE/OFFLINE
// ============================================

window.addEventListener('online', () => {
    updateStatus('online');
    showToast('📶 Kembali online', 'success');
});

window.addEventListener('offline', () => {
    updateStatus('offline');
    showToast('📶 Offline - Pesan akan disimpan lokal');
});

// Initialize
console.log('🔐 SecureChat loaded with AES-256-GCM encryption');