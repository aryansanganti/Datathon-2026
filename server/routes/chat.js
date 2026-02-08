const express = require('express');
const router = express.Router();
const axios = require('axios');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Sprint = require('../models/Sprint');

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Get JIRA context for the bot
async function getJiraContext() {
    try {
        // Fetch all issues with assignee info
        const issues = await Issue.find({})
            .populate('assignee_id', 'display_name email role team')
            .lean();

        // Fetch all users
        const users = await User.find({}).lean();

        // Fetch sprints
        const sprints = await Sprint.find({}).lean();

        // Build context summary
        const userStats = {};

        users.forEach(user => {
            userStats[user.display_name || user.name || user.user_id] = {
                userId: user.user_id,
                email: user.email,
                role: user.role,
                team: user.team,
                department: user.department,
                skills: user.skills || [],
                totalAssigned: 0,
                completed: 0,
                inProgress: 0,
                todo: 0,
                totalStoryPoints: 0,
                completedStoryPoints: 0,
                issues: []
            };
        });

        // Process issues
        issues.forEach(issue => {
            const assigneeName = issue.assignee_id?.display_name || 'Unassigned';

            if (userStats[assigneeName]) {
                userStats[assigneeName].totalAssigned++;
                userStats[assigneeName].totalStoryPoints += issue.story_points || 0;

                if (issue.status?.toLowerCase().includes('done') || issue.status?.toLowerCase().includes('closed')) {
                    userStats[assigneeName].completed++;
                    userStats[assigneeName].completedStoryPoints += issue.story_points || 0;
                } else if (issue.status?.toLowerCase().includes('progress')) {
                    userStats[assigneeName].inProgress++;
                } else {
                    userStats[assigneeName].todo++;
                }

                userStats[assigneeName].issues.push({
                    key: issue.key,
                    title: issue.title,
                    status: issue.status,
                    priority: issue.priority,
                    storyPoints: issue.story_points,
                    type: issue.issue_type
                });
            }
        });

        // Build sprint summary
        const sprintSummary = sprints.map(s => ({
            name: s.name,
            state: s.state,
            startDate: s.start_date,
            endDate: s.end_date,
            goal: s.goal
        }));

        // Overall stats
        const totalIssues = issues.length;
        const completedIssues = issues.filter(i =>
            i.status?.toLowerCase().includes('done') || i.status?.toLowerCase().includes('closed')
        ).length;
        const inProgressIssues = issues.filter(i =>
            i.status?.toLowerCase().includes('progress')
        ).length;

        return {
            totalIssues,
            completedIssues,
            inProgressIssues,
            pendingIssues: totalIssues - completedIssues - inProgressIssues,
            userStats,
            sprints: sprintSummary,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error fetching JIRA context:', error);
        return { error: 'Failed to fetch JIRA data' };
    }
}

// Chat endpoint - receives text, returns AI response
router.post('/message', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get JIRA context
        const jiraContext = await getJiraContext();

        // Build prompt for Gemini
        const systemPrompt = `You are a helpful JIRA assistant bot. You have access to the following JIRA data from the team's project:

## Overall Statistics:
- Total Issues: ${jiraContext.totalIssues}
- Completed: ${jiraContext.completedIssues}
- In Progress: ${jiraContext.inProgressIssues}
- Pending: ${jiraContext.pendingIssues}

## Team Member Statistics:
${Object.entries(jiraContext.userStats || {}).map(([name, stats]) => `
### ${name}
- Role: ${stats.role || 'N/A'}
- Team: ${stats.team || 'N/A'}
- Total Assigned: ${stats.totalAssigned}
- Completed: ${stats.completed}
- In Progress: ${stats.inProgress}
- To Do: ${stats.todo}
- Story Points (Total/Completed): ${stats.totalStoryPoints}/${stats.completedStoryPoints}
- Current Issues: ${stats.issues.slice(0, 5).map(i => `${i.key}: ${i.title} (${i.status})`).join(', ')}
`).join('\n')}

## Active Sprints:
${jiraContext.sprints?.filter(s => s.state === 'active').map(s => `- ${s.name}: ${s.goal || 'No goal set'}`).join('\n') || 'No active sprints'}

Answer the user's questions about work completion, remaining tasks, team performance, and project status based on this data. Be concise and helpful. If asked about specific team members, provide their detailed statistics.`;

        // Call Gemini API
        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: systemPrompt + '\n\nUser Question: ' + message }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024
                }
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const aiResponse = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            'I apologize, I could not generate a response. Please try again.';

        res.json({
            response: aiResponse,
            context: {
                totalIssues: jiraContext.totalIssues,
                completedIssues: jiraContext.completedIssues
            }
        });

    } catch (error) {
        console.error('Chat error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to process message', details: error.message });
    }
});

// Speech-to-Text using Sarvam API
router.post('/stt', async (req, res) => {
    try {
        const { audio, language = 'en-IN' } = req.body; // audio is base64 encoded

        if (!audio) {
            return res.status(400).json({ error: 'Audio data is required' });
        }

        if (!SARVAM_API_KEY) {
            return res.status(500).json({ error: 'Sarvam API key not configured' });
        }

        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audio, 'base64');

        // Create form data
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', audioBuffer, {
            filename: 'audio.webm',
            contentType: 'audio/webm'
        });
        formData.append('language_code', language);
        formData.append('model', 'saarika:v2.5');

        const response = await axios.post(
            'https://api.sarvam.ai/speech-to-text',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'api-subscription-key': SARVAM_API_KEY
                }
            }
        );

        res.json({
            transcript: response.data.transcript,
            language: response.data.language_code
        });

    } catch (error) {
        console.error('STT error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Speech-to-text failed', details: error.message });
    }
});

// Text-to-Speech using Sarvam API
router.post('/tts', async (req, res) => {
    try {
        const { text, language = 'hi-IN', speaker = 'meera' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        if (!SARVAM_API_KEY) {
            return res.status(500).json({ error: 'Sarvam API key not configured' });
        }

        const response = await axios.post(
            'https://api.sarvam.ai/text-to-speech',
            {
                inputs: [text],
                target_language_code: language,
                speaker: speaker,
                model: 'bulbul:v1',
                enable_preprocessing: true
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'api-subscription-key': SARVAM_API_KEY
                }
            }
        );

        res.json({
            audio: response.data.audios?.[0], // base64 encoded audio
            format: 'wav'
        });

    } catch (error) {
        console.error('TTS error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Text-to-speech failed', details: error.message });
    }
});

// Get JIRA summary endpoint
router.get('/context', async (req, res) => {
    try {
        const context = await getJiraContext();
        res.json(context);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch context' });
    }
});

module.exports = router;
