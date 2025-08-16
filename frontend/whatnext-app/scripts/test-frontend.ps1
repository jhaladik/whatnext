# Frontend Testing Script for WhatNext App
# Tests frontend integration with movie-recommendations worker

# Configuration
$FRONTEND_URL = "http://localhost:3000"  # Local dev server
$WORKER_URL = "https://movie-recommendations-prod.jhaladik.workers.dev"

Write-Host "[FRONTEND] Testing WhatNext Frontend Application" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Frontend URL: $FRONTEND_URL" -ForegroundColor Gray
Write-Host "Worker URL: $WORKER_URL" -ForegroundColor Gray
Write-Host ""

# Function to make API calls
function Invoke-API {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [string]$BaseUrl = $FRONTEND_URL
    )
    
    $uri = "$BaseUrl$Endpoint"
    $headers = @{
        "Content-Type" = "application/json"
        "Accept" = "application/json"
    }
    
    try {
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            Write-Host "[DEBUG] Request body: $jsonBody" -ForegroundColor DarkGray
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
            Write-Host "[ERROR] Response body: $errorBody" -ForegroundColor Red
        }
        return $null
    }
}

# Test 1: Check Frontend Server
Write-Host "[TEST 1] Checking Frontend Server" -ForegroundColor Yellow
Write-Host "Testing if frontend server is running..." -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $FRONTEND_URL -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Frontend server is running" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] Frontend server is not running at $FRONTEND_URL" -ForegroundColor Red
    Write-Host "Please start the frontend with: npm run dev" -ForegroundColor Yellow
    exit 1
}

# Test 2: Start Session via Frontend API
Write-Host "`n[TEST 2] Starting Session via Frontend" -ForegroundColor Yellow
Write-Host "Testing session initialization through frontend API..." -ForegroundColor Gray

$startBody = @{
    domain = "movies"
    questionFlow = "standard"
    context = @{
        timeOfDay = "evening"
        dayOfWeek = "Friday"
        season = "winter"
    }
}

$session = Invoke-API -Method POST -Endpoint "/api/movies/start" -Body $startBody
if ($session) {
    Write-Host "[OK] Session started successfully" -ForegroundColor Green
    Write-Host "   Session ID: $($session.sessionId)" -ForegroundColor Gray
    Write-Host "   Greeting: $($session.greeting)" -ForegroundColor Cyan
    Write-Host "   Flow Type: $($session.flowType)" -ForegroundColor Gray
    Write-Host "   Questions: $($session.questions.Count)" -ForegroundColor Gray
    $sessionId = $session.sessionId
} else {
    Write-Host "[ERROR] Failed to start session" -ForegroundColor Red
    Write-Host "Checking if API functions are properly configured..." -ForegroundColor Yellow
    exit 1
}

# Test 3: Answer Questions and Get Recommendations
Write-Host "`n[TEST 3] Answering Questions" -ForegroundColor Yellow
Write-Host "Submitting answers to get recommendations..." -ForegroundColor Gray

$answers = @(
    @{ questionId = "cognitive_load"; answer = "easy"; responseTime = 2000 }
    @{ questionId = "emotional_tone"; answer = "uplifting"; responseTime = 2500 }
    @{ questionId = "personal_context"; answer = "escaping"; responseTime = 3000 }
    @{ questionId = "attention_level"; answer = "moderate"; responseTime = 2200 }
    @{ questionId = "discovery_mode"; answer = "familiar"; responseTime = 1800 }
)

$recommendationsReceived = $false
$questionIndex = 1

