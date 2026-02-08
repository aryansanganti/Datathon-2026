const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { processTranscript, applyEmployeeUpdates } = require('../services/transcriptAnalyzer');
const Task = require('../models/Task');

// ============= TEAM MEMBERS (same as jira.js) =============
const TEAM = [
    { name: 'Aryan', accountId: '712020:f4133ad3-9b22-491e-8260-37d3ce9dcf04', role: 'AWS Solutions Architect' },
    { name: 'Ritwik', accountId: '712020:88eb9ecb-d9f0-40ee-a5d0-9cbe35c6ac8f', role: 'AWS Backend Developer' },
    { name: 'Mohak', accountId: '712020:27f806c7-3623-4153-bb5b-0f60bb121dec', role: 'AWS DevOps Engineer' },
    { name: 'Manu', accountId: '712020:a0876b3e-cc7b-403e-8aac-a8929a1c080e', role: 'AWS Cloud Engineer' }
];

// Map assignee name to team member
function findTeamMember(assigneeName) {
    if (!assigneeName) return TEAM[Math.floor(Math.random() * TEAM.length)];
    
    const name = assigneeName.toLowerCase();
    const member = TEAM.find(m => name.includes(m.name.toLowerCase()));
    return member || TEAM[Math.floor(Math.random() * TEAM.length)];
}

// Map role to team member
function mapRoleToTeamMember(roleRequired) {
    const roleMap = {
        'backend': 'Ritwik',
        'frontend': 'Aryan',
        'devops': 'Mohak',
        'qa': 'Manu',
        'infrastructure': 'Manu',
        'cloud': 'Manu',
        'api': 'Ritwik',
        'ui': 'Aryan',
        'security': 'Manu'
    };

    const normalizedRole = roleRequired?.toLowerCase() || '';
    for (const [key, memberName] of Object.entries(roleMap)) {
        if (normalizedRole.includes(key)) {
            return TEAM.find(m => m.name === memberName);
        }
    }
    return TEAM[Math.floor(Math.random() * TEAM.length)];
}

/**
 * POST /api/transcript/analyze
 * Analyze a transcript (file path OR raw text) and extract tasks/features
 * 
 * Body: {
 *   transcript: string (raw meeting transcript text) - preferred for UI
 *   OR
 *   transcript_path: string (relative path to transcript file)
 * }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { transcript, transcript_path } = req.body;

    // Priority 1: Raw text analysis (from UI)
    if (transcript && typeof transcript === 'string') {
      console.log(`\n📝 Analyzing raw transcript (${transcript.length} chars)`);
      
      const analysisResult = await analyzeTranscriptText(transcript);
      return res.json(analysisResult);
    }

    // Priority 2: File-based processing
    if (transcript_path) {
      const fullPath = path.resolve(__dirname, '../../..', transcript_path);
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({
          success: false,
          error: `Transcript file not found: ${transcript_path}`
        });
      }

      console.log(`\n📝 Processing transcript file: ${fullPath}`);
      
      const result = await processTranscript(fullPath);

      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.json({
        success: true,
        meeting_documentation: result.meeting_doc,
        employee_updates: result.employee_updates,
        llm_analysis: result.raw_analysis
      });
    }

    // Neither provided
    return res.status(400).json({
      success: false,
      error: 'Either transcript text or transcript_path is required'
    });
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/transcript/apply-updates
 * Apply the generated updates to employee_data.json
 * 
 * Body: {
 *   updates: array of update objects from /analyze
 * }
 */
