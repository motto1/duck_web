FROM node:22-alpine AS base
WORKDIR /app
ENV npm_config_script_shell=/bin/sh

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build:prod

EXPOSE 3000

CMD ["sh", "-c", "npm run db:push:prod && npm run start"]
