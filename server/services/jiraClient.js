const axios = require('axios');

const JIRA_DOMAIN = process.env.JIRA_DOMAIN || (process.env.JIRA_BASE_URL ? process.env.JIRA_BASE_URL.replace('https://', '').replace(/\/$/, '') : '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const auth = {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
};

// Base URL for Jira Cloud API v3
const baseURL = `https://${JIRA_DOMAIN}/rest/api/3`;

// function searchIssues(jql, startAt = 0, maxResults = 50) {
//     try {
//         const res = await axios.get(`${baseURL}/search`, { ... });
//         return res.data;
//     } ...
// }

// NEW IMPLEMENTATION for /rest/api/3/search/jql
// NEW IMPLEMENTATION for /rest/api/3/search/jql
async function searchIssues(jql, nextPageToken = undefined, maxResults = 50) {
    try {
        // We use the derived JIRA_DOMAIN or parse it from baseURL if needed
        // Note: baseURL handles the domain part.
        // Endpoint is /search/jql
        // Response format: { issues: [], nextPageToken: "...", isLast: boolean }

        const payload = {
            jql,
            maxResults,
            fields: ['key', 'summary', 'status', 'assignee', 'created', 'updated', 'priority', 'customfield_10020']
        };

        if (nextPageToken) {
            payload.nextPageToken = nextPageToken;
        }

        const res = await axios.post(`${baseURL}/search/jql`, payload, { auth });

        return {
            issues: res.data.issues || [],
            nextPageToken: res.data.nextPageToken,
            isLast: res.data.isLast
        };
    } catch (err) {
        console.error('Jira search error:', err.message);
        if (err.response) {
            console.error('Jira API Response:', err.response.data);
        }
        throw err;
    }
}

// In Jira Cloud, sprints belong to boards
async function fetchSprints(boardId, startAt = 0) {
    // Determine agile API URL (it's different from core API)
    const agileURL = `https://${JIRA_DOMAIN}/rest/agile/1.0`;
    try {
        const res = await axios.get(`${agileURL}/board/${boardId}/sprint`, {
            auth,
            params: { startAt }
        });
        return res.data;
    } catch (err) {
        console.error('Jira sprint fetch error:', err.message);
        throw err;
    }
}

module.exports = { searchIssues, fetchSprints };
