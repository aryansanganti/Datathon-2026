const mongoose = require('mongoose');
const User = require('./models/User');
const Commit = require('./models/Commit');
require('dotenv').config();

const USERS = [
    { id: 'alice', name: 'Alice Dev', additions: 500, deletions: 100, commits: 5 },
    { id: 'bob', name: 'Bob Engineer', additions: 1200, deletions: 300, commits: 8 },
    { id: 'charlie', name: 'Charlie Lead', additions: 50, deletions: 10, commits: 2 }
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Clear existing commits/users to have a clean slate (optional, but good for testing)
    // await User.deleteMany({});
    // await Commit.deleteMany({});

    for (const u of USERS) {
        // Upsert User
        let user = await User.findOneAndUpdate(
            { user_id: u.id },
            {
                source: 'GitHub',
                source_user_id: u.id,
                display_name: u.name,
                email: `${u.id}@example.com`
            },
            { upsert: true, new: true }
        );

        console.log(`Seeding data for ${u.name}...`);

        for (let i = 0; i < u.commits; i++) {
            // Randomize stats slightly around the average
            const adds = Math.floor(u.additions / u.commits) + Math.floor(Math.random() * 20);
            const dels = Math.floor(u.deletions / u.commits) + Math.floor(Math.random() * 10);

            await Commit.create({
                commit_id: `sha_${u.id}_${i}_${Date.now()}`,
                source: 'github',
                repo_id: 'test-repo',
                branch: 'main',
                author_id: user._id,
                timestamp: new Date(Date.now() - Math.floor(Math.random() * 1000000000)), // Random past time
                raw_signature: `sig_${u.id}_${i}_${Date.now()}`,
                stats: {
                    additions: adds,
                    deletions: dels,
                    total: adds + dels
                }
            });
        }
    }

    console.log('Seeding complete!');
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
