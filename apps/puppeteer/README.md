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

## Convert html to pdf

```
curl -X POST \
  -H 'content-type: application/json' \
  --data '{"html":"<h1>title</h1>"}' \
  'http://localhost:3000/'
```

## Props
all the puppeteer props to create a pdf are supported except the path
https://devdocs.io/puppeteer/index#pagepdfoptions


## Ports

- HTTP 3000
