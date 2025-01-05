FROM bitnami/dotnet:9.0.0-debian-12-r1 as download

WORKDIR /app

ARG TARGETARCH

ADD https://services.sonarr.tv/v1/download/main/latest?version=4&os=linux&arch=${TARGETARCH} /app/sonarr.tar.gz

RUN tar -xf /app/sonarr.tar.gz

FROM bitnami/dotnet:9.0.0-debian-12-r1

WORKDIR /app

COPY --from=download /app/Sonarr /app

CMD [ "/app/sonarr", "-nobrowser", "-data=/config"]
