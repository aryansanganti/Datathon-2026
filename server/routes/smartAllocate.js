const express = require('express');
const router = express.Router();
const User = require('../models/User');
const JiraUser = require('../models/JiraUser');
const Contributor = require('../models/Contributor');

// Mock team members - same as HR routes
const MOCK_TEAM_MEMBERS = [
    { name: 'Aryan Sanganti', email: 'aryan.sanganti@company.com', role: 'Tech Lead', skills: ['React', 'Node.js', 'MongoDB', 'AWS'], seniority: 4 },
    { name: 'Ritwik Mohanty', email: 'ritwik.mohanty@company.com', role: 'Senior Developer', skills: ['TypeScript', 'React', 'GraphQL', 'PostgreSQL'], seniority: 4 },
    { name: 'Mohak Jaiswal', email: 'mohak.jaiswal@company.com', role: 'Senior Developer', skills: ['Python', 'Django', 'React', 'Docker'], seniority: 3 },
    { name: 'Manu Bhavsar', email: 'manu.bhavsar@company.com', role: 'Developer', skills: ['JavaScript', 'Vue.js', 'Node.js', 'MySQL'], seniority: 2 },
    { name: 'Alex Thompson', email: 'alex.thompson@company.com', role: 'Senior Developer', skills: ['Java', 'Spring Boot', 'Kubernetes', 'React'], seniority: 4 },
    { name: 'Sarah Chen', email: 'sarah.chen@company.com', role: 'QA Engineer', skills: ['Selenium', 'Jest', 'Cypress', 'Python'], seniority: 3 },
    { name: 'Michael Rodriguez', email: 'michael.rodriguez@company.com', role: 'DevOps Engineer', skills: ['AWS', 'Terraform', 'Docker', 'CI/CD'], seniority: 3 },
    { name: 'Emily Davis', email: 'emily.davis@company.com', role: 'Developer', skills: ['React', 'TypeScript', 'Tailwind', 'Next.js'], seniority: 2 },
    { name: 'James Wilson', email: 'james.wilson@company.com', role: 'Backend Developer', skills: ['Node.js', 'Express', 'MongoDB', 'Redis'], seniority: 3 },
    { name: 'Priya Sharma', email: 'priya.sharma@company.com', role: 'Full Stack Developer', skills: ['React', 'Python', 'FastAPI', 'PostgreSQL'], seniority: 3 },
    { name: 'David Kim', email: 'david.kim@company.com', role: 'Junior Developer', skills: ['JavaScript', 'React', 'CSS', 'HTML'], seniority: 1 },
    { name: 'Jessica Martinez', email: 'jessica.martinez@company.com', role: 'UI/UX Developer', skills: ['Figma', 'React', 'CSS', 'Animation'], seniority: 2 },
    { name: 'Ryan O\'Connor', email: 'ryan.oconnor@company.com', role: 'Senior Developer', skills: ['Go', 'Rust', 'Microservices', 'gRPC'], seniority: 4 },
    { name: 'Amanda Lee', email: 'amanda.lee@company.com', role: 'Data Engineer', skills: ['Python', 'Spark', 'SQL', 'Airflow'], seniority: 3 },
    { name: 'Chris Brown', email: 'chris.brown@company.com', role: 'Developer', skills: ['Angular', 'TypeScript', '.NET', 'C#'], seniority: 2 },
    { name: 'Natasha Patel', email: 'natasha.patel@company.com', role: 'Project Manager', skills: ['Agile', 'Scrum', 'JIRA', 'Confluence'], seniority: 3 }
];

/**
 * GET /api/smart-allocate/employees
 * Returns employees in the EmployeeData format expected by smart-allocate frontend
 * Uses mock team members
 */
