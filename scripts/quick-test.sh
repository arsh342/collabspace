#!/bin/bash

# Quick SSL Testing Script for CollabSpace
# Usage: ./scripts/quick-test.sh [http|https|both|status]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ports
HTTP_PORT=${HTTP_PORT:-3000}
HTTPS_PORT=${HTTPS_PORT:-3443}

# Helper functions
print_header() {
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Check if port is in use
check_port() {
    local port=$1
    local protocol=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_success "$protocol server running on port $port"
        return 0
    else
        print_error "$protocol server not running on port $port"
        return 1
    fi
}

# Test HTTP connection
test_http_connection() {
    local port=$1
    
    if curl -s -f "http://localhost:$port" >/dev/null 2>&1; then
        print_success "HTTP connection successful"
        return 0
    else
        print_error "HTTP connection failed"
        return 1
    fi
}

# Test HTTPS connection
test_https_connection() {
    local port=$1
    
    if curl -s -f -k "https://localhost:$port" >/dev/null 2>&1; then
        print_success "HTTPS connection successful"
        return 0
    else
        print_error "HTTPS connection failed"
        return 1
    fi
}

# Check SSL certificates
check_ssl_certs() {
    if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
        print_success "SSL certificates found"
        return 0
    else
        print_error "SSL certificates missing"
        return 1
    fi
}

# Test HTTP mode
test_http() {
    print_header "🔓 Testing HTTP Mode"
    
    echo -e "${CYAN}📡 Checking HTTP server...${NC}"
    if check_port $HTTP_PORT "HTTP"; then
        echo -e "${CYAN}🔗 Testing connection...${NC}"
        if test_http_connection $HTTP_PORT; then
            echo
            print_success "HTTP mode is working correctly!"
            print_info "Access: http://localhost:$HTTP_PORT"
        fi
    else
        echo
        print_warning "HTTP server not running"
        echo -e "${YELLOW}🚀 Start with: npm run dev${NC}"
    fi
}

# Test HTTPS mode
test_https() {
    print_header "🔒 Testing HTTPS Mode"
    
    echo -e "${CYAN}🔍 Checking SSL certificates...${NC}"
    if check_ssl_certs; then
        echo -e "${CYAN}📡 Checking HTTPS server...${NC}"
        if check_port $HTTPS_PORT "HTTPS"; then
            echo -e "${CYAN}🔗 Testing secure connection...${NC}"
            if test_https_connection $HTTPS_PORT; then
                echo
                print_success "HTTPS mode is working correctly!"
                print_info "Access: https://localhost:$HTTPS_PORT"
                print_warning "Browser will show security warning for self-signed cert"
            fi
        else
            echo
            print_warning "HTTPS server not running"
            echo -e "${YELLOW}🚀 Start with: USE_HTTPS=true npm run dev${NC}"
        fi
    else
        echo
        print_warning "SSL certificates missing"
        echo -e "${YELLOW}🔧 Generate with: npm run ssl:generate${NC}"
    fi
}

# Test both modes
test_both() {
    test_http
    echo
    test_https
    
    echo
    print_header "📋 Summary"
    
    # HTTP status
    if check_port $HTTP_PORT "HTTP" >/dev/null 2>&1; then
        echo -e "${GREEN}🔓 HTTP:  ✅ Running on http://localhost:$HTTP_PORT${NC}"
    else
        echo -e "${RED}🔓 HTTP:  ❌ Not running${NC}"
    fi
    
    # HTTPS status
    if check_ssl_certs >/dev/null 2>&1 && check_port $HTTPS_PORT "HTTPS" >/dev/null 2>&1; then
        echo -e "${GREEN}🔒 HTTPS: ✅ Running on https://localhost:$HTTPS_PORT${NC}"
    else
        echo -e "${RED}🔒 HTTPS: ❌ Not running or certificates missing${NC}"
    fi
}

# Show status
show_status() {
    print_header "📊 CollabSpace SSL Status"
    
    # Check SSL certificates
    echo -e "${CYAN}🔍 SSL Certificates:${NC}"
    if [ -f "ssl/cert.pem" ]; then
        print_success "Certificate: ssl/cert.pem"
    else
        print_error "Certificate: ssl/cert.pem (missing)"
    fi
    
    if [ -f "ssl/key.pem" ]; then
        print_success "Private Key: ssl/key.pem"
    else
        print_error "Private Key: ssl/key.pem (missing)"
    fi
    
    echo
    echo -e "${CYAN}📡 Server Status:${NC}"
    
    # Check HTTP server
    if check_port $HTTP_PORT "HTTP" >/dev/null 2>&1; then
        print_success "HTTP server: Running on port $HTTP_PORT"
    else
        print_error "HTTP server: Not running on port $HTTP_PORT"
    fi
    
    # Check HTTPS server
    if check_port $HTTPS_PORT "HTTPS" >/dev/null 2>&1; then
        print_success "HTTPS server: Running on port $HTTPS_PORT"
    else
        print_error "HTTPS server: Not running on port $HTTPS_PORT"
    fi
    
    echo
    echo -e "${CYAN}🌐 Access URLs:${NC}"
    echo -e "   HTTP:  http://localhost:$HTTP_PORT"
    echo -e "   HTTPS: https://localhost:$HTTPS_PORT"
}

# Show help
show_help() {
    print_header "🔐 CollabSpace Quick SSL Testing"
    
    echo "Usage: $0 [command]"
    echo
    echo "Commands:"
    echo "  http     Test HTTP mode (port $HTTP_PORT)"
    echo "  https    Test HTTPS mode (port $HTTPS_PORT)"
    echo "  both     Test both HTTP and HTTPS modes"
    echo "  status   Show current status"
    echo "  help     Show this help message"
    echo
    echo "Quick Start:"
    echo "  $0 http          # Test HTTP"
    echo "  $0 https         # Test HTTPS"
    echo "  $0 both          # Test both modes"
    echo
    echo "NPM Scripts:"
    echo "  npm run test:http     # Test HTTP mode"
    echo "  npm run test:https    # Test HTTPS mode"
    echo "  npm run quick:http    # Quick HTTP start"
    echo "  npm run quick:https   # Quick HTTPS start"
    echo
    echo "SSL Management:"
    echo "  npm run ssl:generate  # Generate SSL certificates"
    echo "  npm run ssl:status    # Check SSL status"
}

# Main execution
main() {
    local command=${1:-help}
    
    case $command in
        "http")
            test_http
            ;;
        "https")
            test_https
            ;;
        "both")
            test_both
            ;;
        "status")
            show_status
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $command${NC}"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
