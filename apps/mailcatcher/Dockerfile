#
# MailCatcher Dockerfile
#

FROM ruby:4.0.9-trixie@sha256:127b7bfab0d522244d37e5e62694fc2358928818e4d0953a67e03ab756fbf443 AS bundler

ARG MAILCATCHER_VERSION
ARG BUILDKIT_SBOM_SCAN_STAGE=true

# Install MailCatcher:
RUN --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    --mount=type=cache,target=/var/cache/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get upgrade --yes && \
    apt-get install --no-install-recommends --yes build-essential pkg-config sqlite3 libsqlite3-dev && \
    gem install mailcatcher --version ${MAILCATCHER_VERSION} --no-document

FROM ruby:4.0.9-slim-trixie@sha256:88f0d8f1f2f7829c8c85c5cfee774f7ac936a7ba460e904e8c873b6a7f96c311 AS runner

LABEL org.opencontainers.image.authors="me@philiplehmann.ch"

COPY --from=bundler /usr/local/bundle /usr/local/bundle

WORKDIR /home/mailcatcher

RUN useradd -ms /bin/bash -u 1000 mailcatcher

USER mailcatcher

# Expose the SMTP and HTTP ports:
EXPOSE 1025 1080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["ruby", "-rnet/http", "-e", "exit Net::HTTP.get_response(URI('http://127.0.0.1:1080/')).is_a?(Net::HTTPSuccess)"]

CMD ["mailcatcher", "--foreground", "--verbose", "--ip=0.0.0.0"]
