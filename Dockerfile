FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port 8000
EXPOSE 8000

# Start the application
CMD ["node", "server.js"]
