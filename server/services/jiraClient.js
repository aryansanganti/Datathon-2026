const axios = require('axios');
const { withRetry } = require('../utils/retry');

const JIRA_DOMAIN = process.env.JIRA_DOMAIN || (process.env.JIRA_BASE_URL ? process.env.JIRA_BASE_URL.replace('https://', '').replace(/\/$/, '') : '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const auth = {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
};

const baseURL = `https://${JIRA_DOMAIN}/rest/api/3`;
const agileURL = `https://${JIRA_DOMAIN}/rest/agile/1.0`;

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

async function fetchSprints(boardId, startAt = 0) {
    try {
        const res = await axios.get(`${agileURL}/board/${boardId}/sprint`, {
            auth,
            params: { startAt },
        });
        return res.data;
    } catch (err) {
        console.error('Jira sprint fetch error:', err.message);
        throw err;
    }
}

async function fetchProjects() {
    const res = await axios.get(`${baseURL}/project`, { auth });
    return Array.isArray(res.data) ? res.data : (res.data.values || res.data || []);
}

async function fetchBoards(projectKeyOrId) {
    const res = await axios.get(`${agileURL}/board`, {
        auth,
        params: { projectKeyOrId },
    });
    return res.data.values || [];
}

async function createSprint(boardId, name, startDate, endDate) {
    return withRetry(
        () =>
            axios.post(
                `${agileURL}/sprint`,
                {
                    name,
                    startDate,
                    endDate,
                    originBoardId: Number(boardId),
                },
                { auth }
            ),
        { maxAttempts: 3, baseMs: 1000 }
    ).then((r) => r.data);
}

async function createIssue(projectKey, summary, description, issueType, assigneeAccountId) {
    const body = {
        fields: {
            project: { key: projectKey },
            summary: summary || 'Untitled',
            description: description
                ? {
                      type: 'doc',
                      version: 1,
                      content: [
                          {
                              type: 'paragraph',
                              content: [{ type: 'text', text: description }],
                          },
                      ],
                  }
                : undefined,
            issuetype: { name: issueType || 'Task' },
        },
    };
    if (assigneeAccountId) body.fields.assignee = { accountId: assigneeAccountId };
    return withRetry(
        () => axios.post(`${baseURL}/issue`, body, { auth }),
        { maxAttempts: 3, baseMs: 1000 }
    ).then((r) => r.data);
}

async function moveIssuesToSprint(sprintId, issueKeys) {
    return withRetry(
        () =>
            axios.post(
                `${agileURL}/sprint/${sprintId}/issue`,
                { issues: issueKeys },
                { auth }
            ),
        { maxAttempts: 3, baseMs: 1000 }
    );
}

async function getMyself() {
    const res = await axios.get(`${baseURL}/myself`, { auth });
    return res.data;
}

async function searchUsers(query) {
    const res = await axios.get(`${baseURL}/user/search`, {
        auth,
        params: { query },
    });
    return res.data || [];
}

module.exports = {
    searchIssues,
    fetchSprints,
    fetchProjects,
    fetchBoards,
    createSprint,
    createIssue,
    moveIssuesToSprint,
    getMyself,
    searchUsers,
};
