#
# MailCatcher Dockerfile
#

FROM ruby:3.4.7-trixie AS bundler

LABEL org.opencontainers.image.authors="philiplehmann@gmail.com"

ARG MAILCATCHER_VERSION

# Install MailCatcher:
RUN --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    --mount=type=cache,target=/var/cache/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get upgrade --yes && \
    apt-get install --no-install-recommends --yes build-essential pkg-config sqlite3 libsqlite3-dev && \
    gem install mailcatcher --version ${MAILCATCHER_VERSION} --no-document

FROM ruby:3.4.7-slim-trixie AS runner

COPY --from=bundler /usr/local/bundle /usr/local/bundle

WORKDIR /home/mailcatcher

RUN useradd -ms /bin/bash -u 1000 mailcatcher

USER mailcatcher

# Expose the SMTP and HTTP ports:
EXPOSE 1025 1080

CMD ["mailcatcher", "--foreground", "--verbose", "--ip=0.0.0.0"]
