#!/bin/bash
set -e

echo "=========================================="
echo " Grocery List App — Test Suite"
echo "=========================================="

# Layer 1: Frontend unit tests (headless, always runnable)
echo ""
echo "--- Layer 1: Frontend Unit Tests ---"
cd frontend
yarn test --watchAll=false
cd ..

# Layer 2: Backend integration tests (requires: uvicorn + MongoDB running)
echo ""
echo "--- Layer 2: Backend Integration Tests ---"
echo "Note: Requires backend running at http://localhost:8001 and MongoDB"
python backend_test.py

# Layer 3: E2E tests (requires: iOS simulator or Android emulator + Maestro installed)
echo ""
echo "--- Layer 3: E2E Tests (Maestro) ---"
if command -v maestro &> /dev/null; then
  echo "Note: Requires app running in simulator/emulator"
  maestro test maestro/flows/
else
  echo "SKIPPED: Maestro not installed. Run: curl -Ls 'https://get.maestro.mobile.dev' | bash"
fi

echo ""
echo "=========================================="
echo " All tests complete!"
echo "=========================================="
