"""Generate API reference pages for the package or every member of the uv workspace."""

from pathlib import Path
import tomllib

import mkdocs_gen_files

configuration = tomllib.loads(Path("pyproject.toml").read_text())
members = configuration.get("tool", {}).get("uv", {}).get("workspace", {}).get("members", ["."])
nav = mkdocs_gen_files.Nav()

for member in members:
    src_root = Path(member) / "src"
    for path in sorted(src_root.rglob("*.py")):
        if path.name == "__init__.py":
            continue
        module = path.relative_to(src_root).with_suffix("")
        doc_path = Path("package", module).with_suffix(".md")
        with mkdocs_gen_files.open(doc_path, "w") as stream:
            stream.write("::: " + ".".join(module.parts) + "\n")
        nav[module.parts] = module.with_suffix(".md").as_posix()

with mkdocs_gen_files.open("package/SUMMARY.md", "w") as nav_file:
    nav_file.writelines(nav.build_literate_nav())
