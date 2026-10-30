# Releases. GitHub Actions (main-release.yml, dev-release.yml) and a person on a laptop run the same targets.
#
#   make release-version   # semantic-release: bump the 3 versions, CHANGELOG.md, commit, tag v<version>, push, GitHub release
#   make release-assets    # attach the backend and frontend wheels + sdists to GitHub release v<version>
#   make release           # all of it: release-version, then build-package and release-assets
#
# Guards: on main or dev only, clean tree, HEAD equal to origin/<branch>. GitHub token: GH_TOKEN,
# else `gh auth login` (once), else a hidden prompt on a terminal.

export GH_TOKEN  # also from .env (included by common.mk)

.PHONY: release-version release-assets release

release-version: ## Version, CHANGELOG, commit, tag v<version>, push, GitHub release (main/dev, clean, in sync)
	@printf '%b\n' "${CYAN}=========> release-version...${NC}" >&2
	@branch=$$(git rev-parse --abbrev-ref HEAD); \
	case "$$branch" in main|dev) ;; *) printf '%b\n' "${RED}Release from main or dev only (on $$branch)${NC}"; exit 1 ;; esac; \
	if [ -n "$$(git status --porcelain)" ]; then printf '%b\n' "${RED}Uncommitted changes: commit or stash first${NC}"; exit 1; fi; \
	git fetch -q origin "$$branch" || { printf '%b\n' "${RED}Cannot fetch origin/$$branch${NC}"; exit 1; }; \
	if [ "$$(git rev-parse HEAD)" != "$$(git rev-parse "origin/$$branch")" ]; then printf '%b\n' "${RED}$$branch is not in sync with origin/$$branch: pull or push first${NC}"; exit 1; fi; \
	if [ -z "$$GH_TOKEN" ]; then GH_TOKEN=$$(gh auth token 2>/dev/null) || GH_TOKEN=""; fi; \
	if [ -z "$$GH_TOKEN" ]; then \
		if [ -t 0 ]; then \
			echo "Not logged in: run 'gh auth login', or paste a token now."; \
			printf "GitHub token (repo scope, input hidden): "; stty -echo; read -r GH_TOKEN; stty echo; echo; \
		else printf '%b\n' "${RED}No GitHub token: set GH_TOKEN or run gh auth login${NC}"; exit 1; fi; \
	fi; \
	export GH_TOKEN; \
	[ -n "$$GIT_COMMIT_AUTHOR" ] || GIT_COMMIT_AUTHOR="$$(git config user.name) <$$(git config user.email)>"; \
	export GIT_COMMIT_AUTHOR; \
	version=$$(PYTHONPATH=. $(UV) run --group dev semantic-release version --print 2>/dev/null | tr -d '[:space:]'); \
	if [ -z "$$version" ] || git rev-parse -q --verify "refs/tags/v$$version" >/dev/null; then \
		printf '%b\n' "${YELLOW}No releasable commit since the last tag (only chore/docs/refactor/...)${NC}"; \
		[ -z "$$GITHUB_OUTPUT" ] || echo "released=false" >> "$$GITHUB_OUTPUT"; exit 0; \
	fi; \
	PYTHONPATH=. GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/dev/null \
		$(UV) run --group dev semantic-release -v version || exit 1; \
	printf '%b\n' "${GREEN}Released v$$version${NC}"; \
	[ -z "$$GITHUB_OUTPUT" ] || { echo "released=true"; echo "version=$$version"; } >> "$$GITHUB_OUTPUT"

release-assets: ## Attach the backend and frontend wheels + sdists of the current version to GitHub release v<version>
	@printf '%b\n' "${CYAN}=========> release-assets...${NC}" >&2
	@version=$$($(UV) version --short); \
	files=$$(ls dist/*-$$version-*.whl dist/*-$$version.tar.gz 2>/dev/null); \
	if [ -z "$$files" ]; then printf '%b\n' "${RED}No dist/*-$$version files: run make build-package${NC}"; exit 1; fi; \
	if ! gh release view "v$$version" >/dev/null 2>&1; then \
		case "$$version" in *-*) pre="--prerelease" ;; *) pre="" ;; esac; \
		gh release create "v$$version" --verify-tag --title "v$$version" --generate-notes $$pre || exit 1; \
	fi; \
	gh release upload "v$$version" $$files --clobber && printf '%b\n' "${GREEN}Attached to v$$version:${NC} $$files"

release: ## Laptop: release-version, then build-package and release-assets (docs: make deploy-doc-gh)
	@printf '%b\n' "${CYAN}=========> release...${NC}" >&2
	@$(MAKE) --no-print-directory release-version
	@version=$$($(UV) version --short); \
	if ! git tag --points-at HEAD | grep -qx "v$$version"; then printf '%b\n' "${YELLOW}Nothing released: stopping${NC}"; exit 0; fi; \
	$(MAKE) --no-print-directory build-package release-assets && \
	printf '%b\n' "${GREEN}release complete${NC}" >&2
