#
# MailCatcher Dockerfile
#

FROM ruby:3.2-bullseye as bundler

# Install MailCatcher:
RUN apt-get update; \
    apt-get upgrade --yes; \
    apt-get install --no-install-recommends --yes build-essential pkg-config sqlite3 libsqlite3-dev; \
    gem install mailcatcher --version 0.9.0 --no-document

FROM ruby:3.2-slim-bullseye as runner

COPY --from=bundler /usr/local/bundle /usr/local/bundle

WORKDIR /home/mailcatcher

RUN useradd -ms /bin/bash -u 1000 mailcatcher

USER mailcatcher

# Expose the SMTP and HTTP ports:
EXPOSE 1025 1080

CMD ["mailcatcher", "--foreground", "--verbose", "--ip=0.0.0.0"]