router.post('/apply-updates', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'updates array is required'
      });
    }

    const employeeDataPath = path.resolve(__dirname, '../../employee_data.json');
    const changesApplied = applyEmployeeUpdates(updates, employeeDataPath);

    res.json({
      success: true,
      changes_applied: changesApplied,
      message: `Applied ${changesApplied} update(s) to employee data`
    });
  } catch (error) {
    console.error('Error applying updates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/transcript/list
 * List available transcript files in the Transcript folder
 */
router.get('/list', (req, res) => {
  try {
    const transcriptDir = path.resolve(__dirname, '../../..', 'Transcript');
    
    if (!fs.existsSync(transcriptDir)) {
      return res.json({
        success: true,
        transcripts: [],
        message: 'Transcript folder not found'
      });
    }

    const files = fs.readdirSync(transcriptDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: `Transcript/${f}`,
        size: fs.statSync(path.join(transcriptDir, f)).size
      }));

    res.json({
      success: true,
      transcripts: files
    });
  } catch (error) {
    console.error('Error listing transcripts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Analyze transcript text using LLM
 */
async function analyzeTranscriptText(transcript) {
  // Try Gemini first, then fallback to local analysis
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  const prompt = `Analyze this meeting transcript and extract actionable items.

TRANSCRIPT:
${transcript}

Extract and return a JSON object with this EXACT structure:
{
  "summary": "Brief 1-2 sentence summary of the meeting",
  "meetingType": "sprint planning" | "standup" | "retrospective" | "feature discussion" | "general",
  "participants": ["name1", "name2"],
  "items": [
    {
      "id": "unique-id-1",
      "type": "feature" | "task",
      "title": "Clear title",
      "description": "Detailed description",
      "assignee": "Person name if mentioned",
      "priority": "low" | "medium" | "high",
      "estimatedHours": 8,
      "requiredSkills": ["React", "Node.js"],
      "confidence": 0.85
    }
  ]
}

Rules:
- "feature" = larger work requiring planning (redirect to Smart Allocate)
- "task" = specific actionable item that can become a Jira ticket directly
- Extract assignee names if mentioned (e.g., "John will handle...")
- Estimate hours based on complexity mentioned
- requiredSkills should be tech stack inferred from context
- confidence is 0-1 based on how clear the requirement is

Return ONLY valid JSON, no markdown or explanation.`;

  if (GEMINI_API_KEY) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          }
        }
      );

      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        // Clean and parse JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed;
        }
      }
    } catch (error) {
      console.error('Gemini API error, using fallback:', error.message);
    }
  }

  // Fallback: Simple keyword-based extraction
  return extractItemsFromText(transcript);
}

/**
 * Simple fallback extraction without LLM
 */
function extractItemsFromText(transcript) {
  const items = [];
  const lines = transcript.split('\n').filter(l => l.trim());
  
  // Common patterns
  const taskPatterns = [
    /(\w+)\s+will\s+(handle|work on|implement|create|build|fix|update|review)\s+(.+)/gi,
    /need to\s+(implement|create|build|fix|update|add|remove|deploy)\s+(.+)/gi,
    /todo:\s*(.+)/gi,
    /action item:\s*(.+)/gi,
  ];

  const featurePatterns = [
    /new feature[:\s]+(.+)/gi,
    /we need\s+a\s+(.+\s+feature)/gi,
    /large[r]?\s+task[:\s]+(.+)/gi,
    /epic[:\s]+(.+)/gi,
  ];

  const participants = new Set();
  const names = transcript.match(/\b([A-Z][a-z]+)\s+(will|said|mentioned|suggested)/g);
  if (names) {
    names.forEach(n => {
      const name = n.split(' ')[0];
      participants.add(name);
    });
  }

  let itemId = 1;

  // Extract features
  featurePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      items.push({
        id: `feature-${itemId++}`,
        type: 'feature',
        title: match[1].trim().substring(0, 100),
        description: `Feature extracted from meeting: ${match[0].trim()}`,
        priority: 'medium',
        estimatedHours: 40,
        requiredSkills: inferSkills(match[0]),
        confidence: 0.7
      });
    }
  });

  // Extract tasks
  taskPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      const assignee = match[1] && match[1].match(/^[A-Z]/) ? match[1] : undefined;
      const action = match[2] || '';
      const what = match[3] || match[2] || match[1] || '';
      
      items.push({
        id: `task-${itemId++}`,
        type: 'task',
        title: `${action} ${what}`.trim().substring(0, 100),
        description: match[0].trim(),
        assignee: assignee,
        priority: what.toLowerCase().includes('urgent') || what.toLowerCase().includes('critical') ? 'high' : 'medium',
        estimatedHours: estimateHours(what),
        requiredSkills: inferSkills(what),
        confidence: 0.6
      });
    }
  });

  // If no items found, create a generic one
  if (items.length === 0) {
    items.push({
      id: 'task-1',
      type: 'task',
      title: 'Review meeting notes',
      description: 'Review and process the meeting transcript for action items',
      priority: 'low',
      estimatedHours: 2,
      requiredSkills: [],
      confidence: 0.5
    });
  }

  return {
    summary: `Meeting transcript with ${items.length} extracted action items`,
    meetingType: 'general',
    participants: Array.from(participants),
    items
  };
}

function inferSkills(text) {
  const skills = [];
  const skillKeywords = {
    'React': ['react', 'frontend', 'ui', 'component'],
    'Node.js': ['node', 'backend', 'api', 'server'],
    'Python': ['python', 'ml', 'data', 'script'],
    'AWS': ['aws', 'cloud', 'lambda', 's3', 'ec2'],
    'Docker': ['docker', 'container', 'kubernetes', 'k8s'],
    'PostgreSQL': ['postgres', 'database', 'sql', 'db'],
    'TypeScript': ['typescript', 'ts', 'types'],
    'CI/CD': ['ci/cd', 'pipeline', 'deploy', 'jenkins', 'github actions'],
  };

  const lower = text.toLowerCase();
  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      skills.push(skill);
    }
  }

  return skills.slice(0, 4);
}

