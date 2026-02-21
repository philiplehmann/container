# MailCatcher

MailCatcher is a simple SMTP server that catches any email sent to it and displays it in a web interface. It's perfect for testing email functionality in development environments without actually sending emails.

## Features

- 📧 Catches all outbound emails in development
- 🌐 Web interface to view caught emails
- 🔍 Search and filter emails
- 📱 Responsive design for mobile viewing
- 🚀 Lightweight and fast
- 🐳 Ready-to-use Docker container

## Quick Start

### Run with Docker

```bash
docker run -p 1080:1080 -p 1025:1025 --name mailcatcher-server philiplehmann/mailcatcher:latest
```

### Run with Docker Compose

```yaml
services:
  mailcatcher:
    image: philiplehmann/mailcatcher:latest
    ports:
      - "1080:1080"  # Web interface
      - "1025:1025"  # SMTP server
    container_name: mailcatcher-server
```

## Configuration

### Ports

| Port | Service | Description |
|------|---------|-------------|
| 1025 | SMTP | Mail server for receiving emails |
| 1080 | HTTP | Web interface for viewing emails |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_PORT` | 1025 | SMTP server port (not used by the current Dockerfile `CMD` in `apps/mailcatcher/Dockerfile`; changes require rebuilding the image or modifying `CMD` to read `SMTP_PORT`) |
| `HTTP_PORT` | 1080 | Web interface port (not used by the current Dockerfile `CMD` in `apps/mailcatcher/Dockerfile`; changes require rebuilding the image or modifying `CMD` to read `HTTP_PORT`) |

## Usage

### Configure Your Application

Point your application's SMTP settings to:
- **Host:** `localhost` (or your Docker container IP)
- **Port:** `1025`
- **Authentication:** None required

### View Caught Emails

Open your browser and navigate to:
```text
http://localhost:1080
```

### Example Configuration

#### Node.js (Nodemailer)
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  secure: false, // No SSL/TLS
  auth: null     // No authentication
});
```

#### Python (smtplib)
```python
import smtplib
from email.mime.text import MIMEText

server = smtplib.SMTP('localhost', 1025)
# No authentication needed
```

#### PHP
```php
ini_set('SMTP', 'localhost');
ini_set('smtp_port', 1025);
// Use mail() function as normal
```

## Development

### Building the Image

#### Using Nx (Recommended)
```bash
# Build the Docker image using Nx
nx docker-push mailcatcher

# Or from the workspace root
npx nx docker-push mailcatcher
```

#### Using Docker directly
```bash
docker build -t mailcatcher -f apps/mailcatcher/Dockerfile .
```

### Running in Development Mode

#### Using Nx
```bash
# Run the container using Nx
nx docker-run mailcatcher

# Test the Docker build
nx docker-test mailcatcher

# Run tests
nx test mailcatcher
```

#### Using Docker directly
```bash
# Run the container
docker run -p 1080:1080 -p 1025:1025 mailcatcher
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Check what's using the port
lsof -i :1080
lsof -i :1025

# Stop the container and try again
docker stop mailcatcher-server
docker rm mailcatcher-server
```

**Can't access web interface:**
- Ensure port 1080 is not blocked by firewall
- Check if Docker container is running: `docker ps`
- Verify port mapping: `docker port mailcatcher-server`

**Emails not being caught:**
- Verify your application is configured to use `localhost:1025`
- Check container logs: `docker logs mailcatcher-server`
- Ensure no authentication is configured in your email client

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
