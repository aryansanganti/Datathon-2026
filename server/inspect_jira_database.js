/**
 * Quick MongoDB Database Inspector
 * Shows where the Jira data is currently stored
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function inspect() {
    try {
        // Check BOTH databases: 'test' (default) and 'mern-app' (intended)

        console.log('\n🔍 INSPECTING MONGODB DATABASES\n');
        console.log('═'.repeat(70));

        // Check 'test' database (where data currently is)
        console.log('\n📁 Checking database: test');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'test'
        });

        const testDb = mongoose.connection.db;
        const testCollection = testDb.collection('jira_all_data_Datathon');
        const testCount = await testCollection.countDocuments();

        console.log(`   Collection: jira_all_data_Datathon`);
        console.log(`   Documents: ${testCount}`);

        if (testCount > 0) {
            const usersWithTickets = await testCollection.countDocuments({ 'tickets.0': { $exists: true } });
            console.log(`   Users with tickets: ${usersWithTickets}`);

            // Show sample users
            const samples = await testCollection.find({ 'tickets.0': { $exists: true } }).limit(5).toArray();
            console.log('\n   📋 Sample users with tickets:');
            samples.forEach(user => {
                console.log(`      - ${user.name}: ${user.tickets.length} tickets`);
            });
        }

        await mongoose.disconnect();

        // Check 'mern-app' database (where it should be)
        console.log('\n📁 Checking database: mern-app');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'mern-app'
        });

        const mernDb = mongoose.connection.db;
        const mernCollection = mernDb.collection('jira_all_data_Datathon');
        const mernCount = await mernCollection.countDocuments();

        console.log(`   Collection: jira_all_data_Datathon`);
        console.log(`   Documents: ${mernCount}`);

        if (mernCount > 0) {
            const usersWithTickets = await mernCollection.countDocuments({ 'tickets.0': { $exists: true } });
            console.log(`   Users with tickets: ${usersWithTickets}`);
        }

        await mongoose.disconnect();

        // Summary
        console.log('\n' + '═'.repeat(70));
        console.log('\n📊 SUMMARY:');
        console.log(`   Data in 'test' database: ${testCount} users`);
        console.log(`   Data in 'mern-app' database: ${mernCount} users`);

        if (testCount > 0 && mernCount === 0) {
            console.log('\n⚠️  DATA IS IN THE WRONG DATABASE!');
            console.log('\n💡 SOLUTION:');
            console.log('   Option 1: Re-run the fetch script (it\'s now fixed to use mern-app)');
            console.log('             Command: node fetch_jira_to_mongodb.js');
            console.log('');
            console.log('   Option 2: Move data from test to mern-app database');
            console.log('             (I can create a migration script for this)');
        } else if (mernCount > 0) {
            console.log('\n✅ Data is in the correct database (mern-app)!');
        }

        console.log('\n' + '═'.repeat(70) + '\n');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

inspect();
