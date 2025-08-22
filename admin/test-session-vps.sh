#!/bin/bash

# VPS Session Testing Script
echo "🔧 Testing Session Configuration on VPS"

echo "Environment Variables:"
echo "NODE_ENV: $NODE_ENV"
echo "USE_HTTPS: $USE_HTTPS"
echo "SESSION_SECRET length: ${#SESSION_SECRET}"

echo ""
echo "🧪 Testing Login:"
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt \
  -v

echo ""
echo "🧪 Testing Session Check:"
curl -X GET http://localhost:3000/api/auth/session \
  -b cookies.txt \
  -v

echo ""
echo "🍪 Cookie Contents:"
cat cookies.txt

echo ""
echo "📝 Check server logs for detailed debugging information"
