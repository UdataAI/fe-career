import json

# Read the file
with open('src/data/jds.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Print current order
print("Current order:")
for i, job in enumerate(data):
    print(f"{i}: {job['title']}")

# Find the accounting job
acct_index = None
for i, job in enumerate(data):
    if "Kế toán" in job['title'] and "Hành chính" in job['title']:
        if acct_index is None:
            acct_index = i
            print(f"\nFound accounting job at index {i}")
        else:
            print(f"Found duplicate accounting job at index {i}")

# Move accounting job to position 0
if acct_index is not None and acct_index > 0:
    acct_job = data.pop(acct_index)
    data.insert(0, acct_job)
    print(f"Moved accounting job to position 0")

# Remove duplicates (keep only first occurrence of each id)
seen_ids = set()
unique_data = []
for job in data:
    if job['id'] not in seen_ids:
        unique_data.append(job)
        seen_ids.add(job['id'])
    else:
        print(f"Removing duplicate: {job['title']}")

# Write back
with open('src/data/jds.json', 'w', encoding='utf-8') as f:
    json.dump(unique_data, f, ensure_ascii=False, indent=2)

print("\nNew order:")
for i, job in enumerate(unique_data):
    print(f"{i}: {job['title']}")
