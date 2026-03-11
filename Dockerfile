# Optional: build and run server in Docker (run from repo root: docker build -t quizbomb-server .)
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
RUN npm run build 2>/dev/null || true
EXPOSE 2567
ENV PORT=2567
CMD ["node", "dist/index.js"]
