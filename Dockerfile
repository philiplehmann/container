FROM bitnami/dotnet:9.0.0-debian-12-r1 AS download

RUN curl --output sonarr.tar.gz -L "https://services.sonarr.tv/v1/download/main/latest?version=4&os=linux&arch=arm64" && \
    tar -xf sonarr.tar.gz

FROM bitnami/dotnet:9.0.0-debian-12-r1

COPY --from=download /app/Sonarr /app

CMD [ "/app/Sonarr", "-nobrowser", "-data=/config"]
