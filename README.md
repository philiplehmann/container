# Container

Monorepo containing multiple images for wrapped binaries or custom builds

## Wrapper Apps

### poppler wrapper

- [doc](https://github.com/philiplehmann/container/blob/main/apps/poppler/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/poppler-server)

```bash
yarn nx docker-run poppler
```

### tesseract wrapper

- [doc](https://github.com/philiplehmann/container/blob/main/apps/tesseract/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/tesseract)

```bash
yarn nx docker-run tesseract
```

### tesseract wrapper

- [doc](https://github.com/philiplehmann/container/blob/main/apps/tesseract/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/tesseract)

```bash
yarn nx docker-run tesseract
```

### unoserver wrapper

- [doc](https://github.com/philiplehmann/container/blob/main/apps/unoserver/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/unoserver)

```bash
yarn nx docker-run unoserver
```

### puppeteer wrapper

- [doc](https://github.com/philiplehmann/container/blob/main/apps/puppeteer/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/puppeteer)

```bash
yarn nx docker-run puppeteer
```

## Mailboxes Apps

### MailCatcher (Ruby)

- [doc](https://github.com/philiplehmann/container/blob/main/apps/mailcatcher/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/mailcatcher)

```bash
yarn nx docker-run mailcatcher
```

### MailDev (Node)

- [doc](https://github.com/philiplehmann/container/blob/main/apps/maildev/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/maildev)

```bash
yarn nx docker-run maildev
```

### MailHog (Go)

- [doc](https://github.com/philiplehmann/container/blob/main/apps/mailhog/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/mailhog)

```bash
yarn nx docker-run mailhog
```

## Lint

```
yarn nx run-many --target lint
```

## Test

```
yarn nx run-many --target test
```

## Generate code

generate a new application, generates are not very configured and project/testing/linting has to be ajusted afterwards in the project.json

```
yarn nx g @nx/node:application name
```

generate a new library, generates are not very configured and project/testing/linting has to be ajusted afterwards in the project.json

```
yarn nx g @nx/node:library libs/new/name
```

If you happen to use Nx plugins, you can leverage code generators that might come with it.

Run `nx list` to get a list of available plugins and whether they have generators. Then run `nx list <plugin-name>` to see what generators are available.

Learn more about [Nx generators on the docs](https://nx.dev/plugin-features/use-code-generators).
