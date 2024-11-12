#!/bin/bash

# ===============================
# Script: setup_environment.sh
# Description: Sets up the development environment with Homebrew/Chocolatey, Python, virtualenv, Docker, and dependencies.
# ===============================

# ===============================
# Configuration Variables
# ===============================
PYTHON_VERSION="3.12"

# ===============================
# Color and Emoji Definitions
# ===============================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SUCCESS_EMOJI="✅"
INFO_EMOJI="ℹ️"
WARNING_EMOJI="⚠️"
ERROR_EMOJI="❌"
DOCKER_EMOJI="🐳"
PYTHON_EMOJI="🐍"
VENV_EMOJI="🔧"
HOME_EMOJI="🏠"
SETUP_EMOJI="🚀"

# ===============================
# Utility Functions
# ===============================

# Function to log messages with emoji and color
log() {
    local color=$1
    local emoji=$2
    local message=$3
    echo -e "${color}${emoji} ${message}${NC}"
}

# Function to display a spinner for long-running tasks
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while ps a | awk '{print $1}' | grep -q "$pid"; do
        local temp=${spinstr#?}
        printf " [%c] " "$spinstr"
        spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Function to exit with error
error_exit() {
    log $RED "$ERROR_EMOJI $1"
    exit 1
}

# ===============================
# System Compatibility and Package Managers
# ===============================

check_system() {
    log $INFO_EMOJI $BLUE "Checking system compatibility..."

    OS_TYPE=""
    PACKAGE_MANAGER=""

    case "$OSTYPE" in
        darwin*)  
            OS_TYPE="macOS"
            PACKAGE_MANAGER="brew"
            ;;
        linux-gnu*)
            OS_TYPE="Linux"
            # Detect Linux distribution
            if [ -x "$(command -v apt)" ]; then
                PACKAGE_MANAGER="apt"
            elif [ -x "$(command -v dnf)" ]; then
                PACKAGE_MANAGER="dnf"
            elif [ -x "$(command -v brew)" ]; then
                PACKAGE_MANAGER="brew"
            else
                error_exit "Unsupported Linux distribution. Please install Homebrew or use a supported package manager."
            fi
            ;;
        msys*|cygwin*|win32*)
            OS_TYPE="Windows"
            PACKAGE_MANAGER="choco"
            ;;
        *)
            error_exit "Unsupported OS: $OSTYPE"
            ;;
    esac

    log $SUCCESS_EMOJI $GREEN "Detected OS: $OS_TYPE with package manager: $PACKAGE_MANAGER."
}

# Function to install Homebrew (for Linux if not installed)
install_homebrew() {
    if [ "$PACKAGE_MANAGER" == "brew" ]; then
        if ! command -v brew &> /dev/null; then
            log $WARNING_EMOJI $YELLOW "Homebrew not found. Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" & 
            spinner $!
            echo
            # Add Homebrew to PATH
            if [ "$OS_TYPE" == "macOS" ]; then
                echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.bash_profile
                eval "$(/opt/homebrew/bin/brew shellenv)"
            else
                echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
                eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
            fi

            if command -v brew &> /dev/null; then
                log $SUCCESS_EMOJI $GREEN "Homebrew installed successfully."
            else
                error_exit "Failed to install Homebrew."
            fi
        else
            log $SUCCESS_EMOJI $GREEN "Homebrew is already installed."
        fi
    fi
}

# Function to install Chocolatey (for Windows if not installed)
install_chocolatey() {
    if [ "$PACKAGE_MANAGER" == "choco" ]; then
        if ! command -v choco &> /dev/null; then
            log $WARNING_EMOJI $YELLOW "Chocolatey not found. Installing Chocolatey..."
            # Note: Requires administrator privileges
            SETUP_CMD='Set-ExecutionPolicy Bypass -Scope Process -Force; \
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; \
iex ((New-Object System.Net.WebClient).DownloadString("https://chocolatey.org/install.ps1"))'

            # Execute the PowerShell command
            powershell.exe -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "$SETUP_CMD" & 
            spinner $!
            echo

            if command -v choco &> /dev/null; then
                log $SUCCESS_EMOJI $GREEN "Chocolatey installed successfully."
            else
                error_exit "Failed to install Chocolatey."
            fi
        else
            log $SUCCESS_EMOJI $GREEN "Chocolatey is already installed."
        fi
    fi
}

# Function to install packages using the detected package manager
install_package() {
    local package=$1
    local install_cmd

    case "$PACKAGE_MANAGER" in
        brew)
            install_cmd="brew install $package"
            ;;
        apt)
            install_cmd="sudo apt-get update && sudo apt-get install -y $package"
            ;;
        dnf)
            install_cmd="sudo dnf install -y $package"
            ;;
        choco)
            install_cmd="choco install $package -y"
            ;;
        *)
            error_exit "Unsupported package manager: $PACKAGE_MANAGER"
            ;;
    esac

    log $INFO_EMOJI $BLUE "Installing $package..."
    $install_cmd & 
    spinner $!
    echo

    if command -v $package &> /dev/null || [ "$PACKAGE_MANAGER" == "choco" -a "$package" == "docker-desktop" ]; then
        # Special case for docker-desktop which might not be in PATH
        log $SUCCESS_EMOJI $GREEN "$package installed successfully."
    else
        error_exit "Failed to install $package."
    fi
}

# ===============================
# Docker Installation and Setup
# ===============================

