# -----------------------------
# Stage 1 - Build
# -----------------------------
FROM node:20 AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY . .
RUN npx tsc

# -----------------------------
# Stage 2 - Production
# -----------------------------
FROM node:20
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

# Copy compiled JS files from builder
COPY --from=builder /usr/src/app/dist ./dist

# Ensure uploads & outputs directories exist
RUN mkdir -p uploads outputs

# Expose the same port your app uses
EXPOSE 3000

# Start your backend app
CMD ["node", "dist/index.js"]
