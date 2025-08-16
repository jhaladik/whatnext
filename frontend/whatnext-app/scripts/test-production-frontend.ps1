# Production Frontend Testing Script for WhatNext App
# Tests production deployment at https://whatnext-frontend.pages.dev/

# Configuration
$PRODUCTION_URL = "https://whatnext-frontend.pages.dev"

Write-Host "[PRODUCTION] Testing WhatNext Frontend in Production" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Production URL: $PRODUCTION_URL" -ForegroundColor Gray
Write-Host ""

# Function to make API calls
function Invoke-API {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    $uri = "$PRODUCTION_URL$Endpoint"
    $headers = @{
        "Content-Type" = "application/json"
        "Accept" = "application/json"
    }
    
    try {
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            Write-Host "[DEBUG] Request to: $uri" -ForegroundColor DarkGray
            Write-Host "[DEBUG] Request body: $jsonBody" -ForegroundColor DarkGray
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $jsonBody
        } else {
            Write-Host "[DEBUG] Request to: $uri" -ForegroundColor DarkGray
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
        }
        Write-Host "[DEBUG] Response received" -ForegroundColor DarkGray
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

# Test 1: Check Production Site
Write-Host "[TEST 1] Checking Production Site" -ForegroundColor Yellow
Write-Host "Testing if production site is accessible..." -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $PRODUCTION_URL -Method GET -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Production site is accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] Production site is not accessible at $PRODUCTION_URL" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Check Recommendations Page
Write-Host "`n[TEST 2] Checking Recommendations Page" -ForegroundColor Yellow
Write-Host "Testing if recommendations page loads..." -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "$PRODUCTION_URL/recommendations" -Method GET -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Recommendations page loads" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARNING] Recommendations page returned error" -ForegroundColor Yellow
}

# Test 3: Start Session via Production API
Write-Host "`n[TEST 3] Starting Session via Production API" -ForegroundColor Yellow
Write-Host "Testing session initialization..." -ForegroundColor Gray

$startBody = @{
    domain = "movies"
    questionFlow = "standard"
    context = @{
        timeOfDay = "evening"
        dayOfWeek = (Get-Date).DayOfWeek.ToString()
        season = "winter"
    }
}

$session = Invoke-API -Method POST -Endpoint "/api/movies/start" -Body $startBody
if ($session) {
    Write-Host "[OK] Session started successfully" -ForegroundColor Green
    Write-Host "   Session ID: $($session.sessionId)" -ForegroundColor Gray
    Write-Host "   Greeting: $($session.greeting)" -ForegroundColor Cyan
    Write-Host "   Flow Type: $($session.flowType)" -ForegroundColor Gray
    
    if ($session.questions) {
        Write-Host "   Questions loaded: $($session.questions.Count)" -ForegroundColor Gray
        $sessionId = $session.sessionId
    } elseif ($session.question) {
        Write-Host "   First question: $($session.question.text)" -ForegroundColor Gray
        $sessionId = $session.sessionId
    }
} else {
    Write-Host "[ERROR] Failed to start session" -ForegroundColor Red
    Write-Host "The API endpoint may not be properly configured" -ForegroundColor Yellow
    exit 1
}

# Test 4: Answer Questions and Get Recommendations
Write-Host "`n[TEST 4] Answering Questions to Get Recommendations" -ForegroundColor Yellow
Write-Host "Submitting answers..." -ForegroundColor Gray

$answers = @(
    @{ questionId = "cognitive_load"; answer = "easy"; responseTime = 2000 }
    @{ questionId = "emotional_tone"; answer = "uplifting"; responseTime = 2500 }
    @{ questionId = "personal_context"; answer = "escaping"; responseTime = 3000 }
    @{ questionId = "attention_level"; answer = "moderate"; responseTime = 2200 }
    @{ questionId = "discovery_mode"; answer = "familiar"; responseTime = 1800 }
)

$recommendationsReceived = $false
$questionIndex = 1
$allResponses = @()

