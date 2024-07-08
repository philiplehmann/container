#
# maildev Dockerfile
#

FROM bitnami/node:20.15.1

LABEL org.opencontainers.image.authors="philiplehmann@gmail.com"

ARG MAILDEV_VERSION

WORKDIR /home/maildev

RUN npm install --global --yes maildev@${MAILDEV_VERSION}

RUN useradd -ms /bin/bash maildev

USER maildev

# Expose the SMTP and HTTP ports:
EXPOSE 1025 1080

CMD ["maildev"]
