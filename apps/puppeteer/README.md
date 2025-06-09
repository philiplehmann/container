# Puppeteer Node.js Wrapper

A containerized Node.js service that provides a REST API for converting web pages and HTML content to PDF documents and images using Puppeteer and headless Chrome.

## Features

- 🌐 **URL to PDF** - Convert any web page to PDF
- 📄 **HTML to PDF** - Convert raw HTML content to PDF  
- 🖼️ **URL to Image** - Generate screenshots of web pages
- 🎨 **HTML to Image** - Convert HTML content to images
- ⚙️ **Configurable** - Supports all Puppeteer PDF options
- 🚀 **Fast & Lightweight** - Optimized for performance
- 🐳 **Docker Ready** - Easy deployment with Docker
- 🔧 **REST API** - Simple HTTP interface

## Quick Start

### Run with Docker

```bash
docker run -p 3000:3000 --name puppeteer-server philiplehmann/puppeteer:latest
```

### Run with Docker Compose

```yaml
version: '3.8'
services:
  puppeteer:
    image: philiplehmann/puppeteer:latest
    ports:
      - "3000:3000"
    container_name: puppeteer-server
    environment:
      - NODE_ENV=production
```

### Run with Nx

```bash
# Build the Docker image
nx build puppeteer

# Run the container
nx docker-run puppeteer

# Serve locally for development
nx serve puppeteer
```

## API Endpoints

### PDF Generation

#### Convert URL to PDF

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  --data '{"url":"https://google.com"}' \
  'http://localhost:3000/pdf'
```

#### Convert HTML to PDF

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  --data '{"html":"<h1>Hello World</h1><p>This is a test document.</p>"}' \
  'http://localhost:3000/pdf'
```

#### Advanced PDF Options

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  --data '{
    "url": "https://example.com",
    "format": "A4",
    "margin": {
      "top": "1in",
      "right": "1in",
      "bottom": "1in",
      "left": "1in"
    },
    "printBackground": true,
    "landscape": false
  }' \
  'http://localhost:3000/pdf'
```

### Image Generation

#### Convert URL to Image

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  --data '{"url":"https://google.com"}' \
  'http://localhost:3000/image'
```

#### Convert HTML to Image

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  --data '{"html":"<h1>Hello World</h1>"}' \
  'http://localhost:3000/image'
```

#### Advanced Image Options

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  --data '{
    "url": "https://example.com",
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "fullPage": true,
    "type": "png"
  }' \
  'http://localhost:3000/image'
```

## Configuration Options

### PDF Options

All Puppeteer PDF options are supported (except `path`). See the [Puppeteer documentation](https://devdocs.io/puppeteer/index#pagepdfoptions) for complete details.

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `format` | string | Paper format (A4, Letter, Legal, etc.) | A4 |
| `landscape` | boolean | Paper orientation | false |
| `printBackground` | boolean | Print background graphics | false |
| `margin` | object | Page margins | {} |
| `scale` | number | Scale of the webpage rendering | 1 |
| `displayHeaderFooter` | boolean | Display header and footer | false |
| `headerTemplate` | string | HTML template for header | |
| `footerTemplate` | string | HTML template for footer | |

### Image Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `type` | string | Image format (png, jpeg, webp) | png |
| `quality` | number | Image quality (0-100, jpeg only) | 80 |
| `fullPage` | boolean | Capture full scrollable page | false |
| `viewport` | object | Page viewport size | {width: 800, height: 600} |
| `clip` | object | Capture specific area | |

### Request Examples

#### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3000/pdf', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com',
    format: 'A4',
    margin: { top: '1cm', bottom: '1cm' }
  })
});

const pdfBuffer = await response.arrayBuffer();
```

#### Python
```python
import requests

response = requests.post('http://localhost:3000/pdf', json={
    'url': 'https://example.com',
    'format': 'A4',
    'printBackground': True
})

with open('output.pdf', 'wb') as f:
    f.write(response.content)
```

#### PHP
```php
<?php
$data = [
    'url' => 'https://example.com',
    'format' => 'A4',
    'landscape' => false
];

$response = file_get_contents('http://localhost:3000/pdf', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode($data)
    ]
]));

file_put_contents('output.pdf', $response);
?>
```

## Architecture Support

This service supports both AMD64 and ARM64 architectures.

### Apple Silicon (M1/M2/M3) Compatibility

For Apple Silicon Macs, you may encounter issues with the default Docker setup. If you see errors like:

```text
Failed to launch the browser process!
The hardware on this system lacks support for the sse3 instruction set.
```

**Solution:** Use Colima for better x86_64 emulation support:

```bash
# Install Colima
brew install colima

# Start with x86_64 architecture
colima start --arch x86_64 --cpu 4 --memory 16

# Now run your Docker commands
docker run -p 3000:3000 philiplehmann/puppeteer:latest
```

## Development

### Local Development Setup

#### Prerequisites
- Node.js 18+
- Chrome/Chromium browser
- Nx CLI

#### Start Development Server

```bash
# Set Chrome executable path (macOS)
export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Start the development server
yarn nx serve puppeteer
```

The server will be available at `http://localhost:3000`

### Testing

#### Run All Tests Locally
```bash
# Set environment for local testing
export TEST_SERVER_RUNNER=local

# Run end-to-end tests with Playwright
yarn nx e2e-local puppeteer

# Run unit tests with Vitest  
yarn nx vitest-local puppeteer

# Run both test suites
yarn nx test-local puppeteer
```

#### Update Test Snapshots
```bash
yarn nx e2e puppeteer --update-snapshots
```

### Building and Deployment

#### Using Nx (Recommended)
```bash
# Build Docker image
nx build puppeteer

# Test the build
nx docker-test puppeteer

# Run the container
nx docker-run puppeteer

# Push to registry
nx docker-push puppeteer
```

#### Using Docker Directly
```bash
# Build image
docker build -t puppeteer -f apps/puppeteer/Dockerfile .

# Run container
docker run -p 3000:3000 puppeteer
```

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | HTTP | REST API server |

## Environment Variables


| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Node.js environment |
| `PUPPETEER_EXECUTABLE_PATH` | | Custom Chrome executable path |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | | Skip Chromium download |

## Troubleshooting

### Common Issues

**Chrome fails to launch:**
- Ensure sufficient memory is allocated to Docker
- Try running with `--no-sandbox` flag in production
- Check Chrome executable permissions

**Memory issues:**
- Increase Docker memory limits
- Use `--max-old-space-size` Node.js flag
- Consider adding swap space

**Timeout errors:**
- Increase timeout values in requests
- Check network connectivity
- Ensure target URLs are accessible

**Font rendering issues:**
- Install additional fonts in the container
- Set proper locale settings
- Use web-safe fonts

### Debug Mode

Enable debug logging by setting:
```bash
export DEBUG="puppeteer:*"
yarn nx serve puppeteer
```

## Performance Tips

1. **Reuse Browser Instance** - The service reuses Chrome instances for better performance
2. **Memory Management** - Pages are automatically closed after processing
3. **Caching** - Consider implementing response caching for frequently requested content
4. **Resource Limiting** - Set appropriate memory and CPU limits in production

## Security Considerations

- Run in a sandboxed environment
- Validate input URLs and HTML content
- Consider rate limiting for public deployments
- Use network policies to restrict outbound connections
- Keep Chrome/Puppeteer updated for security patches

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with `nx test puppeteer`
5. Submit a pull request

## License

This project is licensed under the MIT License.
