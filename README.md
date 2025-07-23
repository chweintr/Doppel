# AR Streaming Avatar - Caleb Weintraub

An interactive, real-time streaming AI avatar in Augmented Reality, powered by HeyGen's Streaming API and AR.js. Experience conversations with Caleb's AI persona through your iOS/iPad web browser with holographic visual effects.

## 🚀 Quick Start

1. **Get HeyGen API Access**
   - Sign up at [HeyGen.com](https://heygen.com)
   - Obtain your API token from the developer console
   - Ensure you have access to the Streaming API

2. **Print AR Marker**
   - Download and print the [Hiro marker](https://jeromeetienne.github.io/AR.js/data/images/HIRO.jpg)
   - Ensure high contrast and flat surface for best tracking

3. **Open in iOS Safari**
   - Serve files via HTTP/HTTPS (required for camera access)
   - Navigate to `index.html` in Safari on iOS/iPad
   - Allow camera permissions when prompted

4. **Connect Avatar**
   - Enter your HeyGen API token
   - Click "Connect Avatar"
   - Point camera at printed Hiro marker
   - Start chatting with the holographic avatar!

## 🎯 Features

### Core Functionality
- **Real-time Avatar Streaming**: Low-latency video streaming via WebRTC
- **AR Integration**: Marker-based AR using AR.js for iOS/iPad Safari
- **Interactive Chat**: Text and voice input with conversational AI
- **Chroma Key Processing**: Transparent background for holographic effect
- **Performance Monitoring**: FPS and connection quality tracking

### Visual Effects
- **Holographic Appearance**: CSS blend modes and animations
- **Floating Kiosk Design**: 3D platform with glowing accents
- **Interference Patterns**: Subtle scan lines and visual distortion
- **Glow Effects**: Dynamic lighting and opacity animations
- **Responsive UI**: Touch-friendly controls optimized for mobile

### User Interactions
- **Voice Recognition**: Speech-to-text input (Safari compatible)
- **Quick Prompts**: Pre-defined conversation starters
- **Touch Interactions**: Tap avatar for greetings
- **Real-time Chat**: Low-latency text messaging

## 🛠 Technical Implementation

### Architecture
```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   iOS Safari    │◄──►│  AR.js +     │◄──►│   HeyGen    │
│   (WebRTC)      │    │  A-Frame     │    │ Streaming   │
└─────────────────┘    └──────────────┘    └─────────────┘
        ▲                       ▲                   ▲
        │                       │                   │
        ▼                       ▼                   ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│  Canvas Chroma  │    │ Holographic  │    │   LiveKit   │
│  Key Processing │    │   Shaders    │    │   WebRTC    │
└─────────────────┘    └──────────────┘    └─────────────┘
```

### Key Technologies
- **HeyGen Streaming API**: Real-time avatar generation and streaming
- **LiveKit**: WebRTC client for low-latency media streaming
- **AR.js**: Web-based AR framework for marker tracking
- **A-Frame**: Declarative 3D/AR scene framework
- **Canvas API**: Real-time chroma key video processing
- **Web Speech API**: Voice recognition for natural interaction

### Avatar Processing Pipeline
1. **Stream Capture**: Receive video stream from HeyGen via WebRTC
2. **Chroma Key**: Remove green background using canvas processing
3. **Holographic Effects**: Apply CSS blend modes and animations
4. **AR Rendering**: Display processed video on 3D plane in AR space
5. **Interaction Handling**: Process user input and send to HeyGen API

## 📱 iOS/iPad Compatibility

### Supported Features
- ✅ Camera access and AR tracking
- ✅ WebRTC video streaming
- ✅ Canvas-based video processing
- ✅ CSS blend modes and animations
- ✅ Touch interactions and gestures
- ✅ Web Speech API (voice input)
- ✅ LocalStorage for settings

### Requirements
- iOS 14.3+ / iPadOS 14.3+
- Safari browser (required for AR.js)
- Stable internet connection (for streaming)
- Well-lit environment (for marker tracking)

### Performance Optimization
- 30 FPS chroma key processing
- Adaptive quality based on device performance
- Efficient memory management for continuous streaming
- Background processing minimization

## 🎨 Visual Design

### Holographic Effects
The avatar uses multiple layered visual effects to create a convincing holographic appearance:

1. **Specular Layer**: Color-dodge blend mode with gradient animation
2. **Interference Layer**: Repeating scan lines with horizontal scroll
3. **Glow Layer**: Radial gradient with pulsing opacity
4. **Floating Animation**: Subtle vertical movement and scale effects

### CSS Blend Modes
```css
.specular-layer {
    mix-blend-mode: color-dodge;
    background-image: linear-gradient(180deg, 
        transparent 20%, 
        rgba(60, 94, 109, 0.3) 35%, 
        rgba(244, 49, 14, 0.2) 50%,
        rgba(245, 131, 8, 0.3) 80%, 
        transparent
    );
}
```

## 🔧 Configuration

### Environment Variables
```javascript
const config = {
    serverUrl: "https://api.heygen.com",
    avatarId: "c928ca11c4c54082a66f6693ec4b1b09", // Caleb's avatar
    quality: "high",
    background: "#00FF00" // Green screen for chroma key
};
```

### Chroma Key Sensitivity
Adjust green screen detection thresholds in `avatar-app.js`:
```javascript
// More sensitive detection
if (g > 80 && g > r + 30 && g > b + 30) {
    data[i + 3] = 0; // Make transparent
}
```

## 🚀 Deployment Options

### Local Development
```bash
# Simple Python server
python3 -m http.server 8000

# Node.js serve
npx serve .

# PHP built-in server
php -S localhost:8000
```

### Cloud Hosting
- **Netlify**: Drag-and-drop deployment with HTTPS
- **Vercel**: Git-based deployment with global CDN
- **GitHub Pages**: Free hosting for public repositories
- **Firebase Hosting**: Google Cloud with custom domains

### Production Considerations
- HTTPS required for camera access
- CORS headers for HeyGen API calls
- CDN for optimal loading times
- Error handling and fallbacks

## 🎤 Voice Interaction

The avatar supports natural voice conversations using the Web Speech API:

1. Click "🎤 Voice Input" to start listening
2. Speak your question or comment
3. Speech is converted to text automatically
4. Message is sent to avatar for response
5. Avatar responds with voice and visual animation

### Voice Recognition Setup
```javascript
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'en-US';
```

## 🎭 Avatar Personality

Caleb's AI avatar is designed with:
- **Humorous and Irreverent**: Witty responses and playful interactions
- **Deep Knowledge**: Expertise in AI, creativity, philosophy, and contemporary art
- **Human-Computer Interaction**: Insights on technology and human experience
- **Conversational Style**: Natural, engaging dialogue patterns

### Example Conversation Starters
- "Tell me about the intersection of AI and contemporary art"
- "What are your thoughts on human-computer interaction?"
- "Share a philosophical insight about creativity"
- "How do you see the future of AI in artistic expression?"

## 🔧 Troubleshooting

### Common Issues

**Camera Access Denied**
- Ensure HTTPS connection
- Check Safari permissions in Settings
- Restart browser if permissions cached

**AR Marker Not Detected**
- Print marker with high contrast
- Ensure flat, well-lit surface
- Check marker orientation and distance

**Avatar Not Loading**
- Verify HeyGen API token
- Check network connection
- Monitor browser console for errors

**Poor Performance**
- Close other browser tabs
- Ensure good lighting for AR tracking
- Check device temperature (avoid overheating)

### Debug Mode
Enable debug logging by adding to URL:
```
?debug=true
```

## 🏗 Development

### Project Structure
```
├── index.html          # Main application file
├── avatar-app.js       # Core application logic
├── README.md          # Documentation
├── package.json       # Dependencies
└── assets/
    └── hiro-marker.jpg # AR marker image
```

### Building Custom Avatars
To use different HeyGen avatars, update the `avatarId` in configuration:
```javascript
avatarId: "your-avatar-id-here"
```

### Extending Functionality
The modular architecture allows easy extension:
- Custom A-Frame components for new visual effects
- Additional input methods (keyboard, gestures)
- Multi-language support
- Avatar switching capabilities

## 📄 License

This project is provided as-is for educational and demonstration purposes. HeyGen API usage subject to their terms of service.

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Enhanced visual effects and shaders
- Multi-marker support for larger AR scenes
- Voice synthesis customization
- Performance optimizations
- Additional platform support

## 📞 Support

For technical issues or questions:
- Check browser console for error messages
- Verify HeyGen API connectivity
- Test with different lighting conditions
- Ensure latest iOS/Safari version

---

**Ready to experience the future of conversational AI in AR? Set up your HeyGen token and start chatting with Caleb's holographic avatar!** 🚀✨ 