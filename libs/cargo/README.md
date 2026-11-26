# @riwi/cargo

Nx executors for Rust projects, running `cargo` in the project root (so the project's
`rust-toolchain.toml` picks the toolchain).

| executor  | runs                                                 |
| --------- | ---------------------------------------------------- |
| `install` | `cargo fetch`                                        |
| `build`   | `cargo build`                                        |
| `test`    | `cargo test`                                         |
| `lint`    | `cargo fmt --check`, then `cargo clippy -D warnings` |
| `format`  | `cargo fmt`                                          |
| `run`     | `cargo run`                                          |

All executors accept `toolchain`, `manifestPath` (default `{projectRoot}/Cargo.toml`), `package`,
`locked`, `frozen`, `offline`, `target`, `targetDir`, `args` and `env`. The compiling executors
(`build`, `test`, `lint`, `run`) also take `release`, `profile`, `features`, `allFeatures` and
`noDefaultFeatures`.

```json
{
  "lint": { "executor": "@riwi/cargo:lint" },
  "test": { "executor": "@riwi/cargo:test", "options": { "locked": true } },
  "build": { "executor": "@riwi/cargo:build", "options": { "release": true, "locked": true } }
}
```

## Running unit tests

Run `nx test cargo` to execute the unit tests via [Bun test](https://bun.com/docs/test).
