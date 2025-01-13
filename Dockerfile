FROM node:18-alpine

WORKDIR /app

# Copy package files
# Copy application files
COPY . .

# Install dependencies
RUN npm install

# Build TypeScript
RUN npm run build

# Expose port 8000
EXPOSE 8000

# Start the application
CMD ["npm", "start"]
