import { db } from "../server/db";
import { users, movies, genres } from "../shared/schema";

async function seed() {
    console.log('🌱 Seeding database...');

    // Creating admin user
    console.log('Creating admin user...');
    try {
        await db.insert(users).values({
            username: "admin",
            password: "admin", // In a real app, this would be hashed
            email: "admin@filmflex.com",
            role: "admin",
            userType: "premium",
            isActive: true
        }).onConflictDoNothing();
    } catch (error) {
        console.error('Error creating admin user:', error);
    }

    // Creating genres
    console.log('Creating genres...');
    const genreData = [
        { name: "Action" },
        { name: "Adventure" },
        { name: "Comedy" },
        { name: "Animation" },
        { name: "Drama" },
        { name: "Sci-Fi" },
        { name: "Thriller" },
        { name: "Fantasy" },
        { name: "Romance" },
        { name: "Horror" }
    ];

    for (const genre of genreData) {
        try {
            await db.insert(genres).values(genre).onConflictDoNothing();
        } catch (error) {
            console.error(`Error creating genre ${genre.name}:`, error);
        }
    }

    // Creating movies with correct video URLs
    console.log('Creating movies...');
    const movieData = [
        {
            title: "Kung Fu Panda",
            description: "To everyone's surprise, including his own, Po, an overweight, clumsy panda, is chosen as protector of the Valley of Peace. His suitability will soon be tested as the valley's arch-enemy is on his way.",
            releaseYear: 2008,
            duration: 92,
            posterUrl: "https://static.tuoitre.vn/tto/i/s626/2008/06/25/kJFEt8qE.jpg",
            backdropUrl: "https://static.tuoitre.vn/tto/i/s626/2008/06/25/kJFEt8qE.jpg",
            rating: "PG",
            matchPercentage: 94,
            videoUrl: "136atrovI1bWEMoSgq3X12veiNwh2fzO6", // First Google Drive ID
            videoSources: [],
            genreIds: [2, 3, 4], // Adventure, Comedy, Animation
            director: "Mark Osborne, John Stevenson",
            cast: ["Jack Black", "Dustin Hoffman", "Angelina Jolie"],
            imdbRating: "7.6",
            viewCount: 1200
        },
        {
            title: "Kung Fu Panda 2",
            description: "Po and his friends fight to stop a peacock villain from conquering China with a deadly new weapon, but first the Dragon Warrior must come to terms with his past.",
            releaseYear: 2011,
            duration: 90,
            posterUrl: "https://i.pinimg.com/564x/25/da/73/25da73a1b09d45370042aa5a3744f819.jpg",
            backdropUrl: "https://i.pinimg.com/564x/25/da/73/25da73a1b09d45370042aa5a3744f819.jpg",
            rating: "PG",
            matchPercentage: 92,
            videoUrl: "1-irIEcfPe0zgPacX-XcMGv1zoB5hMWwI", // Second Google Drive ID
            videoSources: [],
            genreIds: [2, 3, 4], // Adventure, Comedy, Animation
            director: "Jennifer Yuh Nelson",
            cast: ["Jack Black", "Angelina Jolie", "Jackie Chan"],
            imdbRating: "7.2",
            viewCount: 1100
        },
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
            videoUrl: null,
            genreIds: [1, 7], // Action, Thriller
            director: "Christopher Nolan",
            cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
            imdbRating: "9.0",
            viewCount: 1245
        }
    ];

    for (const movie of movieData) {
        try {
            await db.insert(movies).values(movie).onConflictDoNothing();
        } catch (error) {
            console.error(`Error creating movie ${movie.title}:`, error);
        }
    }

    console.log('✅ Database seeded successfully!');
}

seed().catch(error => {
    console.error('Error seeding database:', error);
    process.exit(1);
}).finally(() => {
    process.exit(0);
});