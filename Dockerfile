FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /home/node/Downloads /home/node/.yoinks \
    && chown -R node:node /home/node

USER node
ENTRYPOINT ["node", "dist/cli.js"]
