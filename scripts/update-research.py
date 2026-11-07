"""Resume fixed public-source imports in the deployed Atlas, without credentials."""
import getpass
import sys
import json
import time
import urllib.error
import urllib.request

ORIGIN = "https://islet-evidence-atlas.mattepaste.chatgpt.site"
ENDPOINT = ORIGIN + "/api/research"
ACCESS = getpass.getpass("Site service access (hidden): ") if "--service" in sys.argv else ""
HEADERS = {"Content-Type": "application/json", "Origin": ORIGIN}
if ACCESS:
    HEADERS["OAI-Sites-Authorization"] = "Bearer " + ACCESS

def update(source, batches):
    saved = 0
    for _ in range(batches):
        request = urllib.request.Request(
            ENDPOINT, data=json.dumps({"source": source}).encode(),
            headers=HEADERS,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=100) as response:
                result = json.load(response)
        except (urllib.error.URLError, TimeoutError) as error:
            print(json.dumps({"source": source, "saved": saved, "error": str(error)}), flush=True)
            return
        saved += result.get("count", 0)
        if result.get("complete") or result.get("busy"):
            break
        time.sleep(0.2)
    print(json.dumps({"source": source, "processed_this_run": saved}), flush=True)

if __name__ == "__main__":
    for name, count in [("atlas", 1), ("recent", 10), ("publications", 50), ("trials", 20), ("fulltext", 10)]:
        update(name, count)
    with urllib.request.urlopen(urllib.request.Request(ENDPOINT, headers=HEADERS), timeout=30) as response:
        print(json.dumps(json.load(response)), flush=True)
