#!/bin/bash

SESSION_ID="3d22b0cb-771b-46f2-ba11-e90a1a8b2d4a"
BASE_URL="https://movie-recommendations-prod.jhaladik.workers.dev"

echo "Testing complete flow with Vectorize integration"
echo "Session: $SESSION_ID"
echo ""

# Answer all 5 questions
echo "Answering questions..."
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"cognitive_load","answer":"challenge","responseTime":1000}' -s > /dev/null

curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"emotional_tone","answer":"intense","responseTime":1000}' -s > /dev/null

curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"personal_context","answer":"exploring","responseTime":1000}' -s > /dev/null

curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"attention_level","answer":"full_focus","responseTime":1000}' -s > /dev/null

echo "Getting recommendations after final question..."
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"discovery_mode","answer":"surprise","responseTime":1000}' \
  -s | python -m json.tool