#!/bin/bash
cd /Users/JJR/saas_starter_Nov9/saas-starter

# Load environment variables
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Kill any existing drizzle processes
pkill -f drizzle-kit 2>/dev/null || true

# Wait a moment
sleep 2

# Start Drizzle Studio
echo "🚀 Starting Drizzle Studio with proper database connection..."
echo "📊 Database: $POSTGRES_URL"
echo "🌐 URL: https://local.drizzle.studio"

pnpm db:studio
