#
# maildev Dockerfile
#

FROM bitnami/node:20.11.1

WORKDIR /home/maildev

RUN npm install --global --yes maildev@v2.1.0

RUN useradd -ms /bin/bash maildev

USER maildev

# Expose the SMTP and HTTP ports:
EXPOSE 1025 1080

CMD ["maildev"]
