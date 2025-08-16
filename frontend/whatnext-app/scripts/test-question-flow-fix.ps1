# Test Script: Verify Question Flow Fix
# Tests that questions don't repeat and progress correctly

# Configuration
$API_URL = "https://whatnext-frontend.pages.dev"  # Will test production after deploy
# $API_URL = "http://localhost:8788"  # For local testing

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "QUESTION FLOW FIX VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing at: $API_URL" -ForegroundColor Gray
Write-Host ""

# Function to make API calls
function Invoke-API {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    $uri = "$API_URL$Endpoint"
    $headers = @{
        "Content-Type" = "application/json"
        "Accept" = "application/json"
    }
    
    try {
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $jsonBody
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
        }
        return $response
    } catch {
        Write-Host "[ERROR] API Error: $_" -ForegroundColor Red
        return $null
    }
}

# Start session
Write-Host "[STEP 1] Starting Session" -ForegroundColor Yellow
$session = Invoke-API -Method POST -Endpoint "/api/movies/start" -Body @{
    domain = "movies"
    questionFlow = "standard"
}

if (-not $session -or -not $session.sessionId) {
    Write-Host "[ERROR] Failed to start session" -ForegroundColor Red
    exit 1
}

$sessionId = $session.sessionId
Write-Host "[OK] Session started: $sessionId" -ForegroundColor Green
Write-Host "[OK] First question: $($session.question.id)" -ForegroundColor Cyan

# Track questions seen
$questionsSeen = @{}
$questionsSeen[$session.question.id] = 1

# Predefined answers
$answerMap = @{
    "cognitive_load" = "easy"
    "emotional_tone" = "uplifting"
    "personal_context" = "escaping"
    "attention_level" = "moderate"
    "discovery_mode" = "familiar"
}

# Answer questions
Write-Host "`n[STEP 2] Answering Questions" -ForegroundColor Yellow
$currentQuestion = $session.question
$questionCount = 0
$maxQuestions = 10
$duplicateFound = $false

while ($currentQuestion -and $questionCount -lt $maxQuestions) {
    $questionCount++
    $questionId = $currentQuestion.id
    
    Write-Host "`nQuestion $questionCount : $questionId" -ForegroundColor White
    
    # Check for duplicate
    if ($questionsSeen.ContainsKey($questionId)) {
        $questionsSeen[$questionId]++
        Write-Host "[WARNING] Question repeated! Seen $($questionsSeen[$questionId]) times" -ForegroundColor Red
        $duplicateFound = $true
    } else {
        $questionsSeen[$questionId] = 1
        Write-Host "[OK] New question" -ForegroundColor Green
    }
    
    # Get answer
    $answer = if ($answerMap.ContainsKey($questionId)) { 
        $answerMap[$questionId] 
    } elseif ($currentQuestion.options) { 
        $currentQuestion.options[0].id 
    } else { 
        "default" 
    }
    
    # Submit answer
    Write-Host "Submitting answer: $answer" -ForegroundColor Gray
    $response = Invoke-API -Method POST -Endpoint "/api/movies/answer/$sessionId" -Body @{
        questionId = $questionId
        answer = $answer
        responseTime = 2000
    }
    
    if (-not $response) {
        Write-Host "[ERROR] No response" -ForegroundColor Red
        break
    }
    
    # Check response
    if ($response.type -eq "recommendations") {
        Write-Host "`n[SUCCESS] Recommendations received after $questionCount questions!" -ForegroundColor Green
        Write-Host "Total movies: $($response.recommendations.Count)" -ForegroundColor Gray
        break
    } elseif ($response.question) {
        $currentQuestion = $response.question
        if ($response.progress) {
            Write-Host "Progress: $($response.progress.current)/$($response.progress.total)" -ForegroundColor Gray
        }
    } else {
        Write-Host "[WARNING] Unexpected response" -ForegroundColor Yellow
        break
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nQuestions Asked:" -ForegroundColor Yellow
foreach ($q in $questionsSeen.Keys) {
    $count = $questionsSeen[$q]
    $status = if ($count -gt 1) { "[DUPLICATE x$count]" } else { "[OK]" }
    $color = if ($count -gt 1) { "Red" } else { "Green" }
    Write-Host "  $status $q" -ForegroundColor $color
}

Write-Host "`nTotal questions answered: $questionCount" -ForegroundColor Gray

if ($duplicateFound) {
    Write-Host "`n[FAIL] Test Failed - Questions were repeated!" -ForegroundColor Red
    Write-Host "The fix did not work correctly." -ForegroundColor Red
} else {
    Write-Host "`n[PASS] Test Passed - No duplicate questions!" -ForegroundColor Green
    Write-Host "Questions progressed correctly without repetition." -ForegroundColor Green
}

if ($questionCount -ge $maxQuestions) {
    Write-Host "`n[WARNING] Hit max question limit without getting recommendations" -ForegroundColor Yellow
}