function estimateHours(text) {
  const lower = text.toLowerCase();
  if (lower.includes('quick') || lower.includes('simple') || lower.includes('minor')) return 4;
  if (lower.includes('complex') || lower.includes('major') || lower.includes('large')) return 24;
  if (lower.match(/\d+\s*h(our)?s?/)) {
    const match = lower.match(/(\d+)\s*h/);
    return parseInt(match[1]) || 8;
  }
  return 8;
}

/**
 * POST /api/transcript/create-jira-tasks
 * Create Jira tickets from extracted tasks
 */
router.post('/create-jira-tasks', async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'tasks array is required'
      });
    }

    // Get Jira config
    const JIRA_DOMAIN = process.env.JIRA_BASE_URL?.replace('https://', '').replace(/\/$/, '');
    const JIRA_EMAIL = process.env.JIRA_EMAIL;
    const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
    const PROJECT_KEY = 'SCRUM';

    if (!JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_DOMAIN) {
      return res.status(400).json({
        success: false,
        error: 'Jira credentials not configured'
      });
    }

    const auth = {
      username: JIRA_EMAIL,
      password: JIRA_API_TOKEN,
    };
    const baseURL = `https://${JIRA_DOMAIN}/rest/api/3`;

    const results = [];

    for (const task of tasks) {
      try {
        // Find team member based on assignee name or skills
        let assignee = findTeamMember(task.assignee);
        if (!assignee && task.requiredSkills?.length > 0) {
          // Try to match by skills
          const skillStr = task.requiredSkills.join(' ').toLowerCase();
          if (skillStr.includes('backend') || skillStr.includes('node') || skillStr.includes('api')) {
            assignee = TEAM.find(m => m.name === 'Ritwik');
          } else if (skillStr.includes('frontend') || skillStr.includes('react') || skillStr.includes('ui')) {
            assignee = TEAM.find(m => m.name === 'Aryan');
          } else if (skillStr.includes('devops') || skillStr.includes('docker') || skillStr.includes('ci')) {
            assignee = TEAM.find(m => m.name === 'Mohak');
          } else {
            assignee = TEAM.find(m => m.name === 'Manu');
          }
        }
        if (!assignee) assignee = TEAM[0];

        // Create Jira issue
        const body = {
          fields: {
            project: { key: PROJECT_KEY },
            summary: task.title,
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{
                    type: 'text',
                    text: task.description || task.title
                  }]
                }
              ]
            },
            issuetype: { name: 'Task' },
            assignee: { accountId: assignee.accountId }
          }
        };

        const jiraRes = await axios.post(`${baseURL}/issue`, body, { auth });

        // Save to MongoDB
        const taskId = `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await Task.findOneAndUpdate(
          { task_id: taskId },
          {
            task_id: taskId,
            title: task.title,
            description: task.description || '',
            role_required: inferRoleFromSkills(task.requiredSkills),
            priority: task.priority || 'medium',
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
            estimated_hours: task.estimatedHours || 8,
            status: 'allocated',
            jira_issue_key: jiraRes.data.key,
            jira_issue_id: jiraRes.data.id,
            synced_to_jira: true
          },
          { upsert: true, new: true }
        );

        results.push({
          task_id: taskId,
          jira_key: jiraRes.data.key,
          assignee: assignee.name,
          assigneeRole: assignee.role,
          title: task.title,
          description: task.description || task.title,
          priority: task.priority || 'medium',
          estimatedHours: task.estimatedHours || 8,
          requiredSkills: task.requiredSkills || [],
          status: 'todo'
        });

        console.log(`✅ Created Jira ticket: ${jiraRes.data.key} → ${assignee.name}`);
      } catch (error) {
        console.error(`❌ Failed to create ticket for: ${task.title}`, error.message);
        results.push({
          task_id: task.id,
          title: task.title,
          description: task.description || task.title,
          priority: task.priority || 'medium',
          estimatedHours: task.estimatedHours || 8,
          requiredSkills: task.requiredSkills || [],
          assignee: 'Unknown',
          assigneeRole: 'Unknown',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Created ${results.filter(r => !r.error).length} Jira tickets`,
      results
    });
  } catch (error) {
    console.error('Error creating Jira tasks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function inferRoleFromSkills(skills) {
  if (!skills || skills.length === 0) return 'backend';
  const joined = skills.join(' ').toLowerCase();
  if (joined.includes('react') || joined.includes('frontend') || joined.includes('ui')) return 'frontend';
  if (joined.includes('test') || joined.includes('qa')) return 'qa';
  if (joined.includes('devops') || joined.includes('docker') || joined.includes('ci')) return 'devops';
  return 'backend';
}

module.exports = router;
