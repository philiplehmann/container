# office-pdf

A single Rust HTTP server that converts office documents to PDF and images, as an alternative to the
`unoserver` image. It uses ArtCraft's clean-room Rust office engines (MIT OR Apache-2.0), linked into
the binary:

| engine                                              | documents                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| [WordCraft](https://github.com/storytold/wordcraft) | docx, docm, dotx, dotm, doc, dot, odt, ott, rtf, html, md, txt, xml |
| [DeckCraft](https://github.com/storytold/deckcraft) | pptx, pptm, potx, ppsx, ppt, pps                                    |
| [GridCraft](https://github.com/storytold/gridcraft) | xlsx, xlsm, xltx, xls, xlsb, ods, csv, tsv                          |

It also does what the `poppler` and `pdftk` images do — text and HTML extraction, page images,
compress, encrypt, forms, split, merge, rotate, stamp — with pure-Rust libraries: [lopdf](https://github.com/J-F-Liu/lopdf)
for editing and craft-libs' vendored [hayro](https://github.com/LaurenzV/hayro) for reading and
rendering pages.

There is no LibreOffice, JVM, poppler, Python or Node runtime in the image: one process of
40–70 MB of memory (about 170 MB once presentations have been converted), and most requests take
milliseconds. One container instead of four (unoserver, poppler, pdftk, and the JVM they need).

> The ArtCraft engines are alpha software. Layout fidelity is good for typical documents but not on
> par with LibreOffice yet; use `strict=true` to refuse output with missing glyphs or pictures.

## API

The API is versioned by path: everything is under `/v1`. A breaking change gets a new prefix (`/v2`)
while `/v1` keeps working. Only the container probes (`/health/*`) are unversioned.

The endpoints mirror the unoserver image, with the same parameters, so its use cases carry over by
prefixing the paths with `/v1`. Unlike unoserver, every endpoint is always available: there is no
LibreOffice to start, so there are no `UNOSERVER_DIRECT_ONLY`, `UNOSERVER_FS_ENABLE` or
`UNOSERVER_PROCESS_ENABLED` switches.

| unoserver                   | office-pdf                     |
| --------------------------- | ------------------------------ |
| `POST /convert`             | `POST /v1/convert`             |
| `POST /direct`              | `POST /v1/direct`              |
| `POST /direct-fs`           | `POST /v1/direct-fs`           |
| `GET/DELETE /processes`     | `GET/DELETE /v1/processes`     |
| `GET/DELETE /processes/:id` | `GET/DELETE /v1/processes/:id` |
| `GET /health/*`             | `GET /health/*`                |
|                             | `GET /v1/openapi.json`         |

### `GET /v1/openapi.json`

The OpenAPI 3.1 document, generated from the handlers (so it can't drift from the code). The same
document is printed by `office-pdf openapi`, e.g. for client generators:

```bash
docker run --rm philiplehmann/office-pdf office-pdf openapi > openapi.json
```

### `POST /v1/convert` and `POST /v1/direct`

The request body is the document, the response the converted file (`application/pdf`, `image/png`,
`image/jpeg` or `image/webp`).

| query             | `/convert` | `/direct` | description                                                                                              |
| ----------------- | :--------: | :-------: | -------------------------------------------------------------------------------------------------------- |
| `convertTo`       |     ✓      |     ✓     | `pdf` (default), `png`, `jpeg`, `webp`                                                                   |
| `inputFilter`     |     ✓      |           | LibreOffice import filter name (`MS Word 2007 XML`, `Impress MS PowerPoint 2007 XML`, …)                 |
| `outputFilter`    |     ✓      |     ✓     | LibreOffice export filter name (`writer_pdf_Export`, `impress_png_Export`, …)                            |
| `filterOptions`   |     ✓      |     ✓     | `Name=Value` or JSON (`{"PageRange":{"type":"string","value":"1-2"}}`); repeatable; needs `outputFilter` |
| `timeoutMs`       |     ✓      |     ✓     | give up after this many milliseconds (the conversion is listed as killed)                                |
| `updateIndex`     |     ✓      |           | update tables of contents and fields before exporting                                                    |
| `dontUpdateIndex` |     ✓      |           | accepted (it is the default)                                                                             |
| `verbose`         |     ✓      |           | log the request's options                                                                                |
| `quiet`           |     ✓      |           | accepted                                                                                                 |
| `format`          |     ✓      |     ✓     | input format by extension; default: `Content-Type`, then content detection                               |
| `markup`          |     ✓      |     ✓     | print markup: tracked changes and comments (text documents)                                              |
| `strict`          |     ✓      |     ✓     | fail with 422 instead of writing output with missing glyphs or pictures                                  |

The password of an encrypted document goes in the `X-Document-Password` header.

Filter options: `PageRange` (`1-2`, `1,3,5-7`, `4-`) selects pages or slides, `Quality` (1–100) sets
JPEG quality; other options (`SelectPdfVersion`, …) are accepted and have no effect. Images are one
page: the first of `PageRange`, else page 1. Spreadsheets convert to PDF only.

Errors are JSON, `{ "error": "…" }`:

| status | meaning                                                                   |
| ------ | ------------------------------------------------------------------------- |
| 400    | invalid or unknown parameter, unknown filter or filter option, empty body |
| 401    | password missing or wrong                                                 |
| 413    | body larger than `MAX_BODY_BYTES`                                         |
| 415    | unsupported input format or output type                                   |
| 422    | document can't be read, or `strict` refused it                            |
| 500    | conversion failed or was killed                                           |
| 504    | conversion exceeded `timeoutMs`                                           |

```bash
curl --data-binary @report.docx -o report.pdf http://localhost:3000/v1/convert
curl --data-binary @slides.pptx -o slide2.png \
  'http://localhost:3000/v1/convert?outputFilter=impress_png_Export&filterOptions=PageRange%3D2'
curl --data-binary @old.doc -o first-pages.pdf \
  'http://localhost:3000/v1/direct?outputFilter=writer_pdf_Export&filterOptions=PageRange%3D1-2'
```

### `POST /v1/direct-fs`

Converts a file below `FS_INPUT_ROOT` into a file below `FS_OUTPUT_ROOT` (mount them as volumes).

```json
{
  "inputPath": "in.doc",
  "outputPath": "converted/in.pdf",
  "convertTo": "pdf",
  "outputFilter": "writer_pdf_Export",
  "filterOptions": ["PageRange=1-2"],
  "timeoutMs": 30000
}
```

Answers `{ "status": "complete", "inputPath", "outputPath", "outputBytes", "durationMs" }`, or
`{ "status": "error", "message" }` with 400 for absolute paths, paths leaving the roots (`..`,
symbolic links) and missing input files. Missing output folders are created; the output is written
atomically.

### `/v1/processes`

The conversions of the server, shaped like unoserver's tracked processes (`id`, `command` = the
engine, `args`, `pid`, `status`, `startTime`, `endTime`, `exitCode`, `signal`). Conversions run in
process, so `pid` is the server's.

| request                             | description                                                   |
| ----------------------------------- | ------------------------------------------------------------- |
| `GET /v1/processes?status=`         | list (`running`, `completed`, `failed`, `killed`) and summary |
| `DELETE /v1/processes?olderThan=ms` | remove finished conversions                                   |
| `GET /v1/processes/{id}`            | one conversion                                                |
| `DELETE /v1/processes/{id}?signal=` | kill a running conversion: its request gets an error          |

A conversion thread can't be interrupted: a killed or timed-out conversion finishes in the
background and holds its slot (`MAX_CONCURRENT_CONVERSIONS`) until then.

### PDF tools

The request body is the PDF (except `merge`, `stamp`, `background`: `multipart/form-data`). The
password of an encrypted input goes in `X-Document-Password`; encrypted inputs come out
decrypted unless the operation is `encrypt`. Errors are JSON, `{ "error": "…" }` (400 invalid
parameters, 401 password, 422 not a readable PDF, 504 timeout).

| endpoint           | query                                                                                                                                                                                                                                               | answers                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `/v1/pdf-to-text`  | `pages` (`1-3`)                                                                                                                                                                                                                                     | `text/plain`, pages end with `\f`      |
| `/v1/pdf-to-html`  | `pages`                                                                                                                                                                                                                                             | `text/html`, lines positioned          |
| `/v1/pdf-to-image` | `pages` (default `1`), `dpi` (150), `convertTo` (png, jpeg, webp), `quality`                                                                                                                                                                        | an image, or a ZIP for several pages   |
| `/v1/compress`     |                                                                                                                                                                                                                                                     | PDF                                    |
| `/v1/uncompress`   |                                                                                                                                                                                                                                                     | PDF                                    |
| `/v1/encrypt`      | `password` (owner, required), `userPassword`, `allow` (repeatable: Printing, DegradedPrinting, ModifyContents, Assembly, CopyContents, ScreenReaders, ModifyAnnotations, FillIn, AllFeatures), `encryption` (aes256 default, aes128, 128bit, 40bit) | PDF                                    |
| `/v1/decrypt`      | `password`                                                                                                                                                                                                                                          | PDF                                    |
| `/v1/data/fields`  |                                                                                                                                                                                                                                                     | JSON, as the pdftk image               |
| `/v1/data/dump`    |                                                                                                                                                                                                                                                     | JSON, as the pdftk image               |
| `/v1/data/annots`  |                                                                                                                                                                                                                                                     | JSON                                   |
| `/v1/data/fdf`     |                                                                                                                                                                                                                                                     | FDF                                    |
| `/v1/form/fill`    | field values by name (`Name=John`, check boxes `true`/`false` or a state), `flag` (need_appearances default, flatten, replacement_font), `fontName`                                                                                                 | PDF                                    |
| `/v1/cat`          | `pages` in pdftk syntax: `1-3,7`, `5-1`, `end`, `r1`, `1-endodd`; pages may repeat                                                                                                                                                                  | PDF                                    |
| `/v1/split`        | `range` (repeatable, one file each) or `every` (pages per file, default 1)                                                                                                                                                                          | ZIP (`pg_0001.pdf` or `part_0001.pdf`) |
| `/v1/merge`        | multipart: the PDFs as file fields, in order                                                                                                                                                                                                        | PDF                                    |
| `/v1/rotate`       | `angle` (multiple of 90, clockwise), `pages`                                                                                                                                                                                                        | PDF                                    |
| `/v1/stamp`        | multipart `file` + `stamp`; `multi` for page n on page n                                                                                                                                                                                            | PDF                                    |
| `/v1/background`   | multipart `file` + `background`; `multi`                                                                                                                                                                                                            | PDF                                    |

```bash
curl --data-binary @in.pdf http://localhost:3000/v1/pdf-to-text
curl --data-binary @in.pdf -o in.zip 'http://localhost:3000/v1/split'
curl -F a=@one.pdf -F b=@two.pdf -o both.pdf http://localhost:3000/v1/merge
curl -F file=@in.pdf -F stamp=@draft.pdf -o stamped.pdf http://localhost:3000/v1/stamp
curl --data-binary @form.pdf -o filled.pdf 'http://localhost:3000/v1/form/fill?Name=John%20Doe&Agree=true&flag=flatten'
```

Differences from the pdftk and poppler images:

- `data/fields` keeps a field's tooltip (`title`) when it has several widgets (pdftk drops it), and
  `justification` can be `center`.
- `form/fill` with `true` selects a radio group's choice; the pdftk image sets the second state
  name, which is `Off` for some groups. A value that is not `true`/`false` or a state of the
  button is an error (400) instead of being ignored. `replacement_font` takes one of the 14
  standard PDF fonts (no font embedding).
- `encrypt` defaults to AES-256 (pdftk: RC4 128 bit; still available as `encryption=128bit`).
- `pdf-to-text` and `pdf-to-html` lay text out by its position on the page; on the test documents
  the words match `pdftotext` 98–100 %, but complex layouts (columns, tables) can order differently.
- `pdf-to-text` answers `text/plain` and `pdf-to-html` `text/html` (the poppler image sent
  `plain/text` and `plain/html`).

### `GET /health/liveness`, `GET /health/readiness`

Return `ok`.

## Configuration

| env                          | default     | description                                        |
| ---------------------------- | ----------- | -------------------------------------------------- |
| `HOST`                       | `0.0.0.0`   | bind address                                       |
| `PORT`                       | `3000`      | port                                               |
| `MAX_BODY_BYTES`             | `104857600` | largest accepted document (also for `/direct-fs`)  |
| `MAX_CONCURRENT_CONVERSIONS` | CPU count   | conversions at once; further requests wait         |
| `FS_INPUT_ROOT`              | `/data/in`  | `/v1/direct-fs` input root                         |
| `FS_OUTPUT_ROOT`             | `/data/out` | `/v1/direct-fs` output root                        |
| `PROCESS_RETENTION_MS`       | `3600000`   | how long finished conversions stay listed          |
| `PROCESS_MAX_COMPLETED`      | `1000`      | how many finished conversions stay listed          |
| `RUST_LOG`                   | `info`      | log filter (`info,tower_http=debug` logs requests) |

Text is laid out with the fonts fontconfig finds. The image ships Liberation, DejaVu, Carlito,
Caladea and Noto; mount or install more fonts (e.g. `fonts-noto-cjk`) for other scripts.

## Development

The toolchain is pinned in `rust-toolchain.toml` (and `.tool-versions` for mise).

```bash
bun nx install office-pdf      # cargo fetch
bun nx serve office-pdf        # cargo run
bun nx test office-pdf         # cargo test (includes the ported unoserver, poppler and pdftk suites)
bun nx lint office-pdf         # cargo fmt --check + cargo clippy -D warnings
bun nx typecheck office-pdf    # the e2e TypeScript
bun nx format office-pdf       # cargo fmt
bun nx build office-pdf        # cargo build --release
bun nx docker-test office-pdf  # build the image and run e2e/*.spec.ts against it
bun nx docker-run office-pdf
```

The tests port the unoserver, poppler and pdftk suites (with their fixtures and snapshots) twice: in
Rust against the router (`tests/http.rs`, `tests/pdf.rs`) and in Bun against the container (`e2e/`).

## Updating the engines

`Cargo.toml` pins each engine to a commit. Their PDF writers use a fork of `krilla` through
`[patch.crates-io]`, which Cargo does not pass on to dependents, so the patch is repeated here, at the
`craft-libs` revision of the pinned WordCraft commit's `Cargo.toml`. DeckCraft pins another revision
of the same fork; check that it still builds against WordCraft's when updating. The PDF reader
(`craft-pdf` with hayro) uses the same craft-libs revision, with the `hayro*` and `vello_*` patches.

## Roadmap

- Images of spreadsheets, and of more than one page per `/convert` request.
- pdftk's attachments (`attach_files`, `unpack_files`), bookmarks (`update_info`) and
  `replacement_font` with embedded TrueType fonts.
