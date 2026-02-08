/**
 * Verify Jira Data in MongoDB
 * 
 * This script checks the jira_all_data_Datathon collection
 * and displays actual users with their tickets
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app';

async function verifyData() {
    try {
        // Connect to MongoDB with explicit database name
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'mern-app'  // Explicitly specify database name
        });

        const dbName = mongoose.connection.db.databaseName;
        console.log('✅ Connected to MongoDB');
        console.log(`📁 Database: ${dbName}`);
        console.log(`🔗 URI: ${MONGODB_URI.substring(0, 40)}...\n`);

        // Get the collection
        const db = mongoose.connection.db;
        const collection = db.collection('jira_all_data_Datathon');

        // Get total count
        const totalUsers = await collection.countDocuments();
        console.log(`📊 Total users in collection: ${totalUsers}\n`);

        // Get users WITH tickets (real users)
        console.log('👥 REAL USERS WITH TICKETS:\n');
        console.log('═'.repeat(80));

        const usersWithTickets = await collection
            .find({ 'tickets.0': { $exists: true } })
            .sort({ 'tickets': -1 })
            .toArray();

        for (const user of usersWithTickets) {
            console.log(`\n👤 User: ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   User ID: ${user.user_id}`);
            console.log(`   Total Tickets: ${user.tickets.length}`);
            console.log(`   Last Sync: ${user.timestamp}`);

            if (user.tickets.length > 0) {
                console.log(`\n   📋 Sample Tickets:`);
                user.tickets.slice(0, 3).forEach((ticket, idx) => {
                    console.log(`      ${idx + 1}. [${ticket.key}] ${ticket.summary}`);
                    console.log(`         Status: ${ticket.status} | Priority: ${ticket.priority}`);
                });
                if (user.tickets.length > 3) {
                    console.log(`      ... and ${user.tickets.length - 3} more tickets`);
                }
            }
            console.log('─'.repeat(80));
        }

        // Show statistics
        console.log('\n📊 STATISTICS:\n');
        console.log('═'.repeat(80));

        const stats = await collection.aggregate([
            {
                $project: {
                    name: 1,
                    email: 1,
                    ticketCount: { $size: '$tickets' }
                }
            },
            { $sort: { ticketCount: -1 } }
        ]).toArray();

        console.log('\nTicket Distribution:');
        stats.forEach(user => {
            if (user.ticketCount > 0) {
                console.log(`  ${user.name.padEnd(30)} ${user.ticketCount} tickets`);
            }
        });

        const totalTickets = stats.reduce((sum, user) => sum + user.ticketCount, 0);
        const usersWithTicketsCount = stats.filter(u => u.ticketCount > 0).length;

        console.log('\n' + '═'.repeat(80));
        console.log(`Total Users: ${totalUsers}`);
        console.log(`Users with Tickets: ${usersWithTicketsCount}`);
        console.log(`Users without Tickets: ${totalUsers - usersWithTicketsCount}`);
        console.log(`Total Tickets: ${totalTickets}`);
        console.log('═'.repeat(80));

        // Show one complete user document
        console.log('\n📄 COMPLETE SAMPLE DOCUMENT (User with Tickets):\n');
        const sampleUser = await collection.findOne({ 'tickets.0': { $exists: true } });
        console.log(JSON.stringify(sampleUser, null, 2));

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

verifyData();
