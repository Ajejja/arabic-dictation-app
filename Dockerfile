# Use Node.js 20
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install deps
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source code
COPY backend ./

# Ensure folders exist
RUN mkdir -p uploads outputs

# Expose port
EXPOSE 3000

# Run the app
CMD ["npx", "ts-node", "index.ts"]
