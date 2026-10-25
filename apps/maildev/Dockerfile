#
# maildev Dockerfile
#

FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4

LABEL org.opencontainers.image.authors="me@philiplehmann.ch"

ARG MAILDEV_VERSION

WORKDIR /home/bun

USER bun

RUN bun install --production maildev@${MAILDEV_VERSION}

# Expose the SMTP and HTTP ports:
EXPOSE 1025 1080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["bun", "node_modules/maildev/dist/bin/healthcheck.js"]

CMD ["bun", "x", "maildev", "--mail-directory", "mails"]
