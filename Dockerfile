# Builder stage
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Runner stage
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci --only=production
COPY --from=builder /usr/src/app/dist ./dist
# keep uploads/outputs dirs present (empty) so app has them
RUN mkdir -p backend/uploads backend/outputs
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/backend/index.js"]