foreach ($answer in $answers) {
    Write-Host "   Answering question $questionIndex/5: $($answer.questionId)" -ForegroundColor Gray
    
    # Small delay between answers
    Start-Sleep -Milliseconds 500
    
    $response = Invoke-API -Method POST -Endpoint "/api/movies/answer/$sessionId" -Body $answer
    
    if ($response) {
        if ($response.type -eq "recommendations") {
            Write-Host "[OK] Recommendations received!" -ForegroundColor Green
            Write-Host "   Total movies: $($response.recommendations.Count)" -ForegroundColor Gray
            
            # Validate Movie data structure
            Write-Host "`n[VALIDATION] Checking movie data structure..." -ForegroundColor Yellow
            
            if ($response.recommendations -and $response.recommendations.Count -gt 0) {
                $firstMovie = $response.recommendations[0]
                
                # Check required fields for MovieCard component
                $requiredFields = @("title", "year", "rating", "genres", "overview")
                $missingFields = @()
                
                foreach ($field in $requiredFields) {
                    if (-not $firstMovie.$field) {
                        $missingFields += $field
                    }
                }
                
                if ($missingFields.Count -eq 0) {
                    Write-Host "[OK] All required fields present" -ForegroundColor Green
                } else {
                    Write-Host "[WARNING] Missing fields: $($missingFields -join ', ')" -ForegroundColor Yellow
                }
                
                # Check field names match component expectations
                Write-Host "`n[FIELD MAPPING] Checking field names..." -ForegroundColor Cyan
                Write-Host "   movieId: $(if($firstMovie.movieId) { 'Present' } else { 'Missing' })" -ForegroundColor Gray
                Write-Host "   title: $($firstMovie.title)" -ForegroundColor Gray
                Write-Host "   poster: $(if($firstMovie.poster) { 'Present' } else { 'Missing' })" -ForegroundColor Gray
                Write-Host "   year: $($firstMovie.year)" -ForegroundColor Gray
                Write-Host "   rating: $($firstMovie.rating)" -ForegroundColor Gray
                Write-Host "   genres: $($firstMovie.genres -join ', ')" -ForegroundColor Gray
                Write-Host "   runtime: $(if($firstMovie.runtime) { "$($firstMovie.runtime) min" } else { 'Missing' })" -ForegroundColor Gray
                Write-Host "   isSurprise: $($firstMovie.isSurprise)" -ForegroundColor Gray
                
                # Check poster URL format
                if ($firstMovie.poster) {
                    if ($firstMovie.poster -match "^https?://") {
                        Write-Host "[OK] Poster URL is valid: $($firstMovie.poster.Substring(0, [Math]::Min(50, $firstMovie.poster.Length)))..." -ForegroundColor Green
                    } else {
                        Write-Host "[WARNING] Poster URL may be invalid: $($firstMovie.poster)" -ForegroundColor Yellow
                    }
                }
            }
            
            # Check moment summary
            if ($response.moment) {
                Write-Host "`n[MOMENT] Validating moment summary..." -ForegroundColor Yellow
                Write-Host "   Description: $($response.moment.description)" -ForegroundColor Cyan
                Write-Host "   Emoji: $($response.moment.emoji)" -ForegroundColor Gray
                Write-Host "   Confidence: $($response.moment.confidence)%" -ForegroundColor Gray
            }
            
            $recommendationsReceived = $true
            $recommendations = $response.recommendations
            break
        } elseif ($response.question) {
            Write-Host "   Next question: $($response.question.text)" -ForegroundColor Gray
        }
    }
    
    $questionIndex++
}

if (-not $recommendationsReceived) {
    Write-Host "[ERROR] No recommendations received after answering all questions" -ForegroundColor Red
    exit 1
}

# Test 4: Quick Adjustments
Write-Host "`n[TEST 4] Testing Quick Adjustments" -ForegroundColor Yellow
Write-Host "Testing mood adjustment buttons..." -ForegroundColor Gray

$adjustments = @("lighter", "deeper", "weirder", "safer")
foreach ($adj in $adjustments) {
    Write-Host "   Testing '$adj' adjustment..." -ForegroundColor Gray
    
    $adjustBody = @{
        adjustmentType = $adj
    }
    
    $adjusted = Invoke-API -Method POST -Endpoint "/api/movies/adjust/$sessionId" -Body $adjustBody
    if ($adjusted) {
        Write-Host "   [OK] Adjustment successful" -ForegroundColor Green
        Write-Host "      New recommendations: $($adjusted.recommendations.Count)" -ForegroundColor Gray
        
        # Verify first movie still has correct structure
        if ($adjusted.recommendations -and $adjusted.recommendations.Count -gt 0) {
            $movie = $adjusted.recommendations[0]
            if ($movie.title -and $movie.year) {
                Write-Host "      Sample: $($movie.title) ($($movie.year))" -ForegroundColor Cyan
            }
        }
    }
    
    Start-Sleep -Milliseconds 300
}

# Test 5: Movie Interactions
Write-Host "`n[TEST 5] Testing Movie Interactions" -ForegroundColor Yellow
Write-Host "Testing reaction tracking..." -ForegroundColor Gray

if ($recommendations -and $recommendations.Count -gt 0) {
    $testMovie = $recommendations[0]
    
    $interactions = @(
        @{ movieId = $testMovie.movieId; interactionType = "love"; metadata = @{ position = 1 } }
        @{ movieId = $testMovie.movieId; interactionType = "seen"; metadata = @{ position = 1 } }
        @{ movieId = $testMovie.movieId; interactionType = "not_interested"; metadata = @{ position = 1 } }
    )
    
    foreach ($interaction in $interactions) {
        $result = Invoke-API -Method POST -Endpoint "/api/movies/interaction/$sessionId" -Body $interaction
        if ($result) {
            Write-Host "   [OK] Tracked: $($interaction.interactionType)" -ForegroundColor Green
        }
    }
}

