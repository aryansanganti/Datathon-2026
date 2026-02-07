const axios = require('axios');

const JIRA_DOMAIN = process.env.JIRA_DOMAIN; // e.g., 'your-domain.atlassian.net'
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const auth = {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
};

// Base URL for Jira Cloud API v3
const baseURL = `https://${JIRA_DOMAIN}/rest/api/3`;

async function searchIssues(jql, startAt = 0, maxResults = 50) {
    try {
        const res = await axios.get(`${baseURL}/search`, {
            auth,
            params: {
                jql,
                startAt,
                maxResults,
                fields: 'key,summary,status,assignee,created,updated,priority,customfield_10020' // customfield_10020 is often sprint
            },
        });
        return res.data;
    } catch (err) {
        console.error('Jira search error:', err.message);
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
