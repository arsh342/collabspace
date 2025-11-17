#!/bin/bash

# Simple status checks for CollabSpace

echo "🚀 Starting CollabSpace Status Checks..."

# Check 1: Dependencies (check if node_modules exists and has packages)
echo "📦 Checking dependencies..."
if [ -d "node_modules" ] && [ "$(ls -A node_modules 2>/dev/null)" ]; then
    echo "✅ Dependencies are installed"
else
    echo "❌ Dependencies not installed - run npm install"
    exit 1
fi

# Check 2: Tests
echo "🧪 Running tests..."
if npm test > /dev/null 2>&1; then
    echo "✅ All tests pass"
else
    echo "❌ Tests failed"
    exit 1
fi

# Check 3: Security audit (allow moderate vulnerabilities)
echo "🔒 Running security audit..."
if npm audit --audit-level=high > /dev/null 2>&1; then
    echo "✅ No high/critical security vulnerabilities"
else
    echo "⚠️  High/critical security vulnerabilities found"
    npm audit --audit-level=high
    exit 1
fi

# Check 4: App can start (basic syntax check)
echo "⚡ Checking app startup..."
if node -c src/app.js > /dev/null 2>&1; then
    echo "✅ App syntax is valid"
else
    echo "❌ App syntax errors detected"
    exit 1
fi

echo "✨ All status checks passed!"
echo "🎉 CollabSpace is ready for deployment!"
