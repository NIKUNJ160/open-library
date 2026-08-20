#!/bin/bash

echo "Starting Universal Open Knowledge Search Engine..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH."
    echo "Please install Docker to run the deployment script."
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null && ! docker-compose --version &> /dev/null; then
    echo "Error: Docker Compose is not installed or not in PATH."
    exit 1
fi

# Check for .env file
if [ ! -f .env ]; then
    echo "Warning: .env file not found. Copying .env.example to .env..."
    cp .env.example .env
    echo "Please update the .env file with your specific configuration, especially OPENAI_API_KEY."
fi

# Create frontend directory if it doesn't exist to prevent volume mount errors
if [ ! -d "frontend" ]; then
    echo "Creating empty frontend directory for volume mount..."
    mkdir -p frontend
    echo "<h1>Frontend Placeholder</h1><p>Replace this with your built frontend files.</p>" > frontend/index.html
fi

echo "Building and starting Docker containers..."

# Run docker-compose
if docker compose version &> /dev/null; then
    docker compose up -d --build
else
    docker-compose up -d --build
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================================="
    echo "Deployment Successful!"
    echo "=========================================================="
    echo ""
    echo "Services are now running:"
    echo "🌐 Frontend:       http://localhost:8080"
    echo "🔌 API Health:     http://localhost:3000/api/v1/health"
    echo "📚 API Swagger:    http://localhost:3000/api/docs"
    echo ""
    echo "To view logs, run:"
    if docker compose version &> /dev/null; then
        echo "  docker compose logs -f"
    else
        echo "  docker-compose logs -f"
    fi
    echo "=========================================================="
else
    echo "Error: Failed to start Docker containers."
    exit 1
fi
