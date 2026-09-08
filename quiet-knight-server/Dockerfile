FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl libstdc++6 && rm -rf /var/lib/apt/lists/*
# Official unmodified Stockfish 18 baseline x86-64 release; verify upstream digest.
RUN curl -fL --retry 3 https://github.com/official-stockfish/Stockfish/releases/download/sf_18/stockfish-ubuntu-x86-64.tar -o /tmp/stockfish.tar \
 && echo '5c6f38b02a4da5f3ffe763f27da6c3e743eebefd92b50cb3661623b96696adff  /tmp/stockfish.tar' | sha256sum -c - \
 && mkdir -p /opt/stockfish && tar --no-same-owner -xf /tmp/stockfish.tar -C /opt/stockfish --strip-components=1 \
 && chmod +x /opt/stockfish/stockfish-ubuntu-x86-64 && rm /tmp/stockfish.tar
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "server.js"]
