const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Issue = require('../models/Issue');
const Sprint = require('../models/Sprint');
const AllocationRun = require('../models/AllocationRun');

/**
 * GET /api/finance/overview
 * Get high-level financial metrics
 */
router.get('/overview', async (req, res) => {
    try {
        // Get all users with hourly rates
        const users = await User.find({ hourly_rate: { $exists: true, $gt: 0 } }).lean();
        const avgHourlyRate = users.length > 0 
            ? users.reduce((sum, u) => sum + u.hourly_rate, 0) / users.length 
            : 75;

        // Get task statistics
        const tasks = await Task.find({}).lean();
        const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
        const completedTasks = tasks.filter(t => t.status === 'done');
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
        const pendingTasks = tasks.filter(t => t.status === 'pending');

        // Calculate costs
        const totalBudgetedCost = totalEstimatedHours * avgHourlyRate;
        const completedHours = completedTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
        const actualSpentCost = completedHours * avgHourlyRate;

        // Get issues with cost data
        const issues = await Issue.find({ 'cost.estimated_cost': { $exists: true } }).lean();
        const totalTrackedCost = issues.reduce((sum, i) => sum + (i.cost?.actual_cost || i.cost?.estimated_cost || 0), 0);

        // Calculate ROI (savings vs market rate $150/hr)
        const marketRate = 150;
        const marketCost = totalEstimatedHours * marketRate;
        const savings = marketCost - totalBudgetedCost;
        const roi = totalBudgetedCost > 0 ? (savings / totalBudgetedCost * 100) : 0;

        // Allocation runs for historical data
        const allocationRuns = await AllocationRun.find({}).sort({ created_at: -1 }).limit(30).lean();

        res.json({
            summary: {
                total_budgeted_cost: Math.round(totalBudgetedCost),
                actual_spent_cost: Math.round(actualSpentCost),
                remaining_budget: Math.round(totalBudgetedCost - actualSpentCost),
                market_rate_cost: Math.round(marketCost),
                projected_savings: Math.round(savings),
                roi_percentage: Math.round(roi * 10) / 10,
                avg_hourly_rate: Math.round(avgHourlyRate),
                currency: 'USD'
            },
            tasks: {
                total: tasks.length,
                completed: completedTasks.length,
                in_progress: inProgressTasks.length,
                pending: pendingTasks.length,
                completion_rate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
            },
            hours: {
                total_estimated: Math.round(totalEstimatedHours),
                completed: Math.round(completedHours),
                remaining: Math.round(totalEstimatedHours - completedHours)
            },
            allocation_history: allocationRuns.slice(0, 10)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/finance/daily-progress
 * Get daily/weekly progress analysis for features
 */
router.get('/daily-progress', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Get tasks with timestamps
        const tasks = await Task.find({
            updatedAt: { $gte: startDate }
        }).sort({ updatedAt: -1 }).lean();

        // Get issues with workflow history
        const issues = await Issue.find({
            updated_at: { $gte: startDate }
        }).sort({ updated_at: -1 }).lean();

        // Group by day
        const dailyData = {};
        const today = new Date();
        
        for (let i = 0; i < parseInt(days); i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyData[dateStr] = {
                date: dateStr,
                completed: 0,
                started: 0,
                delayed: 0,
                on_track: 0,
                cost_incurred: 0,
                hours_logged: 0
            };
        }

        // Process tasks
        tasks.forEach(task => {
            const dateStr = task.updatedAt.toISOString().split('T')[0];
            if (dailyData[dateStr]) {
                if (task.status === 'done') {
                    dailyData[dateStr].completed++;
                    dailyData[dateStr].hours_logged += task.estimated_hours || 0;
                }
                if (task.status === 'in_progress') {
                    dailyData[dateStr].started++;
                }
                // Check if delayed (past deadline and not done)
                if (task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done') {
                    dailyData[dateStr].delayed++;
                } else if (task.status !== 'done') {
                    dailyData[dateStr].on_track++;
                }
            }
        });

        // Process issues for cost data
        issues.forEach(issue => {
            const dateStr = issue.updated_at.toISOString().split('T')[0];
            if (dailyData[dateStr]) {
                dailyData[dateStr].cost_incurred += issue.cost?.actual_cost || 0;
            }
        });

        // Calculate cumulative values
        const sortedDays = Object.values(dailyData).sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        let cumulativeCompleted = 0;
        let cumulativeCost = 0;
        let cumulativeHours = 0;

        sortedDays.forEach(day => {
            cumulativeCompleted += day.completed;
            cumulativeCost += day.cost_incurred;
            cumulativeHours += day.hours_logged;
            day.cumulative_completed = cumulativeCompleted;
            day.cumulative_cost = Math.round(cumulativeCost);
            day.cumulative_hours = Math.round(cumulativeHours * 10) / 10;
        });

        res.json({
            period: `${days} days`,
            daily_breakdown: sortedDays,
            totals: {
                total_completed: cumulativeCompleted,
                total_cost: Math.round(cumulativeCost),
                total_hours: Math.round(cumulativeHours),
                avg_daily_completion: Math.round((cumulativeCompleted / parseInt(days)) * 10) / 10
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/finance/sprint-analysis
 * Analyze sprint performance and ROI
 */
router.get('/sprint-analysis', async (req, res) => {
    try {
        const sprints = await Sprint.find({}).sort({ start_date: -1 }).limit(10).lean();
        const users = await User.find({ hourly_rate: { $exists: true, $gt: 0 } }).lean();
        const avgHourlyRate = users.length > 0 
            ? users.reduce((sum, u) => sum + u.hourly_rate, 0) / users.length 
            : 75;

        const sprintAnalysis = await Promise.all(sprints.map(async (sprint) => {
            // Get tasks for this sprint
            const sprintTasks = await Task.find({ sprint_id: sprint.sprint_id }).lean();
            const completedTasks = sprintTasks.filter(t => t.status === 'done');
            
            const totalHours = sprintTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
            const completedHours = completedTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
            
            const plannedCost = totalHours * avgHourlyRate;
            const actualCost = completedHours * avgHourlyRate;
            
            // Calculate if delayed (tasks past deadline)
            const now = new Date();
            const delayedTasks = sprintTasks.filter(t => 
                t.deadline && new Date(t.deadline) < now && t.status !== 'done'
            );
            
            // Estimate delay cost (20% overhead per delayed task)
            const delayCost = delayedTasks.length * avgHourlyRate * 4; // 4 hours overhead per delay
            
            // Calculate velocity (story points or tasks per day)
            const sprintDays = sprint.start_date && sprint.end_date 
                ? Math.ceil((new Date(sprint.end_date) - new Date(sprint.start_date)) / (1000 * 60 * 60 * 24))
                : 14;
            const velocity = sprintDays > 0 ? completedTasks.length / sprintDays : 0;

            // ROI calculation
            const marketCost = totalHours * 150;
            const savings = marketCost - plannedCost;
            const roi = plannedCost > 0 ? ((savings - delayCost) / plannedCost * 100) : 0;

            return {
                sprint_id: sprint.sprint_id,
                name: sprint.name,
                state: sprint.state,
                start_date: sprint.start_date,
                end_date: sprint.end_date,
                goal: sprint.goal,
                metrics: {
                    total_tasks: sprintTasks.length,
                    completed_tasks: completedTasks.length,
                    delayed_tasks: delayedTasks.length,
                    completion_rate: sprintTasks.length > 0 
                        ? Math.round((completedTasks.length / sprintTasks.length) * 100) 
                        : 0,
                    velocity: Math.round(velocity * 10) / 10
                },
                financials: {
                    planned_cost: Math.round(plannedCost),
                    actual_cost: Math.round(actualCost),
                    delay_cost: Math.round(delayCost),
                    total_cost: Math.round(actualCost + delayCost),
                    savings: Math.round(savings),
                    roi_percentage: Math.round(roi * 10) / 10,
                    currency: 'USD'
                },
                hours: {
                    planned: Math.round(totalHours),
                    completed: Math.round(completedHours),
                    remaining: Math.round(totalHours - completedHours)
                }
            };
        }));

        // Calculate overall metrics
        const totalPlannedCost = sprintAnalysis.reduce((sum, s) => sum + s.financials.planned_cost, 0);
        const totalActualCost = sprintAnalysis.reduce((sum, s) => sum + s.financials.total_cost, 0);
        const totalSavings = sprintAnalysis.reduce((sum, s) => sum + s.financials.savings, 0);
        const avgRoi = sprintAnalysis.length > 0 
            ? sprintAnalysis.reduce((sum, s) => sum + s.financials.roi_percentage, 0) / sprintAnalysis.length
            : 0;

        res.json({
            sprints: sprintAnalysis,
            overall: {
                total_planned_cost: Math.round(totalPlannedCost),
                total_actual_cost: Math.round(totalActualCost),
                total_savings: Math.round(totalSavings),
                average_roi: Math.round(avgRoi * 10) / 10,
                sprints_analyzed: sprintAnalysis.length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/finance/feature-costs
 * Break down costs by feature/epic
 */
router.get('/feature-costs', async (req, res) => {
    try {
        // Get issues grouped by epic
        const issues = await Issue.find({}).lean();
        const users = await User.find({ hourly_rate: { $exists: true, $gt: 0 } }).lean();
        const avgHourlyRate = users.length > 0 
            ? users.reduce((sum, u) => sum + u.hourly_rate, 0) / users.length 
            : 75;

        // Group by epic
        const epicGroups = {};
        
        issues.forEach(issue => {
            const epicKey = issue.epic_key || 'No Epic';
            if (!epicGroups[epicKey]) {
                epicGroups[epicKey] = {
                    epic_key: epicKey,
                    issues: [],
                    total_story_points: 0,
                    completed_story_points: 0,
                    estimated_cost: 0,
                    actual_cost: 0,
                    time_spent_hours: 0
                };
            }
            
            epicGroups[epicKey].issues.push(issue);
            epicGroups[epicKey].total_story_points += issue.story_points || 0;
            
            if (issue.status === 'Done' || issue.resolution === 'Done') {
                epicGroups[epicKey].completed_story_points += issue.story_points || 0;
            }
            
            epicGroups[epicKey].estimated_cost += issue.cost?.estimated_cost || 
                (issue.original_estimate_hours || 0) * avgHourlyRate;
            epicGroups[epicKey].actual_cost += issue.cost?.actual_cost || 
                (issue.time_spent_hours || 0) * avgHourlyRate;
            epicGroups[epicKey].time_spent_hours += issue.time_spent_hours || 0;
        });

        // Calculate metrics for each epic
        const features = Object.values(epicGroups).map(epic => {
            const completionRate = epic.total_story_points > 0 
                ? (epic.completed_story_points / epic.total_story_points) * 100 
                : 0;
            
            const costVariance = epic.estimated_cost > 0 
                ? ((epic.actual_cost - epic.estimated_cost) / epic.estimated_cost) * 100 
                : 0;

            // Determine status
            let status = 'on_track';
            if (costVariance > 20) status = 'over_budget';
            else if (completionRate < 50 && costVariance > 10) status = 'at_risk';
            else if (completionRate >= 100) status = 'completed';

            return {
                ...epic,
                issues: epic.issues.length,
                completion_rate: Math.round(completionRate),
                estimated_cost: Math.round(epic.estimated_cost),
                actual_cost: Math.round(epic.actual_cost),
                cost_variance_percent: Math.round(costVariance * 10) / 10,
                status,
                currency: 'USD'
            };
        });

        // Sort by cost (highest first)
        features.sort((a, b) => b.actual_cost - a.actual_cost);

        res.json({
            features: features.slice(0, 20),
            summary: {
                total_features: features.length,
                total_estimated_cost: Math.round(features.reduce((sum, f) => sum + f.estimated_cost, 0)),
                total_actual_cost: Math.round(features.reduce((sum, f) => sum + f.actual_cost, 0)),
                features_at_risk: features.filter(f => f.status === 'at_risk' || f.status === 'over_budget').length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/finance/risk-assessment
 * Get cost risk assessment
 */
router.get('/risk-assessment', async (req, res) => {
    try {
        const tasks = await Task.find({}).lean();
        const users = await User.find({ hourly_rate: { $exists: true, $gt: 0 } }).lean();
        const avgHourlyRate = users.length > 0 
            ? users.reduce((sum, u) => sum + u.hourly_rate, 0) / users.length 
            : 75;

        const now = new Date();
        
        // Analyze risks
        const risks = [];
        
        // 1. Delayed tasks risk
        const delayedTasks = tasks.filter(t => 
            t.deadline && new Date(t.deadline) < now && t.status !== 'done'
        );
        if (delayedTasks.length > 0) {
            const delayedHours = delayedTasks.reduce((sum, t) => sum + (t.estimated_hours || 8), 0);
            const delayCost = delayedHours * avgHourlyRate * 0.3; // 30% overhead
            risks.push({
                type: 'delayed_tasks',
                severity: delayedTasks.length > 5 ? 'high' : delayedTasks.length > 2 ? 'medium' : 'low',
                count: delayedTasks.length,
                potential_cost_impact: Math.round(delayCost),
                description: `${delayedTasks.length} tasks are past their deadline`,
                recommendation: 'Prioritize completing delayed tasks or adjust timelines'
            });
        }

        // 2. Resource overallocation risk
        const allocatedTasks = tasks.filter(t => t.allocated_to && t.status !== 'done');
        const userWorkload = {};
        allocatedTasks.forEach(t => {
            const userId = t.allocated_to.toString();
            userWorkload[userId] = (userWorkload[userId] || 0) + (t.estimated_hours || 8);
        });
        
        const overloadedUsers = Object.entries(userWorkload).filter(([_, hours]) => hours > 40);
        if (overloadedUsers.length > 0) {
            risks.push({
                type: 'resource_overload',
                severity: overloadedUsers.length > 3 ? 'high' : 'medium',
                count: overloadedUsers.length,
                potential_cost_impact: Math.round(overloadedUsers.length * avgHourlyRate * 8), // 8h overtime per person
                description: `${overloadedUsers.length} team members are overallocated`,
                recommendation: 'Redistribute tasks or adjust timelines'
            });
        }

        // 3. High-priority unassigned tasks
        const unassignedHighPriority = tasks.filter(t => 
            t.priority === 'high' && !t.allocated_to && t.status === 'pending'
        );
        if (unassignedHighPriority.length > 0) {
            risks.push({
                type: 'unassigned_priority',
                severity: unassignedHighPriority.length > 3 ? 'high' : 'medium',
                count: unassignedHighPriority.length,
                potential_cost_impact: Math.round(unassignedHighPriority.length * avgHourlyRate * 16), // 2 days delay
                description: `${unassignedHighPriority.length} high-priority tasks are not assigned`,
                recommendation: 'Immediately assign resources to high-priority tasks'
            });
        }

        // 4. Sprint scope creep risk (if many pending tasks)
        const pendingCount = tasks.filter(t => t.status === 'pending').length;
        const totalCount = tasks.length;
        if (totalCount > 0 && (pendingCount / totalCount) > 0.6) {
            risks.push({
                type: 'scope_creep',
                severity: 'medium',
                count: pendingCount,
                potential_cost_impact: Math.round(pendingCount * avgHourlyRate * 4),
                description: `${Math.round((pendingCount / totalCount) * 100)}% of tasks are still pending`,
                recommendation: 'Review sprint scope and prioritize essential tasks'
            });
        }

        // Calculate total risk exposure
        const totalRiskCost = risks.reduce((sum, r) => sum + r.potential_cost_impact, 0);
        const highRisks = risks.filter(r => r.severity === 'high').length;
        const mediumRisks = risks.filter(r => r.severity === 'medium').length;

        res.json({
            overall_risk_level: highRisks > 0 ? 'high' : mediumRisks > 2 ? 'medium' : 'low',
            total_risk_exposure: Math.round(totalRiskCost),
            risks: risks.sort((a, b) => {
                const severityOrder = { high: 0, medium: 1, low: 2 };
                return severityOrder[a.severity] - severityOrder[b.severity];
            }),
            summary: {
                high_risks: highRisks,
                medium_risks: mediumRisks,
                low_risks: risks.filter(r => r.severity === 'low').length,
                total_risks: risks.length
            },
            currency: 'USD'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/finance/team-costs
 * Get cost breakdown by team member
 */
router.get('/team-costs', async (req, res) => {
    try {
        const users = await User.find({}).lean();
        const tasks = await Task.find({}).populate('allocated_to').lean();

        const teamCosts = users.map(user => {
            const userTasks = tasks.filter(t => 
                t.allocated_to && t.allocated_to._id.toString() === user._id.toString()
            );
            
            const completedTasks = userTasks.filter(t => t.status === 'done');
            const inProgressTasks = userTasks.filter(t => t.status === 'in_progress');
            
            const totalHours = userTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
            const completedHours = completedTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
            
            const hourlyRate = user.hourly_rate || 75;
            const totalCost = totalHours * hourlyRate;
            const costIncurred = completedHours * hourlyRate;

            return {
                user_id: user.user_id,
                name: user.display_name || user.name,
                email: user.email,
                role: user.role,
                team: user.team,
                hourly_rate: hourlyRate,
                metrics: {
                    total_tasks: userTasks.length,
                    completed_tasks: completedTasks.length,
                    in_progress_tasks: inProgressTasks.length,
                    completion_rate: userTasks.length > 0 
                        ? Math.round((completedTasks.length / userTasks.length) * 100) 
                        : 0
                },
                hours: {
                    allocated: Math.round(totalHours),
                    completed: Math.round(completedHours),
                    capacity: user.capacity_hours_per_sprint || 40,
                    utilization: Math.round((totalHours / (user.capacity_hours_per_sprint || 40)) * 100)
                },
                cost: {
                    total_allocated: Math.round(totalCost),
                    incurred: Math.round(costIncurred),
                    remaining: Math.round(totalCost - costIncurred),
                    currency: 'USD'
                }
            };
        });

        // Sort by cost incurred (highest first)
        teamCosts.sort((a, b) => b.cost.incurred - a.cost.incurred);

        const totalAllocated = teamCosts.reduce((sum, t) => sum + t.cost.total_allocated, 0);
        const totalIncurred = teamCosts.reduce((sum, t) => sum + t.cost.incurred, 0);

        res.json({
            team: teamCosts.filter(t => t.metrics.total_tasks > 0),
            summary: {
                total_team_members: teamCosts.filter(t => t.metrics.total_tasks > 0).length,
                total_allocated_cost: Math.round(totalAllocated),
                total_incurred_cost: Math.round(totalIncurred),
                avg_utilization: Math.round(
                    teamCosts.reduce((sum, t) => sum + t.hours.utilization, 0) / (teamCosts.length || 1)
                )
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
