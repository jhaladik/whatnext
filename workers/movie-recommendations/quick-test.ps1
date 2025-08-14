$SESSION_ID = "4eb669e1-111a-4469-b44b-6d92411496a4"
$BASE_URL = "https://movie-recommendations-prod.jhaladik.workers.dev"

# Answer all questions quickly
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" -H "Content-Type: application/json" -d '{"questionId":"emotional_tone","answer":"uplifting","responseTime":1000}' -s | Out-Null
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" -H "Content-Type: application/json" -d '{"questionId":"personal_context","answer":"building","responseTime":1000}' -s | Out-Null  
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" -H "Content-Type: application/json" -d '{"questionId":"attention_level","answer":"moderate","responseTime":1000}' -s | Out-Null
Write-Host "Answering final question to get recommendations..."
curl -X POST "$BASE_URL/api/movies/answer/$SESSION_ID" -H "Content-Type: application/json" -d '{"questionId":"discovery_mode","answer":"reliable","responseTime":1000}'