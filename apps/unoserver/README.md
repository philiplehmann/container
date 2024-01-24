# unoserver node wrapper

## Run Image
```
docker run --rm -p 5000:5000 --name unoserver philiplehmann/unoserver:latest
```

## Convert file
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:5000/convert'
```

## Ports
 - HTTP 5000
