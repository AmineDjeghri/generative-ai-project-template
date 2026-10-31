# Local releases and .github/workflows/release.yml use the same guarded targets.
# semantic-release builds and validates packages before publishing a version.
export GH_TOKEN

.PHONY: release-version release-assets release

release-version: ## Build, version, CHANGELOG, commit, tag, push and GitHub release (main/dev, clean, in sync)
	@branch=$$(git rev-parse --abbrev-ref HEAD); \
	case "$$branch" in main|dev) ;; *) echo "Release from main or dev only (on $$branch)" >&2; exit 1 ;; esac; \
	if [ -n "$$(git status --porcelain)" ]; then echo "Uncommitted changes: commit or stash first" >&2; exit 1; fi; \
	git fetch -q origin "$$branch" || exit 1; \
	head=$$(git rev-parse HEAD) || exit 1; \
	if [ "$$head" != "$$(git rev-parse "origin/$$branch")" ]; then echo "$$branch is not in sync with origin/$$branch: pull or push first" >&2; exit 1; fi; \
	tag=$$($(UV) run --no-sync python scripts/release_artifacts.py tag) || exit 1; \
	tagged=false; \
	[ "$$head" != "$$(git rev-parse -q --verify "refs/tags/$$tag^{commit}" 2>/dev/null)" ] || tagged=true; \
	if [ "$$GITHUB_ACTIONS" = true ] && [ "$$head" != "$$GITHUB_SHA" ]; then \
		if [ "$$tagged" != true ] || [ "$$(git rev-parse HEAD^ 2>/dev/null)" != "$$GITHUB_SHA" ] || \
		   [ "$$(git log -1 --format=%s)" != "chore(release): $$tag [skip ci]" ] || \
		   git rev-parse -q --verify HEAD^2 >/dev/null 2>&1; then \
			echo "Branch advanced beyond the tested commit; release from its own validated workflow" >&2; exit 1; \
		fi; \
		changes=$$(git diff --name-only "$$GITHUB_SHA" HEAD) || exit 1; \
		for path in $$changes; do \
			case "$$path" in CHANGELOG.md|uv.lock|pyproject.toml|backend/pyproject.toml|frontend/pyproject.toml) ;; \
			*) echo "Release retry contains unvalidated application changes" >&2; exit 1 ;; esac; \
		done; \
	fi; \
	if [ -z "$$GH_TOKEN" ]; then GH_TOKEN=$$(gh auth token 2>/dev/null) || GH_TOKEN=""; fi; \
	if [ -z "$$GH_TOKEN" ]; then \
		if [ -t 0 ]; then \
			echo "Not logged in: run 'gh auth login', or paste a token now."; \
			printf "GitHub token (repo scope, input hidden): "; stty -echo; read -r GH_TOKEN; stty echo; echo; \
		else echo "No GitHub token: set GH_TOKEN or run gh auth login" >&2; exit 1; fi; \
	fi; \
	export GH_TOKEN; \
	output() { [ -z "$$GITHUB_OUTPUT" ] || printf 'released=%s\ntagged=%s\nversion=%s\ntag=%s\n' "$$1" "$$2" "$${3#v}" "$$3" >> "$$GITHUB_OUTPUT"; }; \
	if [ "$$tagged" = true ]; then echo "$$tag already exists at HEAD; artifact upload can be retried"; output false true "$$tag"; exit 0; fi; \
	[ -n "$$GIT_COMMIT_AUTHOR" ] || GIT_COMMIT_AUTHOR="$$(git config user.name) <$$(git config user.email)>"; \
	export GIT_COMMIT_AUTHOR; \
	version=$$(PYTHONPATH=. $(UV) run --group dev semantic-release version --print) || exit 1; \
	if [ -z "$$version" ] || git rev-parse -q --verify "refs/tags/v$$version" >/dev/null; then \
		echo "No releasable commit since the last tag"; output false false "$$tag"; exit 0; \
	fi; \
	if [ "$$GITHUB_ACTIONS" != true ]; then \
		printf 'Publish v%s (commit, tag, push and GitHub release)? Type yes: ' "$$version"; \
		IFS= read -r confirmation && [ "$$confirmation" = yes ] || { echo "Release cancelled" >&2; exit 1; }; \
	fi; \
	PYTHONPATH=. GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/dev/null \
		$(UV) run --group dev semantic-release -v version || exit 1; \
	echo "Released v$$version"; output true true "v$$version"

release-assets: ## Attach every package's wheel and sdist to the current GitHub release
	@tag=$$($(UV) run --no-sync python scripts/release_artifacts.py tag) || exit 1; \
	files=$$($(UV) run --no-sync python scripts/release_artifacts.py files $(PACKAGE_PROJECTS)) || exit 1; \
	if [ "$$(git rev-parse -q --verify "refs/tags/$$tag^{commit}")" != "$$(git rev-parse HEAD)" ]; then \
		echo "$$tag must point at HEAD before uploading its artifacts" >&2; exit 1; \
	fi; \
	if ! gh release view "$$tag" >/dev/null 2>&1; then \
		case "$$tag" in *-*) pre="--prerelease" ;; *) pre="" ;; esac; \
		gh release create "$$tag" --verify-tag --title "$$tag" --generate-notes $$pre || exit 1; \
	fi; \
	gh release upload "$$tag" $$files --clobber

release: ## Build and publish a new release, or finish uploading the release at HEAD
	@$(MAKE) --no-print-directory release-version
	@tag=$$($(UV) run --no-sync python scripts/release_artifacts.py tag) || exit 1; \
	if [ "$$(git rev-parse -q --verify "refs/tags/$$tag^{commit}" 2>/dev/null)" != "$$(git rev-parse HEAD)" ]; then \
		echo "Nothing released: stopping"; exit 0; \
	fi; \
	$(UV) run --no-sync python scripts/release_artifacts.py files $(PACKAGE_PROJECTS) >/dev/null 2>&1 || \
		$(MAKE) --no-print-directory build-package || exit 1; \
	$(MAKE) --no-print-directory release-assets
