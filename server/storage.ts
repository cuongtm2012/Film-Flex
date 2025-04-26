import {
  users, type User, type InsertUser,
  genres, type Genre, type InsertGenre,
  movies, type Movie, type InsertMovie,
  favorites, type Favorite, type InsertFavorite,
  viewHistory, type ViewHistory, type InsertViewHistory
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Genre methods
  getAllGenres(): Promise<Genre[]>;
  getGenre(id: number): Promise<Genre | undefined>;
  createGenre(genre: InsertGenre): Promise<Genre>;
  
  // Movie methods
  getAllMovies(): Promise<Movie[]>;
  getMovie(id: number): Promise<Movie | undefined>;
  getMoviesByGenre(genreId: number): Promise<Movie[]>;
  searchMovies(query: string): Promise<Movie[]>;
  getFeaturedMovies(): Promise<Movie[]>;
  getNewReleases(): Promise<Movie[]>;
  createMovie(movie: InsertMovie): Promise<Movie>;
  
  // Favorites methods
  getUserFavorites(userId: number): Promise<Movie[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, movieId: number): Promise<void>;
  
  // View history methods
  getUserViewHistory(userId: number): Promise<ViewHistory[]>;
  addOrUpdateViewHistory(history: InsertViewHistory): Promise<ViewHistory>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private genres: Map<number, Genre>;
  private movies: Map<number, Movie>;
  private favorites: Map<number, Favorite>;
  private viewHistory: Map<number, ViewHistory>;
  
  currentUserId: number;
  currentGenreId: number;
  currentMovieId: number;
  currentFavoriteId: number;
  currentViewHistoryId: number;

  constructor() {
    this.users = new Map();
    this.genres = new Map();
    this.movies = new Map();
    this.favorites = new Map();
    this.viewHistory = new Map();
    
    this.currentUserId = 1;
    this.currentGenreId = 1;
    this.currentMovieId = 1;
    this.currentFavoriteId = 1;
    this.currentViewHistoryId = 1;
    
    // Add some initial genres
    this.initializeGenres();
    
    // Add some initial movies
    this.initializeMovies();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Genre methods
  async getAllGenres(): Promise<Genre[]> {
    return Array.from(this.genres.values());
  }
  
  async getGenre(id: number): Promise<Genre | undefined> {
    return this.genres.get(id);
  }
  
  async createGenre(insertGenre: InsertGenre): Promise<Genre> {
    const id = this.currentGenreId++;
    const genre: Genre = { ...insertGenre, id };
    this.genres.set(id, genre);
    return genre;
  }
  
  // Movie methods
  async getAllMovies(): Promise<Movie[]> {
    return Array.from(this.movies.values());
  }
  
  async getMovie(id: number): Promise<Movie | undefined> {
    return this.movies.get(id);
  }
  
  async getMoviesByGenre(genreId: number): Promise<Movie[]> {
    return Array.from(this.movies.values()).filter(movie => 
      movie.genreIds.includes(genreId)
    );
  }
  
  async searchMovies(query: string): Promise<Movie[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.movies.values()).filter(movie => 
      movie.title.toLowerCase().includes(lowerQuery) || 
      movie.description.toLowerCase().includes(lowerQuery)
    );
  }
  
  async getFeaturedMovies(): Promise<Movie[]> {
    // For this demo, we'll return the first 5 movies as featured
    return Array.from(this.movies.values()).slice(0, 5);
  }
  
  async getNewReleases(): Promise<Movie[]> {
    // For this demo, we'll sort by releaseYear and return the most recent ones
    return Array.from(this.movies.values())
      .sort((a, b) => b.releaseYear - a.releaseYear)
      .slice(0, 5);
  }
  
  async createMovie(insertMovie: InsertMovie): Promise<Movie> {
    const id = this.currentMovieId++;
    const movie: Movie = { ...insertMovie, id };
    this.movies.set(id, movie);
    return movie;
  }
  
  // Favorites methods
  async getUserFavorites(userId: number): Promise<Movie[]> {
    const userFavorites = Array.from(this.favorites.values())
      .filter(favorite => favorite.userId === userId);
    
    return userFavorites.map(favorite => 
      this.movies.get(favorite.movieId)!
    ).filter(Boolean);
  }
  
  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const id = this.currentFavoriteId++;
    const favorite: Favorite = { 
      ...insertFavorite, 
      id, 
      createdAt: new Date() 
    };
    this.favorites.set(id, favorite);
    return favorite;
  }
  
  async removeFavorite(userId: number, movieId: number): Promise<void> {
    const favoriteToRemove = Array.from(this.favorites.values()).find(
      favorite => favorite.userId === userId && favorite.movieId === movieId
    );
    
    if (favoriteToRemove) {
      this.favorites.delete(favoriteToRemove.id);
    }
  }
  
  // View history methods
  async getUserViewHistory(userId: number): Promise<ViewHistory[]> {
    return Array.from(this.viewHistory.values())
      .filter(history => history.userId === userId)
      .sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime());
  }
  
  async addOrUpdateViewHistory(insertHistory: InsertViewHistory): Promise<ViewHistory> {
    // Check if there's already an entry for this user and movie
    const existingHistory = Array.from(this.viewHistory.values()).find(
      history => history.userId === insertHistory.userId && history.movieId === insertHistory.movieId
    );
    
    // Increment movie view count
    const movie = this.movies.get(insertHistory.movieId);
    if (movie && (!existingHistory || existingHistory.progress < 10)) {
      // Only count as a new view if it's a new history entry or previous progress was minimal
      const updatedMovie = { 
        ...movie, 
        viewCount: (movie.viewCount || 0) + 1 
      };
      this.movies.set(movie.id, updatedMovie);
    }
    
    if (existingHistory) {
      // Update the existing entry
      const updatedHistory: ViewHistory = {
        ...existingHistory,
        progress: insertHistory.progress || existingHistory.progress,
        watchedAt: new Date()
      };
      this.viewHistory.set(existingHistory.id, updatedHistory);
      return updatedHistory;
    } else {
      // Create a new entry
      const id = this.currentViewHistoryId++;
      const history: ViewHistory = { 
        ...insertHistory, 
        id, 
        watchedAt: new Date(),
        progress: insertHistory.progress || 0
      };
      this.viewHistory.set(id, history);
      return history;
    }
  }
  
  // Helper methods to initialize sample data
  private initializeGenres() {
    const genreNames = [
      "Action", "Adventure", "Comedy", "Drama", "Horror", 
      "Science Fiction", "Thriller", "Documentary", "Animation"
    ];
    
    genreNames.forEach(name => {
      const genre: Genre = {
        id: this.currentGenreId++,
        name
      };
      this.genres.set(genre.id, genre);
    });
  }
  
  private initializeMovies() {
    const sampleMovies: Omit<Movie, 'id'>[] = [
      {
        title: "The Dark Knight",
        description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
        releaseYear: 2008,
        duration: 152,
        posterUrl: "https://images.unsplash.com/photo-1497514440240-3b870f7341f0",
        backdropUrl: "https://images.unsplash.com/photo-1497514440240-3b870f7341f0",
        rating: "PG-13",
        matchPercentage: 98,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 7], // Action, Thriller
        director: "Christopher Nolan",
        cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
        imdbRating: "9.0",
        viewCount: 1245
      },
      {
        title: "Inception",
        description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        releaseYear: 2010,
        duration: 148,
        posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1",
        backdropUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1",
        rating: "PG-13",
        matchPercentage: 97,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 6, 7], // Action, Sci-Fi, Thriller
        director: "Christopher Nolan",
        cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"],
        imdbRating: "8.8"
      },
      {
        title: "Interstellar",
        description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        releaseYear: 2014,
        duration: 169,
        posterUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26",
        backdropUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26",
        rating: "PG-13",
        matchPercentage: 94,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [2, 6], // Adventure, Sci-Fi
        director: "Christopher Nolan",
        cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
        imdbRating: "8.6"
      },
      {
        title: "The Matrix",
        description: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
        releaseYear: 1999,
        duration: 136,
        posterUrl: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf",
        backdropUrl: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf",
        rating: "R",
        matchPercentage: 92,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 6], // Action, Sci-Fi
        director: "Lana Wachowski, Lilly Wachowski",
        cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
        imdbRating: "8.7"
      },
      {
        title: "Blade Runner 2049",
        description: "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who's been missing for thirty years.",
        releaseYear: 2017,
        duration: 164,
        posterUrl: "https://images.unsplash.com/photo-1611523658822-385aa008324c",
        backdropUrl: "https://images.unsplash.com/photo-1611523658822-385aa008324c",
        rating: "R",
        matchPercentage: 89,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 6], // Action, Sci-Fi
        director: "Denis Villeneuve",
        cast: ["Ryan Gosling", "Harrison Ford", "Ana de Armas"],
        imdbRating: "8.0"
      },
      {
        title: "Dune",
        description: "Feature adaptation of Frank Herbert's science fiction novel, about the son of a noble family entrusted with the protection of the most valuable asset and most vital element in the galaxy.",
        releaseYear: 2021,
        duration: 155,
        posterUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0",
        backdropUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0",
        rating: "PG-13",
        matchPercentage: 91,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [2, 6], // Adventure, Sci-Fi
        director: "Denis Villeneuve",
        cast: ["Timothée Chalamet", "Rebecca Ferguson", "Zendaya"],
        imdbRating: "8.0"
      },
      {
        title: "Tenet",
        description: "Armed with only one word, Tenet, and fighting for the survival of the entire world, a Protagonist journeys through a twilight world of international espionage on a mission that will unfold in something beyond real time.",
        releaseYear: 2020,
        duration: 150,
        posterUrl: "https://images.unsplash.com/photo-1507207611509-ec012433ff52",
        backdropUrl: "https://images.unsplash.com/photo-1507207611509-ec012433ff52",
        rating: "PG-13",
        matchPercentage: 88,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 6, 7], // Action, Sci-Fi, Thriller
        director: "Christopher Nolan",
        cast: ["John David Washington", "Robert Pattinson", "Elizabeth Debicki"],
        imdbRating: "7.4"
      },
      {
        title: "The Tomorrow War",
        description: "A family man is drafted to fight in a future war where the fate of humanity relies on his ability to confront the past.",
        releaseYear: 2021,
        duration: 138,
        posterUrl: "https://images.unsplash.com/photo-1529641484336-ef35148bab06",
        backdropUrl: "https://images.unsplash.com/photo-1529641484336-ef35148bab06",
        rating: "PG-13",
        matchPercentage: 82,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 2, 6], // Action, Adventure, Sci-Fi
        director: "Chris McKay",
        cast: ["Chris Pratt", "Yvonne Strahovski", "J.K. Simmons"],
        imdbRating: "6.6"
      },
      {
        title: "No Time to Die",
        description: "James Bond has left active service. His peace is short-lived when Felix Leiter, an old friend from the CIA, turns up asking for help.",
        releaseYear: 2021,
        duration: 163,
        posterUrl: "https://images.unsplash.com/photo-1512070679279-8988d32161be",
        backdropUrl: "https://images.unsplash.com/photo-1512070679279-8988d32161be",
        rating: "PG-13",
        matchPercentage: 87,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 2, 7], // Action, Adventure, Thriller
        director: "Cary Joji Fukunaga",
        cast: ["Daniel Craig", "Ana de Armas", "Rami Malek"],
        imdbRating: "7.3"
      },
      {
        title: "Free Guy",
        description: "A bank teller discovers that he's actually an NPC inside a brutal, open world video game.",
        releaseYear: 2021,
        duration: 115,
        posterUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c",
        backdropUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c",
        rating: "PG-13",
        matchPercentage: 90,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 2, 3], // Action, Adventure, Comedy
        director: "Shawn Levy",
        cast: ["Ryan Reynolds", "Jodie Comer", "Taika Waititi"],
        imdbRating: "7.1"
      }
    ];
    
    sampleMovies.forEach(movie => {
      const id = this.currentMovieId++;
      this.movies.set(id, { ...movie, id });
    });
  }
}

export const storage = new MemStorage();