install_docker() {
    log $INFO_EMOJI $DOCKER_EMOJI "Checking Docker installation..."

    if ! command -v docker &> /dev/null; then
        log $WARNING_EMOJI $YELLOW "Docker not found. Installing Docker..."

        case "$OS_TYPE" in
            macOS)
                install_package "docker"
                log $INFO_EMOJI $DOCKER_EMOJI "Launching Docker Desktop..."
                open -a Docker || error_exit "Failed to launch Docker Desktop."
                ;;
            Linux)
                if [ "$PACKAGE_MANAGER" == "apt" ]; then
                    sudo apt-get update
                    sudo apt-get install -y ca-certificates curl gnupg lsb-release
                    sudo mkdir -p /etc/apt/keyrings
                    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
                    echo \
                      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
                      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
                    sudo apt-get update
                    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
                elif [ "$PACKAGE_MANAGER" == "dnf" ]; then
                    sudo dnf -y install dnf-plugins-core
                    sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
                    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
                    sudo systemctl start docker
                    sudo systemctl enable docker
                elif [ "$PACKAGE_MANAGER" == "brew" ]; then
                    install_package "docker"
                    log $INFO_EMOJI $DOCKER_EMOJI "Launching Docker..."
                    open /Applications/Docker.app || error_exit "Failed to launch Docker."
                fi
                ;;
            Windows)
                install_package "docker-desktop"
                log $INFO_EMOJI $DOCKER_EMOJI "Launching Docker Desktop..."
                start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" || error_exit "Failed to launch Docker Desktop."
                ;;
            *)
                error_exit "Unsupported OS for Docker installation."
                ;;
        esac

        # Wait for Docker daemon to start
        log $INFO_EMOJI $DOCKER_EMOJI "Waiting for Docker daemon to start..."
        # Give Docker some time to initialize
        sleep 10
        while ! docker info > /dev/null 2>&1; do
            sleep 2
        done
        log $SUCCESS_EMOJI $GREEN "Docker is installed and the daemon is running."
    else
        log $SUCCESS_EMOJI $GREEN "Docker is already installed."
    fi
}

# ===============================
# Python and Virtual Environment Setup
# ===============================

install_python() {
    log $INFO_EMOJI $PYTHON_EMOJI "Installing Python $PYTHON_VERSION..."

    if [ "$PACKAGE_MANAGER" == "brew" ] || [ "$PACKAGE_MANAGER" == "choco" ]; then
        install_package "python@$PYTHON_VERSION"
    elif [ "$PACKAGE_MANAGER" == "apt" ] || [ "$PACKAGE_MANAGER" == "dnf" ]; then
        install_package "python${PYTHON_VERSION}"
    fi

    # Verify Python installation
    PYTHON_EXECUTABLE="python${PYTHON_VERSION}"
    if command -v $PYTHON_EXECUTABLE &> /dev/null; then
        log $SUCCESS_EMOJI $GREEN "Python $PYTHON_VERSION installed successfully."
    else
        error_exit "Python $PYTHON_VERSION installation verification failed."
    fi
}

handle_virtualenv() {
    local VENV_DIR="venv"

    log $INFO_EMOJI $VENV_EMOJI "Setting up virtual environment..."

    # Check if virtualenv is installed
    if ! command -v virtualenv &> /dev/null; then
        log $INFO_EMOJI $YELLOW "virtualenv not found. Installing virtualenv..."
        pip install --upgrade virtualenv || error_exit "Failed to install virtualenv."
    fi

    # Remove existing virtual environment if necessary
    if [ -d "$VENV_DIR" ]; then
        log $WARNING_EMOJI $YELLOW "Existing virtual environment detected. Removing..."
        rm -rf "$VENV_DIR" || error_exit "Failed to remove existing virtual environment."
    fi

    # Create a new virtual environment
    log $INFO_EMOJI $VENV_EMOJI "Creating a new virtual environment in '$VENV_DIR'..."
    $PYTHON_EXECUTABLE -m venv "$VENV_DIR" || error_exit "Failed to create virtual environment."

    if [ -d "$VENV_DIR" ]; then
        log $SUCCESS_EMOJI $GREEN "Virtual environment created successfully."
    else
        error_exit "Virtual environment directory not found after creation."
    fi

    # Activate the virtual environment
    log $INFO_EMOJI $VENV_EMOJI "Activating the virtual environment..."
    # shellcheck disable=SC1091
    source "$VENV_DIR/bin/activate" || error_exit "Failed to activate virtual environment."

    if [ "$VIRTUAL_ENV" != "" ]; then
        log $SUCCESS_EMOJI $GREEN "Virtual environment activated."
    else
        error_exit "Virtual environment activation failed."
    fi
}

# ===============================
# Install Python Dependencies
# ===============================

install_requirements() {
    if [ -f "requirements.txt" ]; then
        log $INFO_EMOJI $SETUP_EMOJI "Installing Python packages from requirements.txt..."
        pip install -r requirements.txt & 
        spinner $!
        echo

        if [ $? -eq 0 ]; then
            log $SUCCESS_EMOJI $GREEN "All packages installed successfully."
        else
            error_exit "Failed to install some packages from requirements.txt."
        fi
    else
        log $WARNING_EMOJI $YELLOW "requirements.txt not found. Skipping package installation."
    fi
}

# ===============================
# Main Execution Flow
# ===============================

main() {
    log $INFO_EMOJI $HOME_EMOJI "Starting environment setup..."

    check_system
    if [ "$PACKAGE_MANAGER" == "brew" ]; then
        install_homebrew
    elif [ "$PACKAGE_MANAGER" == "choco" ]; then
        install_chocolatey
    fi
    install_docker
    install_python
    handle_virtualenv
    install_requirements

    log $SUCCESS_EMOJI $GREEN "🛠️ Environment setup completed successfully! 🎉"
    log $INFO_EMOJI "To activate your virtual environment in future sessions, run: source venv/bin/activate"
}

# Run the main function
main
