/**
 * List all databases and collections in MongoDB
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function listAll() {
    try {
        console.log('\n🔍 MONGODB CLUSTER INSPECTION\n');
        console.log('═'.repeat(70));

        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const adminDb = mongoose.connection.db.admin();

        // List all databases
        console.log('\n📚 ALL DATABASES IN CLUSTER:\n');
        const { databases } = await adminDb.listDatabases();

        for (const db of databases) {
            console.log(`\n📁 Database: ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);

            // List collections in this database
            const dbConn = mongoose.connection.client.db(db.name);
            const collections = await dbConn.listCollections().toArray();

            if (collections.length > 0) {
                console.log(`   Collections:`);
                for (const coll of collections) {
                    const collection = dbConn.collection(coll.name);
                    const count = await collection.countDocuments();
                    console.log(`      - ${coll.name}: ${count} documents`);

                    // If this is our collection, show details
                    if (coll.name === 'jira_all_data_Datathon' && count > 0) {
                        console.log(`\n      ✅ FOUND JIRA DATA HERE!`);
                        const sample = await collection.findOne();
                        console.log(`         Sample user: ${sample.name}`);
                        console.log(`         Tickets: ${sample.tickets.length}`);
                    }
                }
            } else {
                console.log(`   No collections`);
            }
        }

        console.log('\n' + '═'.repeat(70) + '\n');

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err.stack);
    } finally {
        await mongoose.disconnect();
    }
}

listAll();
