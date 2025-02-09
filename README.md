# Door Access System

A modern web-based door access control system with hierarchical access control and comprehensive management capabilities.

## Features

- Modern, responsive touch interface with smooth animations
- Hierarchical access control system:
  - Admin: Full access to all doors and management features
  - Host: Property-level access and management
  - Resident: Unit-level access and guest management
  - Guest: Specific door access only
- Single code for both door access and admin functions
- Secure initialization flow with code confirmation
- Real-time door control
- Comprehensive access logging and monitoring
- Network-accessible from any device
- TypeScript-based with strict type safety

## Initial Setup

### Clean Start

For a fresh installation or to reset the system to its initial state, use the provided clean-start scripts:

#### Windows
```powershell
# Run as Administrator
.\scripts\clean-start.ps1
```

#### Linux/Unix
```bash
# Run with sudo
sudo ./scripts/clean-start.sh
```

These scripts will:
1. Kill any processes using required ports (8000, 27017)
2. Stop MongoDB service if running
3. Clean MongoDB data directory
4. Reset environment files to defaults
5. Install dependencies
6. Build TypeScript
7. Prepare the system for first run

### First Run

After running the clean-start script, you can start the application using either:

1. NPM:
    ```bash
    npm start
    ```

2. Docker:
    ```bash
    docker compose up
    ```

The system starts in initialization mode:
1. Default admin code: 123456
2. On first access, you'll be prompted to:
   - Enter the default code (123456)
   - Set a new admin code
   - Confirm the new admin code
3. System then restarts in normal mode

## Data Persistence

### Using Docker

1. **Data Directory**: The MongoDB data is stored in the `./data/db` directory on your host machine. This directory is mounted as a volume in the MongoDB container.
2. **Custom Data Location**: If you want to persist data in a different location (e.g., cloud storage, NAS, etc.), modify the `docker-compose.yml` file to point to your desired path:
   ```yaml
   volumes:
     - /path/to/your/data:/data/db
   ```

### Running Directly with npm

1. **Data Directory**: Ensure you have a local MongoDB instance running and point the `MONGODB_URI` in the `.env` file to your MongoDB server.
2. **Custom Data Location**: If you want to persist data elsewhere, ensure your MongoDB configuration allows for it, and update the connection string in the `.env` file accordingly.

## Access Control

### Admin Code Usage
- Opens any door in the system when used normally
- Grants access to admin panel when admin button is pressed
- Can create and manage all types of users

### User Types
1. Admin
   - Full access to all doors
   - Can manage all users and access codes
   - Can view all access logs
   - Can configure system settings

2. Host
   - Access to assigned properties
   - Can manage residents and guests for their properties
   - Can view logs for their properties

3. Resident
   - Access to assigned units
   - Can create guest codes for their units
   - Can view their own access logs

4. Guest
   - Access to specific assigned doors
   - Time-limited access
   - Can view their own access logs

## System Requirements

### Standard Installation
- Node.js 18 or higher
- MongoDB 4.4 or higher
- Modern web browser

### Docker Installation
- Docker
- Docker Compose

## Troubleshooting

1. Port already in use: 
    ```bash
    # Use clean-start script to automatically handle this
    .\scripts\clean-start.ps1  # Windows
    sudo ./scripts/clean-start.sh  # Linux/Unix
    ```

2. Docker issues:
    ```bash
    # Rebuild container
    docker compose build --no-cache
    # Clean start
    docker compose down && docker compose up -d
    ```

3. Network access issues:
    - Ensure devices are on the same network
    - Check firewall settings
    - Verify port 8000 is open

4. Reset to initialization mode:
    ```bash
    # Using the development endpoint
    curl -X POST http://localhost:8000/dev/reset-db
    ```

## Security Features

- Strict 6-digit code requirement
- Two-step initialization process
- Active/inactive status tracking
- Date range validity for temporary access
- Comprehensive access logging
- Hierarchical permission system
- Automatic session management

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
docker compose build

# Start with volume mounting
docker compose up
```

### Code Organization
- TypeScript-based implementation
- Strict type checking
- Modular architecture
- Clear separation of concerns
- Comprehensive error handling
