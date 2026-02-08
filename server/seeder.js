// seeder.js
const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const Commit = require('./models/Commit');
const Issue = require('./models/Issue');
const AllocationRun = require('./models/AllocationRun');
require('dotenv').config();

const dbConnect = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app';
        console.log(`Connecting to ${mongoUri}...`);
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const runSeed = async () => {
    await dbConnect();

    try {
        // --- 1. USERS (HR & Finance data) ---
        console.log('Adding/Updating Users...');
        
        const usersData = [
            {
                user_id: 'manual:EMP001',
                employee_id: 'TECH001',
                source: 'Manual',
                name: 'Alex Chen',
                display_name: 'Alex Chen',
                email: 'alex.chen@example.com',
                role: 'Senior Developer',
                department: 'Engineering',
                team: 'Backend Team',
                skills: ['Node.js', 'MongoDB', 'Python'],
                seniority_level: 5,
                hourly_rate: 95,
                years_of_experience: 8,
                availability: 'available'
            },
            {
                user_id: 'manual:EMP002',
                employee_id: 'TECH002',
                source: 'Manual',
                name: 'Sarah Jones',
                display_name: 'Sarah Jones',
                email: 'sarah.jones@example.com',
                role: 'Frontend Developer',
                department: 'Engineering',
                team: 'Frontend Team',
                skills: ['React', 'TypeScript', 'Tailwind'],
                seniority_level: 3,
                hourly_rate: 75,
                years_of_experience: 4,
                availability: 'available'
            },
            {
                user_id: 'manual:EMP003',
                employee_id: 'TECH003',
                source: 'Manual',
                name: 'Mike Ross',
                display_name: 'Mike Ross',
                email: 'mike.ross@example.com',
                role: 'DevOps Engineer',
                department: 'Engineering',
                team: 'Platform Team',
                skills: ['AWS', 'Docker', 'Kubernetes'],
                seniority_level: 4,
                hourly_rate: 85,
                years_of_experience: 6,
                availability: 'busy'
            },
               {
                user_id: 'manual:EMP004',
                employee_id: 'TECH004',
                source: 'Manual',
                name: 'Emily Davis',
                display_name: 'Emily Davis',
                email: 'emily.davis@example.com',
                role: 'QA Engineer',
                department: 'Engineering',
                team: 'QA Team',
                skills: ['Selenium', 'Jest', 'Cypress'],
                seniority_level: 2,
                hourly_rate: 60,
                years_of_experience: 2,
                availability: 'available'
            },
             {
                user_id: 'manual:EMP005',
                employee_id: 'TECH005',
                source: 'Manual',
                name: 'Daniel Lee',
                display_name: 'Daniel Lee',
                email: 'daniel.lee@example.com',
                role: 'Product Manager',
                department: 'Product',
                team: 'Product Team',
                skills: ['Jira', 'Agile', 'Scrum'],
                seniority_level: 5,
                hourly_rate: 110,
                years_of_experience: 10,
                availability: 'available'
            }
        ];

        const createdUsers = [];
        for (const userData of usersData) {
            const user = await User.findOneAndUpdate(
                { email: userData.email },
                { $set: userData },
                { upsert: true, new: true }
            );
            createdUsers.push(user);
        }
        console.log(`Synced ${createdUsers.length} users.`);


        // --- 2. TASKS (Project Mgmt & Finance data) ---
        console.log('Adding/Updating Tasks...');
        
        // Helper to get random user ID
        const getRandomUser = () => createdUsers[Math.floor(Math.random() * createdUsers.length)]._id;

        const tasksData = [
            {
                task_id: 'TASK-1001',
                title: 'Data Ingestion Pipeline',
                description: 'Build backend service to ingest data from Jira and GitHub',
                role_required: 'backend',
                priority: 'high',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                estimated_hours: 40,
                status: 'in_progress',
                allocated_to: createdUsers[0]._id, // Alex
                sprint_id: 'SPRINT-24-01',
                jira_issue_key: 'PROJ-101'
            },
             {
                task_id: 'TASK-1002',
                title: 'Dashboard UI Component',
                description: 'Create responsive analytics dashboard using Recharts',
                role_required: 'frontend',
                priority: 'medium',
                deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                estimated_hours: 16,
                status: 'done',
                allocated_to: createdUsers[1]._id, // Sarah
                sprint_id: 'SPRINT-24-01',
                jira_issue_key: 'PROJ-102'
            },
            {
                task_id: 'TASK-1003',
                title: 'CI/CD Workflow',
                description: 'Setup GitHub Actions for automated testing and deployment',
                role_required: 'devops',
                priority: 'high',
                deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Overdue
                estimated_hours: 8,
                status: 'pending', // Pending but overdue -> Risk
                allocated_to: createdUsers[2]._id, // Mike
                sprint_id: 'SPRINT-24-01',
                jira_issue_key: 'PROJ-103'
            },
             {
                task_id: 'TASK-1004',
                title: 'Unit Tests for Auth Service',
                description: 'Write comprehensive tests for user authentication',
                role_required: 'qa',
                priority: 'medium',
                deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Overdue
                estimated_hours: 12,
                status: 'in_progress', // Active but overdue -> Stress risk
                allocated_to: createdUsers[3]._id, // Emily
                sprint_id: 'SPRINT-24-01',
                jira_issue_key: 'PROJ-104'
            },
             {
                task_id: 'TASK-1005',
                title: 'API Documentation',
                description: 'Document all API endpoints using Swagger',
                role_required: 'backend',
                priority: 'low',
                 deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                estimated_hours: 4,
                status: 'pending',
                allocated_to: null, // Unassigned risk
                 sprint_id: 'SPRINT-24-02',
                jira_issue_key: 'PROJ-105'
            }
        ];

         for (const taskData of tasksData) {
            await Task.findOneAndUpdate(
                { task_id: taskData.task_id },
                { $set: taskData },
                { upsert: true }
            );
        }
        console.log(`Synced ${tasksData.length} tasks.`);


        // --- 3. COMMITS (HR Activity data) ---
        console.log('Adding/Updating Commits...');
        
        const commitsData = [
            // Alex (High activity)
            {
                commit_id: 'sha123456',
                message: 'feat: Implement data ingestion service PROJ-101',
                author_id: createdUsers[0]._id,
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                source: 'GitHub',
                raw_signature: 'alex-1',
                stats: { additions: 350, deletions: 20, total: 370 },
                linked_issues: ['PROJ-101'],
                files_changed: [{ filename: 'service.js', language: 'JavaScript', additions: 350 }]
            },
             {
                commit_id: 'sha123457',
                message: 'fix: Database connection timeout PROJ-101',
                author_id: createdUsers[0]._id,
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                source: 'GitHub',
                raw_signature: 'alex-2',
                stats: { additions: 15, deletions: 5, total: 20 },
                linked_issues: ['PROJ-101'],
                 files_changed: [{ filename: 'db.js', language: 'JavaScript', additions: 15 }]
            },
            // Sarah (Moderate activity)
            {
                commit_id: 'sha888888',
                message: 'feat: Add analytics charts PROJ-102',
                author_id: createdUsers[1]._id,
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                source: 'GitHub',
                raw_signature: 'sarah-1',
                 stats: { additions: 120, deletions: 0, total: 120 },
                linked_issues: ['PROJ-102'],
                 files_changed: [{ filename: 'Chart.tsx', language: 'TypeScript', additions: 120 }]
            },
             // Mike (Low recent activity - Retention risk indicator)
            {
                commit_id: 'sha999999',
                message: 'chore: Update docker config',
                author_id: createdUsers[2]._id,
                timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // Old commit
                source: 'GitHub',
                raw_signature: 'mike-1',
                 stats: { additions: 5, deletions: 2, total: 7 },
                 files_changed: [{ filename: 'Dockerfile', language: 'Docker', additions: 5 }]
            }
        ];

         for (const commitData of commitsData) {
            await Commit.findOneAndUpdate(
                { commit_id: commitData.commit_id },
                { $set: commitData },
                { upsert: true }
            );
        }
        console.log(`Synced ${commitsData.length} commits.`);


        // --- 4. ISSUES (Jira Sync Placeholder for Finance/Links) ---
        // Just minimal stubs to satisfy links from Finance/Tasks, since user said no detailed Jira yet
        console.log('Adding/Updating Issues (Stubs)...');
        
        const issuesData = [
             {
                issue_id: '10001',
                key: 'PROJ-101',
                title: 'Data Ingestion Pipeline',
                description: 'Full backend ingestion logic',
                status: 'In Progress',
                issue_type: 'Story',
                priority: 'High',
                assignee_id: createdUsers[0]._id,
                reporter_id: createdUsers[4]._id,
                story_points: 8,
                cost: { estimated_cost: 40 * 95, actual_cost: 0 }, // 40h * Alex rate
                 created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                updated_at: new Date()
            },
            {
                issue_id: '10002',
                key: 'PROJ-102',
                title: 'Dashboard UI Component',
                 description: 'Frontend dashboard implementation',
                status: 'Done',
                issue_type: 'Task',
                priority: 'Medium',
                assignee_id: createdUsers[1]._id,
                reporter_id: createdUsers[4]._id,
                story_points: 5,
                 cost: { estimated_cost: 16 * 75, actual_cost: 1200 }, // 16h * Sarah rate
                 created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                updated_at: new Date()
            }
        ];

         for (const issueData of issuesData) {
            await Issue.findOneAndUpdate(
                { key: issueData.key },
                { $set: issueData },
                { upsert: true }
            );
        }
        console.log(`Synced ${issuesData.length} issues.`);


        // --- 5. ALLOCATION RUNS (History for Finance) ---
        console.log('Adding/Updating Allocation History...');
        // Just a dummy record so "Allocation History" chart isn't empty
         await AllocationRun.create({
            sprint_id: 'SPRINT-24-01-RUN-1',
             sprint_name: 'Sprint 24-01',
            input_task_count: 5,
            allocated_task_count: 4,
            unallocated_count: 1,
            total_cost: 5000,
             status: 'completed',
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
         });
         console.log('Added 1 Allocation Run.');


        console.log('--- SEEDING COMPLETE ---');
        console.log('If your frontend shows blank, ensure your .env MONGODB_URI matches where this script ran.');
        process.exit(0);

    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

runSeed();
