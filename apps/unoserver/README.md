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
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?convertTo=pdf'
```

convert to png
```
curl -X POST \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.png \
  'http://localhost:3000/convert?convertTo=png'
```

convert to jpeg
```
curl -X POST \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.jpeg \
  'http://localhost:3000/convert?convertTo=jpeg'
```

inputFilter - The LibreOffice input filter to use (ex 'writer8'), if autodetect fails
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?inputFilter=writer8'
```

outputFilter - The export filter to use when converting. It is selected automatically if not specified.
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?outputFilter=writer_pdf_Export'
```

filterOptions - The options to use for the output filter, if not specified, the default options are used.
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?filterOptions=PageRange=1-2'
```

updateIndex - Updates the indexes before conversion. Can be time consuming.
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?updateIndex=true'
```

dontUpdateIndex - Skip updating the indexes.
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?dontUpdateIndex=true'
```


verbose - Increase informational output to stderr.
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?verbose=true'
```


quiet - Decrease informational output to stderr.
```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@apps/unoserver/src/test/assets/dummy.docx" --output tmp/document.pdf \
  'http://localhost:3000/convert?quiet=true'
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

# run node-test
TEST_SERVER_RUNNER=local yarn nx node-test-local unoserver

# run both, e2e and node-test
TEST_SERVER_RUNNER=local yarn nx test-local unoserver
´´´
