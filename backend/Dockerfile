# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install 
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Create folders for the database and logs so the app doesn't crash
RUN mkdir -p data logs

COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist

# Standardize the DB_PATH to be sure
ENV DB_PATH=/app/data/monitoring.db
ENV PORT=8001

EXPOSE 8001

# Run directly with node to avoid npm overhead
CMD ["node", "dist/index.js"]