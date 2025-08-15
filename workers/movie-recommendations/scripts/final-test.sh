#!/bin/bash

SESSION_ID="0f3cded2-8723-4a42-9f65-3e5d2fc4d91c"
BASE_URL="https://movie-recommendations-prod.jhaladik.workers.dev"

echo "Testing complete flow with session: $SESSION_ID"
echo ""

# Answer questions in correct order
echo "1. Answering cognitive_load..."
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"cognitive_load","answer":"challenge","responseTime":1000}' -s > /dev/null

echo "2. Answering emotional_tone..."
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"emotional_tone","answer":"intense","responseTime":1500}' -s > /dev/null

echo "3. Answering personal_context..."
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"personal_context","answer":"exploring","responseTime":2000}' -s > /dev/null

echo "4. Answering attention_level..."
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"attention_level","answer":"full_focus","responseTime":1800}' -s > /dev/null

echo "5. Answering discovery_mode (final)..."
echo ""
echo "RECOMMENDATIONS:"
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"discovery_mode","answer":"surprise","responseTime":1200}' \
  -s | python -m json.tool