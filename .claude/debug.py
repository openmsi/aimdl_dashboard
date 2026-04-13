from girder_client import GirderClient
import os

client = GirderClient(apiUrl='https://data.htmdec.org/api/v1')
client.authenticate(apiKey=os.environ['AIMDL_API_KEY'])

# This should work (standard endpoint, worked before the refactor):
print("Token:", client.token)
folders = client.get("folder", parameters={
    "parentType": "collection",
    "parentId": "665de536bcc722774ce53754",
    "limit": 1,
})
print("Folder test:", len(folders), "OK")

# This is what's failing:
try:
    items = client.get("aimdl/datafiles", parameters={
        "dataType": "xrd_derived", "limit": 1,
    })
    print("aimdl test:", len(items), "OK")
except Exception as e:
    print("aimdl test FAILED:", e)