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

## online test

[![poppler.api.datage.ch](https://uptime.riwi.dev/api/badge/35/status)](https://poppler.api.datage.ch/)
