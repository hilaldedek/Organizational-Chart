# ============================
# 1. Build Stage
# ============================
FROM node:20-alpine AS builder
WORKDIR /app

# Paket dosyalarını kopyala
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./

# Prod bağımlılıkları yükle
RUN npm install

# Kodları kopyala ve build et
COPY . .
RUN npm run build

# ============================
# 2. Runner Stage
# ============================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Gerekli dosyaları al (standalone build)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
