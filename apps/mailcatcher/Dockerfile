#
# MailCatcher Dockerfile
#

FROM ruby:4.0.10-trixie@sha256:868a3645f93e82f9d34d113334feb06327674c8c03bd6359b520300b8d440b17 AS bundler

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

FROM ruby:4.0.10-slim-trixie@sha256:dc488b2df1731a1523a24a845fc38627b3edde052473c4e7bef06ae4d649fd25 AS runner

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
