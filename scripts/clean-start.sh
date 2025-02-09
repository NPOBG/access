#!/bin/bash

# Clean Start Script for Linux/Unix

echo -e "\e[32mDoor Access System - Clean Start Script\e[0m"
echo -e "\e[32m======================================\e[0m"

# 1. Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "\e[31mPlease run this script with sudo\e[0m"
    exit
fi

# 2. Kill processes using required ports
echo -e "\n\e[33mChecking for processes using required ports...\e[0m"
ports=(8000 27017)
for port in "${ports[@]}"; do
    pid=$(lsof -ti :$port)
    if [ ! -z "$pid" ]; then
        echo -e "\e[33mKilling process using port $port (PID: $pid)...\e[0m"
        kill -9 $pid
    fi
done

# 3. Stop MongoDB service if running
echo -e "\n\e[33mChecking MongoDB service...\e[0m"
if systemctl is-active --quiet mongodb; then
    systemctl stop mongodb
    echo -e "\e[32mMongoDB service stopped\e[0m"
fi

# 4. Clean MongoDB data directory
echo -e "\n\e[33mCleaning MongoDB data...\e[0m"
data_path="./data"
if [ -d "$data_path" ]; then
    rm -rf $data_path
    echo -e "\e[32mMongoDB data directory cleaned\e[0m"
fi

# 5. Reset environment files
echo -e "\n\e[33mResetting environment files...\e[0m"
cat > .env << EOL
# Environment Variables for Door Access System

# MongoDB connection string
MONGODB_URI=mongodb://mongodb:27017/dooraccess

# Default admin password
ADMIN_PASSWORD=123456
EOL
echo -e "\e[32mEnvironment files reset\e[0m"

# 6. Install dependencies
echo -e "\n\e[33mInstalling dependencies...\e[0m"
npm install
if [ $? -ne 0 ]; then
    echo -e "\e[31mFailed to install dependencies\e[0m"
    exit 1
fi

# 7. Build TypeScript
echo -e "\n\e[33mBuilding TypeScript...\e[0m"
npm run build
if [ $? -ne 0 ]; then
    echo -e "\e[31mFailed to build TypeScript\e[0m"
    exit 1
fi

echo -e "\n\e[32mClean start completed successfully!\e[0m"
echo -e "\e[33mYou can now start the application using either:\e[0m"
echo -e "\e[36m1. npm start\e[0m"
echo -e "\e[36m2. docker-compose up\e[0m"
echo -e "\n\e[33mDefault admin code: 123456\e[0m"

# Make the script executable
chmod +x clean-start.sh
