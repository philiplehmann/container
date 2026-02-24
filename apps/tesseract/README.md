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

## online test

[![tesseract.api.datage.ch](https://uptime.riwi.dev/api/badge/37/status)](https://tesseract.api.datage.ch/)
