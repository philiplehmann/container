#
# maildev Dockerfile
#

FROM oven/bun:1.3.8-slim

LABEL org.opencontainers.image.authors="philiplehmann@gmail.com"

ARG MAILDEV_VERSION

WORKDIR /home/bun

USER bun

RUN bun install --production maildev@${MAILDEV_VERSION}

# Expose the SMTP and HTTP ports:
EXPOSE 1025 1080

CMD ["bun", "x", "maildev", "--mail-directory", "mails"]