foreach ($answer in $answers) {
    Write-Host "   Answering question $questionIndex/5: $($answer.questionId)" -ForegroundColor Gray
    
    Start-Sleep -Milliseconds 500
    
    $response = Invoke-API -Method POST -Endpoint "/api/movies/answer/$sessionId" -Body $answer
    $allResponses += $response
    
    if ($response) {
        Write-Host "   [DEBUG] Response type: $($response.type)" -ForegroundColor DarkGray
        
        if ($response.type -eq "recommendations") {
            Write-Host "[OK] Recommendations received!" -ForegroundColor Green
            Write-Host "   Total movies: $($response.recommendations.Count)" -ForegroundColor Gray
            
            # Detailed validation of movie structure
            Write-Host "`n[VALIDATION] Analyzing Movie Data Structure..." -ForegroundColor Yellow
            
            if ($response.recommendations -and $response.recommendations.Count -gt 0) {
                $firstMovie = $response.recommendations[0]
                
                Write-Host "`n[MOVIE DATA] First movie object:" -ForegroundColor Cyan
                $firstMovie | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Gray
                
                # Check MovieCard required fields
                Write-Host "`n[FIELD CHECK] MovieCard Component Requirements:" -ForegroundColor Yellow
                
                $fieldChecks = @(
                    @{Name="movieId"; Required=$true; Path="movieId"}
                    @{Name="title"; Required=$true; Path="title"}
                    @{Name="poster"; Required=$false; Path="poster"}
                    @{Name="year"; Required=$true; Path="year"}
                    @{Name="rating"; Required=$true; Path="rating"}
                    @{Name="genres"; Required=$true; Path="genres"}
                    @{Name="overview"; Required=$true; Path="overview"}
                    @{Name="runtime"; Required=$false; Path="runtime"}
                    @{Name="director"; Required=$false; Path="director"}
                    @{Name="cast"; Required=$false; Path="cast"}
                    @{Name="tagline"; Required=$false; Path="tagline"}
                    @{Name="trailer_key"; Required=$false; Path="trailer_key"}
                    @{Name="isSurprise"; Required=$false; Path="isSurprise"}
                    @{Name="surpriseReason"; Required=$false; Path="surpriseReason"}
                )
                
                $missingRequired = @()
                $missingOptional = @()
                
                foreach ($field in $fieldChecks) {
                    $value = $firstMovie.($field.Path)
                    if ($value) {
                        $displayValue = if ($field.Name -eq "poster") { 
                            "URL present (length: $($value.Length))" 
                        } elseif ($field.Name -eq "genres" -and $value -is [array]) {
                            "$($value.Count) genres: $($value -join ', ')"
                        } elseif ($field.Name -eq "cast" -and $value -is [array]) {
                            "$($value.Count) cast members"
                        } else {
                            $value
                        }
                        Write-Host "   [OK] $($field.Name): $displayValue" -ForegroundColor Green
                    } else {
                        if ($field.Required) {
                            Write-Host "   [MISSING] $($field.Name) (REQUIRED)" -ForegroundColor Red
                            $missingRequired += $field.Name
                        } else {
                            Write-Host "   [--] $($field.Name) (optional)" -ForegroundColor Gray
                            $missingOptional += $field.Name
                        }
                    }
                }
                
                # Check for unexpected field names (API might use different names)
                Write-Host "`n[FIELD MAPPING] Checking for alternative field names:" -ForegroundColor Yellow
                
                $alternativeFields = @(
                    @{Expected="movieId"; Alternatives=@("id", "tmdb_id", "movie_id")}
                    @{Expected="poster"; Alternatives=@("poster_path", "posterPath", "image")}
                    @{Expected="rating"; Alternatives=@("vote_average", "voteAverage", "score")}
                    @{Expected="genres"; Alternatives=@("genre_ids", "genreIds", "categories")}
                    @{Expected="runtime"; Alternatives=@("duration", "length")}
                    @{Expected="releaseDate"; Alternatives=@("release_date", "date")}
                )
                
                foreach ($mapping in $alternativeFields) {
                    if (-not $firstMovie.($mapping.Expected)) {
                        foreach ($alt in $mapping.Alternatives) {
                            if ($firstMovie.$alt) {
                                Write-Host "   [FOUND] '$alt' exists (might need to map to '$($mapping.Expected)')" -ForegroundColor Yellow
                            }
                        }
                    }
                }
                
                # Check poster URL validity
                if ($firstMovie.poster) {
                    Write-Host "`n[POSTER CHECK] Validating poster URL:" -ForegroundColor Yellow
                    if ($firstMovie.poster -match "^https?://") {
                        Write-Host "   [OK] Full URL: $($firstMovie.poster)" -ForegroundColor Green
                        
                        # Test if poster is accessible
                        try {
                            $posterTest = Invoke-WebRequest -Uri $firstMovie.poster -Method HEAD -TimeoutSec 5
                            Write-Host "   [OK] Poster URL is accessible" -ForegroundColor Green
                        } catch {
                            Write-Host "   [WARNING] Poster URL not accessible (might be CORS issue)" -ForegroundColor Yellow
                        }
                    } elseif ($firstMovie.poster -match "^/") {
                        Write-Host "   [INFO] Relative path: $($firstMovie.poster)" -ForegroundColor Cyan
                        Write-Host "   [INFO] Needs TMDB base URL: https://image.tmdb.org/t/p/w500" -ForegroundColor Cyan
                    } else {
                        Write-Host "   [WARNING] Unusual poster format: $($firstMovie.poster)" -ForegroundColor Yellow
                    }
                }
                
                # Summary
                if ($missingRequired.Count -eq 0) {
                    Write-Host "`n[SUCCESS] All required MovieCard fields are present!" -ForegroundColor Green
                } else {
                    Write-Host "`n[ERROR] Missing required fields for MovieCard:" -ForegroundColor Red
                    Write-Host "   $($missingRequired -join ', ')" -ForegroundColor Red
                    Write-Host "`n[SOLUTION] The API response needs to include these fields" -ForegroundColor Yellow
                }
            }
            
            $recommendationsReceived = $true
            $recommendations = $response.recommendations
            break
        } elseif ($response.question) {
            Write-Host "   Next question: $($response.question.text)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   [WARNING] No response for question $questionIndex" -ForegroundColor Yellow
    }
    
    $questionIndex++
}

if (-not $recommendationsReceived) {
    Write-Host "`n[ERROR] No recommendations received after all questions" -ForegroundColor Red
    Write-Host "[DEBUG] All responses:" -ForegroundColor Yellow
    $allResponses | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Gray
}

# Test 5: Check API Functions Configuration
Write-Host "`n[TEST 5] Checking API Functions Configuration" -ForegroundColor Yellow

$debugEndpoints = @(
    @{Path="/api/debug/check-bindings"; Name="Bindings Check"}
    @{Path="/api/debug/check-d1"; Name="Database Check"}
    @{Path="/api/debug/check-posters"; Name="Posters Check"}
)

foreach ($endpoint in $debugEndpoints) {
    try {
        Write-Host "   Testing $($endpoint.Name)..." -ForegroundColor Gray
        $response = Invoke-API -Method GET -Endpoint $endpoint.Path
        if ($response) {
            Write-Host "   [OK] $($endpoint.Name) working" -ForegroundColor Green
            $jsonResponse = $response | ConvertTo-Json -Compress
            if ($jsonResponse.Length -lt 200) {
                $response | ConvertTo-Json | Write-Host -ForegroundColor DarkGray
            }
        }
    } catch {
        Write-Host "   [WARNING] $($endpoint.Name) not accessible" -ForegroundColor Yellow
    }
}

# Summary and Diagnosis
Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host "[DIAGNOSIS] MovieCard Loading Issues" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan

if ($recommendations) {
    $sampleMovie = $recommendations[0]
    
    Write-Host "`n[LIKELY ISSUES]" -ForegroundColor Red
    
    if (-not $sampleMovie.movieId) {
        Write-Host "1. MovieCard expects 'movieId' but API might be sending 'id'" -ForegroundColor Yellow
        Write-Host "   FIX: Update API to use 'movieId' or update MovieCard to accept 'id'" -ForegroundColor Cyan
    }
    
    if (-not $sampleMovie.poster -or -not ($sampleMovie.poster -match "^https?://")) {
        Write-Host "2. Poster URLs might be incomplete or missing" -ForegroundColor Yellow
        Write-Host "   FIX: Ensure API returns full TMDB URLs like: https://image.tmdb.org/t/p/w500/..." -ForegroundColor Cyan
    }
    
    if ($sampleMovie.vote_average -and -not $sampleMovie.rating) {
        Write-Host "3. API uses 'vote_average' but MovieCard expects 'rating'" -ForegroundColor Yellow
        Write-Host "   FIX: Map vote_average to rating in the API response" -ForegroundColor Cyan
    }
    
    if (-not $sampleMovie.genres -or $sampleMovie.genres.Count -eq 0) {
        Write-Host "4. Genres array is missing or empty" -ForegroundColor Yellow
        Write-Host "   FIX: Ensure API populates genres array with genre names" -ForegroundColor Cyan
    }
}

Write-Host "`n[RECOMMENDED ACTIONS]" -ForegroundColor Magenta
Write-Host "1. Open browser DevTools on $PRODUCTION_URL/recommendations" -ForegroundColor Gray
Write-Host "2. Check Console for JavaScript errors" -ForegroundColor Gray
Write-Host "3. Check Network tab for API responses" -ForegroundColor Gray
Write-Host "4. Verify the response structure matches Movie interface in client.ts" -ForegroundColor Gray

Write-Host "`n[BROWSER CONSOLE TEST]" -ForegroundColor Cyan
Write-Host "Run this in browser console to test API directly:" -ForegroundColor Gray
Write-Host @"
fetch('$PRODUCTION_URL/api/movies/start', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({domain: 'movies', questionFlow: 'quick'})
}).then(r => r.json()).then(console.log)
"@ -ForegroundColor DarkGray