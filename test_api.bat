@echo off
curl -s http://localhost:4001/api/health > test_health.txt 2>&1
curl -s http://localhost:4001/api/modules > test_modules.txt 2>&1
echo Done
