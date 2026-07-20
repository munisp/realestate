#!/bin/bash
# Initialize OpenSearch indices with proper mappings
OPENSEARCH_URL="${OPENSEARCH_URL:-http://localhost:9200}"
echo "Initializing OpenSearch indices at $OPENSEARCH_URL..."

create_index() {
  local name=$1
  local mapping=$2
  local response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT "$OPENSEARCH_URL/$name" \
    -H "Content-Type: application/json" \
    -d "$mapping")
  if [ "$response" = "200" ] || [ "$response" = "400" ]; then
    echo "  ✓ Index $name: $response"
  else
    echo "  ✗ Index $name failed: $response"
  fi
}

MAPPINGS=$(cat /init/index-mappings.json)

create_index "properties_v1" "$(echo $MAPPINGS | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps(d["properties_v1"]))')"
create_index "documents_v1" "$(echo $MAPPINGS | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps(d["documents_v1"]))')"
create_index "analytics_v1" "$(echo $MAPPINGS | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps(d["analytics_v1"]))')"

# Create aliases
curl -s -X POST "$OPENSEARCH_URL/_aliases" -H "Content-Type: application/json" -d '{
  "actions": [
    { "add": { "index": "properties_v1", "alias": "properties" } },
    { "add": { "index": "documents_v1", "alias": "documents" } },
    { "add": { "index": "analytics_v1", "alias": "analytics" } }
  ]
}' > /dev/null
echo "  ✓ Aliases created"
echo "OpenSearch initialization complete."
