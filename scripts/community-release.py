"""Package staged project files without history, runtime state or production identity."""
import json
import subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
output = root / "public/islet-atlas-source.zip"
paths = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for name in sorted(filter(None, paths)):
        path = Path(name)
        if name == "public/islet-atlas-source.zip" or any(
            part.startswith((".env", ".dev.vars")) or part in {".git", ".wrangler", ".sites-runtime", "node_modules", "dist"}
            for part in path.parts
        ):
            continue
        data = subprocess.check_output(["git", "show", ":" + name], cwd=root)
        if name == ".openai/hosting.json":
            manifest = json.loads(data)
            manifest.pop("project_id", None)
            data = (json.dumps(manifest, indent=2) + "\n").encode()
        archive.writestr("islet-atlas/" + name, data)
