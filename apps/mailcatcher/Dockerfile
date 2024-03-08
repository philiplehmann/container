#
# MailCatcher Dockerfile
#

FROM ruby:3.2-slim-bullseye

# Install MailHog:
RUN apt-get update \
  && apt-get install --yes build-essential pkg-config sqlite3 libsqlite3-dev \
  && gem install mailcatcher --version 0.9.0 --no-document \
  && apt-get remove --yes build-essential pkg-config \
  && apt-get autoremove --yes

RUN useradd -ms /bin/bash -u 1000 mailcatcher

WORKDIR /home/mailcatcher

USER mailcatcher

# Expose the SMTP and HTTP ports:
EXPOSE 1025 1080

ENTRYPOINT ["mailcatcher", "--foreground", "--verbose", "--ip=0.0.0.0"]
