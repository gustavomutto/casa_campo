FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data
# Herramientas para compilar better-sqlite3 si no hay binario precompilado
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
# Monta un volumen persistente en /data (en Railway: Volumes)
CMD ["node", "server/index.js"]
