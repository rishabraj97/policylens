import urllib.request, json

url = "http://localhost:8000/api/v1/requirements/44/status"
data = json.dumps({"status": "Completed"}).encode()
req = urllib.request.Request(url, data=data, method="PATCH",
    headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as r:
    print(json.dumps(json.loads(r.read()), indent=2))
