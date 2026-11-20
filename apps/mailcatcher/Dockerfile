#
# MailCatcher Dockerfile
#

FROM ruby:4.0.10-trixie@sha256:84e854507d7f2ffc9061e32d47c16d7413bcb1fa55ec29c1927f9e4d62fa6cf3 AS bundler

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

FROM ruby:4.0.10-slim-trixie@sha256:a4b3e62bfe56bd267a3aeacc1b89aea96be919faa0c7d77c6346e2ac14f6c175 AS runner

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
