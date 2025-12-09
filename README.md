# Container

Monorepo containing multiple images for wrapped binaries or custom builds

## Wrapper Apps

### poppler wrapper

- [doc](https://github.com/philiplehmann/container/blob/main/apps/poppler/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/poppler-server)

```bash
bun nx docker-run poppler
```

### tesseract wrapper

- [doc](https://github.com/philiplehmann/container/blob/main/apps/tesseract/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/tesseract)

```bash
bun nx docker-run tesseract
```

### unoserver wrapper

- [doc](https://github.com/philiplehmann/container/blob/main/apps/unoserver/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/unoserver)

```bash
bun nx docker-run unoserver
```

### puppeteer wrapper

- [doc](https://github.com/philiplehmann/container/blob/main/apps/puppeteer/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/puppeteer)

```bash
bun nx docker-run puppeteer
```

### pdftk wrapper

- [doc](https://github.com/philiplehmann/container/blob/main/apps/pdftk/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/pdftk)

```bash
bun nx docker-run pdftk
```

## Mailboxes Apps

### MailCatcher (Ruby)

- [doc](https://github.com/philiplehmann/container/blob/main/apps/mailcatcher/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/mailcatcher)

```bash
bun nx docker-run mailcatcher
```

### MailDev (Node)

- [doc](https://github.com/philiplehmann/container/blob/main/apps/maildev/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/maildev)

```bash
bun nx docker-run maildev
```

### MailHog (Go)

- [doc](https://github.com/philiplehmann/container/blob/main/apps/mailhog/README.md)
- [docker](https://hub.docker.com/r/philiplehmann/mailhog)

```bash
bun nx docker-run mailhog
```

## Lint

```
bun nx run-many --target lint
```

## Test

```
bun nx run-many --target test
```

## Generate code

generate a new application, generates are not very configured and project/testing/linting has to be ajusted afterwards in the project.json

```
bun nx g @nx/node:application name
```

generate a new library, generates are not very configured and project/testing/linting has to be ajusted afterwards in the project.json

```
bun nx g @nx/node:library libs/new/name
```

If you happen to use Nx plugins, you can leverage code generators that might come with it.

Run `nx list` to get a list of available plugins and whether they have generators. Then run `nx list <plugin-name>` to see what generators are available.

Learn more about [Nx generators on the docs](https://nx.dev/plugin-features/use-code-generators).
