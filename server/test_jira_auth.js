const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const JIRA_DOMAIN = process.env.JIRA_DOMAIN || (process.env.JIRA_BASE_URL ? process.env.JIRA_BASE_URL.replace('https://', '').replace(/\/$/, '') : '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

console.log('Testing Jira Auth...');
console.log('Domain:', JIRA_DOMAIN);
console.log('Email:', JIRA_EMAIL);
console.log('Token (first 4 chars):', JIRA_API_TOKEN ? JIRA_API_TOKEN.substring(0, 4) : 'NONE');

const auth = {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
};

async function test() {
    try {
        // 1. Check who am I
        console.log('Checking /myself...');
        const me = await axios.get(`https://${JIRA_DOMAIN}/rest/api/3/myself`, { auth });
        console.log('Authenticated as:', me.data.displayName, me.data.emailAddress);

        // 2. List ALL Projects
        console.log('\nFetching All Projects...');
        const res = await axios.get(`https://${JIRA_DOMAIN}/rest/api/3/project`, { auth });
        console.log(`Found ${res.data.length} projects:`);
        res.data.forEach(p => console.log(` - [${p.key}] ${p.name} (ID: ${p.id})`));

        // 3. Compare Queries
        console.log('\nQuery 1: "project = SCRUM"');
        const res1 = await axios.post(`https://${JIRA_DOMAIN}/rest/api/3/search/jql`, {
            jql: 'project = SCRUM',
            maxResults: 5,
            fields: ['key']
        }, { auth });
        console.log('Result 1 count:', res1.data.issues.length);

        console.log('\nQuery 5: Full Payload from jiraClient.js');
        const res5 = await axios.post(`https://${JIRA_DOMAIN}/rest/api/3/search/jql`, {
            jql: 'project = SCRUM ORDER BY updated ASC',
            maxResults: 10,
            fields: ['key', 'summary', 'status', 'assignee', 'created', 'updated', 'priority', 'customfield_10020']
        }, { auth });
        console.log('Result 5 count:', res5.data.issues.length);

        console.log('Issues found in search:', searchRes.data.issues.length);
        if (searchRes.data.issues.length > 0) {
            console.log('Latest Issues:');
            searchRes.data.issues.forEach(i =>
                console.log(` - ${i.key}: ${i.fields.summary} (Created: ${i.fields.created})`)
            );
        } else {
            console.log('No issues found in the entire instance visible to this user.');
        }

    } catch (err) {
        console.error('Auth Failed:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data));
        }
    }
}

test();
