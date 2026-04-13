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

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP service port |
| `S3_BUCKET_NAME` | - | S3 bucket used to store cache artifacts (required) |
| `SERVICE_ACCESS_TOKEN` | - | Bearer token required to authenticate requests (required) |
| `AWS_ACCESS_KEY_ID` | auto-discovery | AWS access key ID for S3 access |
| `AWS_SECRET_ACCESS_KEY` | auto-discovery | AWS secret access key for S3 access |
| `AWS_SESSION_TOKEN` | auto-discovery | AWS session token for temporary credentials |
| `AWS_REGION` | auto-discovery | AWS region for S3 requests |
| `S3_ENDPOINT_URL` | - | Custom endpoint for S3-compatible storage (for example MinIO) |
| `S3_TIMEOUT` | `30` | S3 operation timeout in seconds |
