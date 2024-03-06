# poppler node wrapper

## Run Image

```
docker run -p 3000:3000 --name poppler philiplehmann/poppler-server:latest
```

## Convert pdf to text

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/document.pdf" \
  'http://localhost:3000/pdf-to-text'
```

## Convert pdf to html

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/document.pdf" \
  'http://localhost:3000/pdf-to-html'
```

## Ports

- HTTP 3000
