# MailDev

MailDev, built on top of Node.js, is a simple way to test your project's generated emails during development with an easy-to-use web interface that runs on your machine. It's perfect for testing email functionality in development environments without actually sending emails.

## Features

- 📧 Catches all outbound emails in development
- 🌐 Clean, intuitive web interface
- 📱 Responsive design for mobile viewing
- 🔍 Search and filter emails by sender, subject, or content
- 📎 View HTML and plain text versions of emails
- 📋 Download email attachments
- 🔄 Auto-refresh and real-time updates
- 🗑️ Delete individual emails or clear all
- 🚀 Lightweight and fast
- 🐳 Ready-to-use Docker container

## Quick Start

### Run with Docker

```bash
docker run -p 1080:1080 -p 1025:1025 --name maildev-server philiplehmann/maildev:latest
```

### Run with Docker Compose

```yaml
services:
  maildev:
    image: philiplehmann/maildev:latest
    ports:
      - "1080:1080"  # Web interface
      - "1025:1025"  # SMTP server
    container_name: maildev-server
    environment:
      - MAILDEV_WEB_PORT=1080
      - MAILDEV_SMTP_PORT=1025
```

### Run with Nx

```bash
# Build the Docker image
nx docker-push maildev

# Run the container
nx docker-run maildev

# Test the Docker build
nx docker-test maildev
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
| `MAILDEV_WEB_PORT` | 1080 | Web interface port |
| `MAILDEV_SMTP_PORT` | 1025 | SMTP server port |
| `MAILDEV_WEB_IP` | 0.0.0.0 | IP address to bind web interface |
| `MAILDEV_SMTP_IP` | 0.0.0.0 | IP address to bind SMTP server |
| `MAILDEV_BASE_PATHNAME` | / | Base path for web interface |
| `MAILDEV_DISABLE_DNS` | false | Disable DNS lookups |

## Usage

### Configure Your Application

Point your application's SMTP settings to:
- **Host:** `localhost` (or your Docker container IP)
- **Port:** `1025`
- **Authentication:** None required
- **Encryption:** None (plain text)

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
  auth: null,    // No authentication
  tls: {
    rejectUnauthorized: false
  }
});

// Send test email
transporter.sendMail({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test Email',
  text: 'This is a test email',
  html: '<p>This is a <strong>test email</strong></p>'
});
```

#### Python (smtplib)
```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Create message
msg = MIMEMultipart('alternative')
msg['Subject'] = 'Test Email'
msg['From'] = 'sender@example.com'
msg['To'] = 'recipient@example.com'

# Add content
text = 'This is a test email'
html = '<p>This is a <strong>test email</strong></p>'
msg.attach(MIMEText(text, 'plain'))
msg.attach(MIMEText(html, 'html'))

# Send email
server = smtplib.SMTP('localhost', 1025)
server.send_message(msg)
server.quit()
```

#### PHP
```php
<?php
// Configure mail settings
ini_set('SMTP', 'localhost');
ini_set('smtp_port', 1025);

// Send email
$to = 'recipient@example.com';
$subject = 'Test Email';
$message = 'This is a test email';
$headers = 'From: sender@example.com' . "\r\n" .
           'Content-Type: text/html; charset=UTF-8' . "\r\n";

mail($to, $subject, $message, $headers);
?>
```

#### Laravel (.env configuration)
```env
MAIL_MAILER=smtp
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=test@example.com
MAIL_FROM_NAME="${APP_NAME}"
```

## Web Interface Features

### Email List View
- View all caught emails in chronological order
- Filter by sender, recipient, or subject
- Quick preview of email content
- Attachment indicators

### Email Detail View
- Toggle between HTML and plain text views
- Download individual attachments
- View email headers
- Copy email content

### Toolbar Actions
- 🔄 Refresh email list
- 🗑️ Delete individual emails
- 🗑️ Clear all emails
- 🔍 Search functionality

## Development

### Building the Image

#### Using Nx (Recommended)
```bash
# Build and push the Docker image using Nx
nx docker-push maildev

# Or from the workspace root
npx nx docker-push maildev
```

#### Using Docker directly
```bash
docker build -t maildev -f apps/maildev/Dockerfile .
```

### Running in Development Mode

#### Using Nx
```bash
# Run the container using Nx
nx docker-run maildev

# Test the Docker build
nx docker-test maildev

# Run tests
nx test maildev

# Lint the code
nx lint maildev
```

#### Using Docker directly
```bash
# With custom configuration
docker run -p 1080:1080 -p 1025:1025 \
  -e MAILDEV_WEB_PORT=1080 \
  -e MAILDEV_SMTP_PORT=1025 \
  --name maildev-dev \
  philiplehmann/maildev:latest
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Check what's using the port
lsof -i :1080
lsof -i :1025

# Stop the container and try again
docker stop maildev-server
docker rm maildev-server
```

**Can't access web interface:**
- Ensure port 1080 is not blocked by firewall
- Check if Docker container is running: `docker ps`
- Verify port mapping: `docker port maildev-server`
- Check container logs: `docker logs maildev-server`

**Emails not being caught:**
- Verify your application is configured to use `localhost:1025`
- Ensure no authentication is configured in your email client
- Check that TLS/SSL is disabled
- Verify SMTP settings in your application

**Web interface shows no emails:**
- Check that emails are actually being sent by your application
- Verify the container is receiving SMTP connections
- Clear browser cache and refresh the page

### Logging

To see MailDev logs:
```bash
# View container logs
docker logs maildev-server

# Follow logs in real-time
docker logs -f maildev-server
```

## Comparison with MailCatcher

| Feature | MailDev | MailCatcher |
|---------|---------|-------------|
| Technology | Node.js | Ruby |
| Web Interface | Modern, responsive | Simple, functional |
| Real-time Updates | ✅ | ❌ |
| Attachment Support | ✅ | ✅ |
| Search Functionality | ✅ | ❌ |
| Mobile Responsive | ✅ | ✅ |
| Memory Usage | Higher | Lower |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with `nx test maildev`
5. Submit a pull request

## License

This project is licensed under the MIT License.
