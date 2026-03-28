import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://beansilog26_db_user:Vincent0526.@osaconnect.rdqru7s.mongodb.net/OSAConnect_deploymenttest';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    
    try {
        cachedClient = await MongoClient.connect(MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            tls: true,
        });
        return cachedClient;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        return null;
    }
}

export default async function handler(req, res) {
    const path = req.nextUrl.pathname;
    const method = req.method;
    
    // Set CORS headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Health check
    if (path === '/api/health' || path === '/health') {
        return res.status(200).json({ status: 'ok' });
    }
    
    // Login endpoint
    if ((path === '/api/login' || path === '/login') && method === 'POST') {
        try {
            const body = await req.json();
            const username = (body.username || '').toLowerCase().trim();
            const password = body.password || '';
            
            // Hardcoded credentials
            if (username === 'admin' && password === 'admin') {
                return res.status(200).json({
                    success: true,
                    role: 'admin',
                    username: 'admin',
                    full_name: 'System Admin'
                });
            }
            
            if (username === 'faculty' && password === 'faculty') {
                return res.status(200).json({
                    success: true,
                    role: 'faculty',
                    username: 'faculty',
                    full_name: 'Faculty Member'
                });
            }
            
            if (username === 'guard' && password === 'guard') {
                return res.status(200).json({
                    success: true,
                    role: 'guard',
                    username: 'guard',
                    full_name: 'Gate Guard'
                });
            }
            
            if (username === 'staff' && password === 'staff') {
                return res.status(200).json({
                    success: true,
                    role: 'staff',
                    username: 'staff',
                    full_name: 'OSA Staff'
                });
            }
            
            // Try MongoDB for other users
            const client = await connectToDatabase();
            if (client) {
                const db = client.db() || client.db('OSAConnect_deploymenttest');
                
                // Auto-seed if empty
                const userCount = await db.collection('system_users').countDocuments();
                if (userCount === 0) {
                    await db.collection('system_users').insertMany([
                        { username: 'admin', password: 'admin', role: 'admin', full_name: 'System Admin' },
                        { username: 'staff', password: 'staff', role: 'staff', full_name: 'OSA Staff' },
                        { username: 'guard', password: 'guard', role: 'guard', full_name: 'Gate Guard' },
                        { username: 'faculty', password: 'faculty', role: 'faculty', full_name: 'Faculty' },
                    ]);
                }
                
                // Check system users
                const user = await db.collection('system_users').findOne({ username });
                if (user && user.password === password) {
                    return res.status(200).json({
                        success: true,
                        role: user.role,
                        username: user.username,
                        full_name: user.full_name
                    });
                }
                
                // Check students
                const student = await db.collection('students').findOne({ student_id: username });
                if (student && (student.student_id === password || password === student.student_id)) {
                    return res.status(200).json({
                        success: true,
                        role: 'student',
                        username: student.student_id,
                        name: student.name
                    });
                }
            }
            
            return res.status(401).json({ error: 'Invalid credentials' });
            
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
    
    return res.status(404).json({ error: 'Not found' });
}
