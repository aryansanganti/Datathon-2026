/**
 * Seed Mock Data Script
 * Generates synthetic users, teams, projects, issues, and commits
 * for hackathon demo purposes
 * 
 * Run with: node seed_mock.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app';

// Models
const User = require('./models/User');
const Team = require('./models/Team');
const Project = require('./models/Project');
const Issue = require('./models/Issue');
const Commit = require('./models/Commit');
const Sprint = require('./models/Sprint');

// Configuration - Simplified for readable graph visualization
const MOCK_CONFIG = {
    teams: 2,
    usersPerTeam: 3,
    projectsPerTeam: 1,
    issuesPerProject: 5,
    commitsPerUser: 4,
    sprintsPerProject: 1
};

// Mock Data Templates
const ROLE_TEMPLATES = {
    'Tech Lead': { hourly_rate: 95, seniority_level: 4 },
    'Senior Developer': { hourly_rate: 75, seniority_level: 3 },
    'Developer': { hourly_rate: 55, seniority_level: 2 },
    'QA Engineer': { hourly_rate: 50, seniority_level: 2 },
    'DevOps Engineer': { hourly_rate: 70, seniority_level: 3 },
    'Project Manager': { hourly_rate: 85, seniority_level: 4 },
    'Product Manager': { hourly_rate: 80, seniority_level: 4 },
};

const TEAM_TEMPLATES = [
    { name: 'Frontend Team', department: 'Engineering', skills: ['React', 'TypeScript', 'CSS'] },
    { name: 'Backend Team', department: 'Engineering', skills: ['Node.js', 'Python', 'MongoDB'] }
];

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Sam', 'Quinn', 'Avery', 'Jamie', 
                     'Drew', 'Skyler', 'Reese', 'Cameron', 'Blake', 'Dakota', 'Finley', 'Harper', 'Emerson', 'Rowan'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                    'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White'];

const PROJECT_PREFIXES = ['AUTH', 'DASH', 'API', 'DATA', 'UI', 'CORE', 'INFRA', 'ML'];
const ISSUE_TYPES = ['Story', 'Task', 'Bug', 'Feature', 'Improvement'];
const ISSUE_STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const ISSUE_TITLES = [
    'Implement user authentication flow',
    'Fix login page responsive layout',
    'Add dark mode support',
    'Optimize database queries',
    'Create API documentation',
    'Set up CI/CD pipeline',
    'Add unit tests for service layer',
    'Implement caching layer',
    'Fix memory leak in worker process',
    'Add rate limiting to API',
    'Implement search functionality',
    'Create dashboard widgets',
    'Add export to CSV feature',
    'Fix timezone handling',
    'Implement webhook notifications',
    'Add user preferences page',
    'Create admin panel',
    'Optimize image loading',
    'Add error tracking integration',
    'Implement file upload feature'
];

const COMMIT_MESSAGES = [
    'feat: add user authentication',
    'fix: resolve login issue',
    'refactor: improve code structure',
    'docs: update README',
    'test: add unit tests',
    'style: format code',
    'chore: update dependencies',
    'perf: optimize queries',
    'fix: handle edge case in validation',
    'feat: implement new feature'
];

// Utility functions
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUsername(firstName, lastName, index) {
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}`;
}

function generateEmail(username) {
    return `${username}@company.com`;
}

function generateEmployeeId(index) {
    return `MOCK-${String(index).padStart(4, '0')}`;
}

function generateCommitSha() {
    return Array.from({ length: 40 }, () => 
        '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');
}

async function seedDatabase() {
    console.log('🌱 Starting database seeding...\n');

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB\n');

        // Clear existing data (optional - comment out if you want to keep existing data)
        console.log('🗑️  Clearing existing mock data...');
        await Promise.all([
            User.deleteMany({ source: 'Mock' }),
            Team.deleteMany({}),
            Project.deleteMany({ source: 'Manual' }),
            Issue.deleteMany({ project_id: { $regex: /^(AUTH|DASH|API|DATA|UI|CORE|INFRA|ML)/ } }),
            Commit.deleteMany({ source: 'mock' }),
            Sprint.deleteMany({})
        ]);
        console.log('✅ Cleared existing data\n');

        // Create Teams
        console.log('👥 Creating teams...');
        const teams = [];
        for (const template of TEAM_TEMPLATES) {
            const team = await Team.create({
                team_id: `team-${template.name.toLowerCase().replace(/\s+/g, '-')}`,
                name: template.name,
                department: template.department,
                skills: template.skills,
                status: 'Active',
                members: []
            });
            teams.push(team);
            console.log(`   Created: ${template.name}`);
        }

        // Create Users
        console.log('\n👤 Creating users...');
        const allUsers = [];
        let userIndex = 0;

        for (const team of teams) {
            const teamRoles = ['Tech Lead', 'Senior Developer', 'Developer'];
            const teamMembers = [];

            for (let i = 0; i < MOCK_CONFIG.usersPerTeam; i++) {
                const firstName = FIRST_NAMES[userIndex % FIRST_NAMES.length];
                const lastName = LAST_NAMES[userIndex % LAST_NAMES.length];
                const username = generateUsername(firstName, lastName, userIndex);
                const role = teamRoles[i] || 'Developer';
                const roleConfig = ROLE_TEMPLATES[role];

                const user = await User.create({
                    user_id: `mock:${username}`,
                    employee_id: generateEmployeeId(userIndex),
                    source: 'Mock',
                    source_user_id: username,
                    display_name: `${firstName} ${lastName}`,
                    email: generateEmail(username),
                    role: role,
                    department: team.department,
                    team: team.name,
                    hourly_rate: roleConfig.hourly_rate,
                    seniority_level: roleConfig.seniority_level,
                    employment_type: 'Full-time',
                    skills: team.skills.slice(0, randomInt(2, team.skills.length)),
                });

                allUsers.push(user);
                teamMembers.push({
                    user_id: user._id,
                    role_in_team: role,
                    allocation_percentage: 100
                });

                if (i === 0) {
                    team.tech_lead_id = user._id;
                }

                userIndex++;
            }

            team.members = teamMembers;
            await team.save();
            console.log(`   Created ${MOCK_CONFIG.usersPerTeam} users for ${team.name}`);
        }

        // Add leadership roles (reduced to 2)
        console.log('\n👔 Creating leadership users...');
        const leadershipRoles = [
            { role: 'Project Manager', department: 'Product', team: 'Leadership' },
            { role: 'Product Manager', department: 'Product', team: 'Leadership' }
        ];

        for (const leader of leadershipRoles) {
            const firstName = FIRST_NAMES[userIndex % FIRST_NAMES.length];
            const lastName = LAST_NAMES[userIndex % LAST_NAMES.length];
            const username = generateUsername(firstName, lastName, userIndex);

            const user = await User.create({
                user_id: `mock:${username}`,
                employee_id: generateEmployeeId(userIndex),
                source: 'Mock',
                source_user_id: username,
                display_name: `${firstName} ${lastName}`,
                email: generateEmail(username),
                role: leader.role,
                department: leader.department,
                team: leader.team,
                hourly_rate: randomInt(70, 120),
                seniority_level: randomInt(3, 5),
                employment_type: 'Full-time',
                skills: [],
            });
            allUsers.push(user);
            userIndex++;
            console.log(`   Created: ${leader.role} - ${user.display_name}`);
        }

        // Create Projects
        console.log('\n📁 Creating projects...');
        const projects = [];

        for (let i = 0; i < teams.length; i++) {
            const team = teams[i];
            for (let j = 0; j < MOCK_CONFIG.projectsPerTeam; j++) {
                const prefix = PROJECT_PREFIXES[(i * MOCK_CONFIG.projectsPerTeam + j) % PROJECT_PREFIXES.length];
                const projectManager = allUsers.find(u => u.role === 'Project Manager') || team.members[0];

                const project = await Project.create({
                    project_id: prefix,
                    name: `${prefix} Project`,
                    description: `Main project for ${team.name}`,
                    source: 'Manual',
                    status: 'Active',
                    priority: randomElement(PRIORITIES),
                    lead_id: projectManager._id,
                    team_id: team._id,
                    members: team.members.map(m => m.user_id),
                    start_date: new Date(Date.now() - randomInt(30, 90) * 24 * 60 * 60 * 1000),
                    target_end_date: new Date(Date.now() + randomInt(30, 120) * 24 * 60 * 60 * 1000),
                    budget: {
                        allocated: randomInt(50000, 200000),
                        spent: randomInt(10000, 100000),
                        currency: 'USD',
                        type: 'OPEX'
                    },
                    estimated_hours: randomInt(500, 2000),
                    jira_project_key: prefix,
                    github_repos: [`company/${prefix.toLowerCase()}-service`]
                });
                projects.push(project);
                console.log(`   Created: ${project.name}`);
            }
        }

        // Create Sprints
        console.log('\n🏃 Creating sprints...');
        const sprints = [];
        for (const project of projects) {
            for (let i = 0; i < MOCK_CONFIG.sprintsPerProject; i++) {
                const startDate = new Date(Date.now() - (MOCK_CONFIG.sprintsPerProject - i) * 14 * 24 * 60 * 60 * 1000);
                const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
                
                const sprint = await Sprint.create({
                    sprint_id: `${project.project_id}-Sprint-${i + 1}`,
                    name: `Sprint ${i + 1}`,
                    state: i === MOCK_CONFIG.sprintsPerProject - 1 ? 'active' : 'closed',
                    board_id: `board-${project.project_id}`,
                    start_date: startDate,
                    end_date: endDate,
                    complete_date: i < MOCK_CONFIG.sprintsPerProject - 1 ? endDate : null,
                    goal: `Complete ${project.name} milestone ${i + 1}`
                });
                sprints.push(sprint);
            }
        }
        console.log(`   Created ${sprints.length} sprints`);

        // Create Issues
        console.log('\n🎫 Creating issues...');
        const issues = [];
        let issueCount = 0;

        for (const project of projects) {
            const team = teams.find(t => t._id.equals(project.team_id));
            const projectSprints = sprints.filter(s => s.sprint_id.startsWith(project.project_id));
            
            for (let i = 0; i < MOCK_CONFIG.issuesPerProject; i++) {
                const issueKey = `${project.project_id}-${i + 1}`;
                const assignee = team?.members[i % team.members.length];
                const sprint = projectSprints[i % projectSprints.length];
                
                const issue = await Issue.create({
                    issue_id: `issue-${issueKey}`,
                    key: issueKey,
                    title: ISSUE_TITLES[i % ISSUE_TITLES.length],
                    description: `Description for ${issueKey}`,
                    status: randomElement(ISSUE_STATUSES),
                    priority: randomElement(PRIORITIES),
                    issue_type: randomElement(ISSUE_TYPES),
                    assignee_id: assignee?.user_id,
                    sprint_id: sprint?.sprint_id,
                    project_id: project.project_id,
                    story_points: randomInt(1, 13),
                    original_estimate_hours: randomInt(2, 40),
                    time_spent_hours: randomInt(0, 30),
                    labels: [randomElement(['frontend', 'backend', 'api', 'database', 'testing'])],
                    created_at: new Date(Date.now() - randomInt(1, 60) * 24 * 60 * 60 * 1000),
                    updated_at: new Date(Date.now() - randomInt(0, 7) * 24 * 60 * 60 * 1000),
                });
                issues.push(issue);
                issueCount++;
            }
        }
        console.log(`   Created ${issueCount} issues`);

        // Create Commits
        console.log('\n💻 Creating commits...');
        const engineers = allUsers.filter(u => 
            ['Developer', 'Senior Developer', 'Tech Lead', 'DevOps Engineer'].includes(u.role)
        );
        let commitCount = 0;

        for (const user of engineers) {
            const userIssues = issues.filter(i => i.assignee_id?.equals(user._id));
            
            for (let i = 0; i < MOCK_CONFIG.commitsPerUser; i++) {
                const linkedIssue = userIssues[i % (userIssues.length || 1)];
                const sha = generateCommitSha();
                const message = `${randomElement(COMMIT_MESSAGES)}${linkedIssue ? ` [${linkedIssue.key}]` : ''}`;

                await Commit.create({
                    commit_id: sha,
                    branch: randomElement(['main', 'develop', `feature/${linkedIssue?.key || 'misc'}`]),
                    message: message,
                    author_id: user._id,
                    timestamp: new Date(Date.now() - randomInt(0, 60) * 24 * 60 * 60 * 1000),
                    source: 'mock',
                    repo_id: `company/main-repo`,
                    raw_signature: `mock:company/main-repo:${sha}`,
                    stats: {
                        additions: randomInt(5, 200),
                        deletions: randomInt(0, 100),
                        total: randomInt(10, 300)
                    },
                    linked_issues: linkedIssue ? [linkedIssue.key] : [],
                    files_changed: [
                        { 
                            filename: `src/${randomElement(['components', 'services', 'utils', 'api'])}/${randomElement(['index', 'main', 'helper'])}.${randomElement(['ts', 'js', 'tsx'])}`,
                            status: randomElement(['added', 'modified']),
                            additions: randomInt(5, 100),
                            deletions: randomInt(0, 50),
                            language: randomElement(['TypeScript', 'JavaScript'])
                        }
                    ]
                });
                commitCount++;
            }
        }
        console.log(`   Created ${commitCount} commits`);

        // Update project metrics
        console.log('\n📊 Updating project metrics...');
        for (const project of projects) {
            const projectIssues = issues.filter(i => i.project_id === project.project_id);
            const projectCommits = await Commit.countDocuments({ 
                author_id: { $in: project.members },
                source: 'mock'
            });

            await Project.findByIdAndUpdate(project._id, {
                metrics: {
                    total_issues: projectIssues.length,
                    completed_issues: projectIssues.filter(i => i.status === 'Done').length,
                    total_story_points: projectIssues.reduce((sum, i) => sum + (i.story_points || 0), 0),
                    completed_story_points: projectIssues.filter(i => i.status === 'Done')
                        .reduce((sum, i) => sum + (i.story_points || 0), 0),
                    total_commits: projectCommits,
                    velocity: randomInt(20, 60)
                }
            });
        }

        console.log('\n✨ Seeding complete!\n');
        console.log('Summary:');
        console.log(`   - Teams: ${teams.length}`);
        console.log(`   - Users: ${allUsers.length}`);
        console.log(`   - Projects: ${projects.length}`);
        console.log(`   - Sprints: ${sprints.length}`);
        console.log(`   - Issues: ${issueCount}`);
        console.log(`   - Commits: ${commitCount}`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the seeder
seedDatabase();
