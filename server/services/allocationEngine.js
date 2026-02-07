const Task = require('../models/Task');
const User = require('../models/User');
const AllocationRun = require('../models/AllocationRun');
const {
    createSprint,
    createIssue,
    moveIssuesToSprint,
} = require('./jiraClient');

const PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };

function sortTasksByDeadlineAndPriority(tasks) {
    return [...tasks].sort((a, b) => {
        const da = a.deadline ? new Date(a.deadline).getTime() : 0;
        const db = b.deadline ? new Date(b.deadline).getTime() : 0;
        if (da !== db) return da - db;
        return (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
    });
}

function allocateTasks(tasks, users) {
    const assignments = [];
    const byRole = {};
    for (const t of tasks) {
        const r = t.role_required || t.role;
        if (!byRole[r]) byRole[r] = [];
        byRole[r].push(t);
    }
    for (const role of Object.keys(byRole)) {
        const roleUsers = users
            .filter(
                (u) =>
                    u.role === role && (u.jira_account_id || (u.source === 'Jira' && u.source_user_id))
            )
            .map((u) => ({
                ...(u.toObject ? u.toObject() : u),
                jira_account_id: u.jira_account_id || (u.source === 'Jira' ? u.source_user_id : null),
            }))
            .filter((u) => u.jira_account_id);
        const roleTasks = sortTasksByDeadlineAndPriority(byRole[role]);
        if (roleUsers.length === 0) continue;
        roleTasks.forEach((task, i) => {
            const user = roleUsers[i % roleUsers.length];
            assignments.push({ task, user });
        });
    }
    return assignments;
}

async function previewAllocation(projectKey) {
    const tasks = await Task.find({
        status: 'pending',
        synced_to_jira: { $ne: true },
    })
        .sort({ deadline: 1 })
        .lean();
    const users = await User.find({}).lean();
    const assignments = allocateTasks(tasks, users);
    return {
        tasks,
        proposed_assignments: assignments.map((a) => ({
            task_id: a.task.task_id,
            title: a.task.title,
            role_required: a.task.role_required,
            assigned_to: a.user.email || a.user.display_name || a.user.user_id,
            user_id: a.user._id,
        })),
    };
}

async function runAllocation(payload) {
    const { project_key, board_id, sprint_name, sprint_duration_days } = payload;
    if (!project_key || board_id == null || !sprint_name) {
        throw new Error('project_key, board_id, and sprint_name are required');
    }
    const days = Math.max(1, parseInt(sprint_duration_days, 10) || 14);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    const tasks = await Task.find({
        status: 'pending',
        synced_to_jira: { $ne: true },
    })
        .sort({ deadline: 1 })
        .lean();
    const users = await User.find({});
    const assignments = allocateTasks(tasks, users);
    if (assignments.length === 0) {
        return {
            sprint_id: null,
            sprint_name,
            issues_created: 0,
            assignments: [],
            message: 'No pending tasks or no assignable users',
        };
    }

    const sprint = await createSprint(
        board_id,
        sprint_name,
        startDate.toISOString(),
        endDate.toISOString()
    );
    const sprintId = sprint.id;

    const issueKeys = [];
    const assignmentResults = [];
    const taskToJiraId = {};
    for (const { task, user } of assignments) {
        const accountId = user.jira_account_id || (user.source === 'Jira' ? user.source_user_id : null);
        const created = await createIssue(
            project_key,
            task.title,
            task.description,
            'Task',
            accountId || undefined
        );
        const key = created.key;
        issueKeys.push(key);
        taskToJiraId[task.task_id] = { key, id: created.id };
        assignmentResults.push({
            task_id: task.task_id,
            jira_key: key,
            assigned_to: user.email || user.display_name || user.user_id,
        });
    }

    if (issueKeys.length > 0) {
        await moveIssuesToSprint(sprintId, issueKeys);
    }

    for (const { task, user } of assignments) {
        const info = taskToJiraId[task.task_id];
        const jiraKey = info ? info.key : null;
        const jiraId = info ? String(info.id) : null;
        await Task.updateOne(
            { task_id: task.task_id },
            {
                $set: {
                    jira_issue_key: jiraKey,
                    jira_issue_id: jiraId,
                    allocated_to: user._id,
                    sprint_id: String(sprintId),
                    sprint_name,
                    status: 'allocated',
                    synced_to_jira: true,
                },
            }
        );
    }

    await AllocationRun.create({
        sprint_id: String(sprintId),
        sprint_name,
        project_key,
        board_id: Number(board_id),
        assignments: assignmentResults,
        issues_created: issueKeys.length,
    });

    return {
        sprint_id: String(sprintId),
        sprint_name,
        issues_created: issueKeys.length,
        assignments: assignmentResults,
    };
}

module.exports = {
    allocateTasks,
    previewAllocation,
    runAllocation,
};
