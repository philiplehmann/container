#
# MailCatcher Dockerfile
#

FROM ruby:4.0.9-trixie@sha256:07042b74555ff2eef7365abd72d39cba6e499ab63e2d2942fd34d4778338495b AS bundler

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

FROM ruby:4.0.9-slim-trixie@sha256:575fcf0c168d396a6fa9fba87ea1e390ceb4904af6c3fe2bbfdf4824224628c3 AS runner

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
