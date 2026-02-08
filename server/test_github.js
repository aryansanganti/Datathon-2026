const { runIngestion } = require('./services/ingestion');
const { fetchCommits } = require('./services/githubClient');
const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('DB Connected');

    const repoFull = process.env.GITHUB_DEFAULT_REPO;
    console.log('Env Repo:', repoFull);

    try {
        console.log('--- Testing fetchCommits directly ---');
        const res = await fetchCommits(repoFull, { per_page: 100 });
        console.log('Result count:', res.data.length);
        if (res.data.length > 0) {
            console.log('First commit:', res.data[0].sha);
        } else {
            console.log('No commits found. Check if repo is correct or private.');
        }
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }

    process.exit(0);
}

test();
