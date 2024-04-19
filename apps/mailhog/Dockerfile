#
# MailHog Dockerfile
#

FROM golang:1.22-bookworm as builder

LABEL org.opencontainers.image.authors="philiplehmann@gmail.com"

# Install MailHog:
RUN apt-get update \
  && apt-get install --no-install-recommends --yes build-essential git \
  && mkdir -p /root/gocode \
  && export GOPATH=/root/gocode \
  && go install github.com/mailhog/MailHog@v1.0.1

FROM debian:stable-slim
RUN apt-get update && apt-get upgrade --yes
RUN useradd -ms /bin/bash -u 1000 mailhog

COPY --from=builder /root/gocode/bin/MailHog /usr/local/bin/

USER mailhog

WORKDIR /home/mailhog

# Expose the SMTP and HTTP ports:
EXPOSE 1025 8025


CMD ["MailHog"]
