$SESSION_ID = "224b5947-c2b2-4f49-a66d-0d6d047be054"
$BASE_URL = "https://movie-recommendations-prod.jhaladik.workers.dev"

Write-Host "Testing Vectorize integration with new session: $SESSION_ID" -ForegroundColor Green

# Answer all 5 questions quickly
Write-Host "`n1. Answering cognitive_load..." -ForegroundColor Yellow
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" -H "Content-Type: application/json" -d '{"questionId":"cognitive_load","answer":"challenge","responseTime":1000}' -s | Out-Null

Write-Host "2. Answering emotional_tone..." -ForegroundColor Yellow
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" -H "Content-Type: application/json" -d '{"questionId":"emotional_tone","answer":"intense","responseTime":1000}' -s | Out-Null

Write-Host "3. Answering personal_context..." -ForegroundColor Yellow
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" -H "Content-Type: application/json" -d '{"questionId":"personal_context","answer":"exploring","responseTime":1000}' -s | Out-Null

Write-Host "4. Answering attention_level..." -ForegroundColor Yellow
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" -H "Content-Type: application/json" -d '{"questionId":"attention_level","answer":"full_focus","responseTime":1000}' -s | Out-Null

Write-Host "5. Answering discovery_mode (final - should trigger recommendations)..." -ForegroundColor Yellow
Write-Host "`nGetting recommendations:" -ForegroundColor Green
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" -H "Content-Type: application/json" -d '{"questionId":"discovery_mode","answer":"surprise","responseTime":1000}'