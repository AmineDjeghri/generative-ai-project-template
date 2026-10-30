# Contributing to this project

Thanks for taking the time to contribute! Everyone taking part follows the
[Code of Conduct](CODE_OF_CONDUCT.md); report unacceptable behavior by opening an issue.

Team members: the contributors of the repository.

1. Set up once: [1. Setup](docs/developer/1.setup.md) (`make install-dev`, `make pre-commit-install`).
2. Comment on (or create) the issue and wait to be assigned, then branch off `dev`
   (`feature/<name>`, `bugfix/<name>`) and follow the [Conventions](docs/developer/3.conventions.md).
3. Before pushing: `make test-all` and `make pre-commit` ([4. Testing](docs/developer/4.testing.md)).
   CI runs the same `make` targets, so what passes locally passes in CI.
4. Open a pull request to `dev`. Its title follows the
   [commit convention](docs/developer/3.conventions.md#commit-convention): it decides the next
   version. Pull requests are squash-merged.
5. Releases are made by semantic-release, never by hand-made tags:
   [5. Release](docs/developer/5.release.md).

Security issues: [SECURITY.md](SECURITY.md), never a public issue.
