# Build and deployment targets
# This file contains targets for building packages and deploying documentation

.PHONY: build-package deploy-doc-local deploy-doc-gh

build-package: ## Build and verify a wheel and sdist for every package
	@printf '%b\n' "${CYAN}Building Python packages...${NC}" >&2
	@rm -rf dist
	@for project in $(PACKAGE_PROJECTS); do $(UV) build --out-dir dist "$$project" || exit 1; done
	@$(UV) run --no-sync python scripts/release_artifacts.py files $(PACKAGE_PROJECTS)
	@printf '%b\n' "${GREEN}build-package complete${NC}" >&2

deploy-doc-local: ## Serve documentation locally (requires install-dev or install-tools)
	@printf '%b\n' "${CYAN}Deploying documentation locally...${NC}" >&2
	@$(UV) run --no-sync properdocs serve
	@printf '%b\n' "${GREEN}deploy-doc-local complete${NC}" >&2

# Deploy it to the gh-pages branch in your GitHub repository (you need to setup the GitHub Pages in github settings to use the gh-pages branch)
deploy-doc-gh: ## Build and deploy documentation to GitHub Pages
	@printf '%b\n' "${CYAN}Deploying documentation in github actions..${NC}" >&2
	@$(UV) run --no-sync properdocs gh-deploy --strict
	@printf '%b\n' "${GREEN}deploy-doc-gh complete${NC}" >&2

.PHONY: docs-build
docs-build: ## Build strict documentation without starting a server
	@$(UV) run --no-sync properdocs build -f properdocs.yml --strict --quiet --site-dir "$$(mktemp -d)"
