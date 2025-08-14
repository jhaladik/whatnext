#!/bin/bash

# Complete test flow for movie recommendations

SESSION_ID="5fdf11f3-e98f-4b09-a751-bc998a0f30ac"
BASE_URL="https://movie-recommendations-prod.jhaladik.workers.dev"

echo "Question 1: cognitive_load - choosing 'challenge'"
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"cognitive_load","answer":"challenge","responseTime":2000}' \
  -s | python -m json.tool | head -20

echo -e "\n\nQuestion 2: emotional_tone - choosing 'intense'"
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"emotional_tone","answer":"intense","responseTime":1500}' \
  -s | python -m json.tool | head -20

echo -e "\n\nQuestion 3: personal_context - choosing 'exploring'"
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"personal_context","answer":"exploring","responseTime":2000}' \
  -s | python -m json.tool | head -20

echo -e "\n\nQuestion 4: attention_level - choosing 'full_focus'"
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"attention_level","answer":"full_focus","responseTime":1800}' \
  -s | python -m json.tool | head -20

echo -e "\n\nQuestion 5: discovery_mode - choosing 'surprise' (should get recommendations)"
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"discovery_mode","answer":"surprise","responseTime":1200}' \
  -s | python -m json.tool

echo -e "\n\nTest complete!"