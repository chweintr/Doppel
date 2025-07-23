/**
 * AR Streaming Avatar Application
 * Integrates HeyGen Streaming API with AR.js for interactive avatar experience
 */

class ARAvatarApp {
    constructor() {
        this.config = {
            serverUrl: "https://api.heygen.com",
            avatarId: "c928ca11c4c54082a66f6693ec4b1b09",
            token: null
        };
        
        this.session = {
            sessionInfo: null,
            room: null,
            isConnected: false,
            isStreaming: false
        };
        
        this.elements = {
            status: document.getElementById('status'),
            connectBtn: document.getElementById('connect-btn'),
            disconnectBtn: document.getElementById('disconnect-btn'),
            apiTokenInput: document.getElementById('api-token'),
            messageInput: document.getElementById('message-input'),
            sendMessageBtn: document.getElementById('send-message-btn'),
            voiceInputBtn: document.getElementById('voice-input-btn'),
            avatarVideo: document.getElementById('avatar-video'),
            avatarCanvas: document.getElementById('avatar-canvas'),
            avatarTexture: document.getElementById('avatar-texture'),
            loadingOverlay: document.getElementById('loading-overlay')
        };
        
        this.recognition = null;
        this.isListening = false;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupSpeechRecognition();
        this.hideLoading();
        console.log('AR Avatar App initialized');
    }
    
    bindEvents() {
        this.elements.connectBtn.addEventListener('click', () => this.connect());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.elements.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.elements.voiceInputBtn.addEventListener('click', () => this.toggleVoiceInput());
        
        // Enter key to send message
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Store API token in localStorage
        this.elements.apiTokenInput.addEventListener('input', (e) => {
            localStorage.setItem('heygen-token', e.target.value);
        });
        
        // Load saved token
        const savedToken = localStorage.getItem('heygen-token');
        if (savedToken) {
            this.elements.apiTokenInput.value = savedToken;
        }
    }
    
