#
# MailHog Dockerfile
#

FROM golang:1.22-bookworm AS builder

LABEL org.opencontainers.image.authors="philiplehmann@gmail.com"

ARG MAILHOG_VERSION

# Install MailHog:
RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \
    --mount=target=/var/cache/apt,type=cache,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get install --no-install-recommends --yes build-essential git && \
    mkdir -p /root/gocode && \
    export GOPATH=/root/gocode && \
    go install github.com/mailhog/MailHog@${MAILHOG_VERSION}

FROM debian:stable-slim
RUN apt-get update && apt-get upgrade --yes
RUN useradd -ms /bin/bash -u 1000 mailhog

COPY --from=builder /root/gocode/bin/MailHog /usr/local/bin/

USER mailhog

WORKDIR /home/mailhog

# Expose the SMTP and HTTP ports:
EXPOSE 1025 8025


CMD ["MailHog"]
