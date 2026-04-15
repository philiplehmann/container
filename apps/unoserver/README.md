# Unoserver Node.js Wrapper

A containerized Node.js service that provides a REST API for converting office documents using LibreOffice via unoserver.

## Features

- 📄 **Document Conversion** - Convert DOCX, XLSX, PPTX, and more
- 🖼️ **Image Output** - Export to PNG/JPEG
- 🐳 **Docker Ready** - Easy deployment with Docker
- 🔧 **REST API** - Simple HTTP interface
- ⚙️ **Flexible Options** - Control filters, page ranges, and output behavior
- 🧭 **Process Management** - Track, inspect, and terminate conversion processes

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

Default behavior remains unchanged: only `/convert` and `/direct` are available unless `UNOSERVER_FS_ENABLE=true` is explicitly set.

When process tracking is enabled (`UNOSERVER_PROCESS_ENABLED=true`), conversions triggered through `/convert`, `/direct`, and `/direct-fs` are tracked in `/processes`.

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

### Direct Filesystem Conversion (Optional)

This endpoint is disabled by default and only available when `UNOSERVER_FS_ENABLE=true`.

- Endpoint: `POST /direct-fs`
- Content type: `application/json`
- Input and output paths must be relative paths under configured roots.

#### Environment Variables

| Variable | Default | Description |
|------|------|-------------|
| `PORT` | `3000` | HTTP service port |
| `UNOSERVER_DIRECT_ONLY` | `false` | Runs only direct LibreOffice conversion mode when set to `true` |
| `UNOSERVER_FS_ENABLE` | `false` | Enables `POST /direct-fs` when set to `true` |
| `UNOSERVER_FS_INPUT_ROOT` | `/data/in` | Root folder for reading input files |
| `UNOSERVER_FS_OUTPUT_ROOT` | `/data/out` | Root folder for writing output files |
| `UNOSERVER_PROCESS_ENABLED` | `false` | Enables `/processes` endpoints when set to `true` |
| `UNOSERVER_PROCESS_RETENTION_MS` | `3600000` | How long to keep completed processes (1 hour) |
| `UNOSERVER_PROCESS_MAX_COMPLETED` | `1000` | Maximum number of completed processes to retain |

#### Docker Run with Mounted Input/Output Roots

```bash
mkdir -p "$PWD/tmp/in" "$PWD/tmp/out"
cp apps/unoserver/src/test/assets/dummy.docx "$PWD/tmp/in/dummy.docx"

docker run --rm \
  -p 3000:3000 \
  --name unoserver-direct-fs \
  -e UNOSERVER_DIRECT_ONLY=true \
  -e UNOSERVER_FS_ENABLE=true \
  -e UNOSERVER_FS_INPUT_ROOT=/data/in \
  -e UNOSERVER_FS_OUTPUT_ROOT=/data/out \
  -v "$PWD/tmp/in:/data/in" \
  -v "$PWD/tmp/out:/data/out" \
  philiplehmann/unoserver:latest
```

#### Request Example

```bash
curl -X POST \
  -H 'content-type: application/json' \
  -d '{
    "inputPath": "dummy.docx",
    "outputPath": "dummy.pdf",
    "convertTo": "pdf",
    "timeoutMs": 10000
  }' \
  'http://localhost:3000/direct-fs'
```

#### Success Response Example

```json
{
  "status": "complete",
  "inputPath": "dummy.docx",
  "outputPath": "dummy.pdf",
  "outputBytes": 133742,
  "durationMs": 947
}
```

#### Error Response Example

```json
{
  "status": "error",
  "message": "inputPath must resolve within configured root"
}
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

### `timeoutMs`

Optional timeout in milliseconds. If the timeout is reached, the conversion process is killed with `SIGKILL` and is reported as `killed` in process management.

Supported on:
- `/convert` (query parameter)
- `/direct` (query parameter)
- `/direct-fs` (JSON body)

```bash
curl -X POST \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?timeoutMs=10000'
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

## Process Management

The service includes endpoints for monitoring and managing running child processes.

### List Processes

```bash
# List all processes
curl 'http://localhost:3000/processes'

# Filter by status (running, completed, failed, killed)
curl 'http://localhost:3000/processes?status=running'
```

Timeout behavior:
- Timed out conversions are force-killed (`SIGKILL`) and appear with `status: killed`
- Query timed out conversions via `curl 'http://localhost:3000/processes?status=killed'`

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

[![unoserver.api.datage.ch](https://uptime.riwi.dev/api/badge/38/status)](https://unoserver.api.datage.ch/)
