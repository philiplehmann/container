# Build the image with `bun nx docker-build-test office-pdf`.
#
# Run the container with `docker run -p 3000:3000 -t philiplehmann/office-pdf`.
FROM rust:1.100.0-slim-trixie AS build

ARG BUILDKIT_SBOM_SCAN_STAGE=true

WORKDIR /build

# Dependencies first, so source changes don't refetch them. The image's toolchain is used (keep it
# in step with rust-toolchain.toml, which is not copied so rustup doesn't install components).
COPY apps/office-pdf/Cargo.toml apps/office-pdf/Cargo.lock ./
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    mkdir src && echo 'fn main() {}' > src/main.rs && touch src/lib.rs && \
    cargo fetch --locked && \
    rm -rf src

COPY apps/office-pdf/src src
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,target=/build/target,sharing=locked \
    cargo build --release --locked --offline --bin office-pdf && \
    cp target/release/office-pdf /office-pdf

FROM debian:trixie-slim

ARG OFFICE_PDF_VERSION

LABEL org.opencontainers.image.authors="me@philiplehmann.ch"

# Fonts only: the engines lay out text with the fonts fontconfig finds (loaded at runtime, hence
# libfontconfig1). Carlito and Caladea are metric compatible with Calibri and Cambria, Liberation
# with Arial, Times New Roman and Courier New. Add fonts-noto-cjk for Chinese, Japanese and Korean.
RUN --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    --mount=type=cache,target=/var/cache/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get upgrade --yas && \
    apt-get install --yes --no-install-recommends \
                    ca-certificates libfontconfig1 fontconfig \
                    fonts-liberation2 fonts-dejavu-core fonts-crosextra-carlito fonts-crosextra-caladea fonts-noto-core

COPY --from=build /office-pdf /usr/local/bin/office-pdf

ENV HOST=0.0.0.0
ENV PORT=3000
ENV HOME=/tmp
ENV RUST_LOG=info
ENV FS_INPUT_ROOT=/data/in
ENV FS_OUTPUT_ROOT=/data/out

USER 1000:1000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["office-pdf", "healthcheck"]

CMD [ "office-pdf" ]
