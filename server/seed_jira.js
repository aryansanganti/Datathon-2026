const mongoose = require('mongoose');
const Issue = require('./models/Issue');
const User = require('./models/User');
require('dotenv').config();

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Find users
    const alice = await User.findOne({ user_id: 'alice' });
    const bob = await User.findOne({ user_id: 'bob' });

    // Create Mock Issues
    const issues = [
        {
            issue_id: '10001',
            key: 'PROJ-1',
            title: 'Implement Login',
            status: 'Done',
            priority: 'High',
            assignee_id: alice?._id,
            created_at: new Date(),
            updated_at: new Date(),
            project_id: 'PROJ'
        },
        {
            issue_id: '10002',
            key: 'PROJ-2',
            title: 'Fix CSS Bug',
            status: 'In Progress',
            priority: 'Medium',
            assignee_id: bob?._id,
            created_at: new Date(),
            updated_at: new Date(),
            project_id: 'PROJ'
        }
    ];

    for (const i of issues) {
        await Issue.findOneAndUpdate({ issue_id: i.issue_id }, i, { upsert: true });
        console.log(`Seeded issue ${i.key}`);
    }

    process.exit(0);
}

seed().catch(console.error);
