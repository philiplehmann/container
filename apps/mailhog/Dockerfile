#
# MailHog Dockerfile
#

FROM golang:1.27-trixie@sha256:f18c3d73a184fb0582828510722e723b63a93f7188d11dd223d9be6f6880e65d AS builder

ARG MAILHOG_VERSION
ARG BUILDKIT_SBOM_SCAN_STAGE=true

# Install MailHog:
RUN mkdir -p /root/gocode && \
    GOSUMDB=off GOPATH=/root/gocode GOPROXY=https://proxy.golang.org/cached-only go install github.com/mailhog/MailHog@${MAILHOG_VERSION}

FROM debian:trixie-slim@sha256:8aa5a7bf5a1955bddbe7d74fcdd0b91ab30e74362a8b73af672b0481b35b44a0

LABEL org.opencontainers.image.authors="me@philiplehmann.ch"

RUN --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    --mount=type=cache,target=/var/cache/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get upgrade --yes
RUN useradd -ms /bin/bash -u 1000 mailhog

COPY --from=builder /root/gocode/bin/MailHog /usr/local/bin/

USER mailhog

WORKDIR /home/mailhog

# Expose the SMTP and HTTP ports:
EXPOSE 1025 8025

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/8025"]

CMD ["MailHog"]
