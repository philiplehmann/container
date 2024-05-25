#
# MailCatcher Dockerfile
#

FROM ruby:3.3-bullseye as bundler

LABEL org.opencontainers.image.authors="philiplehmann@gmail.com"

ARG MAILCATCHER_VERSION

# Install MailCatcher:
RUN apt-get update; \
    apt-get upgrade --yes; \
    apt-get install --no-install-recommends --yes build-essential pkg-config sqlite3 libsqlite3-dev; \
    gem install mailcatcher --version ${MAILCATCHER_VERSION} --no-document

FROM ruby:3.3-slim-bullseye as runner

COPY --from=bundler /usr/local/bundle /usr/local/bundle

WORKDIR /home/mailcatcher

RUN useradd -ms /bin/bash -u 1000 mailcatcher

USER mailcatcher

# Expose the SMTP and HTTP ports:
EXPOSE 1025 1080

CMD ["mailcatcher", "--foreground", "--verbose", "--ip=0.0.0.0"]
