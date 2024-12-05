#!/bin/bash

# Kill any existing process on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Start Node.js server
nix-shell -p nodejs --run "node server.js"
