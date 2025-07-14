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


## test locally

start puppeteer server, will be on port 3000
```
LIBREOFFICE_EXECUTABLE_PATH="/Applications/LibreOffice.app/Contents/MacOS/soffice" yarn nx serve unoserver
```

run *-local tests
```
# run playwright ui tests
TEST_SERVER_RUNNER=local yarn nx e2e-local unoserver

# run vitest
TEST_SERVER_RUNNER=local yarn nx vitest-local unoserver

# run both, e2e and vitest
TEST_SERVER_RUNNER=local yarn nx test-local unoserver
´´´
