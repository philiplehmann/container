# Container

Monorepo containing multiple images for wrapped binaries or custom builds

## Start the app

most apps need binary dependencies and can be served via docker with `docker-run`

```
yarn nx docker-run poppler
yarn nx docker-run tesseract
yarn nx docker-run unoserver
```

use `serve` to really run it locally but you have to install dependencies yourself

```
yarn nx serve poppler
yarn nx serve tesseract
yarn nx serve unoserver
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
