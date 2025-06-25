# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

# Expose the port (change if your app uses a different port)
EXPOSE 8080

# Start the app
CMD ["npm", "start"] 