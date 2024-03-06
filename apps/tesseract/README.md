# tesseract node wrapper

## Run Image

```
docker run -p 3000:3000 --rm --name tesseract philiplehmann/tesseract:latest
```

## Convert image to text

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/image.type" \
  'http://localhost:3000/image-to-text'
```

## Ports

- HTTP 3000
