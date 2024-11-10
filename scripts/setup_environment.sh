#!/bin/bash

# ===============================
# Script: setup_environment.sh
# Description: Sets up the development environment with Homebrew, Python 3.12, virtualenv, and dependencies.
# ===============================

# Color Definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${1}${2}${NC}"
}

# Function to exit with error
error_exit() {
    log $RED "$1"
    exit 1
}

# 1. Check System Compatibility with Homebrew
check_system() {
    log $BLUE "Checking system compatibility with Homebrew..."

    if [[ "$OSTYPE" != "darwin"* && "$OSTYPE" != "linux-gnu"* ]]; then
        error_exit "Unsupported OS. Homebrew is supported on macOS and Linux."
    else
        log $GREEN "System is compatible with Homebrew."
    fi
}

# 2. Install Homebrew if not installed
install_homebrew() {
    if ! command -v brew &> /dev/null
    then
        log $YELLOW "Homebrew not found. Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || error_exit "Failed to install Homebrew."
        
        # Add Homebrew to PATH
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.bash_profile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        else
            echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
            eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
        fi
        
        if command -v brew &> /dev/null
        then
            log $GREEN "Homebrew installed successfully."
        else
            error_exit "Failed to install Homebrew."
        fi
    else
        log $GREEN "Homebrew is already installed."
    fi
}

# 3. Install Python 3.12 via Homebrew
install_python() {
    log $BLUE "Installing Python 3.12 via Homebrew..."
    HOMEBREW_NO_AUTO_UPDATE=1 brew install python@3.12 || error_exit "Failed to install Python 3.12."
    
    if command -v python3.12 &> /dev/null
    then
        log $GREEN "Python 3.12 installed successfully."
    else
        error_exit "Python 3.12 installation verification failed."
    fi
}

# 4. Handle Virtual Environment
handle_virtualenv() {
    VENV_DIR="venv"
    REQUIRED_PYTHON="3.12"

    if [[ -n "$VIRTUAL_ENV" ]]; then
        log $BLUE "Detected existing virtual environment: $VIRTUAL_ENV"
        CURRENT_PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)

        if [[ "$CURRENT_PYTHON_VERSION" == "$REQUIRED_PYTHON" ]]; then
            log $GREEN "Virtual environment is using Python $REQUIRED_PYTHON. Skipping creation."
            return
        else
            log $YELLOW "Virtual environment is using Python $CURRENT_PYTHON_VERSION, which is not $REQUIRED_PYTHON."
            log $BLUE "Deactivating and removing existing virtual environment..."
            deactivate
            rm -rf "$VENV_DIR" || error_exit "Failed to remove existing virtual environment."
        fi
    fi

    if [ -d "$VENV_DIR" ]; then
        log $BLUE "Virtual environment directory '$VENV_DIR' exists. Checking Python version..."
        # Activate to check python version
        source "$VENV_DIR/bin/activate"
        CURRENT_PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
        if [[ "$CURRENT_PYTHON_VERSION" == "$REQUIRED_PYTHON" ]]; then
            log $GREEN "Existing virtual environment is using Python $REQUIRED_PYTHON. Skipping creation."
            return
        else
            log $YELLOW "Existing virtual environment is using Python $CURRENT_PYTHON_VERSION, which is not $REQUIRED_PYTHON."
            log $BLUE "Deactivating and removing existing virtual environment..."
            deactivate
            rm -rf "$VENV_DIR" || error_exit "Failed to remove existing virtual environment."
        fi
    fi

    # Create new virtual environment
    log $BLUE "Creating a virtual environment named '$VENV_DIR' with Python $REQUIRED_PYTHON..."
    python3.12 -m venv "$VENV_DIR" || error_exit "Failed to create virtual environment."
    
    if [ -d "$VENV_DIR" ]; then
        log $GREEN "Virtual environment created successfully."
    else
        error_exit "Virtual environment directory not found after creation."
    fi

    # Activate the virtual environment
    log $BLUE "Activating the virtual environment..."
    source "$VENV_DIR/bin/activate" || error_exit "Failed to activate virtual environment."
    
    if [ "$VIRTUAL_ENV" != "" ]; then
        log $GREEN "Virtual environment activated."
    else
        error_exit "Virtual environment activation failed."
    fi
}

# 5. Install setuptools
install_setuptools() {
    log $BLUE "Installing/upgrading setuptools..."
    pip install --upgrade pip setuptools || error_exit "Failed to install/setuptools."
    
    if pip show setuptools &> /dev/null
    then
        log $GREEN "setuptools is installed successfully."
    else
        error_exit "setuptools installation verification failed."
    fi
}

# 6. Install Requirements from requirements.txt
install_requirements() {
    if [ -f "requirements.txt" ]; then
        log $BLUE "Installing Python packages from requirements.txt..."
        source venv/bin/activate && pip install -r requirements.txt || error_exit "Failed to install some packages."
        
        log $GREEN "All packages installed successfully."
    else
        log $RED "requirements.txt not found. Skipping package installation."
    fi
}

# Main Execution Flow
main() {
    check_system
    install_homebrew
    install_python
    handle_virtualenv
    install_requirements

    log $GREEN "Environment setup completed successfully!"
}

# Run the main function
main
