FROM node:22.20.0-bookworm-slim

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg fonts-noto-core tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/mizan/video-platform

COPY services/video-platform/package.json services/video-platform/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
  && npm cache clean --force

COPY services/video-platform/src ./src
COPY public/mizan-logo.png /opt/mizan/assets/mizan-logo.png

RUN mkdir -p \
    /var/lib/mizan/uploads \
    /var/lib/mizan/raw \
    /var/lib/mizan/processing \
    /var/lib/mizan/ready \
    /var/lib/mizan/replaced \
    /var/lib/mizan/quarantine \
  && chown -R node:node /opt/mizan /var/lib/mizan

USER node

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "src/video-api.js"]
