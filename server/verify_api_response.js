const axios = require('axios');

async function test() {
    const baseURL = 'http://localhost:8000/api';

    try {
        console.log('--- Testing /api/fetch/github/commits ---');
        const resCommits = await axios.get(`${baseURL}/fetch/github/commits?limit=1`);
        if (resCommits.data.data.length > 0) {
            const c = resCommits.data.data[0];
            console.log('Sample Commit:', JSON.stringify({
                commit_id: c.commit_id,
                branch: c.branch,
                timestamp: c.timestamp,
                stats: c.stats,
                author: c.author_id // Populated field
            }, null, 2));
        } else {
            console.log('No commits found.');
        }

        console.log('\n--- Testing /api/insights/user-activity ---');
        const resActivity = await axios.get(`${baseURL}/insights/user-activity`);
        if (resActivity.data.length > 0) {
            console.log('Sample Activity:', JSON.stringify(resActivity.data[0], null, 2));
        } else {
            console.log('No user activity found.');
        }

    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error('Response:', e.response.data);
    }
}

test();
