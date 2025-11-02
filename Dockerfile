# Use Node.js 20
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy only backend first (so context is right)
COPY backend/package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the backend
COPY backend ./

# Make sure uploads and outputs directories exist
RUN mkdir -p uploads outputs

# Expose port 3000
EXPOSE 3000

# Start using ts-node, pointing to the backend/index.ts
CMD ["npx", "ts-node", "backend/index.ts"]
