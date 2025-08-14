# WhatNext Movie Database Curation Strategy

## 🎯 Vision
Create a carefully curated database of **10,000-15,000 films** that people genuinely love, focusing on quality over quantity and lasting appeal over recency bias.

## 📊 Current Problem
- **4,720 movies** with unclear quality distribution
- Too many recent releases with insufficient validation
- Missing timeless classics that define cinema
- Lack of hidden gems and cult favorites
- Overemphasis on blockbusters

## ✨ Ideal Database Composition

### 1. **Timeless Classics (30% - 3,000 films)**
- **Era**: Pre-2000
- **Criteria**: 
  - Rating: 7.5+ on TMDB/IMDB
  - Votes: 5,000+ (or 1,000+ for pre-1970)
  - Must have cultural significance
- **Sources**:
  - AFI Top 100 Films
  - Sight & Sound Critics' Poll
  - Criterion Collection
  - National Film Registry
- **Examples**: Casablanca, 12 Angry Men, The Godfather, Psycho

### 2. **Modern Classics (25% - 2,500 films)**
- **Era**: 2000-2015
- **Criteria**:
  - Rating: 7.5+
  - Votes: 10,000+
  - Proven staying power (still discussed/watched)
- **Sources**:
  - IMDB Top 250 (2000-2015 entries)
  - Letterboxd highest rated
  - 21st Century best-of lists
- **Examples**: The Dark Knight, There Will Be Blood, Inception, The Social Network

### 3. **Hidden Gems (20% - 2,000 films)**
- **Era**: Any
- **Criteria**:
  - Rating: 7.0+
  - Votes: 1,000-10,000
  - Strong genre representation
  - International cinema
- **Sources**:
  - Festival winners (Sundance, SXSW)
  - A24 catalog
  - Foreign language Oscar submissions
  - Genre-specific "best of" lists
- **Examples**: Coherence, The Man from Earth, Tucker and Dale vs Evil

### 4. **Recent Excellence (15% - 1,500 films)**
- **Era**: 2016-2023 (NOT 2024-2025)
- **Criteria**:
  - Rating: 7.5+
  - Votes: 20,000+ (proven popularity)
  - Minimum 2 years old
  - Critical acclaim + audience love
- **Sources**:
  - Recent Oscar winners/nominees
  - Festival Grand Prix winners
  - Verified box office + critical success
- **Examples**: Parasite, Everything Everywhere All at Once, Dune

### 5. **Cult Favorites (10% - 1,000 films)**
- **Era**: Any
- **Criteria**:
  - Passionate fanbase (even if polarizing)
  - Rating: 6.5+ with high engagement
  - Unique/memorable/quotable
  - Rewatchability factor
- **Sources**:
  - Midnight movie classics
  - Reddit r/movies favorites
  - "So bad it's good" classics
  - Genre cult followings
- **Examples**: The Room, Rocky Horror, The Big Lebowski, Donnie Darko

## 🔍 New Filtering Criteria

### Minimum Requirements by Era:

| Era | Min Age | Min Votes | Min Rating | Special Considerations |
|-----|---------|-----------|------------|------------------------|
| Pre-1970 | N/A | 500 | 7.0 | Historical importance |
| 1970-1989 | N/A | 1,000 | 7.0 | Genre influence |
| 1990-1999 | N/A | 5,000 | 7.0 | Cultural impact |
| 2000-2015 | N/A | 10,000 | 7.2 | Sustained popularity |
| 2016-2022 | 2 years | 20,000 | 7.5 | Proven staying power |
| 2023+ | 2 years | 50,000 | 8.0 | Exceptional only |

### Genre Balance Requirements:
- **Drama**: 25%
- **Comedy**: 15%
- **Action/Adventure**: 15%
- **Thriller/Mystery**: 15%
- **Sci-Fi/Fantasy**: 10%
- **Horror**: 8%
- **Romance**: 7%
- **Documentary**: 3%
- **Animation**: 2%

### Diversity Requirements:
- **International Films**: Minimum 20% non-English
- **Female Directors**: Minimum 15%
- **Diverse Cast**: Minimum 30%
- **Different Countries**: At least 50 countries represented

## 📈 Implementation Plan

### Phase 1: Clean Current Database (Week 1)
1. Remove all 2024-2025 releases (except award winners)
2. Remove films with <1000 votes
3. Remove films with <6.5 rating
4. Keep only films that meet era-specific criteria

### Phase 2: Add Timeless Classics (Week 2)
1. Import AFI Top 100
2. Import IMDB Top 250 (pre-2000)
3. Import Criterion Collection highlights
4. Add Best Picture Oscar winners