router.get('/employees', async (req, res) => {
  try {
    const hourlyRates = { 1: 55, 2: 70, 3: 85, 4: 100 };
    const seniorityMap = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead' };
    
    const formatted = MOCK_TEAM_MEMBERS.map((member, index) => {
      const seed = (index * 7 + 13) % 100;
      const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      
      // Generate consistent pseudo-random values
      const workloadScore = (25 + (seed % 45)) / 100;
      const efficiency = (60 + member.seniority * 8 + (seed % 15)) / 100;
      const activeTickets = 2 + (seed % 6);
      
      return {
        id: `emp_${index + 1}`,
        name: member.name,
        role: member.role,
        avatar: initials,
        availability: true,
        hours_per_week: 40,
        workload: {
          active_tickets: activeTickets,
          ticket_weights: [],
          computed_score: workloadScore
        },
        tech_stack: member.skills,
        seniority: seniorityMap[member.seniority] || 'Mid',
        efficiency: efficiency,
        stress: (15 + (seed % 30)) / 100,
        cost_per_hour: hourlyRates[member.seniority] || 75,
        experience: member.seniority + ((index * 3) % 4),
        jira_linked: true,
        github_linked: true
      };
    });
    
    console.log('📊 Smart Allocate /employees: Returning ' + formatted.length + ' mock team members');
    res.json(formatted);
  } catch (err) {
    console.error('Smart Allocate employees error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/smart-allocate/tasks
 * Returns mock tasks
 */
router.get('/tasks', async (req, res) => {
  try {
    const Task = require('../models/Task');
    const tasks = await Task.find({}).lean();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * GET /api/smart-allocate/jira-tasks
 * Returns mock JIRA-style tasks
 */
router.get('/jira-tasks', async (req, res) => {
  try {
    // Generate mock tasks based on team
    const mockTasks = [];
    const priorities = ['critical', 'high', 'medium', 'low'];
    const statuses = ['pending', 'in_progress', 'done'];
    const taskTypes = [
      'Implement user authentication',
      'Fix pagination bug',
      'Add dashboard analytics',
      'Refactor API endpoints',
      'Write unit tests',
      'Update documentation',
      'Optimize database queries',
      'Add email notifications',
      'Create admin panel',
      'Fix mobile responsiveness',
      'Implement caching layer',
      'Add search functionality',
      'Setup CI/CD pipeline',
      'Add logging system',
      'Implement rate limiting'
    ];
    
    for (let i = 0; i < 20; i++) {
      const seed = (i * 17 + 11) % 100;
      const assigneeIdx = i % MOCK_TEAM_MEMBERS.length;
      
      mockTasks.push({
        id: `TASK-${1000 + i}`,
        task_id: `TASK-${1000 + i}`,
        title: taskTypes[i % taskTypes.length],
        description: taskTypes[i % taskTypes.length] + ' - detailed description',
        status: statuses[seed % 3],
        priority: priorities[seed % 4],
        estimated_hours: 4 + (seed % 12),
        required_skills: MOCK_TEAM_MEMBERS[assigneeIdx].skills.slice(0, 2),
        assigned_to: MOCK_TEAM_MEMBERS[assigneeIdx].name,
        assignee_email: MOCK_TEAM_MEMBERS[assigneeIdx].email,
        created: new Date(Date.now() - (seed + 5) * 24 * 60 * 60 * 1000).toISOString(),
        updated: new Date(Date.now() - (seed % 5) * 24 * 60 * 60 * 1000).toISOString(),
        source: 'mock'
      });
    }
    
    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    mockTasks.sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    });
    
    res.json(mockTasks);
  } catch (error) {
    console.error('Error fetching JIRA tasks:', error);
    res.status(500).json({ error: 'Failed to fetch JIRA tasks' });
  }
});

/**
 * POST /api/smart-allocate/allocations
 */
router.post('/allocations', async (req, res) => {
  try {
    const { allocations } = req.body;
    const mongoose = require('mongoose');
    
    if (allocations && allocations.length > 0) {
      await mongoose.connection.db.collection('allocations').insertMany(
        allocations.map(a => ({ ...a, allocated_at: new Date() }))
      );
    }
    res.status(201).json({ success: true, count: allocations?.length || 0 });
  } catch (error) {
    console.error('Error saving allocations:', error);
    res.status(500).json({ error: 'Failed to save allocations' });
  }
});

/**
 * PATCH /api/smart-allocate/employees/:id/workload
 */
router.patch('/employees/:id/workload', async (req, res) => {
  try {
    const { id } = req.params;
    const { workload } = req.body;
    
    // Convert workload score back to free_slots_per_week
    const freeSlots = Math.round((1 - workload) * 40);
    
    const user = await User.findByIdAndUpdate(
      id,
      { free_slots_per_week: freeSlots },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating workload:', error);
    res.status(500).json({ error: 'Failed to update workload' });
  }
});

/**
 * POST /api/smart-allocate/employees
 */
router.post('/employees', async (req, res) => {
  try {
    const employeeData = req.body;
    
    // Map EmployeeData format to User model
    const user = new User({
      user_id: `manual:${Date.now()}`,
      employee_id: employeeData.id || `EMP${Date.now()}`,
      name: employeeData.name,
      role: 'Developer', // Default, main server uses enum
      team: employeeData.role,
      skills: employeeData.tech_stack || [],
      years_of_experience: employeeData.experience || 3,
      free_slots_per_week: Math.round((1 - (employeeData.workload?.computed_score || 0.5)) * 40),
      availability: employeeData.availability ? 'Free' : 'Busy',
      past_performance_score: employeeData.efficiency || 0.85,
      capacity_hours_per_sprint: employeeData.hours_per_week || 40
    });
    
    await user.save();
    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

/**
 * GET /api/smart-allocate/stats
 * Returns statistics about employees in the database
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const availableUsers = await User.countDocuments({ availability: { $ne: 'Busy' } });
    const avgExperience = await User.aggregate([
      { $group: { _id: null, avgExp: { $avg: '$years_of_experience' } } }
    ]);

    res.json({ 
      success: true, 
      total: totalUsers,
      available: availableUsers,
      avgExperience: avgExperience[0]?.avgExp || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/smart-allocate/health
 */
router.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({ 
    status: 'ok', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' 
  });
});

/**
 * GET /api/smart-allocate/employees-enhanced
 * Returns employees in enhanced format with real JIRA and GitHub data
 */
router.get('/employees-enhanced', async (req, res) => {
  try {
    // Get all data sources
    const users = await User.find({}).lean();
    const jiraUsers = await JiraUser.find({}).lean();
    const contributors = await Contributor.find({}).lean();
    
    console.log('📊 Smart Allocate Enhanced: ' + users.length + ' users, ' + 
                jiraUsers.length + ' JIRA users, ' + contributors.length + ' contributors');
    
    // Create lookup maps
    const jiraByEmail = {};
    jiraUsers.forEach(j => {
      jiraByEmail[j.email.toLowerCase()] = j;
    });
    
    const contributorByEmail = {};
    contributors.forEach(c => {
      contributorByEmail[c.email.toLowerCase()] = c;
    });
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const allEmployees = [];
    const processedEmails = new Set();
    
    // Process mock users first
    for (const user of users) {
      const email = (user.email || '').toLowerCase();
      if (email) processedEmails.add(email);
      
      const jiraData = email ? jiraByEmail[email] : null;
      const contributorData = email ? contributorByEmail[email] : null;
      
      allEmployees.push(formatEnhancedEmployee(user, jiraData, contributorData, thirtyDaysAgo));
    }
    
    // Add JIRA users not in mock data
    for (const jiraUser of jiraUsers) {
      const email = jiraUser.email.toLowerCase();
      if (!processedEmails.has(email)) {
        processedEmails.add(email);
        const contributorData = contributorByEmail[email];
        allEmployees.push(formatEnhancedEmployeeFromJira(jiraUser, contributorData, thirtyDaysAgo));
      }
    }
    
    // Add GitHub contributors not in other sources
    for (const contributor of contributors) {
      const email = contributor.email.toLowerCase();
      if (!processedEmails.has(email)) {
        allEmployees.push(formatEnhancedEmployeeFromGithub(contributor, thirtyDaysAgo));
      }
    }
    
    res.json(allEmployees);
  } catch (error) {
    console.error('Error fetching enhanced employees:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced employees', details: error.message });
  }
});

/**
 * GET /api/smart-allocate/jira-tasks
 * Returns JIRA tickets as tasks for allocation
 */
router.get('/jira-tasks', async (req, res) => {
  try {
    const jiraUsers = await JiraUser.find({}).lean();
    
    const tasks = [];
    for (const user of jiraUsers) {
      for (const ticket of (user.tickets || [])) {
        // Only include non-completed tickets
        if (!['done', 'closed', 'resolved'].includes(ticket.status.toLowerCase())) {
          tasks.push({
            id: ticket.ticket_id,
            task_id: ticket.key,
            title: ticket.summary,
            status: mapJiraStatus(ticket.status),
            priority: mapJiraPriority(ticket.priority),
            role_required: inferRoleFromTicket(ticket),
            estimated_hours: estimateHoursFromPriority(ticket.priority),
            deadline: calculateDeadline(ticket.created, ticket.priority),
            assigned_to: user.user_id,
            assigned_name: user.name,
            source: 'jira',
            jira_key: ticket.key,
            created: ticket.created,
            updated: ticket.updated
          });
        }
      }
    }
    
    res.json({
      total: tasks.length,
      tasks: tasks
    });
  } catch (error) {
    console.error('Error fetching JIRA tasks:', error);
    res.status(500).json({ error: 'Failed to fetch JIRA tasks' });
  }
});

// Helper functions for enhanced employee formatting
function formatEnhancedEmployee(user, jiraData, contributorData, thirtyDaysAgo) {
  const maxSlots = 40;
  const freeSlots = user.free_slots_per_week || 20;
  let workloadScore = Math.max(0, Math.min(1, 1 - (freeSlots / maxSlots)));
  
  // Adjust workload based on JIRA tickets
  if (jiraData) {
    const openTickets = (jiraData.tickets || []).filter(t => 
      !['done', 'closed', 'resolved'].includes(t.status.toLowerCase())
    );
    const jiraWorkload = Math.min(0.5, openTickets.length * 0.08);
    workloadScore = Math.min(1, workloadScore + jiraWorkload);
  }
  
  // Calculate velocity from GitHub data
  let velocityScore = 0.85;
  let recentCommits = 0;
  if (contributorData) {
    const commits = contributorData.commits || [];
    recentCommits = commits.filter(c => new Date(c.date) >= thirtyDaysAgo).length;
    const commitsPerWeek = recentCommits / 4.3;
    velocityScore = Math.min(1, 0.5 + (commitsPerWeek * 0.1));
  }
  
  const isAvailable = user.availability !== 'Busy';
  const years = user.years_of_experience || 3;
  let seniority = 'Mid';
  if (years >= 10) seniority = 'Lead';
  else if (years >= 6) seniority = 'Senior';
  else if (years <= 2) seniority = 'Junior';
  
  const baseRate = 30;
  const expBonus = years * 3;
  const roleBonus = (user.role && (
    user.role.toLowerCase().includes('lead') || 
    user.role.toLowerCase().includes('manager') ||
    user.role.toLowerCase().includes('senior')
  )) ? 20 : 0;
  const costPerHour = baseRate + expBonus + roleBonus;
  
  const name = user.name || user.display_name || 'Employee';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return {
    id: user._id.toString(),
    name: name,
    email: user.email,
    role: user.role || user.team || 'Developer',
    avatar: initials,
    availability: isAvailable,
    hours_per_week: user.capacity_hours_per_sprint || 40,
    workload: {
      active_tickets: jiraData ? (jiraData.tickets || []).filter(t => 
        !['done', 'closed', 'resolved'].includes(t.status.toLowerCase())
      ).length : Math.floor(workloadScore * 5),
      ticket_weights: [],
      computed_score: workloadScore
    },
    tech_stack: user.skills || [],
    seniority: seniority,
    efficiency: user.past_performance_score || velocityScore,
    stress: workloadScore * 0.6,
    cost_per_hour: costPerHour,
    experience: years,
    source: 'mock',
    // Enhanced data
    jira_data: jiraData ? {
      user_id: jiraData.user_id,
      total_tickets: (jiraData.tickets || []).length,
      open_tickets: (jiraData.tickets || []).filter(t => 
        !['done', 'closed', 'resolved'].includes(t.status.toLowerCase())
      ).length
    } : null,
    github_data: contributorData ? {
      username: contributorData.github_username,
      total_commits: contributorData.total_commits,
      recent_commits_30d: recentCommits,
      velocity_score: Math.round(velocityScore * 100)
    } : null
  };
}

function formatEnhancedEmployeeFromJira(jiraUser, contributorData, thirtyDaysAgo) {
  const openTickets = (jiraUser.tickets || []).filter(t => 
    !['done', 'closed', 'resolved'].includes(t.status.toLowerCase())
  );
  const workloadScore = Math.min(1, openTickets.length * 0.15);
  
  let velocityScore = 0.7;
  let recentCommits = 0;
  if (contributorData) {
    const commits = contributorData.commits || [];
    recentCommits = commits.filter(c => new Date(c.date) >= thirtyDaysAgo).length;
    const commitsPerWeek = recentCommits / 4.3;
    velocityScore = Math.min(1, 0.5 + (commitsPerWeek * 0.1));
  }
  
  const name = jiraUser.name || 'JIRA User';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return {
    id: jiraUser.user_id,
    name: name,
    email: jiraUser.email,
    role: 'Developer',
    avatar: initials,
    availability: openTickets.length < 5,
    hours_per_week: 40,
    workload: {
      active_tickets: openTickets.length,
      ticket_weights: [],
      computed_score: workloadScore
    },
    tech_stack: [],
    seniority: 'Mid',
    efficiency: velocityScore,
    stress: workloadScore * 0.6,
    cost_per_hour: 75,
    experience: 3,
    source: 'jira',
    jira_data: {
      user_id: jiraUser.user_id,
      total_tickets: (jiraUser.tickets || []).length,
      open_tickets: openTickets.length
    },
    github_data: contributorData ? {
      username: contributorData.github_username,
      total_commits: contributorData.total_commits,
      recent_commits_30d: recentCommits,
      velocity_score: Math.round(velocityScore * 100)
    } : null
  };
}

function formatEnhancedEmployeeFromGithub(contributor, thirtyDaysAgo) {
  const commits = contributor.commits || [];
  const recentCommits = commits.filter(c => new Date(c.date) >= thirtyDaysAgo).length;
  const commitsPerWeek = recentCommits / 4.3;
  const velocityScore = Math.min(1, 0.5 + (commitsPerWeek * 0.1));
  
  const name = contributor.name || contributor.github_username || 'Contributor';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return {
    id: contributor.contributor_id,
    name: name,
    email: contributor.email,
    role: 'Developer',
    avatar: initials,
    availability: true,
    hours_per_week: 40,
    workload: {
      active_tickets: 0,
      ticket_weights: [],
      computed_score: 0.3
    },
    tech_stack: [],
    seniority: contributor.total_commits > 100 ? 'Senior' : contributor.total_commits > 30 ? 'Mid' : 'Junior',
    efficiency: velocityScore,
    stress: 0.2,
    cost_per_hour: 75,
    experience: Math.floor(contributor.total_commits / 50) + 1,
    source: 'github',
    jira_data: null,
    github_data: {
      username: contributor.github_username,
      total_commits: contributor.total_commits,
      recent_commits_30d: recentCommits,
      velocity_score: Math.round(velocityScore * 100)
    }
  };
}

function mapJiraStatus(status) {
  const lower = status.toLowerCase();
  if (['done', 'closed', 'resolved'].includes(lower)) return 'done';
  if (['in progress', 'in review', 'testing'].includes(lower)) return 'in_progress';
  return 'pending';
}

function mapJiraPriority(priority) {
  const lower = priority.toLowerCase();
  if (['highest', 'critical', 'blocker'].includes(lower)) return 'high';
  if (['high'].includes(lower)) return 'high';
  if (['medium', 'normal'].includes(lower)) return 'medium';
  return 'low';
}

function inferRoleFromTicket(ticket) {
  const summary = (ticket.summary || '').toLowerCase();
  if (summary.includes('ui') || summary.includes('frontend') || summary.includes('css') || summary.includes('design')) {
    return 'frontend';
  }
  if (summary.includes('api') || summary.includes('backend') || summary.includes('database') || summary.includes('server')) {
    return 'backend';
  }
  if (summary.includes('test') || summary.includes('qa') || summary.includes('bug')) {
    return 'qa';
  }
  if (summary.includes('deploy') || summary.includes('ci') || summary.includes('infrastructure')) {
    return 'devops';
  }
  return 'backend'; // Default
}

function estimateHoursFromPriority(priority) {
  const lower = priority.toLowerCase();
  if (['highest', 'critical', 'blocker'].includes(lower)) return 16;
  if (['high'].includes(lower)) return 12;
  if (['medium', 'normal'].includes(lower)) return 8;
  return 4;
}

function calculateDeadline(created, priority) {
  const createdDate = new Date(created);
  const lower = priority.toLowerCase();
  let daysToAdd = 14; // Default 2 weeks
  
  if (['highest', 'critical', 'blocker'].includes(lower)) daysToAdd = 3;
  else if (['high'].includes(lower)) daysToAdd = 7;
  else if (['medium', 'normal'].includes(lower)) daysToAdd = 14;
  else daysToAdd = 21;
  
  createdDate.setDate(createdDate.getDate() + daysToAdd);
  return createdDate;
}

module.exports = router;
