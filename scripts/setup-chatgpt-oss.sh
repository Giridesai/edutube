#!/bin/bash

# ChatGPT OSS 120B Setup Script for EduTube
# This script helps you set up ChatGPT OSS 120B for AI-powered video analysis

echo "🚀 EduTube ChatGPT OSS 120B Setup"
echo "================================="
echo ""

# Check if Ollama is installed
check_ollama() {
    if command -v ollama &> /dev/null; then
        echo "✅ Ollama is installed"
        return 0
    else
        echo "❌ Ollama is not installed"
        return 1
    fi
}

# Install Ollama (macOS)
install_ollama_mac() {
    echo "📦 Installing Ollama for macOS..."
    curl -fsSL https://ollama.ai/install.sh | sh
    echo "✅ Ollama installed successfully"
}

# Pull ChatGPT OSS model
setup_model() {
    echo "🔄 Setting up ChatGPT OSS 120B model..."
    echo "Note: This is a large model and may take time to download"

    # Try to pull chatgpt-oss-120b if available, else fall back to llama3.2
    if ollama pull chatgpt-oss-120b 2>/dev/null; then
        echo "✅ Pulled chatgpt-oss-120b"
    else
        echo "⚠️ chatgpt-oss-120b not available via Ollama. Falling back to llama3.2:latest"
        ollama pull llama3.2:latest
    fi

    echo "✅ Model setup complete"
}

# Create environment file
setup_env() {
    echo "📝 Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        cp .env.example.ai .env
        echo "✅ Environment file created from template"
        echo "📝 Please edit .env file to add your YouTube API key"
    else
        echo "⚠️  .env file already exists - skipping"
    fi
}

# Start Ollama service
start_ollama() {
    echo "🔄 Starting Ollama service..."
    ollama serve &
    sleep 5
    echo "✅ Ollama service started"
}

# Test the setup
test_setup() {
    echo "🧪 Testing ChatGPT OSS setup..."
    
    # Test if Ollama is running
    if curl -s http://localhost:11434/api/tags > /dev/null; then
        echo "✅ Ollama service is running"
    else
        echo "❌ Ollama service is not responding"
        return 1
    fi
    
    # Test model availability
    if ollama list | grep -q "llama3.2"; then
        echo "✅ AI model is available"
    else
        echo "❌ AI model not found"
        return 1
    fi
    
    echo "✅ Setup test completed successfully"
}

# Main setup flow
main() {
    echo "Starting ChatGPT OSS 120B setup for EduTube..."
    echo ""
    
    # Check current directory
    if [ ! -f "package.json" ]; then
        echo "❌ Please run this script from the EduTube project root directory"
        exit 1
    fi
    
    # Check OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "🍎 Detected macOS"
    else
        echo "⚠️  This script is optimized for macOS. Manual setup may be required for other OS."
    fi
    
    # Setup steps
    if ! check_ollama; then
        read -p "Install Ollama? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_ollama_mac
        else
            echo "❌ Ollama is required for ChatGPT OSS. Please install manually."
            exit 1
        fi
    fi
    
    setup_env
    
    read -p "Download and setup AI model? (This may take a while) (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_model
    fi
    
    read -p "Start Ollama service? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_ollama
    fi
    
    echo ""
    echo "🎉 Setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file and add your YouTube API key"
    echo "2. Run 'npm run dev' to start the application"
    echo "3. Test the AI features on the watch page"
    echo ""
    echo "📚 For manual Ollama setup, visit: https://ollama.ai"
    echo "🔧 To use a different AI model, update CHATGPT_OSS_MODEL in .env"
}

# Run main function
main
