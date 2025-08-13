#
# MailHog Dockerfile
#

FROM harbor.riwi.dev/hub/bitnami/golang:1.25.0 AS builder

LABEL org.opencontainers.image.authors="philiplehmann@gmail.com"

ARG MAILHOG_VERSION

# Install MailHog:
RUN mkdir -p /root/gocode && \
    GOSUMDB=off GOPATH=/root/gocode GOPROXY=https://proxy.golang.org/cached-only go install github.com/mailhog/MailHog@${MAILHOG_VERSION}

FROM harbor.riwi.dev/hub/bitnami/minideb:bookworm
RUN apt-get update && apt-get upgrade --yes
RUN useradd -ms /bin/bash -u 1000 mailhog

COPY --from=builder /root/gocode/bin/MailHog /usr/local/bin/

USER mailhog

WORKDIR /home/mailhog

# Expose the SMTP and HTTP ports:
EXPOSE 1025 8025


CMD ["MailHog"]