    showLoading(message = 'Loading...') {
        this.elements.loadingOverlay.querySelector('div:last-child').textContent = message;
        this.elements.loadingOverlay.classList.remove('hidden');
    }
    
    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }
    
    updateStatus(status, className) {
        this.elements.status.textContent = status;
        this.elements.status.className = `status ${className}`;
    }
    
    async connect() {
        const token = this.elements.apiTokenInput.value.trim();
        if (!token) {
            alert('Please enter your HeyGen API token');
            return;
        }
        
        this.config.token = token;
        this.showLoading('Connecting to HeyGen...');
        this.updateStatus('Connecting...', 'connecting');
        
        try {
            // Create new streaming session
            await this.createSession();
            
            // Start the stream
            await this.startStream();
            
            // Connect to LiveKit room
            await this.connectToRoom();
            
            this.session.isConnected = true;
            this.updateStatus('Connected', 'connected');
            this.updateUI(true);
            this.hideLoading();
            
            console.log('Successfully connected to avatar stream');
            
        } catch (error) {
            console.error('Connection failed:', error);
            this.updateStatus('Connection failed', 'disconnected');
            this.hideLoading();
            alert(`Connection failed: ${error.message}`);
        }
    }
    
    async createSession() {
        const response = await fetch(`${this.config.serverUrl}/v1/streaming.new`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.config.token}`
            },
            body: JSON.stringify({
                version: "v2",
                avatar_id: this.config.avatarId,
                quality: "high",
                background: "#00FF00", // Green screen for chroma key
                voice_id: "default"
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create session');
        }
        
        this.session.sessionInfo = await response.json();
        console.log('Session created:', this.session.sessionInfo);
    }
    
    async startStream() {
        const response = await fetch(`${this.config.serverUrl}/v1/streaming.start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.config.token}`
            },
            body: JSON.stringify({
                session_id: this.session.sessionInfo.session_id
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to start stream');
        }
        
        console.log('Stream started');
    }
    
    async connectToRoom() {
        this.session.room = new LiveKitClient.Room();
        
        // Set up event handlers
        this.session.room.on(LiveKitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            console.log('Track subscribed:', track.kind);
            
            if (track.kind === LiveKitClient.Track.Kind.Video) {
                console.log('Video track received');
                const mediaStream = new MediaStream([track.mediaStreamTrack]);
                this.elements.avatarVideo.srcObject = mediaStream;
                this.setupChromaKey();
            }
            
            if (track.kind === LiveKitClient.Track.Kind.Audio) {
                console.log('Audio track received');
                const mediaStream = new MediaStream([track.mediaStreamTrack]);
                const audioElement = new Audio();
                audioElement.srcObject = mediaStream;
                audioElement.play();
            }
        });
        
        this.session.room.on(LiveKitClient.RoomEvent.Connected, () => {
            console.log('Connected to LiveKit room');
            this.session.isStreaming = true;
        });
        
        this.session.room.on(LiveKitClient.RoomEvent.Disconnected, () => {
            console.log('Disconnected from LiveKit room');
            this.session.isStreaming = false;
        });
        
        // Connect to the room
        await this.session.room.connect(
            this.session.sessionInfo.url,
            this.session.sessionInfo.access_token
        );
    }
    
    setupChromaKey() {
        const canvas = this.elements.avatarCanvas;
        const ctx = canvas.getContext('2d');
        const video = this.elements.avatarVideo;
        const outputVideo = this.elements.avatarTexture;
        
        // Create output stream
        const outputStream = canvas.captureStream(30);
        outputVideo.srcObject = outputStream;
        outputVideo.play();
        
        const processFrame = () => {
            if (video.readyState >= video.HAVE_CURRENT_DATA) {
                // Set canvas size to match video
                canvas.width = video.videoWidth || 512;
                canvas.height = video.videoHeight || 512;
                
                // Draw video frame
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Get image data for chroma key processing
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Chroma key algorithm - remove green background
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Check if pixel is green (adjust thresholds as needed)
                    if (g > 100 && g > r + 50 && g > b + 50) {
                        data[i + 3] = 0; // Set alpha to 0 (transparent)
                    }
                }
                
                // Put processed image data back
                ctx.putImageData(imageData, 0, 0);
            }
            
            if (this.session.isStreaming) {
                requestAnimationFrame(processFrame);
            }
        };
        
        processFrame();
    }
    
    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || !this.session.isConnected) return;
        
        try {
            await this.sendToAvatar(message);
            this.elements.messageInput.value = '';
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message');
        }
    }
    
    async sendToAvatar(text) {
        const response = await fetch(`${this.config.serverUrl}/v1/streaming.task`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.config.token}`
            },
            body: JSON.stringify({
                session_id: this.session.sessionInfo.session_id,
                text: text,
                task_type: "talk"
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send message');
        }
        
        console.log('Message sent to avatar:', text);
    }
    
    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.elements.messageInput.value = transcript;
                console.log('Speech recognized:', transcript);
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.elements.voiceInputBtn.textContent = '🎤 Voice Input';
                this.elements.voiceInputBtn.style.background = 'linear-gradient(45deg, #00ffff, #0080ff)';
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                this.elements.voiceInputBtn.textContent = '🎤 Voice Input';
                this.elements.voiceInputBtn.style.background = 'linear-gradient(45deg, #00ffff, #0080ff)';
            };
        } else {
            console.warn('Speech recognition not supported');
            this.elements.voiceInputBtn.style.display = 'none';
        }
    }
    
    toggleVoiceInput() {
        if (!this.recognition) return;
        
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
            this.isListening = true;
            this.elements.voiceInputBtn.textContent = '🛑 Stop Listening';
            this.elements.voiceInputBtn.style.background = 'linear-gradient(45deg, #ff4444, #ff6666)';
        }
    }
    
    async disconnect() {
        try {
            if (this.session.room) {
                await this.session.room.disconnect();
            }
            
            if (this.session.sessionInfo) {
                await fetch(`${this.config.serverUrl}/v1/streaming.stop`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${this.config.token}`
                    },
                    body: JSON.stringify({
                        session_id: this.session.sessionInfo.session_id
                    })
                });
            }
            
            this.session.isConnected = false;
            this.session.isStreaming = false;
            this.session.sessionInfo = null;
            this.session.room = null;
            
            this.elements.avatarVideo.srcObject = null;
            this.elements.avatarTexture.srcObject = null;
            
            this.updateStatus('Disconnected', 'disconnected');
            this.updateUI(false);
            
            console.log('Disconnected from avatar stream');
            
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    }
    
    updateUI(connected) {
        this.elements.connectBtn.disabled = connected;
        this.elements.disconnectBtn.disabled = !connected;
        this.elements.sendMessageBtn.disabled = !connected;
        this.elements.voiceInputBtn.disabled = !connected;
    }
}

// Global functions for quick messages
window.sendQuickMessage = async function(message) {
    if (window.avatarApp && window.avatarApp.session.isConnected) {
        try {
            await window.avatarApp.sendToAvatar(message);
        } catch (error) {
            console.error('Failed to send quick message:', error);
        }
    }
};

// Custom A-Frame components for enhanced AR effects
AFRAME.registerComponent('holographic-shader', {
    init: function () {
        const el = this.el;
        const material = el.getAttribute('material');
        
        // Add holographic properties
        el.setAttribute('material', {
            ...material,
            transparent: true,
            opacity: 0.85,
            side: 'double',
            blending: 'additive'
        });
        
        // Animate holographic effects
        el.setAttribute('animation__pulse', {
            property: 'material.opacity',
            from: 0.7,
            to: 0.95,
            duration: 2000,
            easing: 'easeInOutSine',
            loop: true,
            dir: 'alternate'
        });
        
        el.setAttribute('animation__float', {
            property: 'position',
            from: '0 0 0',
            to: '0 0.1 0',
            duration: 3000,
            easing: 'easeInOutSine',
            loop: true,
            dir: 'alternate'
        });
    }
});

AFRAME.registerComponent('avatar-interactions', {
    init: function () {
        const el = this.el;
        
        // Add click interaction
        el.addEventListener('click', function () {
            if (window.avatarApp && window.avatarApp.session.isConnected) {
                const greetings = [
                    "Hello! I'm Caleb's AI avatar. What would you like to discuss?",
                    "Welcome to my AR space! Ask me about AI, art, or philosophy.",
                    "Hi there! I'm here to chat about creativity and technology."
                ];
                const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
                window.sendQuickMessage(randomGreeting);
            }
        });
        
        // Add hover effects
        el.addEventListener('mouseenter', function () {
            el.setAttribute('animation__hover', {
                property: 'scale',
                to: '1.05 1.05 1.05',
                duration: 300,
                easing: 'easeOutCubic'
            });
        });
        
        el.addEventListener('mouseleave', function () {
            el.setAttribute('animation__hover', {
                property: 'scale',
                to: '1 1 1',
                duration: 300,
                easing: 'easeOutCubic'
            });
        });
    }
});

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.avatarApp = new ARAvatarApp();
});

// Handle AR marker detection
AFRAME.registerComponent('marker-handler', {
    init: function () {
        const el = this.el;
        
        el.addEventListener('markerFound', function () {
            console.log('AR marker found - avatar should be visible');
            document.querySelector('#avatar-platform').setAttribute('visible', true);
        });
        
        el.addEventListener('markerLost', function () {
            console.log('AR marker lost - avatar hidden');
            document.querySelector('#avatar-platform').setAttribute('visible', false);
        });
    }
});

// Add performance monitoring
const performanceMonitor = {
    startTime: Date.now(),
    frameCount: 0,
    lastFrameTime: Date.now(),
    
    update() {
        this.frameCount++;
        const now = Date.now();
        if (now - this.lastFrameTime > 1000) {
            const fps = this.frameCount;
            console.log(`FPS: ${fps}, Uptime: ${(now - this.startTime) / 1000}s`);
            this.frameCount = 0;
            this.lastFrameTime = now;
        }
        requestAnimationFrame(() => this.update());
    }
};

// Start performance monitoring
performanceMonitor.update(); 