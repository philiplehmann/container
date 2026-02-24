# Nx Cache Server Node.js Wrapper

A containerized Node.js service that provides a remote cache endpoint for Nx builds, enabling faster CI and developer workflows by sharing cached artifacts across machines.

## Features

- ⚡ **Remote Caching** - Share Nx build cache across teams and CI
- 🐳 **Docker Ready** - Easy deployment with Docker
- 🔧 **Simple Setup** - Minimal configuration required
- 📦 **Nx Compatible** - Designed for Nx remote cache workflows
- 🌐 **HTTP Endpoint** - Works over standard HTTP

## Quick Start

### Run with Docker

```bash
docker run --rm -p 3000:3000 --name nx-cache-server philiplehmann/nx-cache-server:latest
```

### Run with Docker Compose

```yaml
services:
  nx-cache-server:
    image: philiplehmann/nx-cache-server:latest
    ports:
      - "3000:3000"
    container_name: nx-cache-server
```

## Usage

1. Start the server (see Quick Start).
2. Configure Nx to use the remote cache server URL.

Refer to the official documentation for setup details and client configuration:

- https://philiplehmann.github.io/nx-cache-server/

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | HTTP | Remote cache server |
