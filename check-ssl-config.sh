#!/bin/bash
echo "Checking DATABASE_URL SSL Configuration..."
if echo "$DATABASE_URL" | grep -q "sslmode"; then
    echo "✅ SSL is configured in DATABASE_URL"
    echo "$DATABASE_URL" | sed 's/:[^:]*@/:****@/g'
    exit 0
else
    echo "⚠️  SSL not yet configured in DATABASE_URL"
    echo "Please add ?sslmode=require to DATABASE_URL in Management UI → Settings → Secrets"
    exit 1
fi
