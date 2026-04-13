# Poppler Node.js Wrapper

A containerized Node.js service that provides a REST API for converting PDF documents to text or HTML using Poppler utilities.

## Features

- 📄 **PDF to Text** - Extract plain text from PDFs
- 🌐 **PDF to HTML** - Convert PDFs to HTML
- 🐳 **Docker Ready** - Easy deployment with Docker
- 🔧 **REST API** - Simple HTTP interface

## Quick Start

### Run with Docker

```bash
docker run -p 3000:3000 --name poppler philiplehmann/poppler-server:latest
```

### Run with Docker Compose

```yaml
services:
  poppler:
    image: philiplehmann/poppler-server:latest
    ports:
      - "3000:3000"
    container_name: poppler
```

## API Endpoints

### Convert PDF to Text

Send the PDF as binary data in the request body with header `content-type: application/x-www-form-urlencoded`.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/document.pdf" \
  'http://localhost:3000/pdf-to-text'
```

### Convert PDF to HTML

Send the PDF as binary data in the request body with header `content-type: application/x-www-form-urlencoded`.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/document.pdf" \
  'http://localhost:3000/pdf-to-html'
```

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | HTTP | REST API server |

## Process Management

The service includes endpoints for monitoring and managing running child processes.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POPPLER_PROCESS_ENABLED` | `false` | Enables `/processes` endpoints when set to `true` |
| `POPPLER_PROCESS_RETENTION_MS` | `3600000` | How long to keep completed processes (1 hour) |
| `POPPLER_PROCESS_MAX_COMPLETED` | `1000` | Maximum number of completed processes to retain |

### List Processes

```bash
# List all processes
curl 'http://localhost:3000/processes'

# Filter by status (running, completed, failed, killed)
curl 'http://localhost:3000/processes?status=running'
```

### Get Process Details

```bash
curl 'http://localhost:3000/processes/{process-uuid}'
```

### Kill a Process

```bash
# Kill with SIGTERM (default)
curl -X DELETE 'http://localhost:3000/processes/{process-uuid}'

# Kill with specific signal
curl -X DELETE 'http://localhost:3000/processes/{process-uuid}?signal=SIGKILL'
```

### Clear Completed Processes

```bash
# Clear all completed processes
curl -X DELETE 'http://localhost:3000/processes'

# Clear processes older than 1 minute
curl -X DELETE 'http://localhost:3000/processes?olderThan=60000'
```

## online test

[![poppler.api.datage.ch](https://uptime.riwi.dev/api/badge/35/status)](https://poppler.api.datage.ch/)
