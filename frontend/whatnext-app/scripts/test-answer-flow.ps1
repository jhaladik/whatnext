# Test Script: Dynamic Answer Flow
# Answers questions in the order they're presented by the API

# Configuration
$API_URL = "https://whatnext-frontend.pages.dev"  # Production

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DYNAMIC ANSWER FLOW TEST" -ForegroundColor Cyan
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
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "[ERROR] Response: $errorBody" -ForegroundColor Red
        }
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

# Get first question from session
$currentQuestion = $session.question
Write-Host "[OK] First question: $($currentQuestion.id) - $($currentQuestion.text)" -ForegroundColor Cyan

# Predefined answers for testing
$answerMap = @{
    "cognitive_load" = "easy"
    "emotional_tone" = "uplifting"
    "personal_context" = "escaping"
    "attention_level" = "moderate"
    "discovery_mode" = "familiar"
    "mood_check" = "relaxed"
    "time_commitment" = "standard"
    "era" = "recent"
    "genre" = "comedy"
    "rating" = "decent"
}

# Answer questions dynamically
Write-Host "`n[STEP 2] Answering Questions Dynamically" -ForegroundColor Yellow
$questionCount = 0
$maxQuestions = 10  # Safety limit

while ($currentQuestion -and $questionCount -lt $maxQuestions) {
    $questionCount++
    Write-Host "`nQuestion $questionCount : $($currentQuestion.id)" -ForegroundColor White
    Write-Host "Text: $($currentQuestion.text)" -ForegroundColor Gray
    
    # Show available options
    if ($currentQuestion.options) {
        Write-Host "Options:" -ForegroundColor Gray
        foreach ($option in $currentQuestion.options) {
            Write-Host "  - $($option.id): $($option.text) $($option.emoji)" -ForegroundColor DarkGray
        }
    }
    
    # Get answer from our map or use first option
    $answer = $null
    if ($answerMap.ContainsKey($currentQuestion.id)) {
        $answer = $answerMap[$currentQuestion.id]
        Write-Host "Using predefined answer: $answer" -ForegroundColor Cyan
    } elseif ($currentQuestion.options -and $currentQuestion.options.Count -gt 0) {
        $answer = $currentQuestion.options[0].id
        Write-Host "Using first option: $answer" -ForegroundColor Yellow
    } else {
        Write-Host "[ERROR] No answer available for question $($currentQuestion.id)" -ForegroundColor Red
        break
    }
    
    # Submit answer
    $answerBody = @{
        questionId = $currentQuestion.id
        answer = $answer
        responseTime = 2000
    }
    
    Write-Host "Submitting answer..." -ForegroundColor Gray
    $response = Invoke-API -Method POST -Endpoint "/api/movies/answer/$sessionId" -Body $answerBody
    
    if (-not $response) {
        Write-Host "[ERROR] No response received" -ForegroundColor Red
        break
    }
    
    # Check response type
    if ($response.type -eq "recommendations") {
        Write-Host "`n[SUCCESS] Recommendations received!" -ForegroundColor Green
        Write-Host "Total movies: $($response.recommendations.Count)" -ForegroundColor Gray
        
        # Show first 3 movies
        Write-Host "`nFirst 3 Movies:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(3, $response.recommendations.Count); $i++) {
            $movie = $response.recommendations[$i]
            $surpriseTag = if ($movie.isSurprise) { " [SURPRISE]" } else { "" }
            Write-Host "$($i+1). $($movie.title) ($($movie.year))$surpriseTag" -ForegroundColor White
            if ($movie.genres) {
                Write-Host "   Genres: $($movie.genres -join ', ')" -ForegroundColor Gray
            }
            if ($movie.surpriseReason) {
                Write-Host "   Reason: $($movie.surpriseReason)" -ForegroundColor Magenta
            }
        }
        
        # Check emotional profile
        if ($response.emotionalProfile) {
            Write-Host "`nEmotional Profile Generated:" -ForegroundColor Yellow
            Write-Host "  Energy: $($response.emotionalProfile.energy)" -ForegroundColor Gray
            Write-Host "  Mood: $($response.emotionalProfile.mood)" -ForegroundColor Gray
            Write-Host "  Openness: $($response.emotionalProfile.openness)" -ForegroundColor Gray
            Write-Host "  Focus: $($response.emotionalProfile.focus)" -ForegroundColor Gray
        }
        
        break
    } elseif ($response.question) {
        # Got next question
        $currentQuestion = $response.question
        Write-Host "[OK] Next question received" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Unexpected response type: $($response.type)" -ForegroundColor Yellow
        break
    }
}

if ($questionCount -ge $maxQuestions) {
    Write-Host "`n[ERROR] Maximum question limit reached without recommendations" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Questions answered: $questionCount" -ForegroundColor Gray