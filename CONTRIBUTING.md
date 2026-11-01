# Contributing

1. Follow [Setup](docs/developer/1.setup.md), pick an issue and wait to be assigned.
2. Branch from `dev`: `feature/<name>` or `bugfix/<name>`.
3. Update the relevant docs, configure the integration services and run `make check`
   ([Testing](docs/developer/4.testing.md)). It includes real model requests.
4. Open a PR to `dev` using a [Conventional Commit title](docs/developer/3.conventions.md#commit-convention).
   PRs are squash-merged; the title determines the version.

CI provisions its own Ollama service and runs the same software suites; inspect its result after pushing.
See [Release](docs/developer/5.release.md) for publication and recovery.
Coding agents need explicit approval for commits, pushes and publishing.
Follow the [Code of Conduct](CODE_OF_CONDUCT.md); report security issues through
[SECURITY.md](SECURITY.md), never a public issue.
