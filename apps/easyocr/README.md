# easyocr node wrapper

## Run Image

```
docker run --rm -p 3000:3000 --name easyocr philiplehmann/easyocr:latest
```

## Convert file

default without a param will create pdf
```
curl -X POST \
  -H 'content-type: image/jpeg' \
  --data-binary "@apps/easyocr/src/test/assets/helsana.jpg" \
  'http://localhost:3000/readtext'
```

## Ports

- HTTP 3000
