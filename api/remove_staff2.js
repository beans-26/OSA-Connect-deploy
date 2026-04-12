const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://beansilog26_db_user:Vincent0526.@osaconnect.rdqru7s.mongodb.net/OSAConnect_deploymenttest';

async function removeStaff() {
    console.log("Connecting...");
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db('OSAConnect_deploymenttest');
    
    console.log("Deleting staff user by username...");
    const num = await db.collection('system_users').deleteMany({ username: 'staff' });
    console.log("Deleted", num.deletedCount, "accounts with username 'staff'.");
    
    await client.close();
}

removeStaff().catch(console.error);