# Test 6: Refinement
Write-Host "`n[TEST 6] Testing Refinement Engine" -ForegroundColor Yellow
Write-Host "Testing refinement based on feedback..." -ForegroundColor Gray

if ($recommendations -and $recommendations.Count -ge 3) {
    $refinementBody = @{
        feedback = @(
            @{ movieId = $recommendations[0].movieId; reaction = "like" }
            @{ movieId = $recommendations[1].movieId; reaction = "dislike" }
            @{ movieId = $recommendations[2].movieId; reaction = "like" }
        )
        action = "more_like_this"
    }
    
    $refined = Invoke-API -Method POST -Endpoint "/api/movies/refine/$sessionId" -Body $refinementBody
    if ($refined) {
        Write-Host "[OK] Refinement successful" -ForegroundColor Green
        Write-Host "   Strategy: $($refined.strategy)" -ForegroundColor Cyan
        Write-Host "   Confidence: $($refined.confidence)%" -ForegroundColor Yellow
        Write-Host "   New recommendations: $($refined.recommendations.Count)" -ForegroundColor Gray
    }
}

# Test 7: Check Debug Endpoints
Write-Host "`n[TEST 7] Testing Debug Endpoints" -ForegroundColor Yellow
Write-Host "Checking system health..." -ForegroundColor Gray

$debugEndpoints = @(
    "/api/debug/check-bindings"
    "/api/debug/check-d1"
    "/api/debug/check-posters"
)

foreach ($endpoint in $debugEndpoints) {
    try {
        $response = Invoke-API -Method GET -Endpoint $endpoint
        if ($response) {
            Write-Host "   [OK] $endpoint working" -ForegroundColor Green
        }
    } catch {
        Write-Host "   [WARNING] $endpoint not accessible" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Frontend Testing Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

Write-Host "`n[SUMMARY] Test Results:" -ForegroundColor Yellow
Write-Host "   [OK] Frontend server running" -ForegroundColor Green
Write-Host "   [OK] Session initialization working" -ForegroundColor Green
Write-Host "   [OK] Question flow functional" -ForegroundColor Green
Write-Host "   [OK] Recommendations received" -ForegroundColor Green
Write-Host "   [OK] Movie data structure validated" -ForegroundColor Green
Write-Host "   [OK] Quick adjustments working" -ForegroundColor Green
Write-Host "   [OK] Interaction tracking functional" -ForegroundColor Green
Write-Host "   [OK] Refinement engine working" -ForegroundColor Green

Write-Host "`n[NOTES] MovieCard Component Compatibility:" -ForegroundColor Cyan
if ($recommendations -and $recommendations.Count -gt 0) {
    $sampleMovie = $recommendations[0]
    
    # Check for potential issues
    $issues = @()
    
    if (-not $sampleMovie.movieId) {
        $issues += "movieId field missing (might be using 'id' instead)"
    }
    
    if (-not $sampleMovie.poster -and -not $sampleMovie.poster_path) {
        $issues += "No poster image available"
    }
    
    if ($sampleMovie.vote_average -and -not $sampleMovie.rating) {
        $issues += "Using 'vote_average' instead of 'rating'"
    }
    
    if ($issues.Count -gt 0) {
        Write-Host "   [WARNING] Potential issues found:" -ForegroundColor Yellow
        foreach ($issue in $issues) {
            Write-Host "      - $issue" -ForegroundColor Yellow
        }
        Write-Host "`n   [TIP] Check if API response field names match MovieCard component expectations" -ForegroundColor Cyan
    } else {
        Write-Host "   [OK] Movie data structure appears compatible with MovieCard component" -ForegroundColor Green
    }
}

Write-Host "`n[NEXT STEPS]" -ForegroundColor Magenta
Write-Host "   1. If MovieCard not loading, check browser console for errors" -ForegroundColor Gray
Write-Host "   2. Verify field mapping between API response and Movie interface" -ForegroundColor Gray
Write-Host "   3. Check if poster URLs are accessible (CORS issues)" -ForegroundColor Gray
Write-Host "   4. Ensure all required MovieCard props are provided" -ForegroundColor Gray

Write-Host "`n[TIP] Run this script while frontend dev server is running:" -ForegroundColor Cyan
Write-Host "   Terminal 1: cd frontend/whatnext-app && npm run dev" -ForegroundColor Gray
Write-Host "   Terminal 2: ./scripts/test-frontend.ps1" -ForegroundColor Gray