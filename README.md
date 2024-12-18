Get started by customizing your environment (defined in the .idx/dev.nix file) with the tools and IDE extensions you'll need for your project!

Learn more at https://developers.google.com/idx/guides/customize-idx-env

# Door Access System

A modern web-based door access control system with guest code generation capabilities.

## Features

- Modern, responsive touch interface: Touch-friendly design with smooth animations.
- Secure access code verification
- Single-use guest code generation
- Admin panel for access management
- Real-time door control via Tasmota API
- Access logging and monitoring
- Network-accessible from any device
- Supports multiple simultaneous users
- Works on phones, tablets, and computers

## Running the Application

    ### Standard Method


1. Start the server:

    ```bash
    ./start.sh


2. Access the application:
    On host machine: http://localhost:8000
    From other devices: http://YOUR_IP:8000 (IP shown in terminal)

    ### Docker Method

1. Build and start the container:
    ```bash
    docker-compose up -d


2. Access the application:
    On host machine: http://localhost:8000

    From other devices: http://YOUR_IP:8000 (replace YOUR_IP with the IP address shown in the terminal)


3. View logs:

    ```bash
    docker-compose logs -f

4. Stop the container:
    ```bash
    docker-compose down


## Default Access

The app provides innitial access after installation: 
    - Admin code: 1234
    - Use this code to:
        - Access admin panel
        - Generate guest codes
        - Manage access


## Network access

The application is accessible from any device on the same network:
    - Use the host's IP address shown in terminal
    - Default port: 8000
    - Supports multiple simultaneous users
    - Works on phones, tablets, and computers

## System Requirements

Standard Installation
    - Node.js 18 or higher
    - Modern web browser

Docker Installation
    - Docker
    - Docker Compose

## Troubleshooting

1. Port already in use: 
    ```bash
        # Check what's using port 8000
        lsof -i :8000
        # Kill existing process
        kill $(lsof -t -i:8000)
    ```

2. Docker issues:
    ```bash
        # Rebuild container
        docker-compose build --no-cache
        # Clean start
        docker-compose down && docker-compose up -d
    ```


3. Network access issues:
    - Ensure devices are on the same network
    - Check firewall settings
    - Verify port 8000 is open

## Security Notes

- Keep admin codes secure
- Guest codes are single-use only
- All access attempts are logged
- Admin verification required for sensitive operations


## Development

### Running Development Mode
    ```bash
    # Install dependencies
    npm install
    
    # Start with auto-reload
    npm run dev
    ```


### Docker Development

    ```bash
        # Build with changes
        docker-compose build
    
        # # \Start with volume mountin
        docker-compose up 

