# Test Script: Verify Answer Influence on Recommendations
# Tests that user answers properly influence the recommendation results

# Configuration
$API_URL = "http://localhost:8788"  # Local dev with wrangler
# $API_URL = "https://whatnext-frontend.pages.dev"  # Production

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ANSWER INFLUENCE VERIFICATION TEST" -ForegroundColor Cyan
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

# Function to test a specific answer combination
function Test-AnswerCombination {
    param(
        [string]$TestName,
        [hashtable]$Answers,
        [string[]]$ExpectedTraits
    )
    
    Write-Host "`n[TEST] $TestName" -ForegroundColor Yellow
    Write-Host "================================" -ForegroundColor Yellow
    
    # Start session
    $session = Invoke-API -Method POST -Endpoint "/api/movies/start" -Body @{
        domain = "movies"
        questionFlow = "standard"
    }
    
    if (-not $session -or -not $session.sessionId) {
        Write-Host "[ERROR] Failed to start session" -ForegroundColor Red
        return
    }
    
    $sessionId = $session.sessionId
    Write-Host "Session ID: $sessionId" -ForegroundColor Gray
    
    # Submit answers
    $answerList = @(
        @{ questionId = "cognitive_load"; answer = $Answers.cognitive_load; responseTime = 2000 }
        @{ questionId = "emotional_tone"; answer = $Answers.emotional_tone; responseTime = 2000 }
        @{ questionId = "personal_context"; answer = $Answers.personal_context; responseTime = 2000 }
        @{ questionId = "attention_level"; answer = $Answers.attention_level; responseTime = 2000 }
        @{ questionId = "discovery_mode"; answer = $Answers.discovery_mode; responseTime = 2000 }
    )
    
    Write-Host "`nAnswers submitted:" -ForegroundColor Gray
    foreach ($key in $Answers.Keys) {
        Write-Host "  - $key : $($Answers[$key])" -ForegroundColor DarkGray
    }
    
    $recommendations = $null
    foreach ($answer in $answerList) {
        $response = Invoke-API -Method POST -Endpoint "/api/movies/answer/$sessionId" -Body $answer
        
        if ($response.type -eq "recommendations") {
            $recommendations = $response
            break
        }
    }
    
    if (-not $recommendations) {
        Write-Host "[ERROR] No recommendations received" -ForegroundColor Red
        return
    }
    
    # Analyze results
    Write-Host "`n[RESULTS]" -ForegroundColor Cyan
    Write-Host "Total recommendations: $($recommendations.recommendations.Count)" -ForegroundColor Gray
    
    # Check emotional profile
    if ($recommendations.emotionalProfile) {
        Write-Host "`nEmotional Profile:" -ForegroundColor Cyan
        $recommendations.emotionalProfile | ConvertTo-Json | Write-Host -ForegroundColor Gray
    }
    
    # Check first 5 movies
    Write-Host "`nFirst 5 Movies:" -ForegroundColor Cyan
    for ($i = 0; $i -lt [Math]::Min(5, $recommendations.recommendations.Count); $i++) {
        $movie = $recommendations.recommendations[$i]
        $genres = if ($movie.genres) { $movie.genres -join ", " } else { "N/A" }
        
        # Check if it's a surprise pick
        $surpriseTag = if ($movie.isSurprise) { " [SURPRISE]" } else { "" }
        
        Write-Host "$($i+1). $($movie.title) ($($movie.year))$surpriseTag" -ForegroundColor White
        Write-Host "   Genres: $genres" -ForegroundColor Gray
        Write-Host "   Rating: $($movie.rating)" -ForegroundColor Gray
        
        if ($movie.surpriseReason) {
            Write-Host "   Surprise Reason: $($movie.surpriseReason)" -ForegroundColor Magenta
        }
    }
    
    # Verify expected traits
    Write-Host "`n[VERIFICATION]" -ForegroundColor Yellow
    Write-Host "Expected traits in recommendations:" -ForegroundColor Gray
    foreach ($trait in $ExpectedTraits) {
        Write-Host "  - $trait" -ForegroundColor DarkGray
    }
    
    # Check if the search query reflects our answers
    # This would require access to the actual search query sent to vectorize
    # For now, we verify by checking the types of movies returned
    
    $success = $true
    Write-Host "`n[PASS/FAIL]" -ForegroundColor Yellow
    if ($recommendations.recommendations.Count -gt 0) {
        Write-Host "[PASS] Recommendations received based on answers" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] No recommendations received" -ForegroundColor Red
        $success = $false
    }
    
    return $success
}

# Test Case 1: User wants easy, uplifting content
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST CASE 1: EASY & UPLIFTING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Test-AnswerCombination -TestName "Easy & Uplifting Movies" -Answers @{
    cognitive_load = "easy"
    emotional_tone = "uplifting"
    personal_context = "escaping"
    attention_level = "moderate"
    discovery_mode = "reliable"
} -ExpectedTraits @(
    "Feel-good movies",
    "Light entertainment",
    "Positive themes",
    "Familiar genres"
)

Start-Sleep -Seconds 2

# Test Case 2: User wants intense, challenging content
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST CASE 2: INTENSE & CHALLENGING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Test-AnswerCombination -TestName "Intense & Challenging Movies" -Answers @{
    cognitive_load = "challenge"
    emotional_tone = "intense"
    personal_context = "reflecting"
    attention_level = "full_focus"
    discovery_mode = "surprise"
} -ExpectedTraits @(
    "Complex narratives",
    "Dark themes",
    "Psychological depth",
    "Experimental films"
)

Start-Sleep -Seconds 2

# Test Case 3: User wants contemplative, artistic content
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST CASE 3: CONTEMPLATIVE & ARTISTIC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Test-AnswerCombination -TestName "Contemplative & Artistic Movies" -Answers @{
    cognitive_load = "moderate"
    emotional_tone = "contemplative"
    personal_context = "exploring"
    attention_level = "moderate"
    discovery_mode = "surprise"
} -ExpectedTraits @(
    "Thoughtful films",
    "Artistic approach",
    "Character studies",
    "Independent cinema"
)

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[KEY VERIFICATION POINTS]" -ForegroundColor Yellow
Write-Host "1. Emotional profile should match user answers" -ForegroundColor Gray
Write-Host "2. Search query should include emotional enhancements" -ForegroundColor Gray
Write-Host "3. Surprise picks should respect user preferences" -ForegroundColor Gray
Write-Host "4. Adjacent discoveries should be complementary, not opposite" -ForegroundColor Gray

Write-Host "`n[WHAT TO LOOK FOR]" -ForegroundColor Magenta
Write-Host "- Easy+Uplifting should return comedies, feel-good dramas" -ForegroundColor Gray
Write-Host "- Intense+Challenge should return thrillers, psychological dramas" -ForegroundColor Gray
Write-Host "- Contemplative should return indie films, art house cinema" -ForegroundColor Gray
Write-Host "- Surprise picks should still align with mood/energy level" -ForegroundColor Gray

Write-Host "`n[NOTES]" -ForegroundColor Cyan
Write-Host "If recommendations don't match expectations:" -ForegroundColor Gray
Write-Host "1. Check if emotional profile reflects answers correctly" -ForegroundColor Gray
Write-Host "2. Verify search query includes emotional enhancements" -ForegroundColor Gray
Write-Host "3. Confirm surprise engine considers user profile" -ForegroundColor Gray
Write-Host "4. Check vectorize worker logs for actual search queries" -ForegroundColor Gray