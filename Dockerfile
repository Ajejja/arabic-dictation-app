# Stage 1: build
FROM node:20 AS builder

WORKDIR /usr/src/app

# Copy backend package files
COPY backend/package*.json ./

# Install all dependencies
RUN npm install

# Copy the backend source
COPY backend ./

# Compile TypeScript to JS
RUN npx tsc

# Stage 2: runtime
FROM node:20

WORKDIR /usr/src/app

# Copy only the built output from builder
# COPY --from=builder /usr/src/app/dist ./dist
COPY backend/uploads ./uploads
COPY backend/outputs ./outputs
#COPY backend/.env .env

# Install only production dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

EXPOSE 3000
CMD ["node", "index.js"]
