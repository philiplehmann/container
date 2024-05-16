# puppeteer node wrapper

## Run Image

```
docker run -p 3000:3000 --name puppeteer philiplehmann/puppeteer:latest
```

## Convert url to pdf

```
curl -X POST \
  -H 'content-type: application/json' \
  --data '{"url":"https://google.com"}' \
  'http://localhost:3000/'
```

or

```
curl -X POST \
  -H 'content-type: application/json' \
  --data '{"url":"https://google.com"}' \
  'http://localhost:3000/pdf'
```

## Convert html to pdf

```
curl -X POST \
  -H 'content-type: application/json' \
  --data '{"html":"<h1>title</h1>"}' \
  'http://localhost:3000/'
```

or

```
curl -X POST \
  -H 'content-type: application/json' \
  --data '{"html":"<h1>title</h1>"}' \
  'http://localhost:3000/pdf'
```

## Convert url to image

```
curl -X POST \
  -H 'content-type: application/json' \
  --data '{"url":"https://google.com"}' \
  'http://localhost:3000/image'
```


## Convert html to image

```
curl -X POST \
  -H 'content-type: application/json' \
  --data '{"html":"<h1>title</h1>"}' \
  'http://localhost:3000/image'
```

## Props
all the puppeteer props to create a pdf are supported except the path
https://devdocs.io/puppeteer/index#pagepdfoptions


## Emulation
to allow to run in emulation, some settings are needed to not run into errors:

### Apple Silicon run amd64 version
using docker desktop it only supports 32-bit emulation and resolves in error:
```
Failed to launch the browser process!
The hardware on this system lacks support for the sse3 instruction set.
The upstream chromium project no longer supports this configuration.
For more information, please read and possibly provide input to their
bug tracking system at http://crbug.com/1123353
```

to get 64-bit support i could start it with colima:
```
brew install colima
colima start --arch x86_64 --cpu 4 --memory 16
```

## Ports

- HTTP 3000
