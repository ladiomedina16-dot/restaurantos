#!/bin/bash
# Start RestaurantOS services

# Kill existing processes
pkill -f "next dev" 2>/dev/null
pkill -f "bun --hot" 2>/dev/null
sleep 2

# Environment variables
export DATABASE_URL="postgresql://postgres.mjmqjbqjmzjwixnmxegs:Telco191517k-@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.mjmqjbqjmzjwixnmxegs:Telco191517k-@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
export JWT_SECRET="rst-os-prod-jwt-s3cr3t-k3y-2024-x7z"
export JWT_REFRESH_SECRET="rst-os-prod-refresh-k3y-2024"
export API_SECRET="rst-os-api-s3cr3t-2024-k7w"
export SOCKET_SERVER_URL="http://localhost:3003"

# Start Socket.io mini-service
cd /home/z/my-project/mini-services/restaurant-realtime
nohup bun run dev > /home/z/my-project/mini-services/restaurant-realtime/server.log 2>&1 &
echo "Socket.io PID: $!"
sleep 3

# Start Next.js
cd /home/z/my-project
nohup node node_modules/.bin/next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
echo "Next.js PID: $!"
sleep 10

echo "=== Status ==="
echo "Socket.io:"
curl -m 3 -s http://127.0.0.1:3003/health 2>&1 || echo "  not responding"
echo ""
echo "Next.js:"
curl -m 5 -s http://127.0.0.1:3000/api 2>&1 || echo "  not responding"
