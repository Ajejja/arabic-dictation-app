FROM node:20

WORKDIR /usr/src/app

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend ./

RUN mkdir -p uploads outputs

# Compile TypeScript
RUN npx tsc

EXPOSE 3000

CMD ["node", "dist/index.js"]
