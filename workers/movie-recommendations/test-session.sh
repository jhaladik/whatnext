#!/bin/bash

# Test session for movie recommendations

SESSION_ID="58585944-ffeb-4b32-98ac-f9ff785225ea"
BASE_URL="https://movie-recommendations-prod.jhaladik.workers.dev"

echo "Answering question 2: emotional_tone"
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"emotional_tone","answer":"intense","responseTime":1500}'

echo -e "\n\nAnswering question 3: personal_context"
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"personal_context","answer":"exploring","responseTime":2000}'

echo -e "\n\nAnswering question 4: attention_level"
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"attention_level","answer":"full_focus","responseTime":1800}'

echo -e "\n\nAnswering question 5: discovery_mode (final - should get recommendations)"
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"discovery_mode","answer":"surprise","responseTime":1200}'

echo -e "\n\nTest complete!"