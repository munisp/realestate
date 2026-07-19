#!/bin/bash
set -e

echo "📊 Running Load Tests"
echo "===================="

# Install k6 if not present
if ! command -v k6 &> /dev/null; then
  echo "Installing k6..."
  curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1
  sudo mv k6 /usr/local/bin/
fi

# Run load test
k6 run load-test.js

echo "✅ Load tests complete!"
