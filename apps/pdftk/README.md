# pdftk node wrapper

## Run Image

```
docker run -p 3000:3000 --rm --name pdftk philiplehmann/pdftk:latest
```

## uncompress pdf file

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/image.type" \
  'http://localhost:3000/uncompress'
```

## Ports

- HTTP 3000
