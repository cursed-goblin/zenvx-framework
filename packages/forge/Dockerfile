# Build environment for real ISOs. Disposable, no host access.
FROM debian:trixie

RUN apt-get update && apt-get install -y --no-install-recommends \
      live-build \
      debootstrap \
      xorriso \
      squashfs-tools \
      isolinux \
      syslinux-common \
      ca-certificates \
      nodejs npm \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/zenvx
COPY package.json ./
COPY packages/schema ./packages/schema
COPY packages/forge ./packages/forge
RUN npm install --omit=dev

ENV ZENVX_WORK=/var/lib/zenvx/builds
EXPOSE 8787
CMD ["npm", "run", "start", "--workspace", "@zenvx/forge"]
