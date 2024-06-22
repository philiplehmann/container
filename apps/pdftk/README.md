# pdftk node wrapper

## Run Image

```
docker run -p 3000:3000 --rm --name pdftk philiplehmann/pdftk:latest
```

## compress pdf file

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/uncompressed.pdf" \
  'http://localhost:3000/compress'
```

## uncompress pdf file

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/compressed.pdf" \
  'http://localhost:3000/uncompress'
```

## encrypt pdf file

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/file.pdf" \
  'http://localhost:3000/encrypt?password=1234&userPassword=asdf&allow=Printing'
```

options:
 - password - String (required)
 - userPassword - String
 - allow - Enum
   - Printing
   - DegradedPrinting
   - ModifyContents
   - Assembly
   - CopyContents
   - ScreenReaders
   - ModifyAnnotations
   - FillIn
   - AllFeatures

## decrypt pdf file

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/encrypted.pdf" \
  'http://localhost:3000/decrypt?password=1234'
```

## data fields pdf file
returns the pdf form fields as json

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/pdf-form.pdf" \
  'http://localhost:3000/data/fields'
```

## data dump pdf file
returns pdf file information as json

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/file.pdf" \
  'http://localhost:3000/data/dump'
```

## data fdf pdf file
returns pdf form fields as fdf format

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/pdf-form.pdf" \
  'http://localhost:3000/data/fdf'
```

## form fill pdf file
fills pdf passed values

```
curl -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-binary "@path/to/my/pdf-form.pdf" \
  'http://localhost:3000/form/fill?field1=value1&field2=value2'
```

arguments:
 - flag - Enum
   - need_appearances (default)
   - flatten
   - replacement_font (additional fontName can be defined)
 - fontName
  
 - all form fields are passed with the name

## Ports

- HTTP 3000
