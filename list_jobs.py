import json

with open('src/data/jds.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for i, job in enumerate(data):
    print(f"{i}: {job['title']}")