### Phase 3: Add Modern Classics (Week 3)
1. Import IMDB Top 250 (2000-2015)
2. Add Letterboxd Top 1000 (filtered)
3. Import 21st century critical consensus films

### Phase 4: Discover Hidden Gems (Week 4)
1. Festival winners (Sundance, Cannes, Berlin, Venice)
2. Foreign language submissions
3. Genre-specific deep dives
4. Streaming platform originals (high-rated)

### Phase 5: Curate Recent Excellence (Week 5)
1. 2016-2023 award winners
2. Verified box office + critical successes
3. Films with lasting cultural impact

### Phase 6: Add Cult Favorites (Week 6)
1. Midnight movie circuit
2. Reddit/Letterboxd cult followings
3. "Essential viewing" lists by genre

## 🛠️ Technical Implementation

### Modified TMDB Filters:
```javascript
function shouldIncludeMovie(movie) {
  const year = new Date(movie.release_date).getFullYear();
  const age = new Date().getFullYear() - year;
  
  // Reject too-new movies
  if (age < 2 && !movie.hasAwards) return false;
  
  // Era-specific criteria
  if (year < 1970) {
    return movie.vote_count >= 500 && movie.vote_average >= 7.0;
  } else if (year < 1990) {
    return movie.vote_count >= 1000 && movie.vote_average >= 7.0;
  } else if (year < 2000) {
    return movie.vote_count >= 5000 && movie.vote_average >= 7.0;
  } else if (year < 2016) {
    return movie.vote_count >= 10000 && movie.vote_average >= 7.2;
  } else if (year < 2023) {
    return movie.vote_count >= 20000 && movie.vote_average >= 7.5;
  } else {
    // 2023+: Only exceptional films
    return movie.vote_count >= 50000 && movie.vote_average >= 8.0;
  }
}
```

### Priority Scoring:
```javascript
function calculatePriority(movie) {
  let score = movie.vote_average * 10;
  
  // Boost classics
  const age = new Date().getFullYear() - movie.year;
  if (age > 20) score += age * 0.5;
  
  // Boost highly voted films
  score += Math.log10(movie.vote_count) * 5;
  
  // Boost award winners
  if (movie.hasOscar) score += 20;
  if (movie.hasFestivalWin) score += 15;
  
  // Boost underrepresented genres
  if (movie.genres.includes('Documentary')) score += 10;
  if (movie.genres.includes('Foreign')) score += 10;
  
  return score;
}
```

## 📊 Success Metrics

### Quality Indicators:
- Average rating: >7.5
- Average vote count: >10,000
- Decade distribution: No decade >30%
- Genre distribution: Within target ranges
- User satisfaction: >85% find recommendations relevant

### Database Health:
- Total films: 10,000-15,000
- Update frequency: Add 10-20 films/month
- Remove poor performers: Quarterly review
- Maintain freshness: 2% annual turnover

## 🎬 Special Collections

### Must-Have Lists:
1. **Directors' Essential Films**:
   - Kubrick: 2001, Clockwork Orange, The Shining
   - Scorsese: Taxi Driver, Goodfellas, The Departed
   - Nolan: Memento, The Dark Knight, Interstellar
   - Tarantino: Pulp Fiction, Kill Bill, Django

2. **Genre Essentials**:
   - Sci-Fi: Blade Runner, The Matrix, Arrival
   - Horror: The Exorcist, The Thing, Hereditary
   - Romance: Before Trilogy, Eternal Sunshine, Her
   - Comedy: Some Like It Hot, Groundhog Day, Grand Budapest

3. **International Cinema**:
   - Japanese: Seven Samurai, Spirited Away, Your Name
   - French: Amélie, La Haine, Portrait of a Lady on Fire
   - Korean: Oldboy, Parasite, Burning
   - Mexican: Pan's Labyrinth, Y Tu Mamá También, Roma

## 🚀 Next Steps

1. **Immediate**: Remove 2024-2025 releases except verified excellence
2. **Week 1**: Implement new filtering criteria
3. **Week 2-6**: Execute phased import plan
4. **Ongoing**: Monthly curation reviews
5. **Quarterly**: Database quality audits

## 📝 Notes

- **Quality > Quantity**: Better to have 10,000 great films than 50,000 mediocre ones
- **User Trust**: Every recommendation should be defensible
- **Cultural Relevance**: Balance between timeless and timely
- **Discovery**: Help users find films they'll love, not just popular ones
- **Longevity**: Build a database that remains relevant for years