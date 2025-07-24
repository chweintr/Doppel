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
            sessionToken: null,
            room: null,
            mediaStream: null,
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
            loadingOverlay: document.getElementById('loading-overlay'),
            voiceStatus: document.getElementById('voice-status')
        };
        
        this.audioLevels = {
            microphone: 0,
            avatar: 0
        };
        
        this.recognition = null;
        this.isListening = false;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupSpeechRecognition();
        this.setupCleanup();
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
        
        // Pre-fill API token (password-protected access)
        this.elements.apiTokenInput.value = 'MjNlM2Q1ZmVkY2E2NDNmOGIxYzMzMDgzYzNhZmYyZTQtMTczMDU4NDk0Nw==';
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
    
    updateVoiceStatus(message) {
        if (this.elements.voiceStatus) {
            this.elements.voiceStatus.textContent = message;
        }
    }
    
    // Monitor audio levels for visual feedback
    startAudioMonitoring() {
        if (!this.microphoneStream) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(this.microphoneStream);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        microphone.connect(analyser);
        analyser.fftSize = 256;
        
        const checkLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            
            // Update microphone activity indicator
            if (average > 5) {
                this.elements.status.textContent = `Connected 🎤 Speaking (${Math.round(average)})`;
            } else {
                this.elements.status.textContent = 'Connected 🎤 Listening';
            }
            
            if (this.session.isConnected) {
                requestAnimationFrame(checkLevel);
            }
        };
        
        checkLevel();
        console.log('Audio monitoring started');
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
            // Correct flow: token → new → start
            await this.createSessionToken();
            
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
            
            // Start audio monitoring for voice activity
            this.startAudioMonitoring();
            
            // Now activate AR scene
            this.activateARScene();
            
            console.log('Successfully connected to avatar stream');
            console.log('Avatar ID:', this.config.avatarId);
            console.log('Session Info:', this.session.sessionInfo);
            
        } catch (error) {
            console.error('Connection failed:', error);
            this.updateStatus('Connection failed', 'disconnected');
            this.hideLoading();
            alert(`Connection failed: ${error.message}`);
        }
    }
    
    async createSessionToken() {
        console.log('🔑 Creating session token...');
        const response = await fetch(`${this.config.serverUrl}/v1/streaming.create_token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.config.token
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create session token');
        }
        
        const tokenData = await response.json();
        this.session.sessionToken = tokenData.data.token;
        console.log('✅ Session token created');
    }
    
    async createSession() {
        console.log('📝 Creating session with Bearer token...');
        // Create session first (correct official flow)
        const response = await fetch(`${this.config.serverUrl}/v1/streaming.new`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.session.sessionToken}`
            },
            body: JSON.stringify({
                version: "v2",
                avatar_id: this.config.avatarId,
                voice: {
                    voice_id: "3da51ff105b54d559eda2815af07177a"
                },
                knowledge_base_id: "0091aee50f12487f8467821042177874",
                quality: "high"
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create session');
        }
        
        const sessionData = await response.json();
        this.session.sessionInfo = sessionData.data;
        console.log('Session created successfully!');
        console.log('Avatar ID used:', this.config.avatarId);
        console.log('Session details:', this.session.sessionInfo);
        console.log('Full session response:', sessionData);
        
        // Check if we're getting the right avatar
        if (sessionData.data.avatar_id && sessionData.data.avatar_id !== this.config.avatarId) {
            console.warn('Avatar ID mismatch! Requested:', this.config.avatarId, 'Got:', sessionData.data.avatar_id);
        }
    }
    
    async startStream() {
        console.log('🚀 Starting stream with session ID:', this.session.sessionInfo.session_id);
        console.log('Available session fields:', Object.keys(this.session.sessionInfo));
        
        // Use correct endpoint and parameters based on forum post
        const startParams = {
            session_id: this.session.sessionInfo.session_id
        };
        
        console.log('Start params:', startParams);
        
        // Start the session
        const startResponse = await fetch(`${this.config.serverUrl}/v1/streaming.start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.config.token
            },
            body: JSON.stringify(startParams)
        });
        
        if (!startResponse.ok) {
            console.error('Start response status:', startResponse.status);
            const errorText = await startResponse.text();
            console.error('Start error response:', errorText);
            
            try {
                const error = JSON.parse(errorText);
                throw new Error(error.message || `Failed to start stream: ${startResponse.status}`);
            } catch {
                throw new Error(`Failed to start stream: ${startResponse.status} - ${errorText}`);
            }
        }
        
        console.log('✅ Stream started successfully');
    }
    
    async connectToRoom() {
        // Check if LiveKitClient is available
        if (typeof LiveKitClient === 'undefined') {
            throw new Error('LiveKitClient is not available. Please ensure the LiveKit SDK is loaded.');
        }
        
        console.log('🎧 Connecting to LiveKit room...');
        
        // Create LiveKit room with proper audio configuration
        this.session.room = new LiveKitClient.Room({
            adaptiveStream: true,
            dynacast: true,
            audioCaptureDefaults: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            videoCaptureDefaults: {
                resolution: LiveKitClient.VideoPresets.h720.resolution,
            },
        });
        
        // Create media stream for avatar video with audio
        this.session.mediaStream = new MediaStream();
        
        // Set up event handlers
        this.session.room.on(LiveKitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            console.log('Track subscribed:', track.kind, 'from participant:', participant.identity);
            
            if (track.kind === LiveKitClient.Track.Kind.Video) {
                this.session.mediaStream.addTrack(track.mediaStreamTrack);
                this.elements.avatarVideo.srcObject = this.session.mediaStream;
                // Enable audio output
                this.elements.avatarVideo.muted = false;
                this.elements.avatarVideo.volume = 1.0;
                this.setupChromaKey();
                console.log('Video track connected');
            }
            
            if (track.kind === LiveKitClient.Track.Kind.Audio) {
                // Create separate audio element for avatar speech
                let avatarAudio = document.getElementById('avatar-audio');
                if (!avatarAudio) {
                    avatarAudio = document.createElement('audio');
                    avatarAudio.id = 'avatar-audio';
                    avatarAudio.autoplay = true;
                    avatarAudio.volume = 1.0;
                    document.body.appendChild(avatarAudio);
                }
                
                const audioStream = new MediaStream([track.mediaStreamTrack]);
                avatarAudio.srcObject = audioStream;
                console.log('Audio track connected - you should hear the avatar now');
            }
        });
        
        this.session.room.on(LiveKitClient.RoomEvent.TrackUnsubscribed, (track) => {
            const mediaTrack = track.mediaStreamTrack;
            if (mediaTrack && this.session.mediaStream) {
                this.session.mediaStream.removeTrack(mediaTrack);
            }
        });
        
        this.session.room.on(LiveKitClient.RoomEvent.Connected, () => {
            console.log('Connected to LiveKit room');
            this.session.isStreaming = true;
        });
        
        this.session.room.on(LiveKitClient.RoomEvent.Disconnected, (reason) => {
            console.log('Disconnected from LiveKit room:', reason);
            this.session.isStreaming = false;
        });
        
        // Prepare connection first, then connect
        await this.session.room.prepareConnection(
            this.session.sessionInfo.url,
            this.session.sessionInfo.access_token
        );
        
        await this.session.room.connect(
            this.session.sessionInfo.url,
            this.session.sessionInfo.access_token
        );
        
        // Publish microphone audio so avatar can hear you
        try {
            console.log('🎤 Publishing microphone to LiveKit room...');
            
            // Create and publish local audio track
            const audioTrack = await LiveKitClient.createLocalAudioTrack({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            });
            
            await this.session.room.localParticipant.publishTrack(audioTrack);
            console.log('✅ Microphone published - avatar can now hear you!');
            
            // Store the audio track for later cleanup
            this.localAudioTrack = audioTrack;
            
        } catch (error) {
            console.error('❌ Failed to publish microphone:', error);
            alert('Failed to connect microphone. The avatar may not be able to hear you.');
        }
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
                "x-api-key": this.config.token
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
                console.log('🎤 Speech recognized:', transcript);
                this.elements.messageInput.value = transcript;
                this.updateVoiceStatus('✅ Sending: "' + transcript + '"');
                
                // Small delay for visual feedback, then send
                setTimeout(() => {
                    this.sendMessage();
                    this.updateVoiceStatus('🌊 Message sent, waiting for Doppel to respond...');
                    setTimeout(() => this.updateVoiceStatus(''), 3000);
                }, 500);
            };
            
            this.recognition.onstart = () => {
                console.log('🎤 Speech recognition started');
                this.isListening = true;
                this.elements.voiceInputBtn.textContent = '🛑 Listening...';
                this.elements.voiceInputBtn.style.background = 'linear-gradient(45deg, #ff4444, #ff6666)';
                this.updateVoiceStatus('🎤 Listening... Speak now!');
            };
            
            this.recognition.onend = () => {
                console.log('🎤 Speech recognition ended');
                this.isListening = false;
                this.elements.voiceInputBtn.textContent = '🎤 Press to Speak';
                this.elements.voiceInputBtn.style.background = 'linear-gradient(45deg, #00ffff, #0080ff)';
                this.updateVoiceStatus('');
            };
            
            this.recognition.onerror = (event) => {
                console.error('🎤 Speech recognition error:', event.error);
                this.isListening = false;
                this.elements.voiceInputBtn.textContent = '🎤 Press to Speak';
                this.elements.voiceInputBtn.style.background = 'linear-gradient(45deg, #00ffff, #0080ff)';
                
                if (event.error === 'not-allowed') {
                    this.updateVoiceStatus('❌ Microphone access denied');
                    alert('Microphone access denied. Please allow microphone access and try again.');
                } else if (event.error === 'no-speech') {
                    this.updateVoiceStatus('🤫 No speech detected, try again');
                } else {
                    this.updateVoiceStatus('❌ Voice recognition error');
                }
                
                setTimeout(() => this.updateVoiceStatus(''), 3000);
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
            // Clean up local audio track
            if (this.localAudioTrack) {
                this.localAudioTrack.stop();
                this.localAudioTrack = null;
            }
            
            // Stop microphone stream (if any)
            if (this.microphoneStream) {
                this.microphoneStream.getTracks().forEach(track => track.stop());
                this.microphoneStream = null;
            }
            
            // Clean up avatar audio element
            const avatarAudio = document.getElementById('avatar-audio');
            if (avatarAudio) {
                avatarAudio.pause();
                avatarAudio.srcObject = null;
                avatarAudio.remove();
            }
            
            if (this.session.room) {
                await this.session.room.disconnect();
            }
            
            if (this.session.sessionInfo) {
                await fetch(`${this.config.serverUrl}/v1/realtime.stop`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": this.config.token
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
    
    activateARScene() {
        const arScene = document.getElementById('ar-scene');
        if (arScene) {
            arScene.style.display = 'block';
            
            // Update AR.js to use webcam now that avatar is connected
            arScene.setAttribute('arjs', {
                sourceType: 'webcam',
                debugUIEnabled: false,
                detectionMode: 'mono_and_matrix',
                matrixCodeType: '3x3'
            });
            
            console.log('AR scene activated with camera access');
        }
    }
    
    // Add better cleanup for session management
    setupCleanup() {
        // Auto-cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (this.session.isConnected) {
                // Quick cleanup attempt
                navigator.sendBeacon(`${this.config.serverUrl}/v1/realtime.stop`, 
                    JSON.stringify({
                        session_id: this.session.sessionInfo?.session_id
                    }));
            }
        });
        
        // Cleanup on visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.session.isConnected) {
                this.disconnect();
            }
        });
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