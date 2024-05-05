# unoserver node wrapper

## Run Image

```
docker run --rm -p 3000:3000 --name unoserver philiplehmann/unoserver:latest
```

## Convert file

default without a param will create pdf
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert'
```

convert to pdf
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?convertTo=pdf'
```

convert to png
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.png \
  'http://localhost:3000/convert?convertTo=png'
```

convert to jpeg
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.jpeg \
  'http://localhost:3000/convert?convertTo=jpeg'
```

## Ports

- HTTP 3000
