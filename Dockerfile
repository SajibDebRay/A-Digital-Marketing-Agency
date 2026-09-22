# Use official Node.js 22 image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy rest of the project
COPY . .

# Expose port (Cloud Run injects PORT automatically)
EXPOSE 8080

# Start the server
CMD ["npm", "start"]