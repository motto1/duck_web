FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:prod

EXPOSE 3000

CMD ["sh", "-c", "npm run db:push:prod && npm run start"]
