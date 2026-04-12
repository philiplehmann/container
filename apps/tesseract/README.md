# Tesseract Node.js Wrapper

A containerized Node.js service that provides a simple REST API for converting images into text using Tesseract OCR.

## Features

- 🧠 **OCR Powered** - Extract text from images with Tesseract
- 📷 **Image-to-Text API** - Simple HTTP endpoint
- 🐳 **Docker Ready** - Easy deployment with Docker
- 🔧 **REST API** - Minimal, straightforward interface

## Quick Start

### Run with Docker

```bash
docker run -p 3000:3000 --rm --name tesseract philiplehmann/tesseract:latest
```

### Run with Docker Compose

```yaml
services:
  tesseract:
    image: philiplehmann/tesseract:latest
    ports:
      - "3000:3000"
    container_name: tesseract
```

## API Endpoints

### Convert Image to Text

Send an image as binary data in the request body.

```bash
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/image.type" \
  'http://localhost:3000/image-to-text'
```

**Response:** The extracted text as the response body.

## Request Examples

### JavaScript/Node.js

```javascript
const fs = require('fs');

const imageBuffer = fs.readFileSync('image.png');

const response = await fetch('http://localhost:3000/image-to-text', {
  method: 'POST',
  headers: {
    'content-type': 'application/x-www-form-urlencoded',
  },
  body: imageBuffer,
});

const text = await response.text();
console.log(text);
```

### Python

```python
import requests

with open('image.png', 'rb') as f:
    response = requests.post(
        'http://localhost:3000/image-to-text',
        headers={'content-type': 'application/x-www-form-urlencoded'},
        data=f
    )

print(response.text)
```

### PHP

```php
<?php
$image = file_get_contents('image.png');

$opts = [
  'http' => [
    'method' => 'POST',
    'header' => "content-type: application/x-www-form-urlencoded\r\n",
    'content' => $image
  ]
];

$context = stream_context_create($opts);
$response = file_get_contents('http://localhost:3000/image-to-text', false, $context);

echo $response;
?>
```

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | HTTP | REST API server |

## Tips

- Use high-contrast images for best OCR results
- Prefer PNG/JPEG images with readable text
- If the output looks incorrect, try preprocessing (rotate, increase contrast, remove noise)

## Process Management

The service includes endpoints for monitoring and managing running child processes.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROCESS_RETENTION_MS` | `3600000` | How long to keep completed processes (1 hour) |
| `PROCESS_MAX_COMPLETED` | `1000` | Maximum number of completed processes to retain |

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

[![tesseract.api.datage.ch](https://uptime.riwi.dev/api/badge/37/status)](https://tesseract.api.datage.ch/)
