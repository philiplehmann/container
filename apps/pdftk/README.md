# PDFTK Node.js Wrapper

A containerized Node.js service that provides a REST API for common PDF operations using PDFTK.

## Features

- 🗜️ **Compress/Uncompress** - Optimize PDF file size
- 🔐 **Encrypt/Decrypt** - Secure PDFs with passwords and permissions
- 🧾 **Form Data** - Extract or fill PDF form fields
- 🐳 **Docker Ready** - Easy deployment with Docker
- 🔧 **REST API** - Simple HTTP interface

## Quick Start

### Run with Docker

```bash
docker run -p 3000:3000 --rm --name pdftk philiplehmann/pdftk:latest
```

### Run with Docker Compose

```yaml
services:
  pdftk:
    image: philiplehmann/pdftk:latest
    ports:
      - "3000:3000"
    container_name: pdftk
```

## API Endpoints

### Compress PDF

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/uncompressed.pdf" \
  'http://localhost:3000/compress'
```

### Uncompress PDF

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/compressed.pdf" \
  'http://localhost:3000/uncompress'
```

### Encrypt PDF

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/file.pdf" \
  'http://localhost:3000/encrypt?password=1234&userPassword=asdf&allow=Printing'
```

**Options:**

- `password` (required) - Owner password
- `userPassword` - User password
- `allow` - Permission enum:
  - `Printing`
  - `DegradedPrinting`
  - `ModifyContents`
  - `Assembly`
  - `CopyContents`
  - `ScreenReaders`
  - `ModifyAnnotations`
  - `FillIn`
  - `AllFeatures`

### Decrypt PDF

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/encrypted.pdf" \
  'http://localhost:3000/decrypt?password=1234'
```

### Get Form Fields (JSON)

Returns PDF form fields as JSON.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/pdf-form.pdf" \
  'http://localhost:3000/data/fields'
```

### Get Document Info (JSON)

Returns PDF file information as JSON.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/file.pdf" \
  'http://localhost:3000/data/dump'
```

### Get Form Fields (FDF)

Returns PDF form fields in FDF format.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/pdf-form.pdf" \
  'http://localhost:3000/data/fdf'
```

### Fill PDF Form

Fills a PDF with the provided field values.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/pdf-form.pdf" \
  'http://localhost:3000/form/fill?field1=value1&field2=value2'
```

**Arguments:**

- `flag` - Enum:
  - `need_appearances` (default)
  - `flatten`
  - `replacement_font` (requires `fontName`)
- `fontName` - Additional font name (when using `replacement_font`)
- All form fields are passed as query parameters by name

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | HTTP | REST API server |

## online test

[![pdftk.api.datage.ch](https://uptime.riwi.dev/api/badge/34/status)](https://pdftk.api.datage.ch/)
