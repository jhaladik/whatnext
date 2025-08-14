#!/usr/bin/env node

/**
 * Initialize TMDB movie vectors with conservative rate limiting
 * This script processes movies in batches to avoid overwhelming APIs
 */

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  WORKER_URL: process.env.WORKER_URL || 'http://localhost:8787',
  ADMIN_KEY: process.env.ADMIN_KEY || 'your-admin-key',
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  BATCH_SIZE: 50, // Movies per batch
  DELAY_BETWEEN_BATCHES: 30000, // 30 seconds between batches
  MAX_MOVIES: 50000,
  SAVE_PROGRESS: true,
  PROGRESS_FILE: 'vectorization-progress.json'
};

class VectorizationInitializer {
  constructor() {
    this.processed = [];
    this.failed = [];
    this.currentBatch = 0;
    this.totalProcessed = 0;
  }

  async loadProgress() {
    try {
      const data = await fs.readFile(CONFIG.PROGRESS_FILE, 'utf8');
      const progress = JSON.parse(data);
      this.processed = progress.processed || [];
      this.failed = progress.failed || [];
      this.currentBatch = progress.currentBatch || 0;
      this.totalProcessed = progress.totalProcessed || 0;
      console.log(`Loaded progress: ${this.totalProcessed} movies processed`);
    } catch (error) {
      console.log('No previous progress found, starting fresh');
    }
  }

  async saveProgress() {
    if (CONFIG.SAVE_PROGRESS) {
      const progress = {
        processed: this.processed,
        failed: this.failed,
        currentBatch: this.currentBatch,
        totalProcessed: this.totalProcessed,
        lastUpdate: new Date().toISOString()
      };
      await fs.writeFile(CONFIG.PROGRESS_FILE, JSON.stringify(progress, null, 2));
      console.log('Progress saved');
    }
  }

  async fetchPopularMovies(page = 1) {
    const url = `https://api.themoviedb.org/3/movie/popular?api_key=${CONFIG.TMDB_API_KEY}&page=${page}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.results
        .filter(m => !m.adult && !m.video)
        .map(m => m.id);
    } catch (error) {
      console.error(`Failed to fetch page ${page}:`, error.message);
      return [];
    }
  }

  async fetchTopRatedMovies(page = 1) {
    const url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${CONFIG.TMDB_API_KEY}&page=${page}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.results
        .filter(m => !m.adult && !m.video)
        .map(m => m.id);
    } catch (error) {
      console.error(`Failed to fetch top rated page ${page}:`, error.message);
      return [];
    }
  }

  async collectMovieIds() {
    console.log('Collecting movie IDs from TMDB...');
    const movieIds = new Set(this.processed);
    
    // Fetch popular movies (500 pages max)
    console.log('Fetching popular movies...');
    for (let page = 1; page <= 500 && movieIds.size < CONFIG.MAX_MOVIES; page++) {
      const ids = await this.fetchPopularMovies(page);
      ids.forEach(id => movieIds.add(id));
      
      if (page % 10 === 0) {
        console.log(`Collected ${movieIds.size} unique movie IDs`);
        await this.delay(2000); // Rate limit pause
      }
    }
    
    // Fetch top rated movies
    console.log('Fetching top rated movies...');
    for (let page = 1; page <= 500 && movieIds.size < CONFIG.MAX_MOVIES; page++) {
      const ids = await this.fetchTopRatedMovies(page);
      ids.forEach(id => movieIds.add(id));
      
      if (page % 10 === 0) {
        console.log(`Collected ${movieIds.size} unique movie IDs`);
        await this.delay(2000); // Rate limit pause
      }
    }
    
    // Remove already processed movies
    const newMovieIds = Array.from(movieIds).filter(id => !this.processed.includes(id));
    
    console.log(`Total unique movies to process: ${newMovieIds.length}`);
    return newMovieIds.slice(0, CONFIG.MAX_MOVIES);
  }

  async processBatch(movieIds) {
    console.log(`Processing batch of ${movieIds.length} movies...`);
    
    try {
      const response = await fetch(`${CONFIG.WORKER_URL}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          movieIds,
          adminKey: CONFIG.ADMIN_KEY
        })
      });
      
      if (!response.ok) {
        throw new Error(`Worker error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Batch submitted:', result);
      
      // Mark as processed
      this.processed.push(...movieIds);
      this.totalProcessed += movieIds.length;
      
      return true;
    } catch (error) {
      console.error('Batch processing failed:', error.message);
      this.failed.push(...movieIds);
      return false;
    }
  }

  async waitForProcessing(duration) {
    console.log(`Waiting ${duration / 1000} seconds for processing...`);
    
    // Check status periodically
    const checkInterval = 10000; // Check every 10 seconds
    let elapsed = 0;
    
    while (elapsed < duration) {
      await this.delay(checkInterval);
      elapsed += checkInterval;
      
      try {
        const response = await fetch(`${CONFIG.WORKER_URL}/stats`);
        if (response.ok) {
          const stats = await response.json();
          console.log(`Status: ${stats.vectors.completedMovies} vectors created`);
        }
      } catch (error) {
        // Ignore status check errors
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    console.log('='.repeat(50));
    console.log('TMDB Movie Vectorization Initializer');
    console.log('='.repeat(50));
    
    // Load previous progress
    await this.loadProgress();
    
    // Collect movie IDs
    const movieIds = await this.collectMovieIds();
    
    if (movieIds.length === 0) {
      console.log('No new movies to process!');
      return;
    }
    
    // Process in batches
    const batches = [];
    for (let i = 0; i < movieIds.length; i += CONFIG.BATCH_SIZE) {
      batches.push(movieIds.slice(i, i + CONFIG.BATCH_SIZE));
    }
    
    console.log(`Processing ${batches.length} batches of ~${CONFIG.BATCH_SIZE} movies each`);
    console.log('This will take several hours due to rate limiting...');
    
    for (let i = this.currentBatch; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\nBatch ${i + 1}/${batches.length}`);
      
      const success = await this.processBatch(batch);
      
      if (success) {
        this.currentBatch = i + 1;
        await this.saveProgress();
        
        // Wait between batches
        if (i < batches.length - 1) {
          await this.waitForProcessing(CONFIG.DELAY_BETWEEN_BATCHES);
        }
      } else {
        console.error(`Batch ${i + 1} failed, retrying in 1 minute...`);
        await this.delay(60000);
        i--; // Retry this batch
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('Vectorization initialization complete!');
    console.log(`Total movies processed: ${this.totalProcessed}`);
    console.log(`Failed movies: ${this.failed.length}`);
    console.log('='.repeat(50));
    
    // Final stats
    try {
      const response = await fetch(`${CONFIG.WORKER_URL}/stats`);
      if (response.ok) {
        const stats = await response.json();
        console.log('\nFinal Statistics:');
        console.log(JSON.stringify(stats, null, 2));
      }
    } catch (error) {
      console.error('Could not fetch final stats');
    }
  }
}

// Run the initializer
const initializer = new VectorizationInitializer();
initializer.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});