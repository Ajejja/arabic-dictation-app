# Use Node 20
FROM node:20

WORKDIR /usr/src/app

# Copy dependency files first
COPY backend/package*.json ./

# Install all dependencies (including dev, so we get typescript)
RUN npm install

# Copy the rest of the backend code
COPY backend ./

# Compile TypeScript to JavaScript
RUN npx tsc

# Clean up: remove devDependencies to reduce image size
RUN npm prune --production

# Create needed folders
RUN mkdir -p uploads outputs

# Expose your app port
EXPOSE 3000

# Start the app (pointing to compiled JS)
CMD ["node", "dist/index.js"]
