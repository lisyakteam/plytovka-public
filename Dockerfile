FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY .env .env
COPY certs certs
CMD ["bun", "run", "src"]
