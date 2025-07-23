#!/bin/bash

# AR Streaming Avatar - Deployment Script
# This script helps set up and deploy the AR avatar application

set -e

echo "🤖 AR Streaming Avatar - Deployment Script"
echo "==========================================="

# Function to print colored output
print_status() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check for Python 3
    if command -v python3 &> /dev/null; then
        print_success "Python 3 found: $(python3 --version)"
    else
        print_error "Python 3 not found. Please install Python 3."
        exit 1
    fi
    
    # Check for Node.js (optional)
    if command -v node &> /dev/null; then
        print_success "Node.js found: $(node --version)"
        HAS_NODE=true
    else
        print_warning "Node.js not found. Using Python server instead."
        HAS_NODE=false
    fi
    
    # Check for curl
    if command -v curl &> /dev/null; then
        print_success "curl found"
    else
        print_error "curl not found. Please install curl."
        exit 1
    fi
}

# Download required assets
download_assets() {
    print_status "Downloading required assets..."
    
    # Create assets directory if it doesn't exist
    mkdir -p assets
    
    # Download Hiro marker if not exists
    if [ ! -f "assets/hiro-marker.jpg" ]; then
        print_status "Downloading Hiro AR marker..."
        curl -o assets/hiro-marker.jpg https://jeromeetienne.github.io/AR.js/data/images/HIRO.jpg
        print_success "Hiro marker downloaded"
    else
        print_success "Hiro marker already exists"
    fi
}

# Generate SSL certificates for HTTPS (needed for camera access)
generate_ssl_certs() {
    print_status "Checking for SSL certificates..."
    
    if [ ! -f "cert.pem" ] || [ ! -f "key.pem" ]; then
        print_status "Generating self-signed SSL certificates for HTTPS..."
        
        # Check if openssl is available
        if command -v openssl &> /dev/null; then
            openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes \
                -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
            print_success "SSL certificates generated"
        else
            print_warning "OpenSSL not found. Cannot generate SSL certificates."
            print_warning "You may need to use a different HTTPS solution."
        fi
    else
        print_success "SSL certificates already exist"
    fi
}

# Setup development server
setup_server() {
    print_status "Setting up development server..."
    
    # Check if we're in the right directory
    if [ ! -f "index.html" ]; then
        print_error "index.html not found. Please run this script from the project directory."
        exit 1
    fi
    
    print_success "Project files found"
}

# Start the server
start_server() {
    local server_type=$1
    local port=${2:-8000}
    
    print_status "Starting $server_type server on port $port..."
    
    case $server_type in
        "python")
            print_status "Starting Python HTTP server..."
            print_warning "Note: This is HTTP only. For camera access, you may need HTTPS."
            python3 -m http.server $port
            ;;
        "python-ssl")
            if [ -f "cert.pem" ] && [ -f "key.pem" ]; then
                print_status "Starting Python HTTPS server..."
                python3 -c "
import http.server
import ssl
import socketserver

PORT = $port
Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(('', PORT), Handler) as httpd:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain('cert.pem', 'key.pem')
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    print(f'HTTPS Server running at https://localhost:{PORT}/')
    httpd.serve_forever()
"
            else
                print_error "SSL certificates not found. Run with --generate-ssl first."
                exit 1
            fi
            ;;
        "node")
            if [ "$HAS_NODE" = true ]; then
                print_status "Starting Node.js serve..."
                if [ -f "cert.pem" ] && [ -f "key.pem" ]; then
                    npx serve . -p $port --ssl-cert cert.pem --ssl-key key.pem
                else
                    npx serve . -p $port
                fi
            else
                print_error "Node.js not available"
                exit 1
            fi
            ;;
        *)
            print_error "Unknown server type: $server_type"
            exit 1
            ;;
    esac
}

# Display usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --check-deps        Check dependencies only"
    echo "  --download-assets   Download required assets only"
    echo "  --generate-ssl      Generate SSL certificates only"
    echo "  --server TYPE       Start server (python|python-ssl|node)"
    echo "  --port PORT         Server port (default: 8000)"
    echo "  --test              Run compatibility test first"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Full setup and start Python server"
    echo "  $0 --server python-ssl      # Start HTTPS Python server"
    echo "  $0 --server node --port 3000 # Start Node.js server on port 3000"
    echo "  $0 --test                   # Open compatibility test"
}

# Display post-deployment instructions
show_instructions() {
    local port=${1:-8000}
    local protocol=${2:-http}
    
    print_success "🚀 AR Avatar is ready!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. 📱 Open Safari on your iOS device"
    echo "2. 🌐 Navigate to ${protocol}://$(ipconfig getifaddr en0 2>/dev/null || hostname):${port}"
    echo "3. 🔧 Run compatibility test: ${protocol}://$(ipconfig getifaddr en0 2>/dev/null || hostname):${port}/test.html"
    echo "4. 🖨️  Print the Hiro marker: assets/hiro-marker.jpg"
    echo "5. 🎭 Get your HeyGen API token from https://heygen.com"
    echo "6. 🚀 Launch the avatar: ${protocol}://$(ipconfig getifaddr en0 2>/dev/null || hostname):${port}/index.html"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "- Camera access requires HTTPS in production"
    echo "- Ensure good lighting for AR marker detection"
    echo "- Use latest iOS/Safari version for best compatibility"
    echo ""
    print_warning "Press Ctrl+C to stop the server"
}

# Main execution
main() {
    case "${1:-setup}" in
        "--help")
            show_usage
            exit 0
            ;;
        "--check-deps")
            check_dependencies
            exit 0
            ;;
        "--download-assets")
            download_assets
            exit 0
            ;;
        "--generate-ssl")
            generate_ssl_certs
            exit 0
            ;;
        "--server")
            shift
            server_type=${1:-python}
            port=${3:-8000}
            if [ "$2" = "--port" ]; then
                port=${3:-8000}
            fi
            start_server $server_type $port
            ;;
        "--test")
            if command -v open &> /dev/null; then
                open "http://localhost:8000/test.html"
            elif command -v xdg-open &> /dev/null; then
                xdg-open "http://localhost:8000/test.html"
            else
                print_status "Please open http://localhost:8000/test.html in your browser"
            fi
            ;;
        "setup"|"")
            # Full setup
            check_dependencies
            download_assets
            setup_server
            generate_ssl_certs
            
            # Determine best server option
            if [ -f "cert.pem" ] && [ -f "key.pem" ]; then
                show_instructions 8000 "https"
                start_server "python-ssl" 8000
            else
                show_instructions 8000 "http"
                start_server "python" 8000
            fi
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Trap Ctrl+C to show exit message
trap 'echo ""; print_success "Server stopped. Thanks for using AR Avatar!"; exit 0' INT

# Run main function with all arguments
main "$@" 