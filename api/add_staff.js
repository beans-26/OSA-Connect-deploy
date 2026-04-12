const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://beansilog26_db_user:Vincent0526.@osaconnect.rdqru7s.mongodb.net/OSAConnect_deploymenttest';

async function addStaff() {
    console.log("Connecting...");
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db('OSAConnect_deploymenttest');
    
    console.log("Adding staff user...");
    await db.collection('system_users').insertOne({ username: 'staff', password: 'staff', role: 'staff', full_name: 'OSA Staff' });
    console.log("Added staff account.");
    
    await client.close();
}

addStaff().catch(console.error);
