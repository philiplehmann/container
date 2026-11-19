#
# maildev Dockerfile
#

FROM oven/bun:1.4.5-slim@sha256:b780593f3e10918cbdaec3d5a08d52224b9198069a65eb47812085c2ec007643

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
