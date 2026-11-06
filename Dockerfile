# Bot Arena in a container: `docker compose up`, then http://localhost:9002.
# Next's standalone output keeps the image to the server and the modules it uses. Games live in /data.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build

FROM node:24-alpine
WORKDIR /app
# The container listens on all its interfaces; compose publishes the port on the host's 127.0.0.1 only.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=9002 ARENA_DATA_DIR=/data
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 9002
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://localhost:9002/api/matches > /dev/null || exit 1
CMD ["node", "server.js"]
