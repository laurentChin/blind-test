FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY index.js ./
COPY src ./src

CMD ["bun", "index.js"]
