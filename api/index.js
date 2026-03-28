const http = require('http');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://beansilog26_db_user:Vincent0526.@osaconnect.rdqru7s.mongodb.net/OSAConnect_deploymenttest';
const PORT = process.env.PORT || 3000;

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    
    try {
        cachedClient = await MongoClient.connect(MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            tls: true,
        });
        console.log('MongoDB connected');
        return cachedClient;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        return null;
    }
}

async function handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;
    const method = req.method;
    
    // CORS headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Health check
    if (path === '/health' && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }
    
    // Login endpoint
    if ((path.endsWith('/login') || path.endsWith('/login/') || path === '/api/login') && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const username = (data.username || '').toLowerCase().trim();
                const password = data.password || '';
                
                // Hardcoded credentials
                if (username === 'admin' && password === 'admin') {
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        role: 'admin',
                        username: 'admin',
                        full_name: 'System Admin'
                    }));
                    return;
                }
                
                if (username === 'faculty' && password === 'faculty') {
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        role: 'faculty',
                        username: 'faculty',
                        full_name: 'Faculty Member'
                    }));
                    return;
                }
                
                if (username === 'guard' && password === 'guard') {
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        role: 'guard',
                        username: 'guard',
                        full_name: 'Gate Guard'
                    }));
                    return;
                }
                
                if (username === 'staff' && password === 'staff') {
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        role: 'staff',
                        username: 'staff',
                        full_name: 'OSA Staff'
                    }));
                    return;
                }
                
                // Try MongoDB for other users
                const client = await connectToDatabase();
                if (client) {
                    const db = client.db('OSAConnect_deploymenttest');
                    
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
                        res.writeHead(200);
                        res.end(JSON.stringify({
                            success: true,
                            role: user.role,
                            username: user.username,
                            full_name: user.full_name
                        }));
                        return;
                    }
                    
                    // Check students
                    const student = await db.collection('students').findOne({ student_id: username });
                    if (student && (student.student_id === password || password === student.student_id)) {
                        res.writeHead(200);
                        res.end(JSON.stringify({
                            success: true,
                            role: 'student',
                            username: student.student_id,
                            name: student.name
                        }));
                        return;
                    }
                }
                
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Invalid credentials' }));
                
            } catch (error) {
                console.error('Login error:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }
    
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
}

// Start server
const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
