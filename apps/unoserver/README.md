# Unoserver Node.js Wrapper

A containerized Node.js service that provides a REST API for converting office documents using LibreOffice via unoserver.

## Features

- 📄 **Document Conversion** - Convert DOCX, XLSX, PPTX, and more
- 🖼️ **Image Output** - Export to PNG/JPEG
- 🐳 **Docker Ready** - Easy deployment with Docker
- 🔧 **REST API** - Simple HTTP interface
- ⚙️ **Flexible Options** - Control filters, page ranges, and output behavior

## Quick Start

### Run with Docker

```bash
docker run --rm -p 3000:3000 --name unoserver philiplehmann/unoserver:latest
```

### Run with Docker Compose

```yaml
services:
  unoserver:
    image: philiplehmann/unoserver:latest
    ports:
      - "3000:3000"
    container_name: unoserver
```

## API Endpoints

### Convert File

Default behavior (no parameters) converts to PDF.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert'
```

#### Convert To PDF

```bash
curl -X POST \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?convertTo=pdf'
```

#### Convert To PNG

```bash
curl -X POST \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.png \
  'http://localhost:3000/convert?convertTo=png'
```

#### Convert To JPEG

```bash
curl -X POST \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.jpeg \
  'http://localhost:3000/convert?convertTo=jpeg'
```

## Options

### `inputFilter`

The LibreOffice input filter to use if autodetect fails (e.g. `writer8`).

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?inputFilter=writer8'
```

### `outputFilter`

The export filter to use when converting. Selected automatically if not specified.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?outputFilter=writer_pdf_Export'
```

### `filterOptions`

Options to use for the output filter. Defaults are used if not specified.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?filterOptions=PageRange=1-2'
```

### `updateIndex`

Update indexes before conversion (may be time consuming).

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?updateIndex=true'
```

### `dontUpdateIndex`

Skip updating indexes.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?dontUpdateIndex=true'
```

### `verbose`

Increase informational output to stderr.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?verbose=true'
```

### `quiet`

Decrease informational output to stderr.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?quiet=true'
```

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | HTTP | REST API server |

## Local Development

### Start Server

```bash
LIBREOFFICE_EXECUTABLE_PATH="/Applications/LibreOffice.app/Contents/MacOS/soffice" bun nx serve unoserver
```

### Tests (Local Runner)

```bash
# run playwright ui tests
TEST_SERVER_RUNNER=local bun nx e2e-local unoserver

# run bun-test
TEST_SERVER_RUNNER=local bun nx bun-test-local unoserver

# run both, e2e and bun-test
TEST_SERVER_RUNNER=local bun nx test-local unoserver
```

## online test

[![unoserver.api.datage.ch](https://uptime.riwi.dev/api/badge/38/status)](https://unoserver.api.datage.ch/)
