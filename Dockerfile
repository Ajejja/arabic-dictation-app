# Use Node 20
FROM node:20

WORKDIR /usr/src/app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies (including dev to get TypeScript)
RUN npm install

# Copy the backend code
COPY backend ./

# Compile TypeScript (note: this runs inside /usr/src/app)
RUN npx tsc --project tsconfig.json

# Remove dev dependencies for smaller image
RUN npm prune --production

# Create necessary folders
RUN mkdir -p uploads outputs

# Expose app port
EXPOSE 3000

# Start the compiled JS file (compiled inside /usr/src/app)
CMD ["node", "dist/index.js"]
