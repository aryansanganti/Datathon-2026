const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Commit = require('../models/Commit');
const Task = require('../models/Task');
const Issue = require('../models/Issue');
const featherlessService = require('../services/featherlessService');

/**
 * GET /api/hr/employees
 * Get all employees with computed performance metrics
 */
router.get('/employees', async (req, res) => {
    try {
        const users = await User.find({}).lean();
        
        // Get commits for each user
        const commits = await Commit.find({}).lean();
        const tasks = await Task.find({}).lean();
        
        // Build metrics for each employee
        const employeesWithMetrics = await Promise.all(users.map(async (user) => {
            // Get commits by this user
            const userCommits = commits.filter(c => 
                c.author_id?.toString() === user._id?.toString()
            );
            
            // Get tasks assigned to this user
            const userTasks = tasks.filter(t => 
                t.allocated_to?.toString() === user._id?.toString()
            );
            
            const completedTasks = userTasks.filter(t => t.status === 'done');
            const inProgressTasks = userTasks.filter(t => t.status === 'in_progress');
            const pendingTasks = userTasks.filter(t => t.status === 'pending');
            
            // Calculate commit stats
            const totalAdditions = userCommits.reduce((sum, c) => sum + (c.stats?.additions || 0), 0);
            const totalDeletions = userCommits.reduce((sum, c) => sum + (c.stats?.deletions || 0), 0);
            const avgCommitSize = userCommits.length > 0 
                ? Math.round((totalAdditions + totalDeletions) / userCommits.length) 
                : 0;
            
            // Calculate hours worked
            const totalEstimatedHours = userTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
            const completedHours = completedTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
            
            // Calculate task completion rate
            const completionRate = userTasks.length > 0 
                ? Math.round((completedTasks.length / userTasks.length) * 100) 
                : 0;
            
            // Calculate workload score (0-100)
            const maxActiveTickets = 10;
            const workloadScore = Math.min(100, Math.round((inProgressTasks.length / maxActiveTickets) * 100));
            
            // Calculate stress indicators based on workload and deadlines
            const overdueCount = userTasks.filter(t => 
                t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done'
            ).length;
            
            const stressLevel = Math.min(100, workloadScore + (overdueCount * 15));
            
            return {
                _id: user._id,
                user_id: user.user_id,
                employee_id: user.employee_id,
                name: user.name || user.display_name || 'Unknown',
                email: user.email,
                role: user.role,
                department: user.department,
                team: user.team,
                skills: user.skills || [],
                seniority_level: user.seniority_level || 1,
                hourly_rate: user.hourly_rate || 0,
                years_of_experience: user.years_of_experience || 0,
                availability: user.availability,
                metrics: {
                    commits: {
                        total: userCommits.length,
                        additions: totalAdditions,
                        deletions: totalDeletions,
                        avg_size: avgCommitSize,
                        last_commit: userCommits.length > 0 
                            ? userCommits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0].timestamp 
                            : null
                    },
                    tasks: {
                        total: userTasks.length,
                        completed: completedTasks.length,
                        in_progress: inProgressTasks.length,
                        pending: pendingTasks.length,
                        overdue: overdueCount,
                        completion_rate: completionRate
                    },
                    hours: {
                        total_estimated: totalEstimatedHours,
                        completed: completedHours
                    },
                    performance: {
                        workload_score: workloadScore,
                        stress_level: stressLevel,
                        efficiency: completionRate,
                        productivity_score: userCommits.length > 0 
                            ? Math.min(100, Math.round((completedTasks.length / userCommits.length) * 50) + 50) 
                            : 50
                    }
                }
            };
        }));
        
        res.json(employeesWithMetrics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/hr/employee/:id
 * Get detailed metrics for a single employee
 */
router.get('/employee/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).lean();
        
        if (!user) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        // Get all commits by this user
        const commits = await Commit.find({ author_id: id }).sort({ timestamp: -1 }).lean();
        
        // Get all tasks for this user
        const tasks = await Task.find({ allocated_to: id }).sort({ deadline: 1 }).lean();
        
        // Get issues linked to this user's commits
        const linkedIssueKeys = [...new Set(commits.flatMap(c => c.linked_issues || []))];
        const issues = await Issue.find({ issue_key: { $in: linkedIssueKeys } }).lean();
        
        // Calculate daily/weekly activity
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const recentCommits = commits.filter(c => new Date(c.timestamp) >= thirtyDaysAgo);
        const recentTasks = tasks.filter(t => new Date(t.updatedAt) >= thirtyDaysAgo);
        
        // Group commits by week
        const weeklyActivity = {};
        recentCommits.forEach(commit => {
            const weekStart = getWeekStart(new Date(commit.timestamp));
            const weekKey = weekStart.toISOString().split('T')[0];
            if (!weeklyActivity[weekKey]) {
                weeklyActivity[weekKey] = { commits: 0, additions: 0, deletions: 0 };
            }
            weeklyActivity[weekKey].commits++;
            weeklyActivity[weekKey].additions += commit.stats?.additions || 0;
            weeklyActivity[weekKey].deletions += commit.stats?.deletions || 0;
        });
        
        // Language/tech distribution from commits
        const techDistribution = {};
        commits.forEach(commit => {
            (commit.files_changed || []).forEach(file => {
                if (file.language) {
                    techDistribution[file.language] = (techDistribution[file.language] || 0) + 1;
                }
            });
        });
        
        res.json({
            employee: {
                ...user,
                name: user.name || user.display_name || 'Unknown'
            },
            commits: {
                total: commits.length,
                recent_30_days: recentCommits.length,
                by_week: Object.entries(weeklyActivity).map(([week, data]) => ({ week, ...data })),
                tech_distribution: techDistribution
            },
            tasks: {
                total: tasks.length,
                completed: tasks.filter(t => t.status === 'done').length,
                in_progress: tasks.filter(t => t.status === 'in_progress').length,
                pending: tasks.filter(t => t.status === 'pending').length,
                overdue: tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'done').length,
                recent_30_days: recentTasks.length
            },
            issues: {
                total: issues.length,
                linked_to_commits: linkedIssueKeys.length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/hr/retention-analysis
 * Get retention risk analysis for all employees
 */
router.get('/retention-analysis', async (req, res) => {
    try {
        const users = await User.find({}).lean();
        const commits = await Commit.find({}).lean();
        const tasks = await Task.find({}).lean();
        
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const retentionAnalysis = users.map(user => {
            const userCommits = commits.filter(c => c.author_id?.toString() === user._id?.toString());
            const userTasks = tasks.filter(t => t.allocated_to?.toString() === user._id?.toString());
            
            const recentCommits = userCommits.filter(c => new Date(c.timestamp) >= thirtyDaysAgo);
            const completedTasks = userTasks.filter(t => t.status === 'done');
            const overdueTasks = userTasks.filter(t => 
                t.deadline && new Date(t.deadline) < now && t.status !== 'done'
            );
            const inProgressTasks = userTasks.filter(t => t.status === 'in_progress');
            
            // Calculate workload factor (high workload = higher stress)
            const workloadFactor = Math.min(1, (inProgressTasks.length + overdueTasks.length) / 8);
            
            // Calculate activity decline (fewer recent commits = potential disengagement)
            const avgCommitsPerMonth = userCommits.length / Math.max(1, 6); // Assume 6 months of data
            const activityDecline = avgCommitsPerMonth > 0 
                ? Math.max(0, 1 - (recentCommits.length / avgCommitsPerMonth)) 
                : 0;
            
            // Calculate overdue stress
            const overdueStress = Math.min(1, overdueTasks.length / 3);
            
            // Calculate retention risk score (0-100)
            const riskScore = Math.round(
                (workloadFactor * 40) + 
                (activityDecline * 30) + 
                (overdueStress * 30)
            );
            
            // Determine risk level
            let riskLevel = 'low';
            if (riskScore >= 70) riskLevel = 'critical';
            else if (riskScore >= 50) riskLevel = 'high';
            else if (riskScore >= 30) riskLevel = 'medium';
            
            // Generate recommendations
            const recommendations = [];
            if (workloadFactor > 0.7) {
                recommendations.push({
                    type: 'workload',
                    message: 'Consider redistributing tasks to reduce workload',
                    priority: 'high'
                });
            }
            if (overdueStress > 0.5) {
                recommendations.push({
                    type: 'deadline',
                    message: 'Review and extend deadlines for overdue tasks',
                    priority: 'high'
                });
            }
            if (activityDecline > 0.5) {
                recommendations.push({
                    type: 'engagement',
                    message: 'Schedule 1:1 to discuss career goals and challenges',
                    priority: 'medium'
                });
            }
            if (riskScore < 30) {
                recommendations.push({
                    type: 'positive',
                    message: 'Employee shows healthy engagement levels',
                    priority: 'info'
                });
            }
            
            return {
                employee: {
                    _id: user._id,
                    name: user.name || user.display_name || 'Unknown',
                    email: user.email,
                    role: user.role,
                    team: user.team,
                    department: user.department
                },
                metrics: {
                    workload_factor: Math.round(workloadFactor * 100),
                    activity_trend: Math.round((1 - activityDecline) * 100),
                    overdue_stress: Math.round(overdueStress * 100),
                    recent_commits: recentCommits.length,
                    active_tasks: inProgressTasks.length,
                    overdue_tasks: overdueTasks.length,
                    completed_tasks: completedTasks.length
                },
                risk: {
                    score: riskScore,
                    level: riskLevel
                },
                recommendations
            };
        });
        
        // Sort by risk score descending
        retentionAnalysis.sort((a, b) => b.risk.score - a.risk.score);
        
        // Summary stats
        const summary = {
            total_employees: users.length,
            critical_risk: retentionAnalysis.filter(e => e.risk.level === 'critical').length,
            high_risk: retentionAnalysis.filter(e => e.risk.level === 'high').length,
            medium_risk: retentionAnalysis.filter(e => e.risk.level === 'medium').length,
            low_risk: retentionAnalysis.filter(e => e.risk.level === 'low').length,
            avg_risk_score: Math.round(
                retentionAnalysis.reduce((sum, e) => sum + e.risk.score, 0) / Math.max(1, retentionAnalysis.length)
            )
        };
        
        res.json({
            summary,
            employees: retentionAnalysis
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/hr/team-stats
 * Get aggregated team statistics
 */
router.get('/team-stats', async (req, res) => {
    try {
        const users = await User.find({}).lean();
        const commits = await Commit.find({}).lean();
        const tasks = await Task.find({}).lean();
        
        // Group by team
        const teamStats = {};
        
        users.forEach(user => {
            const team = user.team || user.department || 'Unassigned';
            if (!teamStats[team]) {
                teamStats[team] = {
                    name: team,
                    member_count: 0,
                    total_commits: 0,
                    total_tasks: 0,
                    completed_tasks: 0,
                    total_hours: 0,
                    total_cost: 0,
                    members: []
                };
            }
            
            const userCommits = commits.filter(c => c.author_id?.toString() === user._id?.toString());
            const userTasks = tasks.filter(t => t.allocated_to?.toString() === user._id?.toString());
            const completedTasks = userTasks.filter(t => t.status === 'done');
            const hours = userTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
            
            teamStats[team].member_count++;
            teamStats[team].total_commits += userCommits.length;
            teamStats[team].total_tasks += userTasks.length;
            teamStats[team].completed_tasks += completedTasks.length;
            teamStats[team].total_hours += hours;
            teamStats[team].total_cost += hours * (user.hourly_rate || 75);
            teamStats[team].members.push({
                _id: user._id,
                name: user.name || user.display_name,
                role: user.role
            });
        });
        
        // Calculate team metrics
        Object.values(teamStats).forEach(team => {
            team.completion_rate = team.total_tasks > 0 
                ? Math.round((team.completed_tasks / team.total_tasks) * 100) 
                : 0;
            team.avg_commits_per_member = team.member_count > 0 
                ? Math.round(team.total_commits / team.member_count) 
                : 0;
        });
        
        res.json(Object.values(teamStats));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/hr/generate-report
 * Generate AI performance report using server-side proxy to avoid COORS/Auth issues
 */
router.post('/generate-report', async (req, res) => {
    try {
        const { employee, metrics } = req.body;
        
        if (!employee || !metrics) {
            return res.status(400).json({ error: 'Missing employee or metrics data' });
        }

        const prompt = `You are an HR analytics expert. Analyze the following employee performance data and generate a comprehensive performance report.

EMPLOYEE DATA:
- Name: ${employee.name}
- Role: ${employee.role}
- Department: ${employee.department || 'N/A'} 
- Team: ${employee.team || 'N/A'}
- Seniority Level: ${employee.seniority_level}/5
- Years of Experience: ${employee.years_of_experience || 'N/A'}
- Skills: ${employee.skills?.join(', ') || 'N/A'}
- Hourly Rate: $${employee.hourly_rate || 0}

PERFORMANCE METRICS:
- Total Commits: ${metrics.commits.total}
- Code Added: ${metrics.commits.additions} lines
- Code Removed: ${metrics.commits.deletions} lines
- Avg Commit Size: ${metrics.commits.avg_size} lines
- Last Commit: ${metrics.commits.last_commit || 'N/A'}

- Total Tasks Assigned: ${metrics.tasks.total}
- Tasks Completed: ${metrics.tasks.completed}
- Tasks In Progress: ${metrics.tasks.in_progress}
- Tasks Pending: ${metrics.tasks.pending}
- Overdue Tasks: ${metrics.tasks.overdue}
- Task Completion Rate: ${metrics.tasks.completion_rate}%

- Total Estimated Hours: ${metrics.hours.total_estimated}
- Hours Completed: ${metrics.hours.completed}

- Workload Score: ${metrics.performance.workload_score}/100
- Stress Level: ${metrics.performance.stress_level}/100
- Efficiency Score: ${metrics.performance.efficiency}/100
- Productivity Score: ${metrics.performance.productivity_score}/100

Generate a JSON response with EXACTLY this structure (no markdown, just valid JSON):
{
  "summary": "2-3 sentence executive summary of performance",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areas_for_improvement": ["area 1", "area 2"],
  "recommendations": ["specific recommendation 1", "specific recommendation 2", "specific recommendation 3"],
  "appraisal_score": <number 1-100>,
  "budget_impact": {
    "current_cost": <monthly cost based on hourly rate>,
    "projected_value": <estimated value delivered based on metrics>,
    "roi_assessment": "positive/neutral/negative with brief explanation"
  },
  "promotion_readiness": "ready/developing/not ready - with brief explanation"
}

Base your analysis ONLY on the provided metrics. Be specific and quantifiable.`;

        const response = await featherlessService.generateCompletion([
            { role: 'system', content: 'You are an HR analytics expert. Respond only with valid JSON, no markdown.' },
            { role: 'user', content: prompt }
        ], {
            temperature: 0.3,
            max_tokens: 1500
        });

        // Parse JSON content
        const content = response.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                res.json(parsed);
            } catch (e) {
                console.error('JSON Parse Error:', e);
                // Fallback if strict JSON parsing fails but content exists
                res.json({ 
                    summary: "Report generated but format required adjustment.", 
                    raw_content: content.substring(0, 500) + "..."
                });
            }
        } else {
            res.status(500).json({ error: 'Failed to generate valid JSON report', raw: content });
        }

    } catch (err) {
        console.error('Report Generation Error:', err);
        res.status(err.status || 500).json({ error: err.message });
    }
});

/**
 * POST /api/hr/generate-retention-insight
 * Generate AI retention insights using server-side proxy
 */
router.post('/generate-retention-insight', async (req, res) => {
    try {
        const { summary, employees, risks } = req.body;
        
        if (!summary) {
            return res.status(400).json({ error: 'Missing retention data' });
        }

        const prompt = `You are an HR retention expert. Analyze this team retention data and provide actionable insights.

RETENTION SUMMARY:
- Total Employees: ${summary.total_employees}
- Critical Risk: ${summary.critical_risk} employees
- High Risk: ${summary.high_risk} employees  
- Medium Risk: ${summary.medium_risk} employees
- Low Risk: ${summary.low_risk} employees
- Average Risk Score: ${summary.avg_risk_score}/100

HIGH-RISK EMPLOYEES:
${(risks || []).map(e => `
- ${e.name} (${e.role}, ${e.team || 'No Team'})
  Risk Score: ${e.risk_score}/100
  Workload: ${e.workload}%
  Activity Trend: ${e.activity_trend}%
  Overdue Tasks: ${e.overdue}
  Active Tasks: ${e.active}
`).join('')}

Generate a JSON response with EXACTLY this structure (no markdown, just valid JSON):
{
  "overall_assessment": "2-3 sentence assessment of team retention health",
  "critical_actions": ["immediate action 1", "immediate action 2", "immediate action 3"],
  "team_recommendations": ["team-level recommendation 1", "team-level recommendation 2"],
  "wellness_initiatives": ["wellness initiative 1", "wellness initiative 2", "wellness initiative 3"]
}

Base recommendations ONLY on the provided data. Be specific and actionable.`;

        const response = await featherlessService.generateCompletion([
            { role: 'system', content: 'You are an HR retention expert. Respond only with valid JSON.' },
            { role: 'user', content: prompt }
        ], {
            temperature: 0.3,
            max_tokens: 1000
        });

        // Parse JSON content
        const content = response.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                res.json(parsed);
            } catch (e) {
                console.error('JSON Parse Error:', e);
                res.json({ 
                    overall_assessment: "Analysis completed but format required adjustment.",
                    critical_actions: ["Check system logs"],
                    team_recommendations: [],
                    wellness_initiatives: []
                });
            }
        } else {
            res.status(500).json({ error: 'Failed to generate valid JSON insight' });
        }

    } catch (err) {
        console.error('Retention Insight Error:', err);
        res.status(err.status || 500).json({ error: err.message });
    }
});

// Helper function to get week start date
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

module.exports = router;
