# OSAConnect Full Codebase Context
This file contains the complete source code for the OSAConnect project, provided for AI analysis.

## Directory Structure
```text
./
    .gitignore
    .vercelignore
    aggregate_for_ai.py
    Procfile
    requirements.txt
    vercel.json
    wsgi.py
    api/
        add_staff.js
        index.js
        package.json
        remove_staff.js
        remove_staff2.js
    backend/
        .env
        build.sh
        bulk_report_debug.txt
        check_db.py
        check_student_data.py
        cleanup_students.py
        clear_db.py
        clear_violations.py
        create_faculty.py
        db_dump.txt
        debug_save.py
        deep_cleanup.py
        delete_sample_students.py
        error.html
        final_cleanup.py
        fix_duplicates.py
        fix_users.py
        list_marks.py
        manage.py
        name_cleanup.py
        Procfile
        requirements.txt
        seed.py
        seed_students.py
        test_api.py
        core/
            admin.py
            admin_views.py
            apps.py
            models.py
            serializers.py
            tests.py
            urls.py
            views.py
            __init__.py
            migrations/
                __init__.py
        osaconnect_backend/
            asgi.py
            requirements.txt
            settings.py
            urls.py
            wsgi.py
            __init__.py
    frontend/
        .gitignore
        eslint.config.js
        index.html
        package.json
        README.md
        vite.config.js
        vite.config.js.timestamp-1772451517642-9ecd6542ded67.mjs
        vite.config.js.timestamp-1774669933868-b839540c35148.mjs
        vite.config.js.timestamp-1775008831862-b6b47b4d1fb6f.mjs
        vite.config.js.timestamp-1776093959901-ccfd667632ccb.mjs
        public/
            vite.svg
        src/
            api.js
            App.css
            App.jsx
            index.css
            main.jsx
            assets/
                react.svg
            components/
                Sidebar.jsx
            pages/
                AdminLogin.jsx
                GuardDashboard.jsx
                LandingPage.jsx
                Login.jsx
                StaffDashboard.jsx
                StudentDashboard.jsx
                StudentRegistration.jsx
                admin/
                    AdminDashboard.jsx
                faculty/
                    FacultyDashboard.jsx
                guard/
                    GuardHistory.jsx
                    ReportViolation.jsx
                    ScanHistory.jsx
                staff/
                    AllStudents.jsx
                    Analytics.jsx
                    Archives.jsx
                    PendingReviews.jsx
                    Settings.jsx
                student/
                    Settings.jsx
                    TimeLogs.jsx
                    ViolationInfo.jsx
```

## Source Code Files

### File: .gitignore
```
# Standard Python & Node ignores
**/venv/
**/node_modules/
**/__pycache__/
*.pyc
*.pyo
*.pyd
db.sqlite3
*.egg-info/
frontend/dist/
frontend/build/
.env
frontend/dist/
frontend/build/
.DS_Store
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
Thumbs.db
Desktop.ini

```

### File: .vercelignore
```
.git
.env
venv
node_modules
*.pyc
db.sqlite3
frontend/node_modules
backend/venv

```

### File: aggregate_for_ai.py
```python
import os

def aggregate_codebase(output_file="PROJECT_CONTEXT_FOR_AI.md"):
    # Folders and extensions to ignore
    ignore_folders = {'node_modules', 'venv', '.git', '__pycache__', 'dist', 'build', '.vercel', 'sample images'}
    ignore_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.exe', '.pyc', '.mjs.timestamp'}
    
    # Files specifically to ignore
    ignore_files = {'package-lock.json', 'db.sqlite3', 'PROJECT_CONTEXT_FOR_AI.md', 'aggregator.py'}

    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write("# OSAConnect Full Codebase Context\n")
        outfile.write("This file contains the complete source code for the OSAConnect project, provided for AI analysis.\n\n")
        
        # Write Directory Structure
        outfile.write("## Directory Structure\n```text\n")
        for root, dirs, files in os.walk('.'):
            # Prune ignore folders
            dirs[:] = [d for d in dirs if d not in ignore_folders]
            
            level = root.replace('.', '').count(os.sep)
            indent = ' ' * 4 * (level)
            outfile.write(f"{indent}{os.path.basename(root)}/\n")
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                if f not in ignore_files and os.path.splitext(f)[1] not in ignore_extensions:
                    outfile.write(f"{subindent}{f}\n")
        outfile.write("```\n\n")

        # Write File Contents
        outfile.write("## Source Code Files\n\n")
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in ignore_folders]
            for f in files:
                if f in ignore_files: continue
                ext = os.path.splitext(f)[1]
                if ext in ignore_extensions: continue
                
                file_path = os.path.join(root, f)
                relative_path = os.path.relpath(file_path, '.')
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                        outfile.write(f"### File: {relative_path}\n")
                        # Guess language for markdown highlighting
                        lang = ext[1:] if ext.startswith('.') else ""
                        if lang == "jsx": lang = "javascript"
                        if lang == "py": lang = "python"
                        
                        outfile.write(f"```{lang}\n")
                        outfile.write(content)
                        outfile.write("\n```\n\n")
                except Exception as e:
                    outfile.write(f"### File: {relative_path} (Failed to read: {e})\n\n")

    print(f"Success! Codebase aggregated into {output_file}")

if __name__ == "__main__":
    aggregate_codebase()

```

### File: Procfile
```
web: gunicorn backend.osaconnect_backend.wsgi:application

```

### File: requirements.txt
```txt
django
djangorestframework
django-cors-headers
pymongo
mongoengine
python-dotenv
cryptography
djangorestframework-simplejwt
django-rest-framework-mongoengine
gunicorn
whitenoise
dj-database-url
dnspython
certifi

```

### File: vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "wsgi.py",
      "use": "@vercel/python",
      "config": { "maxLambdaSize": "15mb", "runtime": "python3.10" }
    },
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/login(/)?",
      "dest": "api/index.js"
    },
    { 
      "src": "/api/(.*)", 
      "dest": "wsgi.py" 
    },
    {
      "src": "/static/(.*)",
      "dest": "wsgi.py"
    },
    {
      "src": "/assets/(.*)",
      "dest": "frontend/assets/$1"
    },
    {
      "src": "/(vite.svg|ustp.png|osa-logo.jpg|favicon.ico)",
      "dest": "frontend/$1"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/index.html"
    }
  ]
}

```

### File: wsgi.py
```python
import os
import sys
from pathlib import Path

# Vercel entry point in root
root = Path(__file__).resolve().parent
backend_root = root / "backend"

if str(backend_root) not in sys.path:
    sys.path.append(str(backend_root))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')

from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
application = app

```

### File: api\add_staff.js
```js
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

```

### File: api\index.js
```js
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
    // Login endpoint - check if path is just / or includes login
    if ((path === '/' || path === '' || path.includes('login')) && method === 'POST') {
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
                
                // Try MongoDB for other users
                const client = await connectToDatabase();
                if (client) {
                    const db = client.db('OSAConnect_deploymenttest');
                    
                    // Auto-seed if empty
                    const userCount = await db.collection('system_users').countDocuments();
                    if (userCount === 0) {
                        await db.collection('system_users').insertMany([
                            { username: 'admin', password: 'admin', role: 'admin', full_name: 'System Admin' },
                            { username: 'guard', password: 'guard', role: 'guard', full_name: 'Gate Guard' },
                            { username: 'staff', password: 'staff', role: 'staff', full_name: 'OSA Staff' },
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

```

### File: api\package.json
```json
{
    "name": "api",
    "version": "1.0.0",
    "main": "index.js",
    "dependencies": {
        "mongodb": "^6.21.0"
    }
}

```

### File: api\remove_staff.js
```js
const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://beansilog26_db_user:Vincent0526.@osaconnect.rdqru7s.mongodb.net/OSAConnect_deploymenttest';

async function removeStaff() {
    console.log("Connecting...");
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db('OSAConnect_deploymenttest');
    
    console.log("Deleting staff user...");
    const num = await db.collection('system_users').deleteMany({ role: 'staff' });
    console.log("Deleted", num.deletedCount, "staff accounts.");
    
    await client.close();
}

removeStaff().catch(console.error);

```

### File: api\remove_staff2.js
```js
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

```

### File: backend\.env
```
MONGODB_URI=mongodb+srv://beansilog26_db_user:Vincent0526.@osaconnect.rdqru7s.mongodb.net/OSAConnect_deploymenttest
SECRET_KEY=osaconnect-production-safe-key-v1-2026
DEBUG=True
ALLOWED_HOSTS=*
SMTP_LOGIN=beansilog26@gmail.com
SMTP_PASSWORD=Vincent0526.
```

### File: backend\build.sh
```sh
# Building frontend
cd ../frontend
npm install
npm run build
cd ../backend

pip install -r requirements.txt

# Map frontend dist to static
python manage.py collectstatic --no-input
python manage.py migrate

```

### File: backend\bulk_report_debug.txt
```txt

--- BULK REPORT DEBUG ---
Student: 2023303188 | Violation: No ID | Count: 1
Raw Hours Input: '5'
Final Hours Calculated: 5.0
Final Punishment: 5.0 hours community service (Bulk Report)
--------------------------

--- BULK REPORT DEBUG ---
Student: 2023303188 | Violation: Failure to Attend Event | Count: 1
Raw Hours Input: '2'
Final Hours Calculated: 2.0
Final Punishment: 2.0 hours community service (Bulk Report)
--------------------------

--- BULK REPORT DEBUG ---
Student: 2023303438 | Violation: No ID | Count: 1
Raw Hours Input: '1'
Final Hours Calculated: 1.0
Final Punishment: 1.0 hours community service (Bulk Report)
--------------------------

--- BULK REPORT DEBUG ---
Student: 2023303438 | Violation: Other | Count: 1
Raw Hours Input: '2'
Final Hours Calculated: 2.0
Final Punishment: 2.0 hours community service (Bulk Report)
--------------------------

```

### File: backend\check_db.py
```python
import sys
import os
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student, ViolationReport, ETicket, TimeLog

print("Students:")
for s in Student.objects.all():
    print(f" - {s.student_id}: {s.name}")

print("\nViolations:")
for v in ViolationReport.objects.all():
    ticket_count = ETicket.objects.filter(violation=v).count()
    print(f" - [{v.id}] Student: {v.student.student_id} | Type: {v.violation_type} | Puns: {v.punishment} | Status: {v.status} | HasTicket: {ticket_count}")

print("\nETickets:")
for t in ETicket.objects.all():
    try:
        violation_id = str(t.violation.id) if t.violation else "None"
        student_id = t.violation.student.student_id if t.violation and t.violation.student else "Unknown"
        print(f" - [{t.id}] Student: {student_id} | Violation: {violation_id} | Hrs: {t.remaining_hours}/{t.total_hours_required} | Status: {t.status}")
    except Exception as ev:
        print(f" - [{t.id}] Broken: {str(ev)}")

print("\nTimeLogs:")
for l in TimeLog.objects.all():
    try:
        print(f" - Log for ticket {l.eticket.id} - In: {l.time_in} Out: {l.time_out} Dur: {l.duration_seconds}")
    except:
        print(f" - Broken log")

```

### File: backend\check_student_data.py
```python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student, ViolationReport, ETicket

def check_student():
    sid = "2023303188"
    try:
        student = Student.objects.get(student_id=sid)
        print(f"DEBUG: Checking student {student.name} ({student.student_id})")
        
        violations = ViolationReport.objects.filter(student=student)
        print(f"Found {len(violations)} Violations")
        for v in violations:
            print(f" - [{v.id}] Puns: '{v.punishment}' | Status: {v.status}")
            
            tickets = ETicket.objects.filter(violation=v)
            print(f"   ETickets associated: {len(tickets)}")
            for t in tickets:
                print(f"     -> Ticket {t.id} | Rem: {t.remaining_hours}/{t.total_hours_required} hrs")
                
    except Student.DoesNotExist:
        print("Student not found!")

if __name__ == "__main__":
    check_student()

```

### File: backend\cleanup_students.py
```python
import os
import django

# Set up Django environment
import sys
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student, ViolationReport, ETicket

def cleanup_duplicates():
    print("--- STARTING DATABASE CLEANUP ---")
    
    # 0. STRIP all IDs first (find hidden tabs/spaces)
    print("Normalizing all student IDs (stripping whitespace)...")
    for s in Student.objects.all():
        if s.student_id:
            orig = s.student_id
            stripped = orig.strip()
            if orig != stripped:
                print(f"  Formatting issue detected for {s.name}: [{orig}] -> [{stripped}]")
                
                # Check if the target stripped ID already exists
                conflict = Student.objects.filter(student_id=stripped).first()
                if conflict:
                    print(f"    CONFLICT: Record exists for [{stripped}]. Merging logs...")
                    # RE-LINK ViolationReports from ghost to conflict
                    reports = ViolationReport.objects.filter(student=s)
                    for r in reports:
                        r.student = conflict
                        r.save()
                    s.delete()
                    print(f"    Ghost purged and merged into primary record.")
                else:
                    s.student_id = stripped
                    s.save()
                    print(f"    ID normalized successfully.")

    # 1. Identity all student IDs
    all_sids = [s[0] for s in Student.objects.values_list('student_id')]
    unique_sids = set(all_sids)
    
    for sid in unique_sids:
        if not sid: continue
        duplicates = Student.objects.filter(student_id=sid)
        if duplicates.count() > 1:
            print(f"FOUND DUPLICATE ID: {sid} ({duplicates.count()} entries)")
            
            # Sort duplicates: keep the one with more data (e.g. year_level != 'N/A')
            # and latest update
            sorted_dupes = sorted(
                duplicates, 
                key=lambda s: (s.year_level != 'N/A', s.year_level != None, s.id), 
                reverse=True
            )
            
            keep_this = sorted_dupes[0]
            delete_these = sorted_dupes[1:]
            
            print(f"  KEEPING: {keep_this.name} ({keep_this.year_level}) - ID: {keep_this.id}")
            
            for ghost in delete_these:
                print(f"  CLEANING GHOST ID: {ghost.id}")
                
                # RE-LINK ViolationReports
                reports = ViolationReport.objects.filter(student=ghost)
                if reports.count() > 0:
                    print(f"    Re-linking {reports.count()} reports to primary record...")
                    for r in reports:
                        r.student = keep_this
                        r.save()
                
                # Delete the ghost
                ghost.delete()
                print(f"    Ghost student purged successfully.")

    print("--- CLEANUP COMPLETE ---")

if __name__ == "__main__":
    cleanup_duplicates()

```

### File: backend\clear_db.py
```python
import sys
import os
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import ViolationReport, ETicket, TimeLog

print("Starting database cleanup...")

# 1. Delete all TimeLogs
deleted_logs = TimeLog.objects.all().delete()
print(f"Deleted {deleted_logs} time logs.")

# 2. Delete all ETickets (Timers)
deleted_tickets = ETicket.objects.all().delete()
print(f"Deleted {deleted_tickets} active/completed timers.")

# 3. Delete all Violation Reports
deleted_violations = ViolationReport.objects.all().delete()
print(f"Deleted {deleted_violations} violation records.")

print("Cleanup complete! All students are now starting fresh.")

```

### File: backend\clear_violations.py
```python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import ViolationReport, ETicket, TimeLog

def clear_violations():
    print("Clearing all Violations, ETickets, and TimeLogs...")
    
    # Delete related items first to avoid any issues
    TimeLog.objects.all().delete()
    ETicket.objects.all().delete()
    ViolationReport.objects.all().delete()
    
    print("Complete! All violation data has been removed.")

if __name__ == "__main__":
    clear_violations()

```

### File: backend\create_faculty.py
```python
import sys
import os
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import SystemUser

def create_faculty():
    if not SystemUser.objects.filter(username="faculty").first():
        SystemUser(
            username="faculty", 
            password="faculty", 
            role="faculty", 
            full_name="University Faculty",
            bio="Academic personnel authorized to report student misconduct."
        ).save()
        print("Faculty user 'faculty' created successfully with password 'faculty'.")
    else:
        print("Faculty user 'faculty' already exists.")

if __name__ == "__main__":
    create_faculty()

```

### File: backend\db_dump.txt (Failed to read: 'utf-8' codec can't decode byte 0xff in position 0: invalid start byte)

### File: backend\debug_save.py
```python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student, ViolationReport, ETicket

def debug_creation():
    sid = "2023303188"
    try:
        student = Student.objects.get(student_id=sid)
        print(f"DEBUG: Found {student.name}")
        
        # 1. Create Report
        v = ViolationReport(
            student=student,
            violation_type="Debug Test",
            reporting_guard="Admin",
            status="Approved",
            offense_count=1,
            punishment="5 hours",
        ).save()
        print(f"DEBUG: Saved Report {v.id}")
        
        # 2. Create ETicket
        print("DEBUG: Attempting ETicket save...")
        try:
            t = ETicket(
                violation=v,
                assigned_location="TEST_LOC",
                total_hours_required=5.0,
                remaining_hours=5.0,
                status="Active"
            ).save()
            print(f"DEBUG: SUCCESS! Saved ETicket {t.id}")
        except Exception as e:
            print(f"DEBUG: FAILED TO SAVE ETICKET! Error: {str(e)}")
            
    except Exception as e:
        print(f"DEBUG: CRITICAL ERROR! {str(e)}")

if __name__ == "__main__":
    debug_creation()

```

### File: backend\deep_cleanup.py
```python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

def deep_cleanup():
    print("Starting deep cleanup of Student IDs...")
    all_students = Student.objects.all()
    
    # First pass: Trim all IDs
    print("Normalizing all IDs (trimming whitespace and tabs)...")
    for student in all_students:
        original_id = student.student_id
        cleaned_id = str(original_id).strip()
        if original_id != cleaned_id:
            print(f"Cleaned: '{original_id}' -> '{cleaned_id}'")
            student.student_id = cleaned_id
            try:
                student.save()
            except Exception as e:
                print(f"Could not save {cleaned_id} (likely duplicate): {e}")

    # Second pass: Remove duplicates
    print("Deduplicating...")
    seen_ids = {}
    for student in Student.objects.all():
        sid = student.student_id
        if sid in seen_ids:
            print(f"Removing duplicate for ID: {sid}")
            student.delete()
        else:
            seen_ids[sid] = True

    print("Cleanup complete!")

if __name__ == "__main__":
    deep_cleanup()

```

### File: backend\delete_sample_students.py
```python
import sys
import os
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

print("Looking for sample students...")

# Find students by name
sample_students = Student.objects.filter(name__icontains="sample data")
count = sample_students.count()

if count > 0:
    for student in sample_students:
        print(f"Deleting student: {student.name} (ID: {student.student_id})")
        student.delete()
    print(f"Successfully deleted {count} sample student(s).")
else:
    print("No students found with 'sample data' in their name.")

```

### File: backend\error.html (Failed to read: 'utf-8' codec can't decode byte 0xff in position 0: invalid start byte)

### File: backend\final_cleanup.py
```python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

def final_deduplicate():
    print("Starting final aggressive deduplication...")
    seen_ids = {}
    deleted_count = 0
    
    # Iterate through all students and enforce trimmed ID uniqueness
    for student in Student.objects.all():
        # Normalize: convert to string, remove tabs, spaces, and other whitespace
        clean_id = str(student.student_id).strip()
        
        if clean_id in seen_ids:
            print(f"DELETING DUPLICATE: Student {student.name} with ID variant '{student.student_id}'")
            student.delete()
            deleted_count += 1
        else:
            # If the ID was dirty but unique, fix it
            if student.student_id != clean_id:
                print(f"FIXING ID: '{student.student_id}' -> '{clean_id}'")
                student.student_id = clean_id
                student.save()
            seen_ids[clean_id] = True

    print(f"Cleanup finished. Removed {deleted_count} duplicates.")

if __name__ == "__main__":
    final_deduplicate()

```

### File: backend\fix_duplicates.py
```python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

def remove_duplicates():
    print("Checking for duplicate student records...")
    all_students = Student.objects.all()
    seen_ids = set()
    duplicates_removed = 0

    for student in all_students:
        if student.student_id in seen_ids:
            print(f"Removing duplicate: {student.student_id} ({student.name})")
            student.delete()
            duplicates_removed += 1
        else:
            seen_ids.add(student.student_id)

    print(f"Cleanup complete. Removed {duplicates_removed} duplicate records.")

if __name__ == "__main__":
    remove_duplicates()

```

### File: backend\fix_users.py
```python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import SystemUser, Student

def fix_users():
    print("Fixing users...")
    
    # Ensure all key roles exist
    users = [
        {"username": "admin", "password": "admin", "role": "admin", "full_name": "System Admin"},
        {"username": "staff", "password": "staff", "role": "admin", "full_name": "Staff Personnel"},
        {"username": "guard", "password": "guard", "role": "guard", "full_name": "Gate Guard"},
        {"username": "faculty", "password": "faculty", "role": "faculty", "full_name": "University Faculty"},
    ]
    
    for u in users:
        # Find OR Update
        user = SystemUser.objects.filter(username=u["username"]).first()
        if not user:
            print(f"Creating user: {u['username']}")
            SystemUser(**u).save()
        else:
            print(f"User {u['username']} already exists. Ensuring correct role/password.")
            user.role = u["role"]
            user.password = u["password"]
            user.save()

    # Create test students if missing
    students = [
        {"id": "2023303188", "name": "Vincent Dagaraga"},
        {"id": "2023303189", "name": "Mark Tajeros"},
        {"id": "2023303199", "name": "Nyko Quezon"},
        {"id": "2023303179", "name": "Christian James Ambongan"},
        {"id": "2023303178", "name": "Dominic Wacan"}
    ]
    
    for s in students:
        student = Student.objects.filter(student_id=s["id"]).first()
        if not student:
            print(f"Creating student: {s['id']}")
            Student(student_id=s["id"], name=s["name"], course="BSIT", department="CITC").save()

    print("Complete! All accounts are now active.")

if __name__ == "__main__":
    fix_users()

```

### File: backend\list_marks.py
```python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

def list_marks():
    print("Listing all students with name Mark Tajeros:")
    marks = Student.objects.filter(name__icontains="Mark Tajeros")
    for m in marks:
        print(f"ID: {m.student_id} | Name: {m.name} | Year: {m.year_level} | DocID: {m.id}")

if __name__ == "__main__":
    list_marks()

```

### File: backend\manage.py
```python
#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

```

### File: backend\name_cleanup.py
```python
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

def name_cleanup():
    print("Starting name-based deduplication...")
    seen_names = {}
    deleted_count = 0
    
    for student in Student.objects.all():
        name = str(student.name).strip().lower()
        if name in seen_names:
            print(f"DELETING DUPLICATE NAME: {student.name} (ID: {student.student_id})")
            student.delete()
            deleted_count += 1
        else:
            seen_names[name] = True

    print(f"Cleanup finished. Removed {deleted_count} duplicate names.")

if __name__ == "__main__":
    name_cleanup()

```

### File: backend\Procfile
```
web: gunicorn osaconnect_backend.wsgi

```

### File: backend\requirements.txt
```txt
django
djangorestframework
django-cors-headers
pymongo
mongoengine
python-dotenv
cryptography
djangorestframework-simplejwt
django-rest-framework-mongoengine
gunicorn
whitenoise
dj-database-url
dnspython
certifi

```

### File: backend\seed.py
```python
import mongoengine
import datetime
import random

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import certifi

# Connect to MongoDB using URI from environment or settings
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/OSAConnect_deploymenttest')
print(f"Connecting to: {MONGODB_URI}")
mongoengine.disconnect()
# Use most permissive settings to bypass local handshake errors for seeding
mongoengine.connect(host=MONGODB_URI, tlsAllowInvalidCertificates=True)

from core.models import Student, ViolationReport, ETicket, TimeLog, SystemUser

def seed_data():
    print("Seeding database...")
    
    # Clear existing data
    Student.objects.all().delete()
    ViolationReport.objects.all().delete()
    ETicket.objects.all().delete()
    TimeLog.objects.all().delete()
    SystemUser.objects.all().delete()

    # Create Students
    Student(student_id="2023303188", name="Vincent Dagaraga", contact_number="09358541420", email="vinsdagaraga@gmail.com", course="BSIT", department="CITC").save()
    Student(student_id="2023303189", name="Mark Tajeros", contact_number="09358731470", email="marktajeros@gmail.com", course="BSIT", department="CITC").save()
    Student(student_id="2023303199", name="Nyko Quezon", contact_number="09356782310", email="nykoquezon@gmail.com", course="BSIT", department="CITC").save()
    Student(student_id="2023303179", name="Christian James Ambongan", contact_number="09356730509", email="cjambongan@gmail.com", course="BSIT", department="CITC").save()
    Student(student_id="2023303178", name="Dominic Wacan", contact_number="09358359302", email="dominicwacan@gmail.com", course="BSIT", department="CITC").save()

    # Create System Users
    SystemUser(username="admin", password="admin", role="admin").save()
    SystemUser(username="guard", password="guard", role="guard").save()

    print("Success! Database seeded with 5 real students, 1 staff admin, and 1 guard.")


if __name__ == "__main__":
    seed_data()

```

### File: backend\seed_students.py
```python
import os
import django
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')
django.setup()

from core.models import Student

print("Deleting all existing students in the database...")
Student.objects.all().delete()

students_data = [
    {
        "student_id": "2023303188",
        "name": "Vincent Dagaraga",
        "contact_number": "09358541420",
        "email": "vinsdagaraga@gmail.com",
        "course": "BSIT",
        "department": "CITC"
    },
    {
        "student_id": "2023303189",
        "name": "Mark Tajeros",
        "contact_number": "09358731470",
        "email": "marktajeros@gmail.com",
        "course": "BSIT",
        "department": "CITC"
    },
    {
        "student_id": "2023303199",
        "name": "Nyko Quezon",
        "contact_number": "09356782310",
        "email": "nykoquezon@gmail.com",
        "course": "BSIT",
        "department": "CITC"
    },
    {
        "student_id": "2023303179",
        "name": "Christian James Ambongan",
        "contact_number": "09356730509",
        "email": "cjambongan@gmail.com",
        "course": "BSIT",
        "department": "CITC"
    },
    {
        "student_id": "2023303178",
        "name": "Dominic Wacan",
        "contact_number": "09358359302",
        "email": "dominicwacan@gmail.com",
        "course": "BSIT",
        "department": "CITC"
    }
]

for idx, sd in enumerate(students_data):
    try:
        Student(**sd).save()
        print(f"[{idx+1}/5] Created student record for: {sd['name']} (ID: {sd['student_id']})")
    except Exception as e:
        print(f"Failed to create {sd['name']}: {str(e)}")

print("\nDatabase reset complete. All new students successfully stored!")

```

### File: backend\test_api.py
```python
import urllib.request
import urllib.error
import json

try:
    req = urllib.request.Request(
        'http://localhost:8000/api/timelogs/log_time/', 
        data=json.dumps({"eticket_id": "69a4645bc29d5240bf3de5c1", "action": "in"}).encode('utf-8'),
        method='POST',
        headers={'Content-Type': 'application/json'}
    )
    response = urllib.request.urlopen(req)
    print(response.read().decode())
except urllib.error.HTTPError as e:
    import re
    html = e.read().decode('utf-8')
    m = re.search(r'<pre class="exception_value">(.*?)</pre>', html)
    if m:
        print("EXCEPTION IS:", m.group(1))
    else:
        print("COULD NOT EXTRACT EXCEPTION. HTML START:")
        print(html[:1000])

```

### File: backend\core\admin.py
```python
from django.contrib import admin

# Register your models here.

```

### File: backend\core\admin_views.py
```python
from django.shortcuts import render
from django.http import HttpResponseRedirect
from django.contrib import messages
from .models import Student, ViolationReport, ETicket, TimeLog

def admin_index(request):
    """Admin dashboard - shows overview statistics"""
    student_count = Student.objects.count()
    violation_count = ViolationReport.objects.count()
    eticket_count = ETicket.objects.count()
    timelog_count = TimeLog.objects.count()

    context = {
        'student_count': student_count,
        'violation_count': violation_count,
        'eticket_count': eticket_count,
        'timelog_count': timelog_count,
    }

    return render(request, 'admin/index.html', context)

def all_students(request):
    """View all students registered in the system"""
    students = Student.objects.all()
    context = {
        'students': students,
    }
    return render(request, 'admin/students.html', context)

def student_detail(request, student_id):
    """View details of a specific student"""
    student = Student.objects.get(student_id=student_id)
    violations = ViolationReport.objects.filter(student=student)
    context = {
        'student': student,
        'violations': violations,
    }
    return render(request, 'admin/student_detail.html', context)
    
```

### File: backend\core\apps.py
```python
from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = 'core'

```

### File: backend\core\models.py
```python
from mongoengine import Document, StringField, DateTimeField, IntField, ReferenceField, EnumField, FloatField, BooleanField
import datetime
from enum import Enum

class ViolationStatus(Enum):
    PENDING = "Pending OSA Review"
    APPROVED = "Approved"
    DISMISSED = "Dismissed"

class ETicketStatus(Enum):
    ACTIVE = "Active"
    ONGOING = "Ongoing"
    COMPLETED = "Completed"
    CLEARED = "Cleared"
    FINISHED = "Finished"

class Student(Document):
    student_id = StringField(required=True, unique=True)
    name = StringField(required=True)
    course = StringField()
    department = StringField()
    year_level = StringField()
    contact_number = StringField()
    email = StringField()
    qr_data = StringField()
    meta = {'collection': 'students'}

class ViolationReport(Document):
    student = ReferenceField(Student, required=True)
    violation_type = StringField(required=True)
    description = StringField()
    reporting_guard = StringField(required=True)
    status = StringField(default=ViolationStatus.PENDING.value)
    offense_count = IntField(default=1)
    punishment = StringField()
    created_at = DateTimeField(default=datetime.datetime.now)
    meta = {'collection': 'violation_reports'}

class ETicket(Document):
    violation = ReferenceField(ViolationReport, required=True)
    assigned_location = StringField(required=True)
    total_hours_required = FloatField(required=True)
    remaining_hours = FloatField(required=True)
    status = StringField(default=ETicketStatus.ACTIVE.value)
    lat = FloatField() # Allowed Geofence Lat
    lng = FloatField() # Allowed Geofence Lng
    radius = FloatField(default=100.0) # Allowed Radius in Meters
    created_at = DateTimeField(default=datetime.datetime.now)
    meta = {'collection': 'etickets'}

class TimeLog(Document):
    eticket = ReferenceField(ETicket, required=True)
    time_in = DateTimeField(default=datetime.datetime.now)
    time_out = DateTimeField()
    duration_seconds = FloatField()
    meta = {'collection': 'timelogs'}

class SystemUser(Document):
    username = StringField(required=True, unique=True)
    password = StringField(required=True) # In production, this should be hashed!
    full_name = StringField(default="OSA Administrator")
    bio = StringField(default="University of Science and Technology of Southern Philippines Personnel")
    role = StringField(required=True, choices=['admin', 'guard', 'student', 'staff', 'faculty'])
    meta = {'collection': 'system_users'}

```

### File: backend\core\serializers.py
```python
from rest_framework_mongoengine import serializers
from .models import Student, ViolationReport, ETicket, TimeLog, SystemUser
from datetime import datetime

class StudentSerializer(serializers.DocumentSerializer):
    class Meta:
        model = Student
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        return data

class ViolationReportSerializer(serializers.DocumentSerializer):
    student_details = StudentSerializer(source='student', read_only=True)
    class Meta:
        model = ViolationReport
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        return data

class ETicketSerializer(serializers.DocumentSerializer):
    class Meta:
        model = ETicket
        fields = '__all__'
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # 1. Map ID properly
        data['id'] = str(instance.id)
        if hasattr(instance, 'violation') and instance.violation:
            data['violation'] = str(instance.violation.id)

        # 2. Dynamic Hour Calculation
        if instance.status == 'Ongoing':
            try:
                from core.models import TimeLog
                from datetime import datetime
                open_log = TimeLog.objects.filter(eticket=instance, time_out=None).first()
                if open_log and open_log.time_in:
                    elapsed = (datetime.now() - open_log.time_in).total_seconds() / 3600
                    data['remaining_hours'] = max(0, instance.remaining_hours - elapsed)
            except: pass

        # 3. Violation Details Mapping (Manual Dereference)
        try:
            v_ref = instance.violation
            if v_ref:
                # Ensure we have the full document if it's a lazy reference
                if hasattr(v_ref, '_get_current_object'):
                    v_ref = v_ref._get_current_object()
                
                s_ref = v_ref.student
                if s_ref and hasattr(s_ref, '_get_current_object'):
                    s_ref = s_ref._get_current_object()

                data['violation_details'] = {
                    'id': str(v_ref.id),
                    'violation_type': v_ref.violation_type,
                    'status': v_ref.status,
                    'punishment': v_ref.punishment,
                    'student_details': {
                        'student_id': s_ref.student_id if s_ref else "Unknown",
                        'name': s_ref.name if s_ref else "Unknown",
                        'id': str(s_ref.id) if s_ref else "Unknown"
                    }
                }
        except Exception as e:
            print(f"SERIALIZER ERROR: {str(e)}")
            data['violation_details'] = None
            
        return data

class TimeLogSerializer(serializers.DocumentSerializer):
    class Meta:
        model = TimeLog
        fields = '__all__'

class SystemUserSerializer(serializers.DocumentSerializer):
    class Meta:
        model = SystemUser
        fields = ['username', 'password', 'role', 'full_name', 'bio']
        extra_kwargs = {
            'password': {'write_only': True}
        }

```

### File: backend\core\tests.py
```python
from django.test import TestCase

# Create your tests here.

```

### File: backend\core\urls.py
```python
from django.urls import path, include
from rest_framework_mongoengine import routers
from .views import StudentViewSet, ViolationViewSet, ETicketViewSet, TimeLogViewSet, SystemUserViewSet, login_view, health_check

router = routers.DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'violations', ViolationViewSet, basename='violation')
router.register(r'etickets', ETicketViewSet, basename='eticket')
router.register(r'timelogs', TimeLogViewSet, basename='timelog')
router.register(r'users', SystemUserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', login_view, name='login'),
    path('health/', health_check, name='health'),
]

```

### File: backend\core\views.py
```python
from rest_framework_mongoengine import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import Student, ViolationReport, ETicket, TimeLog, SystemUser
from .serializers import StudentSerializer, ViolationReportSerializer, ETicketSerializer, TimeLogSerializer
import datetime

import os



@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate user against SystemUser or Student collection"""
    username = request.data.get('username', '').lower().strip()
    password = request.data.get('password')
    
    if not username or not password:
        return Response({"error": "Username and password required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # First check SystemUser (admin, guard, staff)
    try:
        # AUTO-SEED PROTECTION: If DB is empty, create admin so they can log in
        from core.models import Student
        if SystemUser.objects.count() == 0:
            print("LOGIN: Empty DB detected, auto-seeding...")
            SystemUser(username="admin", password="admin", role="admin", full_name="System Admin").save()
            SystemUser(username="guard", password="guard", role="guard", full_name="Gate Guard").save()
            SystemUser(username="faculty", password="faculty", role="faculty", full_name="University Faculty").save()
            # Add initial students for the live environment
            initial_students = [
                {"id": "2023303188", "name": "Vincent Dagaraga", "contact": "09358541420", "email": "vinsdagaraga@gmail.com"},
                {"id": "2023303189", "name": "Mark Tajeros", "contact": "09358731470", "email": "marktajeros@gmail.com"},
                {"id": "2023303199", "name": "Nyko Quezon", "contact": "09356782310", "email": "nykoquezon@gmail.com"},
                {"id": "2023303179", "name": "Christian James Ambongan", "contact": "09356730509", "email": "cjambongan@gmail.com"},
                {"id": "2023303178", "name": "Dominic Wacan", "contact": "09358359302", "email": "dominicwacan@gmail.com"}
            ]
            for s in initial_students:
                # UPSERT: Find existing or create new
                student = Student.objects.filter(student_id=s["id"]).first()
                if not student:
                    student = Student(student_id=s["id"])
                
                # Always update fields to match latest seed data
                student.name = s["name"]
                student.course = "BSIT"
                student.department = "CITC"
                student.contact_number = s.get("contact", "")
                student.email = s.get("email", "")
                student.save()

        user = SystemUser.objects.get(username=username)
        if user.password == password:
            return Response({
                "success": True,
                "role": user.role,
                "username": user.username,
                "full_name": user.full_name,
                "bio": user.bio
            })
        else:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    except SystemUser.DoesNotExist:
        pass
    
    # Then check Student collection
    try:
        student = Student.objects.get(student_id=username)
        # For students, use a simple password check (in production, use proper hashing)
        if student.student_id == password or password == student.student_id:
            return Response({
                "success": True,
                "role": "student",
                "username": student.student_id,
                "student_id": student.student_id,
                "name": student.name
            })
        else:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    except Student.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class StudentViewSet(viewsets.ModelViewSet):
    lookup_field = 'student_id'
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        data = request.data
        sid = data.get('student_id', '').strip()
        name = data.get('name', '').strip()

        if sid and Student.objects.filter(student_id=sid).first():
            return Response({"error": f"Student ID '{sid}' is already in use."}, status=status.HTTP_400_BAD_REQUEST)
        
        if name and Student.objects.filter(name__iexact=name).first():
            return Response({"error": f"A student named '{name}' is already registered."}, status=status.HTTP_400_BAD_REQUEST)
            
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        try:
            student = self.get_object()
            data = request.data
            
            # 1. Validate Name Uniqueness if changing
            new_name = data.get('name', '').strip()
            if new_name and new_name.lower() != student.name.lower():
                if Student.objects.filter(name__iexact=new_name).first():
                    return Response({"error": f"A student named '{new_name}' is already registered."}, status=status.HTTP_400_BAD_REQUEST)
                student.name = new_name

            # 2. Validate Student ID Uniqueness if changing
            new_student_id = data.get('student_id', '').strip()
            if new_student_id and new_student_id != student.student_id:
                if Student.objects.filter(student_id=new_student_id).first():
                    return Response({"error": f"Student ID '{new_student_id}' is already in use."}, status=status.HTTP_400_BAD_REQUEST)
                student.student_id = new_student_id

            student.course = data.get('course', student.course)
            student.department = data.get('department', student.department)
            student.year_level = data.get('year_level', student.year_level)
            student.email = data.get('email', student.email)
            student.contact_number = data.get('contact_number', student.contact_number)
            
            student.save()
            serializer = self.get_serializer(student)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

PUNISHMENT_SYSTEM = {
    "No ID": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "Improper wearing of ID": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "Dress code violation": {
        1: {"punishment": "3 hours community service", "hours": 3},
        2: {"punishment": "5 hours community service", "hours": 5},
        3: {"punishment": "10 hours community service", "hours": 10},
    },
    "Littering": {
        1: {"punishment": "2 hours campus cleaning", "hours": 2},
        2: {"punishment": "4 hours community service", "hours": 4},
    },
    "Disrespect to staff": {
        1: {"punishment": "8 hours community service", "hours": 8},
        2: {"punishment": "1 to 2 days community service", "hours": 16},
    },
    "Public disturbance": {
        1: {"punishment": "6 hours community service", "hours": 6},
    },
    "Unauthorized use of facilities": {
        1: {"punishment": "1 day community service + payment for damages if needed", "hours": 8},
    },
    "Cheating": {
        1: {"punishment": "2 to 3 days community service + academic sanction from instructor", "hours": 20},
    },
    "Forgery of signature": {
        1: {"punishment": "2 to 5 days community service + possible disciplinary hearing", "hours": 32},
    },
    "Vandalism": {
        1: {"punishment": "3 to 5 days community service + payment for damages", "hours": 32},
    },
    "Smoking inside campus": {
        1: {"punishment": "1 day community service + seminar on campus rules", "hours": 8},
    },
    "Serious misconduct": {
        1: {"punishment": "Disciplinary hearing + possible suspension", "hours": 0},
    },
}

def get_offense_count(student, violation_type):
    """Count how many times this student has committed this violation type"""
    count = ViolationReport.objects.filter(
        student=student,
        violation_type=violation_type
    ).count()
    return count + 1  # +1 because this is the current offense

def get_punishment(violation_type, offense_count):
    """Get the punishment based on violation type and offense count"""
    if violation_type in PUNISHMENT_SYSTEM:
        violation_punishments = PUNISHMENT_SYSTEM[violation_type]
        if offense_count in violation_punishments:
            return violation_punishments[offense_count]
        # If offense count exceeds defined punishments, use the last one
        return list(violation_punishments.values())[-1]
    # Default punishment for undefined violations
    return {"punishment": "To be determined", "hours": 4}

class ViolationViewSet(viewsets.ModelViewSet):
    queryset = ViolationReport.objects.all()
    serializer_class = ViolationReportSerializer
    permission_classes = [AllowAny]


    @action(detail=False, methods=['get'])
    def analytics(self, request):
        from collections import Counter
        all_violations = ViolationReport.objects.all()
        counts = Counter(v.violation_type for v in all_violations)
        sorted_data = sorted(
            [{"violation_type": k, "count": v} for k, v in counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )
        return Response(sorted_data)
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        data = request.data
        student_ids = data.get('student_ids', [])
        violation_type = data.get('violation', 'Other')
        custom_hours = data.get('hours')
        reporter = data.get('reporter', 'OSA Administrator')
        
        if not student_ids:
            return Response({"error": "No students selected"}, status=status.HTTP_400_BAD_REQUEST)
            
        results = []
        for sid in student_ids:
            try:
                student = Student.objects.get(student_id=sid)
                offense_count = get_offense_count(student, violation_type)
                
                # Robust hour parsing
                hours = 0
                custom_hours_raw = data.get('hours', '')
                try:
                    if custom_hours_raw is not None and str(custom_hours_raw).strip():
                        hours = float(custom_hours_raw)
                except (ValueError, TypeError):
                    hours = 0
                
                # If hours is still 0 (or empty), use the standard system punishment
                if hours <= 0:
                    punishment_info = get_punishment(violation_type, offense_count)
                    punishment = punishment_info["punishment"]
                    hours = punishment_info["hours"]
                else:
                    punishment = f"{hours} hours community service (Bulk Report)"
                
                print(f"--- BULK REPORT DEBUG ---")
                print(f"Student: {sid} | Violation: {violation_type} | Count: {offense_count}")
                print(f"Raw Hours Input: '{custom_hours_raw}'")
                print(f"Final Hours Calculated: {hours}")
                print(f"Final Punishment: {punishment}")
                print(f"--------------------------")

                report = ViolationReport(
                    student=student,
                    violation_type=violation_type,
                    description=data.get('description', f"Bulk report for {violation_type}"),
                    reporting_guard=reporter,
                    status="Approved", # Bulk admin reports are usually pre-approved
                    offense_count=offense_count,
                    punishment=punishment,
                    created_at=datetime.datetime.now()
                ).save()
                
                # Create ETicket automatically for bulk reports if hours > 0
                if hours > 0:
                    ETicket(
                        violation=report,
                        assigned_location="Campus Grounds / Events",
                        total_hours_required=hours,
                        remaining_hours=hours,
                        status="Active",
                        lat=data.get('lat'),
                        lng=data.get('lng'),
                        radius=data.get('radius', 100.0)
                    ).save()
                    
                results.append({"student_id": sid, "status": "success"})
            except Student.DoesNotExist:
                results.append({"student_id": sid, "status": "failed", "error": "Student not found"})
            except Exception as e:
                results.append({"student_id": sid, "status": "failed", "error": str(e)})
                
        return Response({"results": results}, status=status.HTTP_201_CREATED)

    def create(self, request, *args, **kwargs):
        data = request.data
        print(f"--- DATABASE SYNC: PREPARING VIOLATION REPORT ---")
        print(f"Payload: {data}")
        
        student_id = data.get('student_id')
        if not student_id:
            # Fallback for old field name just in case
            student_id = data.get('studentId')
            
        if not student_id:
            return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. ORM: Find or Create Student to ensure link exists
        try:
            student = Student.objects.get(student_id=student_id)
            print(f"DB MATCH: Existing student record found: {student.name}")
        except Student.DoesNotExist:
            # CHECK FOR DUPLICATE NAME (Prevent duplicate accounts for same person with different ID)
            provided_name = data.get('name', 'New Student').strip()
            # Normalize ID as well just in case
            student_id = student_id.strip()
            
            existing_student_by_name = Student.objects.filter(name__iexact=provided_name).first()
            
            if existing_student_by_name:
                print(f"DB LINK: Student {provided_name} exists under different ID. Linking report to existing account.")
                student = existing_student_by_name
            else:
                print(f"DB SYNC: Creating missing student profile for {student_id}...")
                student = Student(
                    student_id=student_id,
                    name=provided_name,
                    course=data.get('course', 'Unknown'),
                    department=data.get('department', 'Unknown'),
                    contact_number=data.get('contact', ''),
                    email=data.get('email', '')
                ).save()
                print(f"DB SUCCESS: New student registered: {student.name}")
            
        # 2. Calculate offense count and punishment
        violation_type = data.get('violation', 'Other')
        offense_count = get_offense_count(student, violation_type)
        punishment_info = get_punishment(violation_type, offense_count)
        
        # All violations now require Pending OSA Review (warnings replaced with community service hours)
        violation_status = "Pending OSA Review"
        notification_type = "action_required"
        
        # 3. ODM: Directly instantiate and save the ViolationReport to 'violation_reports' collection
        try:
            # We save directly using Mongoengine to bypass any potential Serializer mapping issues
            report = ViolationReport(
                student=student,
                violation_type=violation_type,
                description=data.get('description', ''),
                reporting_guard=data.get('reporting_guard', 'Gate Guard'),
                status=violation_status,
                offense_count=offense_count,
                punishment=punishment_info["punishment"],
                created_at=datetime.datetime.now()
            )
            report.save()
            
            print(f"DB SYNC SUCCESS: Violation {report.id} committed to collection 'violation_reports'")
            print(f"Offense #{offense_count} for {violation_type}: {punishment_info['punishment']}")
            
            # 4. Return serialized data so the frontend can update UI
            response_data = self.get_serializer(report).data
            response_data["offense_count"] = offense_count
            response_data["punishment"] = punishment_info["punishment"]
            response_data["notification_type"] = notification_type
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"DB SYNC FAILED: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def approve(self, request, *args, **kwargs):
        try:
            violation_id = kwargs.get('id') or kwargs.get('pk')
            violation = ViolationReport.objects.get(id=violation_id)
            
            if violation.status == "Approved" or violation.status == "Completed":
                return Response({"error": "Violation is already approved or completed."}, status=status.HTTP_400_BAD_REQUEST)

            violation.status = "Approved"
            violation.save()
            
            # Get the actual punishment hours from the violation's offense count
            punishment_info = get_punishment(violation.violation_type, violation.offense_count)
            hours = punishment_info["hours"]
            
            # Only create E-Ticket if there are hours to serve
            if hours > 0:
                violation.status = "Approved"
                violation.save()
                ticket = ETicket(
                    violation=violation,
                    assigned_location="Campus Grounds / Library",
                    total_hours_required=hours,
                    remaining_hours=hours,
                    status="Active"
                ).save()
                print(f"Violation {violation_id} APPROVED. E-Ticket {ticket.id} created with {hours} hours.")
                return Response({"message": f"Violation Approved. E-Ticket created with {hours} hours."}, status=status.HTTP_200_OK)
            
            violation.status = "Completed"
            violation.save()
            print(f"Violation {violation_id} COMPLETED. No E-Ticket needed.")
            return Response({"message": f"Violation Marked as Completed. No service hours required."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def dismiss(self, request, *args, **kwargs):
        try:
            violation_id = kwargs.get('id') or kwargs.get('pk')
            violation = ViolationReport.objects.get(id=violation_id)
            violation.status = "Dismissed"
            violation.save()
            print(f"Violation {violation_id} DISMISSED.")
            return Response({"message": "Violation Dismissed."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ETicketViewSet(viewsets.ModelViewSet):
    queryset = ETicket.objects.all()
    serializer_class = ETicketSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return ETicket.objects.all()

    @action(detail=False, methods=['post'])
    def manual_time_in(self, request):
        """Admin can manually force time in for a student using a code"""
        student_id = request.data.get('student_id')
        code = request.data.get('code', '').upper()

        valid_codes = ['OSA-START', 'OSA-RESUME', 'OSA-IN']

        if code not in valid_codes:
            return Response({"error": "Invalid code. Use OSA-START to begin service."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Find the student
            student = Student.objects.get(student_id=student_id)

            # Find the student's active ticket
            ticket = None
            for t in ETicket.objects.all():
                try:
                    if t.violation.student.student_id == student_id and t.status in ['Active', 'Ongoing']:
                        ticket = t
                        break
                except:
                    pass

            if not ticket:
                return Response({"error": "No active E-Ticket found for this student"}, status=status.HTTP_404_NOT_FOUND)

            # Check if timer already running
            open_log = TimeLog.objects.filter(eticket=ticket, time_out=None).first()
            if open_log:
                return Response({"error": "Timer already running for this student"}, status=status.HTTP_400_BAD_REQUEST)

            # Close any existing open time logs first
            open_logs = TimeLog.objects.filter(eticket=ticket, time_out=None)
            for log in open_logs:
                log.time_out = datetime.datetime.now()
                duration = (log.time_out - log.time_in).total_seconds()
                log.duration_seconds = duration
                log.save()
                ticket.remaining_hours = max(0, ticket.remaining_hours - (duration / 3600))
                
                if ticket.remaining_hours <= 0.001:
                    ticket.remaining_hours = 0
                    ticket.status = "Finished"
                    ticket.violation.status = "Finished"
                    ticket.violation.save()

            if ticket.remaining_hours > 0:
                # Start timer - use remaining hours from ticket
                ticket.status = "Ongoing"
                ticket.save()
                # Create a new time log
                log = TimeLog(eticket=ticket).save()
            else:
                ticket.save()

            return Response({
                "message": f"Timer started for student {student_id}",
                "remaining_hours": ticket.remaining_hours,
                "status": ticket.status
            })

        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def manual_time_out(self, request):
        """Admin can manually force time out for a student"""
        student_id = request.data.get('student_id')

        try:
            # Find the student
            student = Student.objects.get(student_id=student_id)

            # Find the student's ongoing ticket
            ticket = None
            for t in ETicket.objects.all():
                try:
                    if t.violation.student.student_id == student_id and t.status == 'Ongoing':
                        ticket = t
                        break
                except:
                    pass

            if not ticket:
                return Response({"error": "No active timer found for this student"}, status=status.HTTP_404_NOT_FOUND)

            # Find and close the open time log
            open_log = TimeLog.objects.filter(eticket=ticket, time_out=None).first()
            if open_log:
                open_log.time_out = datetime.datetime.now()
                duration = (open_log.time_out - open_log.time_in).total_seconds()
                open_log.duration_seconds = duration
                open_log.save()

                # Deduct hours
                hours_to_deduct = duration / 3600
                ticket.remaining_hours = max(0, ticket.remaining_hours - hours_to_deduct)
                
                if ticket.remaining_hours <= 0.001:
                    ticket.remaining_hours = 0
                    ticket.status = "Finished"
                    ticket.violation.status = "Finished"
                    ticket.violation.save()
                else:
                    ticket.status = "Active"
                ticket.save()

            return Response({
                "message": f"Timer stopped for student {student_id}",
                "remaining_hours": ticket.remaining_hours,
                "status": ticket.status
            })

        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TimeLogViewSet(viewsets.ModelViewSet):
    queryset = TimeLog.objects.all()
    serializer_class = TimeLogSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def log_time(self, request):
        eticket_id = request.data.get('eticket_id')
        action_type = request.data.get('action') # 'in' or 'out'
        
        try:
            eticket = ETicket.objects.get(id=eticket_id)
            
            if action_type == 'custom':
                hours = float(request.data.get('deduct_hours', 0))
                eticket.remaining_hours = max(0, eticket.remaining_hours - hours)
                if eticket.remaining_hours <= 0.01:
                    eticket.remaining_hours = 0
                    eticket.status = "Completed"
                    eticket.violation.status = "Completed"
                    eticket.violation.save()
                eticket.save()
                return Response({"message": f"Successfully deducted {hours} hours!"})

            elif action_type == 'set_start':
                hours = float(request.data.get('deduct_hours', 0))
                
                # Close any existing open time logs for this ticket
                open_logs = TimeLog.objects.filter(eticket=eticket, time_out=None)
                for old_log in open_logs:
                    old_log.time_out = datetime.datetime.now()
                    old_log.duration_seconds = 0  # Don't count old partial sessions
                    old_log.save()
                
                # Set remaining hours to EXACTLY the QR code value
                eticket.remaining_hours = hours
                eticket.status = "Ongoing"
                eticket.save()
                
                # Create a fresh time log for this new session
                log = TimeLog(eticket=eticket).save()
                    
                print(f"SET_START: Timer reset to {hours} hours for ticket {eticket.id}")
                return Response({"message": f"Timer started for {hours} hours!", "hours": hours})

            elif action_type == 'in':
                # Update location if provided (Smart QR)
                lat = request.data.get('lat')
                lng = request.data.get('lng')
                radius = request.data.get('radius')
                
                if lat is not None and lng is not None:
                    eticket.lat = float(lat)
                    eticket.lng = float(lng)
                    eticket.radius = float(radius or 5)
                    eticket.save()

                # Check if there's already an active session
                existing_log = TimeLog.objects.filter(eticket=eticket, time_out=None).first()
                if existing_log:
                    # Timer already running, just return the existing log
                    return Response(TimeLogSerializer(existing_log).data)
                
                # Create new session only if none exists
                log = TimeLog(eticket=eticket).save()
                eticket.status = "Ongoing"
                eticket.save()
                return Response(TimeLogSerializer(log).data)
            else:
                log = TimeLog.objects.filter(eticket=eticket, time_out=None).order_by('-time_in').first()
                if log:
                    log.time_out = datetime.datetime.now()
                    duration = (log.time_out - log.time_in).total_seconds()
                    log.duration_seconds = duration
                    log.save()
                    
                    hours_to_deduct = duration / 3600
                    eticket.remaining_hours = max(0, eticket.remaining_hours - hours_to_deduct)
                    if eticket.remaining_hours <= 0.01:
                        eticket.remaining_hours = 0
                        eticket.status = "Completed"
                        eticket.violation.status = "Completed"
                        eticket.violation.save()
                    else:
                        eticket.status = "Active"
                    eticket.save()
                    
                    return Response(TimeLogSerializer(log).data)
                return Response({"error": "No active session"}, status=status.HTTP_400_BAD_REQUEST)
        except ETicket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

from .serializers import SystemUserSerializer

class SystemUserViewSet(viewsets.ModelViewSet):
    queryset = SystemUser.objects.all()
    serializer_class = SystemUserSerializer
    permission_classes = [AllowAny]
    lookup_field = 'username'

    @action(detail=False, methods=['post'])
    def update_profile(self, request):
        username = request.data.get('username')
        full_name = request.data.get('full_name')
        bio = request.data.get('bio')
        
        try:
            user = SystemUser.objects.get(username=username)
            if full_name: user.full_name = full_name
            if bio: user.bio = bio
            user.save()
            return Response({
                "success": True, 
                "full_name": user.full_name, 
                "bio": user.bio
            })
        except SystemUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        username = request.data.get('username')
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        try:
            user = SystemUser.objects.get(username=username)
            if user.password == old_password:
                user.password = new_password
                user.save()
                return Response({"success": True, "message": "Password updated successfully"})
            return Response({"error": "Incorrect old password"}, status=400)
        except SystemUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Check if the backend and database are connected"""
    try:
        # Check if we can reach the database
        user_count = SystemUser.objects.count()
        
        # AUTO-SEED TRIGGER: If live DB is empty, fill it once!
        if user_count == 0:
            print("HEALTH: Empty DB detected, seeding...")
            # Create Default Users
            SystemUser(username="admin", password="admin", role="admin").save()
            SystemUser(username="guard", password="guard", role="guard").save()
            SystemUser(username="faculty", password="faculty", role="faculty").save()
            # Create Students
            initial_students = [
                {"id": "2023303188", "name": "Vincent Dagaraga", "contact": "09358541420", "email": "vinsdagaraga@gmail.com"},
                {"id": "2023303189", "name": "Mark Tajeros", "contact": "09358731470", "email": "marktajeros@gmail.com"},
                {"id": "2023303199", "name": "Nyko Quezon", "contact": "09356782310", "email": "nykoquezon@gmail.com"},
                {"id": "2023303179", "name": "Christian James Ambongan", "contact": "09356730509", "email": "cjambongan@gmail.com"},
                {"id": "2023303178", "name": "Dominic Wacan", "contact": "09358359302", "email": "dominicwacan@gmail.com"}
            ]
            for s in initial_students:
                # UPSERT: Find existing or create new
                student = Student.objects.filter(student_id=s["id"]).first()
                if not student:
                    student = Student(student_id=s["id"])
                
                # Always update fields to match latest seed data
                student.name = s["name"]
                student.course = "BSIT"
                student.department = "CITC"
                student.contact_number = s.get("contact", "")
                student.email = s.get("email", "")
                student.save()
            user_count = SystemUser.objects.count()

        return Response({
            "status": "healthy", 
            "database": "connected", 
            "users": user_count,
            "seeding": "Success" if user_count > 0 else "Pending"
        })
    except Exception as e:
        return Response({"status": "error", "message": f"Database check failed: {str(e)}"}, status=500)

```

### File: backend\core\__init__.py
```python

```

### File: backend\core\migrations\__init__.py
```python

```

### File: backend\osaconnect_backend\asgi.py
```python
"""
ASGI config for osaconnect_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')

application = get_asgi_application()

```

### File: backend\osaconnect_backend\requirements.txt
```txt
django
djangorestframework
django-cors-headers
pymongo
mongoengine
python-dotenv
cryptography
djangorestframework-simplejwt
django-rest-framework-mongoengine
gunicorn
whitenoise
dj-database-url
dnspython
certifi

```

### File: backend\osaconnect_backend\settings.py
```python
"""
Django settings for osaconnect_backend project.

Generated by 'django-admin startproject' using Django 6.0.2.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/6.0/ref/settings/
"""

from pathlib import Path
import os
import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment from root or backend root
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR.parent / '.env') # Handle /api bridge folder parent loads


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-default-key-change-this')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'osaconnect_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'templates',
            BASE_DIR / '../frontend/dist',
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'osaconnect_backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600
    )
}

# MongoDB Configuration (Mongoengine)
import mongoengine
import certifi

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/OSAConnect_deploymenttest')
MONGODB_URI = MONGODB_URI.strip('"').strip("'")

try:
    mongoengine.connect(
        host=MONGODB_URI,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000
    )
    print("WSGI: Database connected")
except Exception as e:
    print(f"DATABASE ERROR: {e}")

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_ALL_ORIGINS = True # Broaden for dev to be 100% sure

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
# Use the non-manifest version to avoid startup crashes on serverless environments
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

# Include frontend assets in static search
STATICFILES_DIRS = [
    BASE_DIR / '../frontend/dist',
]

```

### File: backend\osaconnect_backend\urls.py
```python
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('api/', include('core.urls')),
    # Serve index.html as root and for any other non-API path
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]

```

### File: backend\osaconnect_backend\wsgi.py
```python
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'osaconnect_backend.settings')

application = get_wsgi_application()
app = application

```

### File: backend\osaconnect_backend\__init__.py
```python

```

### File: frontend\.gitignore
```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```

### File: frontend\eslint.config.js
```js
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]

```

### File: frontend\index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OSA Connect | Service Hub</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

### File: frontend\package.json
```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.13.6",
    "chart.js": "^4.5.1",
    "framer-motion": "^12.34.3",
    "html5-qrcode": "^2.3.8",
    "jspdf": "^4.2.0",
    "jspdf-autotable": "^5.0.7",
    "lucide-react": "^0.575.0",
    "react": "^18.3.1",
    "react-chartjs-2": "^5.3.1",
    "react-dom": "^18.3.1",
    "react-qr-code": "^2.0.18",
    "react-router-dom": "^7.13.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.13.0",
    "@tailwindcss/postcss": "^4.2.1",
    "@tailwindcss/vite": "^4.2.1",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.27",
    "eslint": "^9.13.0",
    "eslint-plugin-react": "^7.37.2",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.14",
    "globals": "^15.11.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.2.1",
    "vite": "^5.4.10"
  }
}

```

### File: frontend\README.md
```md
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

```

### File: frontend\vite.config.js
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Expose to local network (0.0.0.0)
    allowedHosts: ['floppy-seas-post.loca.lt', '.loca.lt'], // Allow localtunnel domains
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: ['.loca.lt'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})

```

### File: frontend\vite.config.js.timestamp-1772451517642-9ecd6542ded67.mjs
```mjs
// vite.config.js
import { defineConfig } from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_test1/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_test1/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_test1/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true,
    // Expose to local network (0.0.0.0)
    allowedHosts: ["floppy-seas-post.loca.lt", ".loca.lt"],
    // Allow localtunnel domains
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  },
  preview: {
    host: true,
    allowedHosts: [".loca.lt"],
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXE9TQUNvbm5lY3RfdGVzdDFcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHZpbmNlXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcT1NBQ29ubmVjdF90ZXN0MVxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdmluY2UvT25lRHJpdmUvRGVza3RvcC9PU0FDb25uZWN0X3Rlc3QxL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcblxuLy8gaHR0cHM6Ly92aXRlLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB0YWlsd2luZGNzcygpLFxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiB0cnVlLCAvLyBFeHBvc2UgdG8gbG9jYWwgbmV0d29yayAoMC4wLjAuMClcbiAgICBhbGxvd2VkSG9zdHM6IFsnZmxvcHB5LXNlYXMtcG9zdC5sb2NhLmx0JywgJy5sb2NhLmx0J10sIC8vIEFsbG93IGxvY2FsdHVubmVsIGRvbWFpbnNcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgcHJldmlldzoge1xuICAgIGhvc3Q6IHRydWUsXG4gICAgYWxsb3dlZEhvc3RzOiBbJy5sb2NhLmx0J10sXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9XG4gICAgfVxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEyVyxTQUFTLG9CQUFvQjtBQUN4WSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFHeEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQTtBQUFBLElBQ04sY0FBYyxDQUFDLDRCQUE0QixVQUFVO0FBQUE7QUFBQSxJQUNyRCxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sY0FBYyxDQUFDLFVBQVU7QUFBQSxJQUN6QixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==

```

### File: frontend\vite.config.js.timestamp-1774669933868-b839540c35148.mjs
```mjs
// vite.config.js
import { defineConfig } from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_testdeploy/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_testdeploy/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_testdeploy/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true,
    // Expose to local network (0.0.0.0)
    allowedHosts: ["floppy-seas-post.loca.lt", ".loca.lt"],
    // Allow localtunnel domains
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  },
  preview: {
    host: true,
    allowedHosts: [".loca.lt"],
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXE9TQUNvbm5lY3RfdGVzdGRlcGxveVxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdmluY2VcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxPU0FDb25uZWN0X3Rlc3RkZXBsb3lcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3ZpbmNlL09uZURyaXZlL0Rlc2t0b3AvT1NBQ29ubmVjdF90ZXN0ZGVwbG95L2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcblxuLy8gaHR0cHM6Ly92aXRlLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB0YWlsd2luZGNzcygpLFxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiB0cnVlLCAvLyBFeHBvc2UgdG8gbG9jYWwgbmV0d29yayAoMC4wLjAuMClcbiAgICBhbGxvd2VkSG9zdHM6IFsnZmxvcHB5LXNlYXMtcG9zdC5sb2NhLmx0JywgJy5sb2NhLmx0J10sIC8vIEFsbG93IGxvY2FsdHVubmVsIGRvbWFpbnNcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgcHJldmlldzoge1xuICAgIGhvc3Q6IHRydWUsXG4gICAgYWxsb3dlZEhvc3RzOiBbJy5sb2NhLmx0J10sXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9XG4gICAgfVxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEwWCxTQUFTLG9CQUFvQjtBQUN2WixPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFHeEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQTtBQUFBLElBQ04sY0FBYyxDQUFDLDRCQUE0QixVQUFVO0FBQUE7QUFBQSxJQUNyRCxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sY0FBYyxDQUFDLFVBQVU7QUFBQSxJQUN6QixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==

```

### File: frontend\vite.config.js.timestamp-1775008831862-b6b47b4d1fb6f.mjs
```mjs
// vite.config.js
import { defineConfig } from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_testdeploy/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_testdeploy/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_testdeploy/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
var vite_config_default = defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true,
    // Expose to local network (0.0.0.0)
    allowedHosts: ["floppy-seas-post.loca.lt", ".loca.lt"],
    // Allow localtunnel domains
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  },
  preview: {
    host: true,
    allowedHosts: [".loca.lt"],
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXE9TQUNvbm5lY3RfdGVzdGRlcGxveVxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdmluY2VcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxPU0FDb25uZWN0X3Rlc3RkZXBsb3lcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3ZpbmNlL09uZURyaXZlL0Rlc2t0b3AvT1NBQ29ubmVjdF90ZXN0ZGVwbG95L2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcblxuLy8gaHR0cHM6Ly92aXRlLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBiYXNlOiBcIi9cIixcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgdGFpbHdpbmRjc3MoKSxcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogdHJ1ZSwgLy8gRXhwb3NlIHRvIGxvY2FsIG5ldHdvcmsgKDAuMC4wLjApXG4gICAgYWxsb3dlZEhvc3RzOiBbJ2Zsb3BweS1zZWFzLXBvc3QubG9jYS5sdCcsICcubG9jYS5sdCddLCAvLyBBbGxvdyBsb2NhbHR1bm5lbCBkb21haW5zXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHByZXZpZXc6IHtcbiAgICBob3N0OiB0cnVlLFxuICAgIGFsbG93ZWRIb3N0czogWycubG9jYS5sdCddLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgfVxuICAgIH1cbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFgsU0FBUyxvQkFBb0I7QUFDdlosT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBR3hCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUE7QUFBQSxJQUNOLGNBQWMsQ0FBQyw0QkFBNEIsVUFBVTtBQUFBO0FBQUEsSUFDckQsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLGNBQWMsQ0FBQyxVQUFVO0FBQUEsSUFDekIsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=

```

### File: frontend\vite.config.js.timestamp-1776093959901-ccfd667632ccb.mjs
```mjs
// vite.config.js
import { defineConfig } from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_testdeploy/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_testdeploy/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/vince/OneDrive/Desktop/OSAConnect_testdeploy/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
var vite_config_default = defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true,
    // Expose to local network (0.0.0.0)
    allowedHosts: ["floppy-seas-post.loca.lt", ".loca.lt"],
    // Allow localtunnel domains
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  },
  preview: {
    host: true,
    allowedHosts: [".loca.lt"],
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5jZVxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXE9TQUNvbm5lY3RfdGVzdGRlcGxveVxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdmluY2VcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxPU0FDb25uZWN0X3Rlc3RkZXBsb3lcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3ZpbmNlL09uZURyaXZlL0Rlc2t0b3AvT1NBQ29ubmVjdF90ZXN0ZGVwbG95L2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcblxuLy8gaHR0cHM6Ly92aXRlLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBiYXNlOiBcIi9cIixcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgdGFpbHdpbmRjc3MoKSxcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogdHJ1ZSwgLy8gRXhwb3NlIHRvIGxvY2FsIG5ldHdvcmsgKDAuMC4wLjApXG4gICAgYWxsb3dlZEhvc3RzOiBbJ2Zsb3BweS1zZWFzLXBvc3QubG9jYS5sdCcsICcubG9jYS5sdCddLCAvLyBBbGxvdyBsb2NhbHR1bm5lbCBkb21haW5zXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHByZXZpZXc6IHtcbiAgICBob3N0OiB0cnVlLFxuICAgIGFsbG93ZWRIb3N0czogWycubG9jYS5sdCddLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgfVxuICAgIH1cbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFgsU0FBUyxvQkFBb0I7QUFDdlosT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBR3hCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUE7QUFBQSxJQUNOLGNBQWMsQ0FBQyw0QkFBNEIsVUFBVTtBQUFBO0FBQUEsSUFDckQsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLGNBQWMsQ0FBQyxVQUFVO0FBQUEsSUFDekIsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=

```

### File: frontend\public\vite.svg
```svg
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>
```

### File: frontend\src\api.js
```js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const violationApi = {
    getAll: () => api.get('/violations/'),
    create: (data) => api.post('/violations/', data),
    getPending: () => api.get('/violations/?status=Pending OSA Review'),
};

export const studentApi = {
    getByStudentId: (id) => api.get(`/students/${id}/`),
    getAll: () => api.get('/students/'),
};

export default api;

```

### File: frontend\src\App.css
```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

```

### File: frontend\src\App.jsx
```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import StudentRegistration from './pages/StudentRegistration';
import ReportViolation from './pages/guard/ReportViolation';
import GuardHistory from './pages/guard/GuardHistory';
import StaffDashboard from './pages/StaffDashboard';
import PendingReviews from './pages/staff/PendingReviews';
import Archives from './pages/staff/Archives';
import StaffSettings from './pages/staff/Settings';
import AllStudents from './pages/staff/AllStudents';
import Analytics from './pages/staff/Analytics';
import StudentDashboard from './pages/StudentDashboard';
import Settings from './pages/student/Settings';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';

const ProtectedRoute = ({ element, allowedRoles }) => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to="/login" replace />;

  try {
    const user = JSON.parse(userStr);
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
          <div className="bg-white p-10 rounded-[32px] shadow-xl max-w-sm border-2 border-red-100 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Access Denied</h2>
            <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">This link is restricted. Your account does not have permission for this section.</p>
            <div className="space-y-3">
              {user.role === 'student' && (
                <a href="/student/dashboard" className="block w-full bg-ustp-blue text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200">My Dashboard</a>
              )}
              {user.role === 'guard' && (
                <a href="/guard/report" className="block w-full bg-ustp-blue text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200">Guard Dashboard</a>
              )}
              {user.role === 'faculty' && (
                <a href="/faculty/report" className="block w-full bg-ustp-blue text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200">Faculty Dashboard</a>
              )}
              {user.role === 'admin' && (
                <a href="/admin/overview" className="block w-full bg-ustp-blue text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200">Admin Dashboard</a>
              )}
              <button onClick={() => { localStorage.removeItem('user'); window.location.href = '/login'; }} className="block w-full bg-slate-100 text-slate-500 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition">Log Out</button>
            </div>
          </div>
        </div>
      );
    }
    return element;
  } catch (error) {
    return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/register" element={<StudentRegistration />} />

          <Route path="/guard/report" element={<ProtectedRoute element={<ReportViolation />} allowedRoles={['guard', 'admin']} />} />
          <Route path="/guard/history" element={<ProtectedRoute element={<GuardHistory />} allowedRoles={['guard', 'admin']} />} />
          <Route path="/guard/*" element={<Navigate to="/guard/report" replace />} />

          <Route path="/staff/report" element={<ProtectedRoute element={<ReportViolation />} allowedRoles={['staff']} />} />
          <Route path="/staff/*" element={<Navigate to="/staff/report" replace />} />

          <Route path="/admin/overview" element={<ProtectedRoute element={<StaffDashboard />} allowedRoles={['admin']} />} />
          <Route path="/admin/students" element={<ProtectedRoute element={<AllStudents />} allowedRoles={['admin']} />} />
          <Route path="/admin/pending" element={<ProtectedRoute element={<PendingReviews />} allowedRoles={['admin']} />} />
          <Route path="/admin/archives" element={<ProtectedRoute element={<Archives />} allowedRoles={['admin']} />} />
          <Route path="/admin/settings" element={<ProtectedRoute element={<StaffSettings />} allowedRoles={['admin']} />} />
          <Route path="/admin/analytics" element={<ProtectedRoute element={<Analytics />} allowedRoles={['admin']} />} />
          <Route path="/admin/*" element={<Navigate to="/admin/overview" replace />} />

          <Route path="/student/dashboard" element={<ProtectedRoute element={<StudentDashboard />} allowedRoles={['student']} />} />
          <Route path="/student/settings" element={<ProtectedRoute element={<Settings />} allowedRoles={['student']} />} />
          <Route path="/student/*" element={<Navigate to="/student/dashboard" replace />} />

          <Route path="/" element={<LandingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

```

### File: frontend\src\index.css
```css
@import "tailwindcss";

@theme {
  --color-ustp-blue: #1e3a8a;
  --color-ustp-gold: #facc15;
  --color-ustp-navy: #172554;
}

body {
  background-color: var(--color-slate-50);
  color: var(--color-slate-900);
  font-family: var(--font-sans);
}


.glass {
  background-color: rgb(255 255 255 / 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgb(255 255 255 / 0.2);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

.btn-premium {
  position: relative;
  overflow: hidden;
  transition-property: all;
  transition-duration: 300ms;
  font-weight: 700;
  border-radius: 1rem;
}

.card-premium {
  background-color: white;
  border-radius: 1.5rem;
  padding: 1.5rem;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  border: 1px solid #f1f5f9;
}

/* Mobile top-bar spacer: push main content down on small screens */
@media (max-width: 1023px) {
  .mobile-top-spacer {
    padding-top: 4.5rem;
    /* height of the mobile top bar */
  }
}

/* Slow spin animation for timer icon */
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
}

.student-map-icon div {
  animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(.7); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
  100% { transform: scale(.7); opacity: 1; }
}

#geofence-map {
  cursor: crosshair;
}

.leaflet-container {
  font-family: inherit;
}

.leaflet-bar {
  border: none !important;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
}
```

### File: frontend\src\main.jsx
```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```

### File: frontend\src\assets\react.svg
```svg
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c6.238-30.281 2.16-54.676-11.769-62.708c-13.355-7.7-35.196.329-57.254 19.526a171.23 171.23 0 0 0-6.375 5.848a155.866 155.866 0 0 0-4.241-3.917C100.759 3.829 77.587-4.822 63.673 3.233C50.33 10.957 46.379 33.89 51.995 62.588a170.974 170.974 0 0 0 1.892 8.48c-3.28.932-6.445 1.924-9.474 2.98C17.309 83.498 0 98.307 0 113.668c0 15.865 18.582 31.778 46.812 41.427a145.52 145.52 0 0 0 6.921 2.165a167.467 167.467 0 0 0-2.01 9.138c-5.354 28.2-1.173 50.591 12.134 58.266c13.744 7.926 36.812-.22 59.273-19.855a145.567 145.567 0 0 0 5.342-4.923a168.064 168.064 0 0 0 6.92 6.314c21.758 18.722 43.246 26.282 56.54 18.586c13.731-7.949 18.194-32.003 12.4-61.268a145.016 145.016 0 0 0-1.535-6.842c1.62-.48 3.21-.974 4.76-1.488c29.348-9.723 48.443-25.443 48.443-41.52c0-15.417-17.868-30.326-45.517-39.844Zm-6.365 70.984c-1.4.463-2.836.91-4.3 1.345c-3.24-10.257-7.612-21.163-12.963-32.432c5.106-11 9.31-21.767 12.459-31.957c2.619.758 5.16 1.557 7.61 2.4c23.69 8.156 38.14 20.213 38.14 29.504c0 9.896-15.606 22.743-40.946 31.14Zm-10.514 20.834c2.562 12.94 2.927 24.64 1.23 33.787c-1.524 8.219-4.59 13.698-8.382 15.893c-8.067 4.67-25.32-1.4-43.927-17.412a156.726 156.726 0 0 1-6.437-5.87c7.214-7.889 14.423-17.06 21.459-27.246c12.376-1.098 24.068-2.894 34.671-5.345a134.17 134.17 0 0 1 1.386 6.193ZM87.276 214.515c-7.882 2.783-14.16 2.863-17.955.675c-8.075-4.657-11.432-22.636-6.853-46.752a156.923 156.923 0 0 1 1.869-8.499c10.486 2.32 22.093 3.988 34.498 4.994c7.084 9.967 14.501 19.128 21.976 27.15a134.668 134.668 0 0 1-4.877 4.492c-9.933 8.682-19.886 14.842-28.658 17.94ZM50.35 144.747c-12.483-4.267-22.792-9.812-29.858-15.863c-6.35-5.437-9.555-10.836-9.555-15.216c0-9.322 13.897-21.212 37.076-29.293c2.813-.98 5.757-1.905 8.812-2.773c3.204 10.42 7.406 21.315 12.477 32.332c-5.137 11.18-9.399 22.249-12.634 32.792a134.718 134.718 0 0 1-6.318-1.979Zm12.378-84.26c-4.811-24.587-1.616-43.134 6.425-47.789c8.564-4.958 27.502 2.111 47.463 19.835a144.318 144.318 0 0 1 3.841 3.545c-7.438 7.987-14.787 17.08-21.808 26.988c-12.04 1.116-23.565 2.908-34.161 5.309a160.342 160.342 0 0 1-1.76-7.887Zm110.427 27.268a347.8 347.8 0 0 0-7.785-12.803c8.168 1.033 15.994 2.404 23.343 4.08c-2.206 7.072-4.956 14.465-8.193 22.045a381.151 381.151 0 0 0-7.365-13.322Zm-45.032-43.861c5.044 5.465 10.096 11.566 15.065 18.186a322.04 322.04 0 0 0-30.257-.006c4.974-6.559 10.069-12.652 15.192-18.18ZM82.802 87.83a323.167 323.167 0 0 0-7.227 13.238c-3.184-7.553-5.909-14.98-8.134-22.152c7.304-1.634 15.093-2.97 23.209-3.984a321.524 321.524 0 0 0-7.848 12.897Zm8.081 65.352c-8.385-.936-16.291-2.203-23.593-3.793c2.26-7.3 5.045-14.885 8.298-22.6a321.187 321.187 0 0 0 7.257 13.246c2.594 4.48 5.28 8.868 8.038 13.147Zm37.542 31.03c-5.184-5.592-10.354-11.779-15.403-18.433c4.902.192 9.899.29 14.978.29c5.218 0 10.376-.117 15.453-.343c-4.985 6.774-10.018 12.97-15.028 18.486Zm52.198-57.817c3.422 7.8 6.306 15.345 8.596 22.52c-7.422 1.694-15.436 3.058-23.88 4.071a382.417 382.417 0 0 0 7.859-13.026a347.403 347.403 0 0 0 7.425-13.565Zm-16.898 8.101a358.557 358.557 0 0 1-12.281 19.815a329.4 329.4 0 0 1-23.444.823c-7.967 0-15.716-.248-23.178-.732a310.202 310.202 0 0 1-12.513-19.846h.001a307.41 307.41 0 0 1-10.923-20.627a310.278 310.278 0 0 1 10.89-20.637l-.001.001a307.318 307.318 0 0 1 12.413-19.761c7.613-.576 15.42-.876 23.31-.876H128c7.926 0 15.743.303 23.354.883a329.357 329.357 0 0 1 12.335 19.695a358.489 358.489 0 0 1 11.036 20.54a329.472 329.472 0 0 1-11 20.722Zm22.56-122.124c8.572 4.944 11.906 24.881 6.52 51.026c-.344 1.668-.73 3.367-1.15 5.09c-10.622-2.452-22.155-4.275-34.23-5.408c-7.034-10.017-14.323-19.124-21.64-27.008a160.789 160.789 0 0 1 5.888-5.4c18.9-16.447 36.564-22.941 44.612-18.3ZM128 90.808c12.625 0 22.86 10.235 22.86 22.86s-10.235 22.86-22.86 22.86s-22.86-10.235-22.86-22.86s10.235-22.86 22.86-22.86Z"></path></svg>
```

### File: frontend\src\components\Sidebar.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Shield, LayoutDashboard, User, AlertTriangle, Clock, LogOut, Menu, X, Users, History, BarChart3, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

const Sidebar = ({ role }) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const menuItems = {
        admin: [
            { name: 'Dashboard', path: '/admin/overview', icon: LayoutDashboard },
            { name: 'View All Students', path: '/admin/students', icon: Users },
            { name: 'Pending Reviews', path: '/admin/pending', icon: AlertTriangle },
            { name: 'Archives', path: '/admin/archives', icon: Clock },
            { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
            { name: 'Settings', path: '/admin/settings', icon: Settings },
        ],
        guard: [
            { name: 'Report Violation', path: '/guard/report', icon: AlertTriangle },
            { name: 'History', path: '/guard/history', icon: History },
        ],
        student: [
            { name: 'Service Hub', path: '/student/dashboard', icon: LayoutDashboard },
            { name: 'Settings', path: '/student/settings', icon: User },
        ],
    };

    const items = menuItems[role] || [];

    const sidebarContent = (
        <>
            <div className="mb-10 flex items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                <img src={logo} alt="OSA Connect Logo" className="h-16 w-auto object-contain" />
            </div>

            <nav className="flex-1 space-y-2">
                {items.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300
              ${isActive
                                ? 'bg-ustp-blue shadow-blue-200 text-white shadow-lg translate-x-1'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-ustp-blue'}
            `}
                    >
                        <item.icon size={22} />
                        <span className="font-bold text-base">{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-100">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-4 w-full text-red-500 hover:bg-red-50 rounded-2xl transition-all group">
                    <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-base">Log Out</span>
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-slate-200/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-xl">
                    <img src={logo} alt="OSA Connect Logo" className="h-8 w-auto object-contain" />
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                >
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="lg:hidden fixed top-0 left-0 w-[280px] h-screen bg-white border-r border-slate-200/50 z-50 p-6 flex flex-col shadow-2xl"
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.aside
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="hidden lg:flex w-72 h-screen glass border-r border-slate-200/50 sticky top-0 p-8 flex-col shrink-0"
            >
                {sidebarContent}
            </motion.aside>
        </>
    );
};

export default Sidebar;

```

### File: frontend\src\pages\AdminLogin.jsx
```javascript
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    User, 
    Eye, 
    EyeOff, 
    Lock, 
    ChevronRight,
    Loader2
} from 'lucide-react';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            
            if (response.ok) {
                if (data.role !== 'admin') {
                    setError('Access denied.');
                    setLoading(false);
                    return;
                }

                const userData = {
                    username: data.username,
                    role: data.role,
                    student_id: data.student_id,
                    name: data.name
                };
                localStorage.setItem('user', JSON.stringify(userData));
                navigate('/admin/overview');
            } else {
                setError(data.error || 'Invalid credentials');
            }
        } catch (error) {
            setError('System connection failure');
        } finally {
            setLoading(false);
        }
    };

    const CSSLogo = ({ className = "" }) => (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[4px] rounded-tl-[2px]" />
                <h2 className="text-xl font-bold text-slate-900 tracking-tight relative z-10 leading-none">OSA</h2>
            </div>
            <span className="text-xl font-bold text-blue-900">Connect</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Simplified Branding Header */}
                <div className="text-center space-y-6">
                    <div className="flex justify-center transition-none">
                        <CSSLogo />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-slate-800">Admin Portal</h1>
                        <p className="text-slate-500 text-sm font-medium">Smart student violation management</p>
                    </div>
                </div>

                {/* Secure Form Card - Minimalist */}
                <div className="bg-white p-8 rounded-xl shadow-sm border-t-4 border-blue-900 border-x border-b border-slate-200">
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-center">
                            <p className="text-red-600 font-bold text-[10px] uppercase tracking-widest">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            {/* Input Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account ID</label>
                                <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-blue-900 transition-none">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-900 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Admin ID"
                                        className="w-full bg-transparent p-3.5 pl-11 outline-none font-bold text-slate-700 placeholder:text-slate-200 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-blue-900 transition-none">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Secure password"
                                        className="w-full bg-transparent p-3.5 pl-11 pr-11 outline-none font-bold text-slate-700 placeholder:text-slate-300 text-sm"
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full h-12 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-[0.4em] shadow-sm flex items-center justify-center gap-3 hover:bg-black transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin text-blue-400" size={18} />
                            ) : (
                                <>Sign In <ChevronRight size={16} /></>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Links */}
                <div className="text-center pt-2">
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.2em]">
                        Admin Interface • <Link to="/login" className="text-blue-900 hover:text-blue-700 font-black underline underline-offset-4">Return</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;

```

### File: frontend\src\pages\GuardDashboard.jsx
```javascript
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Shield, Scan, Send, AlertCircle, CheckCircle2, User, UserPlus, ClipboardList } from 'lucide-react';

const GuardDashboard = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        studentId: '',
        name: '',
        course: '',
        department: '',
        contact: '',
        email: '',
        violation: '',
        description: ''
    });

    const handleScan = () => {
        setLoading(true);
        setTimeout(() => {
            setForm({
                ...form,
                studentId: '2022-300123',
                name: 'Vince User',
                course: 'BSIT',
                department: 'CEA',
                contact: '0917-XXX-XXXX',
                email: 'vince@example.com'
            });
            setLoading(false);
        }, 1500);
    };

    const handleIdChange = (e) => {
        const id = e.target.value;
        setForm({ ...form, studentId: id });

        if (id.length >= 8) {
            setForm(prev => ({
                ...prev,
                name: 'Vince User',
                course: 'BSIT',
                department: 'CEA',
                contact: '0917-XXX-XXXX',
                email: 'vince@example.com'
            }));
        } else {
            setForm(prev => ({
                ...prev,
                name: '',
                course: '',
                department: '',
                contact: '',
                email: ''
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setStep(2);
    };

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="guard" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto overflow-y-auto mobile-top-spacer">
                <header className="mb-8 lg:mb-12 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Security Portal</h1>
                        <p className="text-slate-500 mt-1 sm:mt-2 font-medium text-sm sm:text-base">Laguindingan Campus Gate 1</p>
                    </div>
                    <div className="glass px-4 sm:px-6 py-2 sm:py-3 rounded-2xl flex items-center gap-3 self-start sm:self-auto">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs sm:text-sm font-bold text-slate-700">Gate Active</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                    <div className="lg:col-span-8 space-y-6 lg:space-y-8">
                        {step === 1 && (
                            <div className="card-premium">
                                <div className="flex items-center justify-between mb-6 lg:mb-8 pb-4 border-b border-slate-50">
                                    <h3 className="font-extrabold text-lg lg:text-xl text-slate-800 flex items-center gap-3">
                                        <ClipboardList className="text-blue-600" size={24} />
                                        Violation Report Form
                                    </h3>
                                </div>

                                <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-6 lg:space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4">Identity Information</h4>
                                            <div className="relative">
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Student ID Number"
                                                    value={form.studentId}
                                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 sm:p-4 pr-14 sm:pr-16 font-black text-slate-800 outline-none focus:border-blue-600 transition-all placeholder:text-slate-400 text-sm sm:text-base"
                                                    onChange={handleIdChange}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleScan}
                                                    title="Optional ID Scanner"
                                                    className="absolute right-2 top-2 bottom-2 aspect-square bg-slate-200 hover:bg-slate-300 rounded-xl flex items-center justify-center text-slate-600 transition-colors"
                                                >
                                                    <Scan size={20} />
                                                </button>
                                            </div>

                                            <div>
                                                <input
                                                    required
                                                    readOnly={form.name !== ''}
                                                    placeholder="Full Student Name"
                                                    value={form.name}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-blue-600 transition-all opacity-80 text-sm sm:text-base"
                                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                <input
                                                    required
                                                    readOnly={form.course !== ''}
                                                    placeholder="Course"
                                                    value={form.course}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-blue-600 transition-all text-sm opacity-80"
                                                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                                                />
                                                <input
                                                    required
                                                    readOnly={form.department !== ''}
                                                    placeholder="Department"
                                                    value={form.department}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-blue-600 transition-all text-sm opacity-80"
                                                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4">Contact & Communication</h4>
                                            <div>
                                                <input
                                                    required
                                                    readOnly={form.contact !== ''}
                                                    placeholder="Contact Number"
                                                    value={form.contact}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-blue-600 transition-all opacity-80 text-sm sm:text-base"
                                                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    required
                                                    readOnly={form.email !== ''}
                                                    type="email"
                                                    placeholder="Email Address"
                                                    value={form.email}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-blue-600 transition-all opacity-80 text-sm sm:text-base"
                                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-50 pt-6 lg:pt-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-4 lg:mb-6 font-bold">Violation Details</h4>
                                        <div className="w-full">
                                            <select
                                                required
                                                className="w-full bg-red-50/30 border-2 border-red-50 rounded-2xl p-3 sm:p-4 font-bold text-slate-700 outline-none focus:border-red-500 transition-all appearance-none cursor-pointer text-sm sm:text-base"
                                                onChange={(e) => setForm({ ...form, violation: e.target.value })}
                                                value={form.violation}
                                            >
                                                <option value="">Select Category</option>
                                                <option value="No ID">No Identification (ID)</option>
                                                <option value="Dress Code">Dress Code Violation</option>
                                                <option value="Others">Others</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn-premium bg-blue-600 hover:bg-slate-900 text-white w-full py-4 sm:py-5 text-base sm:text-lg shadow-2xl shadow-blue-900/10 flex items-center justify-center gap-3 mt-4"
                                    >
                                        <Send size={20} />
                                        Finalize & Submit Report
                                    </button>
                                </form>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="card-premium text-center py-16 sm:py-24 border-2 border-green-100 bg-green-50/30">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl shadow-green-200">
                                    <CheckCircle2 className="text-white" size={40} />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Report In Flight</h2>
                                <p className="text-slate-500 mt-3 sm:mt-4 max-w-sm mx-auto text-base sm:text-lg leading-relaxed font-medium px-4">
                                    Violation report for <span className="text-blue-600 font-bold">{form.name}</span> has been dispatched for OSA Review.
                                </p>
                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setForm({ studentId: '', name: '', course: '', department: '', contact: '', email: '', violation: '', description: '' });
                                    }}
                                    className="mt-8 sm:mt-12 btn-premium bg-slate-900 text-white w-full max-w-xs transition-transform hover:scale-105 py-4"
                                >
                                    Return to Duty
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-6 lg:space-y-8">
                        <div className="card-premium bg-ustp-navy text-white relative overflow-hidden p-6 sm:p-8 shadow-2xl">
                            <div className="relative z-10">
                                <h4 className="flex items-center gap-2 text-ustp-gold font-black text-xs tracking-widest uppercase mb-6 lg:mb-8">
                                    <AlertCircle size={14} />
                                    Reporting Guide
                                </h4>
                                <div className="space-y-6 lg:space-y-8">
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-black text-ustp-gold text-xs shrink-0">01</div>
                                        <p className="text-sm text-slate-300 font-medium leading-relaxed">Fetch data using Scanner OR enter ID manually.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-black text-ustp-gold text-xs shrink-0">02</div>
                                        <p className="text-sm text-slate-300 font-medium leading-relaxed">Ensure all contact details are accurate for OSA follow-up.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-black text-ustp-gold text-xs shrink-0">03</div>
                                        <p className="text-sm text-slate-300 font-medium leading-relaxed">Clearly specify the violation category to speed up review.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
                        </div>

                        <div className="card-premium">
                            <h4 className="font-extrabold text-slate-800 text-sm mb-6 lg:mb-8 uppercase tracking-widest text-center">Duty History</h4>
                            <div className="py-16 sm:py-20 text-center bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100">
                                <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-[10px]">Clean Duty Log</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GuardDashboard;

```

### File: frontend\src\pages\LandingPage.jsx
```javascript
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Shield, 
    QrCode, 
    Bell, 
    Clock, 
    LayoutDashboard, 
    CheckCircle, 
    ArrowRight, 
    FileText, 
    Activity, 
    Menu,
    X
} from 'lucide-react';
import laptopMockup from '../assets/mockup_laptop.png';
import tabletMockup from '../assets/mockup_tablet.png';
import phoneMockup from '../assets/mockup_phone.png';

const RotatingDeviceStack = ({ laptop, tablet, phone }) => {
    const [index, setIndex] = useState(0);
    const devices = [
        { id: 'desktop', type: 'laptop', img: laptop, device: 'Desktop', title: 'ADMIN DASHBOARD' },
        { id: 'tablet', type: 'tablet', img: tablet, device: 'Tablet', title: 'GUARD REPORT' },
        { id: 'mobile', type: 'phone', img: phone, device: 'Phone', title: 'STUDENT HUB' },
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % devices.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    // Helper to get position based on current index
    const getPos = (i) => {
        const diff = (i - index + devices.length) % devices.length;
        if (diff === 0) return 'front';
        if (diff === 1) return 'right';
        return 'left';
    };

    return (
        <div className="relative w-full max-w-3xl h-[450px] md:h-[600px] flex flex-col items-center justify-center">
            <div className="relative w-full h-80 md:h-[450px] flex items-center justify-center translate-y-[-10px] md:translate-y-[-30px]">
                {devices.map((d, i) => {
                    const pos = getPos(i);
                    const isFront = pos === 'front';
                    const isRight = pos === 'right';
                    
                    return (
                        <div 
                            key={d.id}
                            className={`
                                absolute transition-all duration-1000 ease-in-out
                                ${isFront ? 'z-30 scale-[0.95] md:scale-110 opacity-100 translate-x-0' : ''}
                                ${isRight ? 'z-10 scale-[0.7] md:scale-85 opacity-30 md:opacity-40 translate-x-[40%] md:translate-x-[45%] rotate-[10deg]' : ''}
                                ${!isFront && !isRight ? 'z-10 scale-[0.7] md:scale-85 opacity-30 md:opacity-40 translate-x-[-40%] md:translate-x-[-45%] rotate-[-10deg]' : ''}
                            `}
                        >
                            <div className={`
                                relative bg-slate-900 border-2 md:border-4 border-slate-950 shadow-2xl overflow-hidden
                                ${d.type === 'laptop' ? 'w-72 md:w-[450px] aspect-[16/10] rounded-2xl' : ''}
                                ${d.type === 'tablet' ? 'w-48 md:w-[260px] aspect-[3/4.5] rounded-3xl border-slate-800' : ''}
                                ${d.type === 'phone' ? 'w-32 md:w-[180px] aspect-[9/19] rounded-[40px] border-slate-900 bg-black p-1' : ''}
                            `}>
                                <img src={d.img} className="w-full h-full object-cover" alt={d.title} />
                                {d.type === 'phone' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 bg-black rounded-b-xl z-10" />}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Active Device Info Overlay */}
            <div className="text-center mt-10 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500" key={index}>
                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-900 text-[10px] font-black rounded-full uppercase tracking-widest">{devices[index].device}</div>
                <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">{devices[index].title}</h3>
                <div className="flex justify-center gap-1.5 pt-2">
                    {devices.map((_, i) => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === index ? 'w-6 bg-blue-900' : 'w-1.5 bg-slate-200'}`} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const LandingPage = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const CSSLogo = ({ className = "", light = false }) => (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[8px] rounded-tl-[4px] rotate-[-10deg]" />
                <h2 className={`text-lg font-bold ${light ? 'text-white' : 'text-slate-900'} tracking-tight relative z-10 leading-none uppercase`}>OSA</h2>
            </div>
            <span className={`text-lg font-bold ${light ? 'text-blue-300' : 'text-blue-900'}`}>Connect</span>
        </div>
    );

    const navLinks = [
        { name: 'Home', href: '#home' },
        { name: 'Features', href: '#features' },
        { name: 'About', href: '#about' },
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-slate-700 selection:bg-blue-50 selection:text-blue-900">
            {/* Simple Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-200 ${scrolled ? 'bg-white shadow-sm py-5 border-b border-slate-100' : 'bg-transparent py-8'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <CSSLogo className="scale-110 md:scale-125 origin-left" />
                    
                    <div className="hidden md:flex items-center gap-10">
                        {navLinks.map((link) => (
                            <a 
                                key={link.name} 
                                href={link.href} 
                                className="text-sm font-black text-slate-500 hover:text-blue-900 transition-colors uppercase tracking-widest"
                            >
                                {link.name}
                            </a>
                        ))}
                        <Link to="/login" className="px-8 py-3 bg-blue-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-blue-900/10">
                            Sign In
                        </Link>
                    </div>

                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-slate-900">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-100 p-6 flex flex-col gap-4 md:hidden shadow-lg animate-in fade-in slide-in-from-top-2">
                        {navLinks.map((link) => (
                            <a key={link.name} href={link.href} onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-700">{link.name}</a>
                        ))}
                        <Link to="/login" className="px-6 py-3 bg-blue-900 text-white rounded-lg text-center font-bold text-sm">Login</Link>
                    </div>
                )}
            </nav>

            {/* Hero Section - Clean & Static */}
            <section id="home" className="pt-48 pb-32 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
                    <div className="space-y-12">
                        <div className="space-y-6">
                            <h1 className="text-6xl md:text-8xl font-black text-slate-900 lg:leading-[0.9] tracking-tighter uppercase italic">
                                Integrated <br/>
                                <span className="text-blue-900">OSA Connect</span>
                            </h1>
                            <div className="inline-block px-4 py-1.5 bg-amber-100 text-amber-800 text-sm font-black rounded border border-amber-200 uppercase tracking-[0.2em]">
                                "One scan at a time"
                            </div>
                        </div>
                        
                        <p className="text-xl md:text-2xl text-slate-600 font-medium leading-relaxed max-w-xl">
                            A smart and efficient student violation management system. Record violations, verify identities, and track community service in real time.
                        </p>

                        <div className="flex gap-4 pt-4">
                            <Link to="/register" className="px-8 py-3 bg-blue-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2">
                                Get Started <ArrowRight size={16} />
                            </Link>
                            <Link to="/login" className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">
                                Login Portal
                            </Link>
                        </div>
                    </div>
                    
                    <div className="flex justify-center md:justify-end relative order-first md:order-last mb-12 md:mb-0">
                        <RotatingDeviceStack laptop={laptopMockup} tablet={tabletMockup} phone={phoneMockup} />
                    </div>

                </div>
            </section>

            {/* Features - Pure Grid */}
            <section id="features" className="py-32 px-6 bg-white border-t border-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-20">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">System Features</h2>
                        <div className="w-16 h-1.5 bg-amber-400 mt-3" />
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
                        {[
                            { title: 'Digital Violation Recording', icon: FileText, desc: 'Centralized and secure logging of student disciplinary incidents.' },
                            { title: 'QR Identity Verification', icon: QrCode, desc: 'Instant identity checks using secure student digital IDs.' },
                            { title: 'Real-time Notifications', icon: Bell, desc: 'Automated alert delivery for administrators and students.' },
                            { title: 'Community Service Tracking', icon: Clock, desc: 'Live monitoring and management of assigned service hours.' },
                            { title: 'Comprehensive Dashboard', icon: LayoutDashboard, desc: 'Admin reporting hub for status monitoring and data analysis.' }
                        ].map((f, i) => (
                            <div key={i} className="flex gap-6">
                                <div className="w-12 h-12 bg-slate-50 text-blue-900 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                                    <f.icon size={20} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-slate-900 text-base">{f.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-24 bg-slate-900 text-white">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <p className="text-amber-400 font-bold text-[10px] uppercase tracking-[0.2em]">Efficiency Protocol</p>
                                <h2 className="text-3xl font-extrabold tracking-tight">About OSA Connect</h2>
                            </div>
                            <div className="space-y-6">
                                <div className="flex gap-5">
                                    <CheckCircle size={20} className="text-blue-300 shrink-0" />
                                    <p className="text-slate-400 text-sm font-medium">Manage student violations faster and more accurately.</p>
                                </div>
                                <div className="flex gap-5">
                                    <CheckCircle size={20} className="text-blue-300 shrink-0" />
                                    <p className="text-slate-400 text-sm font-medium">Reduces manual paperwork and streamlines administrative effort.</p>
                                </div>
                                <div className="flex gap-5">
                                    <CheckCircle size={20} className="text-blue-300 shrink-0" />
                                    <p className="text-slate-400 text-sm font-medium">Improves transparency between students and administrators.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-white/5 rounded-2xl border border-white/10">
                            <h3 className="text-xl font-bold mb-4">Integrated Ecosystem</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Our platform provides a unified environment for student violation processing, QR-based verification, and real-time service monitoring, designed for university-wide stability.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 px-6 bg-white border-t border-slate-100">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="space-y-4 text-center md:text-left">
                        <CSSLogo />
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                            A professional ecosystem for student violation processing and campus monitoring.
                        </p>
                    </div>
                    
                    <div className="flex gap-12 text-center md:text-left">
                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Sections</p>
                            <a href="#home" className="text-xs font-medium text-slate-500 hover:text-blue-900">Home</a>
                            <a href="#features" className="text-xs font-medium text-slate-500 hover:text-blue-900">Features</a>
                            <a href="#about" className="text-xs font-medium text-slate-500 hover:text-blue-900">About</a>
                        </div>
                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Account</p>
                            <Link to="/login" className="text-xs font-medium text-slate-500 hover:text-blue-900">Login</Link>
                            <Link to="/register" className="text-xs font-medium text-slate-500 hover:text-blue-900">Register</Link>
                        </div>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto border-t border-slate-50 mt-16 pt-8 text-center md:text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                        © 2026 OSA CONNECT • ONE SCAN AT A TIME
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;

```

### File: frontend\src\pages\Login.jsx
```javascript
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    User, 
    Eye, 
    EyeOff, 
    Lock, 
    ChevronRight,
    Loader2
} from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (response.ok) {
                // Treat Admin as invalid on public login
                if (data.role === 'admin') {
                    setError('Invalid credentials');
                    setLoading(false);
                    return;
                }

                const userData = {
                    username: data.username,
                    role: data.role,
                    student_id: data.student_id,
                    name: data.name
                };
                localStorage.setItem('user', JSON.stringify(userData));
                
                if (data.role === 'admin') navigate('/admin/overview');
                else if (data.role === 'staff') navigate('/staff/report');
                else if (data.role === 'guard') navigate('/guard/report');
                else if (data.role === 'student') navigate('/student/dashboard');
                else setError(`Unknown Role: ${data.role}`);
            } else {
                setError(data.error || 'Invalid credentials');
            }
        } catch (error) {
            setError('System connection failure');
        } finally {
            setLoading(false);
        }
    };

    const CSSLogo = ({ className = "" }) => (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[4px] rounded-tl-[2px] transition-none" />
                <h2 className="text-xl font-bold text-slate-900 tracking-tight relative z-10 leading-none">OSA</h2>
            </div>
            <span className="text-xl font-bold text-blue-900">Connect</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Simplified Branding Header */}
                <div className="text-center space-y-6">
                    <div className="flex justify-center transition-none">
                        <CSSLogo />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-slate-800">Login to Portal</h1>
                        <p className="text-slate-500 text-sm font-medium">Smart student violation management</p>
                    </div>
                </div>

                {/* Clean Form Card */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                            <p className="text-red-600 font-bold text-xs uppercase tracking-widest text-center">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            {/* Input Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account ID / Username</label>
                                <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-blue-600 transition-none">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter your ID"
                                        className="w-full bg-transparent p-3.5 pl-11 outline-none font-semibold text-slate-700 placeholder:text-slate-300 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Secret Password</label>
                                <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-blue-600 transition-none">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        className="w-full bg-transparent p-3.5 pl-11 pr-11 outline-none font-semibold text-slate-700 placeholder:text-slate-300 text-sm"
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full h-12 bg-blue-900 text-white rounded-lg font-bold text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <>Sign In Portal <ChevronRight size={16} /></>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Links */}
                <div className="text-center pt-2">
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                        Don't have an ID?{' '}
                        <Link to="/register" className="text-blue-700 hover:text-blue-900 font-bold">Register Now</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

```

### File: frontend\src\pages\StaffDashboard.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import QRCode from 'react-qr-code';
import {
    AlertTriangle,
    Clock,
    FileText,
    Inbox,
    User,
    Check,
    X,
    Search,
    Eye,
    Shield,
    Calendar,
    BookOpen,
    Hash,
    MapPin,
    Award,
    Timer,
    Bell,
    UserCheck,
    ClipboardList,
    QrCode,
    CheckCircle
} from 'lucide-react';

/* ─── Violation Detail Modal ──────────────────────────────────────── */
const ViolationModal = ({ report, ticket, activeLog, onClose, onAction }) => {
    if (!report) return null;
    const student = report.student_details || {};

    const formatDateTime = (iso) => {
        if (!iso) return { date: '—', time: '—' };
        const d = new Date(iso);
        return {
            date: d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
            time: d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        };
    };

    const formatRemainingTime = (hours) => {
        if (!hours && hours !== 0) return '—';
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        return `${h}h ${m}m remaining`;
    };

    const caught = formatDateTime(report.created_at);

    const statusColor = (s = '') => {
        const sl = s.toLowerCase();
        if (sl.includes('pending')) return 'bg-orange-100 text-orange-800';
        if (sl.includes('approved') || sl === 'ongoing' || sl === 'active') return 'bg-green-100 text-green-800';
        if (sl === 'finished') return 'bg-blue-100 text-blue-800';
        if (sl.includes('dismissed')) return 'bg-red-100 text-red-800';
        if (sl === 'completed') return 'bg-blue-100 text-blue-800';
        return 'bg-slate-100 text-slate-700';
    };

    const currentStatus = ticket ? ticket.status : report.status;
    const remainingHours = ticket?.remaining_hours;
    const isOngoing = ticket?.status === 'Ongoing';
    const isPending = (report.status || '').toLowerCase().includes('pending');

    const Row = ({ icon: Icon, label, value, accent }) => (
        <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={15} className="text-slate-400" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className={`text-sm font-bold mt-0.5 ${accent || 'text-slate-800'}`}>{value || '—'}</p>
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white"
                    >
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                            <User size={26} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-white leading-tight">
                                {student.name || 'Unknown Student'}
                            </h2>
                            <p className="text-slate-300 text-xs font-bold tracking-widest uppercase mt-0.5">
                                {student.student_id || 'No ID'}
                            </p>
                            <span className={`inline-block mt-2 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusColor(currentStatus)}`}>
                                {currentStatus}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[65vh] overflow-y-auto">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Student Information</p>
                    <Row icon={BookOpen} label="Course" value={student.course} />
                    <Row icon={MapPin} label="Department" value={student.department} />
                    <Row icon={Hash} label="Year Level" value={student.year_level} />

                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 mt-5">Incident Report</p>
                    <Row icon={AlertTriangle} label="Violation Type" value={report.violation_type} accent="text-red-600" />
                    <Row icon={FileText} label="Description" value={report.description || 'No description provided'} />
                    <Row icon={Hash} label="Offense Count" value={report.offense_count ? `#${report.offense_count} Offense` : '—'} />
                    <Row icon={Shield} label="Reported By" value={report.reporting_guard} />

                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 mt-5">Date & Time Caught</p>
                    <Row icon={Calendar} label="Date" value={caught.date} />
                    <Row icon={Clock} label="Time" value={caught.time} />

                    {(report.punishment || isOngoing) && (
                        <>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 mt-5">Sanction</p>
                            {report.punishment && (
                                <Row icon={Award} label="Required Sanction" value={report.punishment} accent="text-blue-700" />
                            )}
                            {isOngoing && remainingHours !== undefined && remainingHours !== null && (
                                <Row
                                    icon={Timer}
                                    label="Time Remaining"
                                    value={formatRemainingTime(remainingHours)}
                                    accent={remainingHours > 0 ? "text-green-600" : "text-slate-800"}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 pb-6 pt-2 flex flex-col gap-2">
                    {isPending && (
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <button
                                onClick={() => {
                                    onAction(report.id, 'Approved');
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-100"
                            >
                                <Check size={16} /> Approve
                            </button>
                            <button
                                onClick={() => {
                                    onAction(report.id, 'Dismissed');
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-100"
                            >
                                <X size={16} /> Dismiss
                            </button>
                        </div>
                    )}


                    {/* Special case for 0-hour punishments that aren't pending but need "Mark Done" (if status is Approved) */}
                    {!isPending && report.status === 'Approved' && !ticket && (
                        <button
                            onClick={() => {
                                onAction(report.id, 'Approved'); // 'approve' endpoint also marks as Completed if hours=0
                                onClose();
                            }}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all mb-2"
                        >
                            Mark as Handled / Done
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Staff Dashboard ─────────────────────────────────────────────── */
const StaffDashboard = () => {
    const [stats, setStats] = useState({ pending: 0, active: 0, completed: 0, warnings: 0 });
    const [violators, setViolators] = useState([]);
    const [allTickets, setAllTickets] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedViolation, setSelectedViolation] = useState(null);
    const [todayStats, setTodayStats] = useState({ violations: 0, assigned: 0, completed: 0 });
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        fetchDashboardData();
        const poll = setInterval(fetchDashboardData, 5000);
        return () => clearInterval(poll);
    }, []);

    const handleAction = async (reportId, newStatus) => {
        try {
            const endpoint = newStatus === 'Approved' ? 'approve' : 'dismiss';
            const response = await fetch(`/api/violations/${reportId}/${endpoint}/`, { method: 'POST' });
            if (response.ok) fetchDashboardData();
        } catch (error) {
            console.error('Error executing action:', error);
        }
    };


    const fetchDashboardData = async () => {
        try {
            const vResponse = await fetch('/api/violations/?t=' + Date.now());
            const violations = await vResponse.json();

            let tickets = [];
            try {
                const tResponse = await fetch('/api/etickets/?t=' + Date.now());
                tickets = await tResponse.json();
            } catch (e) { console.log('ETickets error', e); }

            let fetchedLogs = [];
            try {
                const lResponse = await fetch('/api/timelogs/?t=' + Date.now());
                fetchedLogs = await lResponse.json();
            } catch (e) { console.log('Timelogs error', e); }

            const today = new Date().toDateString();

            const violationsToday = violations.filter(v => new Date(v.created_at).toDateString() === today);
            const ticketsAssignedToday = tickets.filter(t => {
                const created = t.created_at ? new Date(t.created_at).toDateString() : '';
                return created === today;
            });
            const ticketsCompletedToday = tickets.filter(t => {
                const updated = t.updated_at ? new Date(t.updated_at).toDateString() : '';
                return t.status === 'Completed' && updated === today;
            });

            setTodayStats({
                violations: violationsToday.length,
                assigned: ticketsAssignedToday.length,
                completed: ticketsCompletedToday.length,
            });

            const newNotifications = [];

            // 1. All Pending Reviews (Show all, regardless of date, sorted by newest)
            violations.filter(v => v.status.toLowerCase().includes('pending'))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .forEach(v => {
                    const name = v.student_details?.name || 'A student';
                    newNotifications.push({
                        id: `pending-${v.id}`,
                        type: 'warning',
                        message: `Pending Review: ${name} (Action Required)`,
                        time: formatTimeAgo(v.created_at),
                        created_at: v.created_at
                    });
                });

            // 2. Completed Services (Today only)
            ticketsCompletedToday.forEach(t => {
                const name = t.student_details?.name || 'A student';
                newNotifications.push({
                    id: `completed-${t.id}`,
                    type: 'success',
                    message: `${name} completed their assigned community service`,
                    time: formatTimeAgo(t.updated_at),
                    created_at: t.updated_at
                });
            });

            // 3. Overdue Pending (Legacy warning)
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            violations.filter(v =>
                v.status.toLowerCase().includes('pending') &&
                new Date(v.created_at) < threeDaysAgo
            ).forEach(v => {
                const name = v.student_details?.name || 'A student';
                const days = Math.floor((new Date() - new Date(v.created_at)) / (1000 * 60 * 60 * 24));
                newNotifications.push({
                    id: `overdue-${v.id}`,
                    type: 'error',
                    message: `${name} has not completed their pending review for ${days} days`,
                    time: formatTimeAgo(v.created_at),
                    created_at: v.created_at
                });
            });

            // Sort all by date descending and take top 10
            const sortedNotifs = newNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setNotifications(sortedNotifs.slice(0, 10));

            const pending = violations.filter(v => v.status.toLowerCase().includes('pending'));
            const activeTickets = tickets.filter(t => t.status === 'Ongoing');
            const completedTickets = tickets.filter(t => t.status === 'Completed');

            setStats({
                pending: pending.length,
                active: activeTickets.length,
                completed: completedTickets.length,
                warnings: 0,
            });

            setViolators(violations);
            setAllTickets(tickets);
            setLogs(fetchedLogs);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (isoDate) => {
        if (!isoDate) return '';
        const diff = Date.now() - new Date(isoDate).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (mins > 0) return `${mins}m ago`;
        return 'Just now';
    };

    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';

    return (
        <div className="flex bg-slate-50 min-h-screen h-screen overflow-hidden relative">
            <Sidebar role={userRole} />
            <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
                <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-8xl mx-auto w-full flex flex-col overflow-hidden">
                    <header className="mb-6 text-center md:text-left shrink-0">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase italic">Admin Dashboard</h1>
                        <p className="text-slate-500 mt-1 font-medium italic text-xs">
                            {loading
                                ? 'Syncing cloud databases...'
                                : 'Awaiting compliance updates from field units'}
                        </p>
                    </header>
 
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                        <div className="space-y-6">
                            {/* ── Violators Feed ── */}
                            <div className="card-premium p-4 md:p-6">
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50">
                                    <h4 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] text-blue-900">Violators Feed</h4>
                                </div>

                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or student ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-ustp-blue focus:outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {(() => {
                                    const activeViolators = violators.filter(report => {
                                        const status = (report.status || '').toLowerCase();
                                        const isDismissed = status === 'dismissed';
                                        const isCompleted = status === 'completed';
                                        const isPending = status.includes('pending');
                                        
                                        const ticket = allTickets.find(t => t.violation_details?.id === report.id || t.violation === report.id);
                                        const isTicketFinished = ticket && (
                                            ticket.status === 'Completed' || 
                                            ticket.status === 'Finished' || 
                                            (ticket.status !== 'Ongoing' && ticket.remaining_hours <= 0.001)
                                        );
                                        
                                        const matchesSearch = !searchTerm ||
                                            (report.student_details?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                            (report.student_details?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()));

                                        return !isPending && !isDismissed && !isCompleted && !isTicketFinished && matchesSearch;
                                    });

                                    if (activeViolators.length === 0) {
                                        return (
                                            <div className="py-16 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                                <Inbox className="mx-auto text-slate-200 mb-3" size={40} />
                                                <h5 className="font-bold text-slate-400 uppercase tracking-[0.2em] text-xs">No Active Violators</h5>
                                            </div>
                                        );
                                    }

                                    return activeViolators.map((report) => {
                                        const ticket = allTickets.find(t => t.violation_details?.id === report.id || t.violation === report.id);
                                        const isOngoing = ticket?.status === 'Ongoing';
                                        const isPending = (report.status || '').toLowerCase().includes('pending');

                                        return (
                                            <div
                                                key={report.id}
                                                className={`p-4 border shadow-sm rounded-3xl transition-all ${isOngoing ? 'bg-green-50/50 border-green-200' : 'bg-white border-slate-100'}`}
                                            >
                                                <div className="flex gap-4 items-center">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${isOngoing ? 'bg-green-500 text-white shadow-green-200/50' : 'bg-slate-50 text-slate-400'}`}>
                                                        {isOngoing ? <Clock size={20} className="animate-spin-slow" /> : <User size={20} />}
                                                    </div>

                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="font-bold text-slate-800 text-sm truncate">{report.student_details?.name || 'New Student Report'}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{report.violation_type}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isOngoing ? 'bg-green-200 text-green-800' : isPending ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-900'}`}>
                                                                {ticket ? ticket.status : report.status}
                                                            </span>
                                                         </div>
                                                    </div>

                                                    <div className="flex gap-2 flex-shrink-0 relative z-10">
                                                        {isPending && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleAction(report.id, 'Approved')}
                                                                    className="flex items-center gap-1 p-2 bg-green-50 hover:bg-green-500 hover:text-white text-green-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                                                >
                                                                    <Check size={14} /> Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction(report.id, 'Dismissed')}
                                                                    className="flex items-center gap-1 p-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                                                >
                                                                    <X size={14} /> Dismiss
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                const activeLog = logs.find(l => 
                                                                    (ticket && (l.eticket === ticket.id || l.eticket?.id === ticket.id)) && !l.time_out
                                                                );
                                                                setSelectedViolation({ report, ticket, activeLog });
                                                            }}
                                                            className="flex items-center gap-1 p-2 bg-slate-50 hover:bg-slate-800 hover:text-white text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                                                        >
                                                            <Eye size={14} className="pointer-events-none" /> Details
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
                </main>

                {/* Right Sidebar */}
                <aside className="w-96 p-6 border-l border-slate-100 bg-white hidden xl:block">
                    <div className="sticky top-10 space-y-6">
                        {/* Today's Activity Card */}
                        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                                    <Calendar size={24} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base uppercase tracking-wider">Today's Activity</h3>
                                    <p className="text-xs text-slate-400 font-semibold">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle size={20} className="text-red-500" />
                                        <span className="text-sm font-semibold text-slate-700">Violations Today</span>
                                    </div>
                                    <span className="text-2xl font-black text-red-600">{todayStats.violations}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <ClipboardList size={20} className="text-amber-600" />
                                        <span className="text-sm font-semibold text-slate-700">Services Assigned</span>
                                    </div>
                                    <span className="text-2xl font-black text-amber-600">{todayStats.assigned}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <UserCheck size={20} className="text-green-600" />
                                        <span className="text-sm font-semibold text-slate-700">Completed Service</span>
                                    </div>
                                    <span className="text-2xl font-black text-green-600">{todayStats.completed}</span>
                                </div>
                            </div>
                        </div>

                        {/* System Notifications Card */}
                        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <Bell size={24} className="text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base uppercase tracking-wider">System Notifications</h3>
                                    <p className="text-xs text-slate-400 font-semibold">{notifications.length} alerts</p>
                                </div>
                            </div>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="text-center py-10">
                                        <Bell size={40} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-sm text-slate-400 font-medium">No notifications</p>
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`p-4 rounded-2xl border transition-all hover:shadow-md ${notif.type === 'warning' ? 'bg-orange-50 border-orange-100' :
                                                notif.type === 'error' ? 'bg-red-50 border-red-100' :
                                                    'bg-green-50 border-green-100'
                                                }`}
                                        >
                                            <p className={`text-sm font-semibold ${notif.type === 'warning' ? 'text-orange-800' :
                                                notif.type === 'error' ? 'text-red-800' :
                                                    'text-green-800'
                                                }`}>
                                                {notif.message}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-2">{notif.time}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Violation Detail Modal */}
            {selectedViolation && (
                <ViolationModal
                    report={selectedViolation.report}
                    ticket={selectedViolation.ticket}
                    activeLog={selectedViolation.activeLog}
                    onClose={() => setSelectedViolation(null)}
                    onAction={handleAction}
                />
            )}
        </div>
    );
};

export default StaffDashboard;

```

### File: frontend\src\pages\StudentDashboard.jsx
```javascript
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
    Shield,
    Clock,
    History,
    Scan,
    AlertTriangle,
    Inbox,
    Key,
    User,
    Play,
    CheckCircle,
    X,
    QrCode,
    MapPin,
    Navigation,
    LocateFixed
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const LiveTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return <span className="font-mono text-green-600 font-black tracking-tighter">{formatTime(elapsed)}</span>;
};

const StudentDashboard = () => {
    const [violations, setViolations] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [logs, setLogs] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showAdminCode, setShowAdminCode] = useState(false);
    const [adminCode, setAdminCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [showStopScanner, setShowStopScanner] = useState(false);
    const [timerActive, setTimerActive] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [location, setLocation] = useState(null);
    const [isOutOfBounds, setIsOutOfBounds] = useState(false);
    const [monitoringLocation, setMonitoringLocation] = useState(false);
    const [currentDistance, setCurrentDistance] = useState(0);
    const [warningCountdown, setWarningCountdown] = useState(null);
    const [gpsAccuracy, setGpsAccuracy] = useState(0);
    const mapRef = React.useRef(null);
    const [markerInstance, setMarkerInstance] = useState(null);
    const [circleInstance, setCircleInstance] = useState(null);
    const watchIdRef = React.useRef(null);

    // Leaflet Map Setup
    useEffect(() => {
        if (!location || !timerActive || mapRef.current) return;

        const timer = setTimeout(() => {
            try {
                const container = document.getElementById('geofence-map');
                if (!container || !window.L) return;

                const map = L.map('geofence-map', { zoomControl: false }).setView([location.lat, location.lng], 18);
                L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap'
                }).addTo(map);

                const studentIcon = L.divIcon({
                    className: 'student-map-icon',
                    html: '<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>',
                    iconSize: [16, 16]
                });

                const marker = L.marker([location.lat, location.lng], { icon: studentIcon }).addTo(map);

                let circle = null;
                if (activeTicket?.lat) {
                    circle = L.circle([activeTicket.lat, activeTicket.lng], {
                        color: '#10b981',
                        fillColor: '#10b981',
                        fillOpacity: 0.2,
                        radius: (activeTicket.radius || 3) + (gpsAccuracy * 0.7)
                    }).addTo(map);
                }

                mapRef.current = map;
                setMarkerInstance(marker);
                setCircleInstance(circle);
            } catch (e) {
                console.error("Leaflet init error:", e);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [location, timerActive]);

    // Update Marker/Circle on Location Change
    useEffect(() => {
        if (!mapRef.current || !location) return;

        if (markerInstance) {
            markerInstance.setLatLng([location.lat, location.lng]);
            mapRef.current.panTo([location.lat, location.lng]);
        }

        if (circleInstance && activeTicket?.lat) {
            const dist = calculateDistance(location.lat, location.lng, activeTicket.lat, activeTicket.lng);
            const limit = (activeTicket.radius || 3) + (gpsAccuracy * 0.7);

            circleInstance.setLatLng([activeTicket.lat, activeTicket.lng]);
            circleInstance.setRadius(limit);

            if (dist > limit) {
                circleInstance.setStyle({ color: '#ef4444', fillColor: '#ef4444' });
            } else {
                circleInstance.setStyle({ color: '#10b981', fillColor: '#10b981' });
            }
        }
    }, [location, gpsAccuracy]);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const activeTicket = tickets.find(t => t.status === 'Ongoing') || tickets.find(t => t.status === 'Active');
    const displayHours = activeTicket ? activeTicket.remaining_hours : 0;

    useEffect(() => {
        fetchStudentData();
        const poll = setInterval(fetchStudentData, 5000);
        return () => clearInterval(poll);
    }, [user.username]);

    // Live countdown timer logic
    useEffect(() => {
        let interval;
        if (timerActive && startTime) {
            interval = setInterval(() => {
                const secondsSinceStart = Math.floor((Date.now() - startTime) / 1000);
                setElapsed(secondsSinceStart);

                // Auto-stop when hours reach zero
                const currentRemaining = displayHours - (secondsSinceStart / 3600);
                if (currentRemaining <= 0) {
                    autoStopTimer("Service obligation completed! The system has automatically recorded your completion.");
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerActive, startTime, displayHours]);

    // QR Scanner Effect
    useEffect(() => {
        if (!isScanning) return;

        const scanner = new Html5QrcodeScanner("student-qr-reader", {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
        });

        scanner.render((decodedText) => {
            scanner.clear();
            setIsScanning(false);
            processCode(decodedText);
        }, (err) => {
            // ignore
        });

        return () => {
            scanner.clear().catch(e => console.error("Scanner cleared:", e));
        };
    }, [isScanning]);

    // Stop QR Scanner Effect
    useEffect(() => {
        if (!showStopScanner) return;

        const scanner = new Html5QrcodeScanner("stop-qr-reader", {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
        });

        scanner.render((decodedText) => {
            scanner.clear();
            setShowStopScanner(false);
            processStopCode(decodedText);
        }, (err) => {
            // ignore
        });

        return () => {
            scanner.clear().catch(e => console.error("Scanner cleared:", e));
        };
    }, [showStopScanner]);

    // Location Monitoring Effect (Leaflet watchPosition)
    useEffect(() => {
        if (timerActive && activeTicket && activeTicket.lat && activeTicket.lng) {
            setMonitoringLocation(true);

            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    setLocation({ lat: latitude, lng: longitude });
                    setGpsAccuracy(accuracy);

                    const dist = calculateDistance(
                        latitude,
                        longitude,
                        activeTicket.lat,
                        activeTicket.lng
                    );
                    setCurrentDistance(dist);

                    // 15-meter limit with GPS accuracy buffer
                    const accuracyBuffer = accuracy * 0.7;
                    const effectiveRadius = (activeTicket.radius || 15) + accuracyBuffer;
                    const isOut = dist > effectiveRadius;
                    setIsOutOfBounds(isOut);

                    // Automatically stop session if more than 15 meters away
                    if (isOut) {
                        handleBoundaryViolation();
                    }
                },
                (err) => {
                    console.error("Location tracking error:", err);
                    // Automatically stop timer if location is disabled or permission is revoked
                    if (err.code === 1 || err.code === 2) {
                        autoStopTimer("Security Alert: Location services must remain ON. Your session has been stopped.");
                    }
                },
                options
            );
        } else {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            setMonitoringLocation(false);
            setIsOutOfBounds(false);
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [timerActive, activeTicket]);

    const handleBoundaryViolation = async () => {
        if (warningCountdown === null) {
            setWarningCountdown(30); // Start a 30s countdown
        }
    };

    // Warning Countdown Effect (TICKER)
    useEffect(() => {
        let timer;
        if (isOutOfBounds && timerActive) {
            if (warningCountdown === null) setWarningCountdown(30);
            timer = setInterval(() => {
                setWarningCountdown(prev => {
                    if (prev === null) return 30;
                    if (prev <= 1) {
                        autoStopTimer("Geofencing restriction: You were out of bounds for more than 30 seconds.");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setWarningCountdown(null);
        }
        return () => clearInterval(timer);
    }, [isOutOfBounds, timerActive]);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    };

    const autoStopTimer = async (reason) => {
        if (!timerActive || tickets.length === 0) return;
        try {
            const ticketId = tickets[0].id;
            await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eticket_id: ticketId, action: 'out' }),
            });
            setTimerActive(false);
            setStartTime(null);
            setElapsed(0);
            fetchStudentData();
            alert(reason);
        } catch (e) { }
    };

    const fetchStudentData = async () => {
        if (!user.username) return;
        try {
            const vResponse = await fetch('/api/violations/');
            const allViolations = await vResponse.json();

            let allTickets = [];
            try {
                const tResponse = await fetch('/api/etickets/?t=' + Date.now());
                allTickets = await tResponse.json();
                console.log('DEBUG: All Tickets Received:', allTickets);
            } catch (e) { console.log('ETickets error', e); }

            let allLogs = [];
            try {
                const lResponse = await fetch('/api/timelogs/?t=' + Date.now());
                allLogs = await lResponse.json();
            } catch (e) { console.log('Timelogs error', e); }

            const studentViolations = allViolations.filter(v =>
                v.student_details?.student_id === user.username
            );

            const studentTickets = allTickets.filter(t =>
                t.violation_details?.student_details?.student_id === user.username && t.status !== 'Completed'
            );

            setViolations(studentViolations);
            setTickets(studentTickets);
            setLogs(allLogs);

            // Check for active Backend Timer
            if (studentTickets.length > 0) {
                const ongoingTicket = studentTickets.find(t => t.status === 'Ongoing') || studentTickets[0];
                const activeTicketId = ongoingTicket.id;
                const activeLog = allLogs.find(log =>
                    (log.eticket === activeTicketId || log.eticket?.id === activeTicketId) && !log.time_out
                );

                if (activeLog) {
                    setStartTime(new Date(activeLog.time_in).getTime());
                    setTimerActive(true);
                } else {
                    setTimerActive(false);
                    setStartTime(null);
                    setElapsed(0);
                }
            } else {
                setTimerActive(false);
                setStartTime(null);
                setElapsed(0);
            }
        } catch (error) {
            console.error('Error fetching student data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processCode = async (codeToProcess) => {
        const rawCode = (codeToProcess || adminCode) || "";
        const payloadCode = rawCode.trim().toUpperCase();

        if (tickets.length === 0) {
            alert("No active Service Obligations. Please wait for the Admin to assign your fresh violation.");
            return;
        }

        let actionType = null;
        let forcedLat = null;
        let forcedLng = null;
        let forcedRadius = 15; // 15 meters as requested
        const pinnedLoc = JSON.parse(localStorage.getItem('pinned-citc-loc') || 'null');

        // 1. Dynamic Coordinate QR (LAT:8.485121,LNG:124.656512)
        if (payloadCode.includes("LAT:") && payloadCode.includes("LNG:")) {
            try {
                const latMatch = payloadCode.match(/LAT:(-?\d+\.\d+)/);
                const lngMatch = payloadCode.match(/LNG:(-?\d+\.\d+)/);
                if (latMatch && lngMatch) {
                    forcedLat = parseFloat(latMatch[1]);
                    forcedLng = parseFloat(lngMatch[1]);
                    forcedRadius = 15;
                    actionType = 'in';
                }
            } catch (e) {
                console.error("Coordinate parsing error:", e);
            }
        }

        // 2. Specific Building/Dept Codes
        if (!actionType) {
            if (payloadCode.includes("CITC-BUILDING") || payloadCode.includes("CITC-DEPT")) {
                forcedLat = 8.503306;
                forcedLng = 124.660861;
                forcedRadius = 15;
                actionType = 'in';
            } else if (payloadCode.includes("CSM-DEPT")) {
                forcedLat = 8.485421;
                forcedLng = 124.656812;
                forcedRadius = 15;
                actionType = 'in';
            } else if (payloadCode.includes("CEA-DEPT")) {
                forcedLat = 8.485721;
                forcedLng = 124.657112;
                forcedRadius = 15;
                actionType = 'in';
            }
        }

        // 3. System Action Codes
        if (!actionType) {
            if (payloadCode.includes("OSA-START") || payloadCode.includes("OSA-RESUME")) {
                actionType = 'in';
            } else if (payloadCode.includes("OSA-PAUSE") || payloadCode.includes("OSA-STOP") || payloadCode.includes("OSA-OUT")) {
                actionType = 'out';
            }
        }

        if (!actionType) {
            alert("Invalid QR Code. Please scan a valid location or action code.");
            return;
        }
        try {
            // SECURITY REQUIREMENT: Mandatory location check for all Time-In actions
            if (actionType === 'in') {
                if (!navigator.geolocation) {
                    alert("SECURITY BLOCK: Geocation is not supported by this browser.");
                    return;
                }

                try {
                    // This "ping" ensures location is active and permissions are granted
                    await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 8000,
                            maximumAge: 0
                        });
                    });
                } catch (locErr) {
                    if (locErr.code === 1) {
                        alert("ACCESS DENIED: You must enable Location Services to start your service timer.");
                    } else if (locErr.code === 3) {
                        alert("GPS TIMEOUT: Please move to an area with better signal and try again.");
                    } else {
                        alert("LOCATION ERROR: Unable to verify your position. Please ensure GPS is ON.");
                    }
                    return;
                }
            }

            const ticketId = tickets[0].id;
            const response = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eticket_id: ticketId,
                    action: actionType,
                    lat: forcedLat,
                    lng: forcedLng,
                    radius: forcedRadius
                }),
            });

            if (response.ok) {
                setStartTime(Date.now());
                setTimerActive(true);
                setShowAdminCode(false);
                setAdminCode('');
                fetchStudentData();
            } else {
                alert("Server error. Check if the backend is running.");
            }
        } catch (err) {
            console.error(err);
            if (err.code === 1) alert("PERMISSION DENIED: Please reset location permissions in your browser settings.");
            else if (err.code === 3) alert("GPS TIMEOUT: Move closer to a window for a better signal.");
            else alert("Error: " + (err.message || "Unknown Failure"));
        }
    };

    const processStopCode = async (codeToProcess) => {
        const payloadCode = (codeToProcess || "").trim().toUpperCase();
        if (tickets.length === 0) {
            alert("No active Service Obligations to process.");
            return;
        }

        if (payloadCode !== "OSA-PAUSE" && payloadCode !== "CITC-BUILDING-3M" && payloadCode !== "OSA-STOP") {
            alert(`INVALID CODE: ${payloadCode}. Please scan a valid STOP QR code.`);
            return;
        }

        try {
            const ticketId = tickets[0].id;
            const response = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eticket_id: ticketId,
                    action: 'out'
                }),
            });

            if (response.ok) {
                setTimerActive(false);
                setStartTime(null);
                setElapsed(0);
                fetchStudentData();
            }
        } catch (err) {
            alert("Network failure processing action code.");
        }
    };

    const formatRemainingTime = () => {
        if (!activeTicket) return '00:00:00';
        const currentRemainingHours = Math.max(0, displayHours - (elapsed / 3600));
        const hours = Math.floor(currentRemainingHours);
        const minutes = Math.floor((currentRemainingHours - hours) * 60);
        const seconds = Math.floor(((currentRemainingHours - hours) * 60 - minutes) * 60);
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const formatObligationTime = (hours) => {
        if (hours <= 0) return '0 hrs';
        if (hours >= 1) return `${Math.round(hours * 10) / 10} hrs`;
        const mins = Math.round(hours * 60);
        return `${mins} min`;
    };

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            {/* QR Scanner Modals */}
            {isScanning && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors z-10">
                            <X size={20} />
                        </button>
                        <div className="text-center mb-6">
                            <h3 className="font-black text-xl text-slate-800 tracking-tight">Staff Code Scanner</h3>
                            <p className="text-xs font-medium text-slate-400 mt-2">Scan OSA Staff Action Codes</p>
                        </div>
                        <div id="student-qr-reader" className="w-full rounded-2xl overflow-hidden border-4 border-slate-100"></div>
                    </div>
                </div>
            )}

            {showStopScanner && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <button onClick={() => setShowStopScanner(false)} className="absolute top-4 right-4 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors z-10">
                            <X size={20} />
                        </button>
                        <div className="text-center mb-6">
                            <h3 className="font-black text-xl text-red-600 tracking-tight">Stop Timer</h3>
                            <p className="text-xs font-medium text-slate-400 mt-2">Scan QR code to pause your timer</p>
                        </div>
                        <div id="stop-qr-reader" className="w-full rounded-2xl overflow-hidden border-4 border-red-100"></div>
                    </div>
                </div>
            )}

            <Sidebar role="student" />
            <main className="flex-1 p-4 md:p-10 pt-24 md:pt-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                    <div className="w-full">
                        {/* Debug Bar for ID Verification */}
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight uppercase">Service Hub</h1>
                        <p className="text-slate-500 mt-1 font-medium italic text-sm md:text-base">Welcome back, {user.name || user.username || 'Student'}</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Col: Obligation & Timer */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Service Obligation Card */}
                        <div className="card-premium bg-slate-900 text-white relative overflow-hidden p-8 border-4 border-yellow-400/20">
                            <p className=" text-[9px] uppercase font-black tracking-[0.4em] text-yellow-400 mb-6 drop-shadow-sm">Service Obligation</p>
                    <div className="text-4xl md:text-5xl font-mono text-yellow-400 font-black tracking-tighter drop-shadow-xl">{formatObligationTime(displayHours)}</div>
                    <div className="text-[9px] font-black tracking-widest text-yellow-400/80 mt-2 uppercase">Remaining Time</div>
                </div>

                {/* Timer / Scanner Card */}
                <div className="card-premium flex flex-col items-center justify-center p-8 border-2 border-white shadow-xl relative overflow-hidden">
                    {timerActive && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 animate-pulse shadow-[0_0_15px_rgba(255,184,28,0.5)]" />
                    )}

                    <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center transition-all duration-500 ${timerActive ? 'bg-green-500 text-white shadow-2xl rotate-[360deg]' : 'bg-slate-50 text-slate-300'}`}>
                        {timerActive ? <Clock size={32} className="animate-spin-slow" /> : <Scan size={32} />}
                    </div>

                    <div className="text-center w-full mt-6">
                        <h4 className="font-black text-slate-900 text-lg tracking-tight uppercase">
                            {timerActive ? "Service in Progress" : "Staff Code Scanner"}
                        </h4>
                        {timerActive ? (
                            <div className="w-full flex flex-col items-center mt-4">
                                <div className="font-mono text-2xl font-black text-green-600 tracking-tighter animate-pulse mb-2">
                                    {formatRemainingTime()}
                                </div>

                                {/* Live Map Integration */}
                                <div className="card-premium w-full p-0 border-2 border-white shadow-xl overflow-hidden relative group h-[260px]">
                                    <div id="geofence-map" className="w-full h-full bg-slate-50 relative z-10" />
                                    {!timerActive && (
                                        <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-6">
                                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-xl">
                                                <MapPin size={20} />
                                            </div>
                                            <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-1">Satellite Tracking Inactive</p>
                                            <p className="text-[8px] text-slate-400 font-bold max-w-[150px]">Scan a Staff QR code to activate live boundary monitoring.</p>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur p-2 rounded-xl text-[7px] font-black uppercase tracking-widest shadow-xl border border-white">
                                        Live GPS Feed
                                    </div>
                                </div>

                                {monitoringLocation && (
                                    <div className="flex flex-col items-center gap-2 mb-6 w-full">
                                        {/* 10-Second Warning Alert */}
                                        {warningCountdown !== null && (
                                            <div className="w-full bg-red-600 text-white p-3 rounded-2xl mb-4 animate-bounce shadow-2xl flex items-center justify-between border-2 border-red-400">
                                                <div className="flex items-center gap-3">
                                                    <AlertTriangle size={20} className="animate-pulse" />
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest leading-none">Warning: Out of Boundary</p>
                                                        <p className="text-[10px] font-bold mt-1">Return to area immediately!</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white text-red-600 w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-inner">
                                                    {warningCountdown}
                                                </div>
                                            </div>
                                        )}

                                        <div className={`p-5 rounded-[28px] w-full border-2 transition-all ${isOutOfBounds ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Position Status</p>
                                                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${isOutOfBounds ? "bg-rose-600 text-white shadow-lg shadow-rose-200" : "bg-emerald-600 text-white shadow-lg shadow-emerald-200"}`}>
                                                    {isOutOfBounds ? "Outside Area" : "Inside Area"}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center py-2">
                                                <div className={`text-3xl font-black tracking-tight mb-1 ${currentDistance <= (activeTicket?.radius || 5) ? "text-emerald-700" :
                                                        currentDistance <= 25 ? "text-amber-600" : "text-rose-700"
                                                    }`}>
                                                    {currentDistance <= (activeTicket?.radius || 5) ? "Very Near" :
                                                        currentDistance <= 25 ? "Near" : "Far"}
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                                    Est. Distance: {Math.round(currentDistance)}m
                                                </p>
                                            </div>

                                            <div className={`mt-3 pt-3 border-t flex items-center justify-between ${isOutOfBounds ? "border-rose-100" : "border-emerald-100"}`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                    <MapPin size={10} /> Precision
                                                </p>
                                                <p className={`text-[9px] font-black tracking-tight ${gpsAccuracy > 15 ? "text-amber-600" : "text-emerald-600"}`}>
                                                    {gpsAccuracy < 10 ? "Excellent" : gpsAccuracy < 25 ? "Good" : "Weak"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <button onClick={() => setShowStopScanner(true)} className="w-full bg-red-50 text-red-600 border-2 border-red-200 font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all uppercase text-[9px] tracking-widest">
                                    <QrCode size={14} /> Scan to Stop
                                </button>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 mt-4 font-medium max-w-[200px] leading-relaxed mx-auto text-center">
                                {displayHours > 0 ? "Scan QR from OSA Staff to start your service session." : "No active service requirements at this time."}
                            </p>
                        )}
                    </div>

                    {!showAdminCode && !timerActive && (
                        <div className="w-full grid grid-cols-2 gap-4 mt-8">
                            <button onClick={() => setIsScanning(true)} className="bg-ustp-blue text-white font-black py-3 rounded-xl shadow-lg uppercase tracking-widest text-[9px] flex items-center justify-center gap-2">
                                <QrCode size={14} /> Scan QR
                            </button>
                            <button onClick={() => setShowAdminCode(true)} className="bg-slate-900 text-white font-black py-3 rounded-xl shadow-lg uppercase tracking-widest text-[9px] flex flex-col items-center justify-center">
                                <Key size={12} className="mb-0.5" /> Manual
                            </button>
                        </div>
                    )}

                    {showAdminCode && (
                        <div className="w-full space-y-4 mt-6">
                            <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-center outline-none focus:border-ustp-blue tracking-widest text-sm" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && processCode()} />
                            <div className="flex gap-2">
                                <button onClick={() => processCode()} className="flex-1 bg-ustp-blue text-white font-black py-3 rounded-xl text-[9px] uppercase">Submit</button>
                                <button onClick={() => { setShowAdminCode(false); setAdminCode(''); }} className="flex-1 bg-slate-100 text-slate-400 font-black py-3 rounded-xl text-[9px] uppercase">Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
        </div>

                    {/* Right Col: Violations */ }
    <div className="lg:col-span-8 space-y-8">
        <div className="card-premium border-2 border-white shadow-xl p-6 md:p-8">
            <h4 className="font-black text-slate-900 text-lg flex items-center gap-4 mb-8 pb-6 border-b border-slate-50 uppercase tracking-tight">
                <AlertTriangle className="text-red-500" size={20} />
                Violation Records
            </h4>

            {loading ? (
                <div className="py-20 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest text-[10px]">Syncing Data...</div>
            ) : (() => {
                const activeViolations = violations;

                if (activeViolations.length === 0) {
                    return (
                        <div className="bg-slate-50/50 rounded-[32px] p-16 border-4 border-dotted border-slate-100 text-center">
                            <Shield className="mx-auto text-slate-200 mb-6" size={40} />
                            <h5 className="font-black text-slate-800 text-lg tracking-tighter uppercase">Good Standing</h5>
                            <p className="text-slate-400 text-xs mt-3 font-medium max-w-xs mx-auto leading-relaxed">No active violations detected. Keep up the good work!</p>
                        </div>
                    );
                }

                return (
                    <div className="space-y-3">
                        {activeViolations.map((v) => {
                            const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
                            const isOngoing = ticket?.status === 'Ongoing';
                            const isCompleted = ticket?.status === 'Completed' || v.status === 'Completed';

                            let displayStatus = v.status;
                            if (ticket) {
                                displayStatus = ticket.status;
                            }
                            if (displayStatus === 'Approved') displayStatus = 'Active';
                            if (isCompleted || displayStatus === 'Completed') displayStatus = 'Finished';

                            return (
                                <div key={v.id} className={`p-5 border rounded-[28px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${isOngoing ? 'bg-green-50 border-green-200' : isCompleted ? 'bg-emerald-50 border-emerald-200 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <div className="flex gap-4 items-center w-full">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isOngoing ? 'bg-green-500 text-white shadow-lg shadow-green-200' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-red-50 text-red-600'}`}>
                                            {isOngoing ? <Clock size={20} className="animate-spin-slow" /> : isCompleted ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h6 className="font-black text-slate-900 text-base uppercase truncate tracking-tight mb-1">{v.violation_type}</h6>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                                    isOngoing ? 'bg-green-200 text-green-800' : 
                                                    displayStatus === 'Finished' ? 'bg-blue-200 text-blue-800' :
                                                    isCompleted ? 'bg-emerald-200 text-emerald-800' : 
                                                    'bg-orange-100 text-orange-600'
                                                }`}>
                                                    {displayStatus}
                                                </span>
                                                <span className="text-[8px] text-slate-300 font-bold">{new Date(v.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center shrink-0 ${isOngoing ? 'bg-green-500 text-white shadow-lg shadow-green-200' : isCompleted ? 'bg-emerald-50 text-emerald-200' : 'bg-slate-50 text-slate-100'}`}>
                                            {isOngoing ? <Clock size={16} className="animate-pulse" /> : isCompleted ? <CheckCircle size={16} /> : <Play size={16} />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;

```

### File: frontend\src\pages\StudentRegistration.jsx
```javascript
import React, { useState } from 'react';
import { 
    UserPlus, 
    CheckCircle2, 
    QrCode, 
    Download, 
    ChevronRight, 
    IdCard, 
    Mail, 
    Phone, 
    GraduationCap, 
    Building2, 
    Layers, 
    Lock,
    Loader2
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Link } from 'react-router-dom';

const COURSES = [
    "BS Civil Engineering", "BS Electronics Engineering", "BS Electrical Engineering", "BS Mechanical Engineering",
    "BS Computer Engineering", "BS Geodetic Engineering", "BS Food Technology", "BS Information Technology",
    "BS Computer Science", "BS Data Science", "BS Technology Communication Management", "BS Applied Physics",
    "BS Applied Mathematics", "BS Chemistry", "BS Environmental Science", "BS Secondary Education Major in Science",
    "Major in Mathematics", "B. Tech & Livelihood Education (Home Economics)", "B. Tech & Livelihood Education (Industrial Arts)",
    "Bachelor in Technical-Vocational Teacher Education Major in Computer System Servicing", "Major in Fashion and Garments",
    "Major in Food Service Management", "BS AutoTronics", "BS Electro-Mechanical Technology", "BS Electronics Technology",
    "BS Energy Systems and Management", "BS Manufacturing Engineering Technology", "College of Medicine", "Senior High School"
];

const DEPARTMENTS = [
    "College of Engineering and Architecture (CEA)", "College of Information Technology and Computing (CITC)",
    "College of Science and Mathematics (CSM)", "College of Science and Technology Education (CSTE)",
    "College of Technology (CT)", "College of Medicine (COM)", "Senior High School (SHS)"
];

const StudentRegistration = () => {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [studentData, setStudentData] = useState({
        student_id: '',
        name: '',
        course: '',
        department: '',
        year_level: '',
        email: '',
        contact_number: '',
        password: ''
    });

    const CSSLogo = ({ className = "" }) => (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <div className="absolute -top-1 -left-1 w-4 h-3 bg-amber-400 rounded-tr-[4px] rounded-tl-[2px]" />
                <h2 className="text-xl font-bold text-slate-800 tracking-tight relative z-10 leading-none">OSA</h2>
            </div>
            <span className="text-xl font-bold text-blue-900">Connect</span>
        </div>
    );

    const formatQRData = (student) => {
        if (!student.name) return student.student_id;
        const nameParts = student.name.trim().split(/\s+/);
        let firstName = nameParts[0] || '';
        let middleInitial = '';
        let lastName = '';
        if (nameParts.length >= 2) {
            const lastPart = nameParts[nameParts.length - 1];
            if (lastPart.endsWith('.') || lastPart.length <= 3) {
                middleInitial = lastPart;
                lastName = nameParts.length > 2 ? nameParts[nameParts.length - 2] : '';
            } else {
                lastName = lastPart;
                middleInitial = nameParts.length > 2 ? nameParts[1] : '';
            }
        }
        const formattedName = `${firstName.toUpperCase()} ${middleInitial.toUpperCase()} ${lastName.toUpperCase()}`.trim();
        const course = student.course ? student.course.replace(/^BS|^BSIT|^BSCS|^BSCE|^BSEE|^BSME|^BSCpE/i, '').trim() : '';
        return `${student.student_id} ${formattedName} ${course}`.trim();
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...studentData,
                password: studentData.password || studentData.student_id
            };
            const response = await fetch('/api/students/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setStep(2);
            } else {
                const data = await response.json();
                alert(`Registration failed: ${data.error || data.message || 'Check your details'}`);
            }
        } catch (error) {
            alert('Server connection error');
        } finally {
            setSaving(false);
        }
    };

    const downloadQR = () => {
        const svg = document.getElementById('qr-code-svg');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = 1024;
            canvas.height = 1024;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, 1024, 1024);
            const pngFile = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.download = `${studentData.student_id}_qr_secure.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-2xl space-y-10">
                
                {/* Clean Header */}
                <div className="text-center space-y-4">
                    <CSSLogo className="justify-center" />
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Student Identity Proxy</h1>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest text-blue-900/60">Registry Portal</p>
                    </div>
                </div>

                {/* Stable Registration Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-12">
                    {step === 1 ? (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="border-b border-slate-50 pb-6">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Account Details</h2>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Step 01: Personal Information</p>
                            </div>

                            <form onSubmit={handleRegister} className="space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {[
                                        { label: 'Student ID', key: 'student_id', icon: IdCard, placeholder: '2023303188' },
                                        { label: 'Full Name', key: 'name', icon: UserPlus, placeholder: 'First M. Last' },
                                        { label: 'Course', key: 'course', icon: GraduationCap, type: 'select', options: COURSES },
                                        { label: 'Department', key: 'department', icon: Building2, type: 'select', options: DEPARTMENTS },
                                        { label: 'Year Level', key: 'year_level', icon: Layers, type: 'select', options: [1,2,3,4,5] },
                                        { label: 'Contact', key: 'contact_number', icon: Phone, placeholder: '09XXX' }
                                    ].map((f) => (
                                        <div key={f.key} className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                                            {f.type === 'select' ? (
                                                <select required value={studentData[f.key]} onChange={(e) => setStudentData({...studentData, [f.key]: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-600 appearance-none text-sm transition-none">
                                                    <option value="">Select {f.label}</option>
                                                    {f.options.map(o => <option key={o} value={o}>{f.key === 'year_level' ? `Year ${o}` : o}</option>)}
                                                </select>
                                            ) : (
                                                <input required type="text" value={studentData[f.key]} onChange={(e) => setStudentData({...studentData, [f.key]: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none font-semibold text-slate-700 placeholder:text-slate-200 focus:bg-white focus:border-blue-600 text-sm transition-none" placeholder={f.placeholder} />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-6 pt-6 border-t border-slate-100">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                        <input required type="email" value={studentData.email} onChange={(e) => setStudentData({...studentData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3.5 outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-600 transition-none text-sm" placeholder="student@example.edu" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                        <input type="password" value={studentData.password} onChange={(e) => setStudentData({...studentData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3.5 outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-600 transition-none text-sm" placeholder="ID as default if blank" />
                                    </div>
                                </div>

                                <button type="submit" disabled={saving} className="w-full h-14 bg-blue-900 text-white rounded-lg font-bold text-xs uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors">
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : <>Complete Registration <ChevronRight size={18} /></>}
                                </button>
                            </form>

                            <div className="mt-10 text-center pt-8 border-t border-slate-100/50">
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Already have an account? <Link to="/login" className="text-blue-900 font-bold underline underline-offset-4">Log in</Link></p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-10 border border-blue-100">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight mb-2">Registration Success</h2>
                            <p className="text-slate-500 font-bold text-sm max-w-sm mx-auto mb-10">Verification complete. Save your official QR credentials below for campus entry.</p>

                            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 inline-block mb-10">
                                <QRCode id="qr-code-svg" value={formatQRData(studentData)} size={200} level={"H"} />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                                <button onClick={downloadQR} className="h-14 flex-1 bg-blue-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors">
                                    <Download size={18} /> Download QR ID
                                </button>
                                <Link to="/login" className="h-14 flex-1 bg-slate-100 text-slate-500 rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-colors">
                                    Continue to Login
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <p className="mt-12 text-[10px] font-bold text-slate-300 uppercase tracking-widest">OSA CONNECT SECURITY © 2026</p>
        </div>
    );
};

export default StudentRegistration;

```

### File: frontend\src\pages\admin\AdminDashboard.jsx
```javascript
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import {
    Users,
    AlertTriangle,
    Clock,
    CheckCircle,
    Shield,
    Activity,
    TrendingUp,
    Calendar,
    UserCheck,
    AlertCircle,
    Settings,
    RefreshCw
} from 'lucide-react';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalViolations: 0,
        pendingReviews: 0,
        activeTickets: 0,
        completedToday: 0,
        guards: 0,
        staff: 0,
        faculty: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [systemHealth, setSystemHealth] = useState({ online: true, lastSync: new Date() });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdminData();
        const poll = setInterval(fetchAdminData, 10000);
        return () => clearInterval(poll);
    }, []);

    const fetchAdminData = async () => {
        try {
            const [violationsRes, ticketsRes, logsRes] = await Promise.all([
                fetch('/api/violations/').catch(() => ({ ok: false, json: async () => [] })),
                fetch('/api/etickets/').catch(() => ({ ok: false, json: async () => [] })),
                fetch('/api/timelogs/').catch(() => ({ ok: false, json: async () => [] }))
            ]);

            const violations = violationsRes.ok ? await violationsRes.json() : [];
            const tickets = ticketsRes.ok ? await ticketsRes.json() : [];
            const logs = logsRes.ok ? await logsRes.json() : [];

            const pending = violations.filter(v => v.status?.toLowerCase().includes('pending')).length;
            const activeTickets = tickets.filter(t => t.status === 'Ongoing').length;
            const today = new Date().toDateString();
            const completedToday = tickets.filter(t => {
                const updated = t.updated_at ? new Date(t.updated_at).toDateString() : '';
                return t.status === 'Completed' && updated === today;
            }).length;

            const uniqueStudents = new Set(violations.map(v => v.student_details?.student_id).filter(Boolean));

            setStats({
                totalStudents: uniqueStudents.size,
                totalViolations: violations.length,
                pendingReviews: pending,
                activeTickets,
                completedToday,
                guards: 3,
                staff: 2,
                faculty: 5
            });

            const activities = [
                ...violations.slice(0, 5).map(v => ({
                    id: v.id,
                    type: 'violation',
                    message: `${v.student_details?.name || 'Unknown'} - ${v.violation_type}`,
                    time: v.created_at,
                    status: v.status
                })),
                ...tickets.slice(0, 5).map(t => ({
                    id: t.id,
                    type: 'ticket',
                    message: `${t.student_details?.name || 'Unknown'} - ${t.punishment}`,
                    time: t.updated_at || t.created_at,
                    status: t.status
                }))
            ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

            setRecentActivity(activities);
            setSystemHealth({ online: true, lastSync: new Date() });
        } catch (error) {
            console.error('Error fetching admin data:', error);
            setSystemHealth({ online: false, lastSync: new Date() });
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (isoDate) => {
        if (!isoDate) return '';
        const diff = Date.now() - new Date(isoDate).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (mins > 0) return `${mins}m ago`;
        return 'Just now';
    };

    const StatCard = ({ icon: Icon, label, value, color, bgColor }) => (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center shadow-lg`}>
                    <Icon className={color} size={28} />
                </div>
                <div>
                    <p className="text-3xl font-black text-slate-900">{loading ? '...' : value}</p>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            <Sidebar role="admin" />
            <div className="flex-1 flex flex-col lg:flex-row">
                <main className="flex-1 p-4 md:p-10 pt-24 md:pt-10 max-w-7xl mx-auto overflow-y-auto">
                    <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight uppercase italic">
                                Admin Command Center
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">
                                {loading ? 'Loading system data...' : 'System overview and management'}
                            </p>
                        </div>
                        <button
                            onClick={fetchAdminData}
                            className="flex items-center gap-2 px-4 py-2 bg-ustp-blue text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </header>

                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                icon={Users}
                                label="Total Students"
                                value={stats.totalStudents}
                                color="text-blue-600"
                                bgColor="bg-blue-50"
                            />
                            <StatCard
                                icon={AlertTriangle}
                                label="Total Violations"
                                value={stats.totalViolations}
                                color="text-red-600"
                                bgColor="bg-red-50"
                            />
                            <StatCard
                                icon={Clock}
                                label="Pending Reviews"
                                value={stats.pendingReviews}
                                color="text-orange-600"
                                bgColor="bg-orange-50"
                            />
                            <StatCard
                                icon={CheckCircle}
                                label="Active Tickets"
                                value={stats.activeTickets}
                                color="text-green-600"
                                bgColor="bg-green-50"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <StatCard
                                icon={Activity}
                                label="Completed Today"
                                value={stats.completedToday}
                                color="text-emerald-600"
                                bgColor="bg-emerald-50"
                            />
                            <StatCard
                                icon={Shield}
                                label="System Status"
                                value={systemHealth.online ? 'Online' : 'Offline'}
                                color={systemHealth.online ? 'text-green-600' : 'text-red-600'}
                                bgColor={systemHealth.online ? 'bg-green-50' : 'bg-red-50'}
                            />
                            <StatCard
                                icon={Calendar}
                                label="Last Sync"
                                value={formatTimeAgo(systemHealth.lastSync)}
                                color="text-slate-600"
                                bgColor="bg-slate-50"
                            />
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-lg">User Roles Overview</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-2xl">
                                    <Shield className="mx-auto text-blue-600 mb-2" size={32} />
                                    <p className="text-2xl font-black text-blue-700">{stats.guards}</p>
                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Guards</p>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-2xl">
                                    <UserCheck className="mx-auto text-purple-600 mb-2" size={32} />
                                    <p className="text-2xl font-black text-purple-700">{stats.staff}</p>
                                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Staff</p>
                                </div>
                                <div className="text-center p-4 bg-indigo-50 rounded-2xl">
                                    <Users className="mx-auto text-indigo-600 mb-2" size={32} />
                                    <p className="text-2xl font-black text-indigo-700">{stats.faculty}</p>
                                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Faculty</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-lg">Recent Activity</h3>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {recentActivity.length} events
                                </span>
                            </div>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {recentActivity.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Activity className="mx-auto text-slate-200 mb-3" size={48} />
                                        <p className="text-slate-400 font-semibold">No recent activity</p>
                                    </div>
                                ) : (
                                    recentActivity.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                activity.type === 'violation' ? 'bg-red-100' : 'bg-blue-100'
                                            }`}>
                                                {activity.type === 'violation' ? (
                                                    <AlertCircle className="text-red-600" size={20} />
                                                ) : (
                                                    <CheckCircle className="text-blue-600" size={20} />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-800 text-sm">{activity.message}</p>
                                                <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(activity.time)}</p>
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                                activity.status?.toLowerCase().includes('pending') ? 'bg-orange-100 text-orange-700' :
                                                activity.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                activity.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {activity.status}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                            <div className="flex items-center gap-4 mb-4">
                                <TrendingUp className="text-ustp-gold" size={28} />
                                <h3 className="font-bold uppercase tracking-wider">Quick Actions</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <a
                                    href="/admin/students"
                                    className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    <Users size={24} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Manage Students</span>
                                </a>
                                <a
                                    href="/admin/pending"
                                    className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    <AlertTriangle size={24} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Pending Reviews</span>
                                </a>
                                <a
                                    href="/admin/analytics"
                                    className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    <Activity size={24} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Analytics</span>
                                </a>
                                <a
                                    href="/admin/settings"
                                    className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    <Settings size={24} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;

```

### File: frontend\src\pages\faculty\FacultyDashboard.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ClipboardList, Users, LogOut, MapPin, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

const FacultyDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ total: 0, pending: 0, cleared: 0 });
    const [recentViolations, setRecentViolations] = useState([]);
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const vResponse = await fetch('/api/violations/');
            const vData = await vResponse.json();
            
            if (Array.isArray(vData)) {
                const pending = vData.filter(v => v.status === 'Pending OSA Review').length;
                const cleared = vData.filter(v => v.status === 'Cleared').length;
                setStats({ total: vData.length, pending, cleared });
                setRecentViolations(vData.slice(0, 5));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending OSA Review': return 'bg-amber-100 text-amber-700';
            case 'Approved': return 'bg-blue-100 text-blue-700';
            case 'Dismissed': return 'bg-red-100 text-red-700';
            case 'Cleared': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-ustp-navy rounded-xl flex items-center justify-center shadow-lg">
                                <Shield className="text-ustp-gold" size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900">Faculty Portal</h1>
                                <p className="text-sm text-slate-500">Welcome, {user.full_name || user.username}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold transition"
                        >
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                                <ClipboardList className="text-blue-600" size={28} />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                                <p className="text-sm text-slate-500 font-medium">Total Violations</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Clock className="text-amber-600" size={28} />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900">{stats.pending}</p>
                                <p className="text-sm text-slate-500 font-medium">Pending Review</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                                <CheckCircle className="text-green-600" size={28} />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900">{stats.cleared}</p>
                                <p className="text-sm text-slate-500 font-medium">Cleared</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Link
                        to="/faculty/report"
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-ustp-blue/30 transition group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-ustp-blue/10 rounded-2xl flex items-center justify-center group-hover:bg-ustp-blue/20 transition">
                                <AlertTriangle className="text-ustp-blue" size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Report Violation</h3>
                                <p className="text-sm text-slate-500">File a new violation report</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/faculty/history"
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-green-500/30 transition group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center group-hover:bg-green-100 transition">
                                <ClipboardList className="text-green-600" size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">View History</h3>
                                <p className="text-sm text-slate-500">View violation history</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Recent Violations */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-slate-900">Recent Violations</h2>
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 text-sm text-ustp-blue hover:text-blue-700 font-semibold"
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-slate-500">Loading...</div>
                    ) : recentViolations.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle className="mx-auto text-green-400 mb-4" size={48} />
                            <p className="text-slate-500">No violations recorded</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentViolations.map((violation) => (
                                <div key={violation.id || violation._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                                            <Users size={18} className="text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{violation.student?.name || 'Unknown Student'}</p>
                                            <p className="text-sm text-slate-500">{violation.violation_type}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(violation.status)}`}>
                                        {violation.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Location Tracking Section */}
                <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <MapPin className="text-ustp-blue" size={24} />
                        <h2 className="text-xl font-black text-slate-900">Student Location Tracking</h2>
                    </div>
                    <p className="text-slate-500 mb-4">
                        Monitor student geofence status and location compliance in real-time.
                    </p>
                    <div className="bg-slate-50 rounded-xl p-8 text-center">
                        <MapPin className="mx-auto text-slate-300 mb-3" size={48} />
                        <p className="text-slate-500 font-medium">Location tracking will be displayed here</p>
                        <p className="text-sm text-slate-400 mt-1">Students with active E-Tickets can be tracked</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FacultyDashboard;

```

### File: frontend\src\pages\guard\GuardHistory.jsx
```javascript
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Clock, AlertTriangle, Filter, Search } from 'lucide-react';

const GuardHistory = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = user.role || 'guard';

    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchViolations();
        const interval = setInterval(fetchViolations, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchViolations = async () => {
        try {
            const response = await fetch('/api/violations/');
            if (response.ok) {
                const data = await response.json();
                setViolations(data.reverse());
            }
        } catch (error) {
            console.error('Failed to fetch violations:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredViolations = violations.filter(v => {
        const matchesSearch =
            v.student_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.student_details?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.violation_type?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filter === 'all') return matchesSearch;
        if (filter === 'pending') return matchesSearch && v.status === 'Pending OSA Review';
        if (filter === 'approved') return matchesSearch && v.status === 'Approved';
        if (filter === 'dismissed') return matchesSearch && v.status === 'Dismissed';
        return matchesSearch;
    });

    const statusCounts = {
        all: violations.length,
        pending: violations.filter(v => v.status === 'Pending OSA Review').length,
        approved: violations.filter(v => v.status === 'Approved').length,
        dismissed: violations.filter(v => v.status === 'Dismissed').length,
    };

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            <Sidebar role={userRole} />
            <main className="flex-1 p-3 md:p-6 pt-20 md:pt-6 max-w-7xl mx-auto h-screen overflow-hidden flex flex-col">
                <header className="mb-4 text-center md:text-left shrink-0">
                    <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                        {userRole === 'faculty' ? 'Faculty Submission History' : 'Violation History'}
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic text-xs">
                        {loading ? 'Syncing history...' : `Viewing ${filteredViolations.length} records`}
                    </p>
                </header>

                <div className="flex-1 overflow-y-auto pr-1 pb-10 custom-scrollbar mt-2">
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, student ID, or violation..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'pending', 'approved', 'dismissed'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${filter === f
                                        ? 'bg-ustp-blue text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)} ({statusCounts[f]})
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin w-12 h-12 border-4 border-ustp-blue border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-4 text-slate-500 font-medium">Loading violations...</p>
                    </div>
                ) : filteredViolations.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                        <Clock className="mx-auto text-slate-200 mb-4" size={48} />
                        <h5 className="font-bold text-slate-400 uppercase tracking-[0.2em] text-xs">No Violations Found</h5>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredViolations.map((report) => (
                            <div key={report.id} className="card-premium p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-lg text-slate-800">
                                                {report.student_details?.name || 'Unknown Student'}
                                            </h3>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${report.status === 'Pending OSA Review' ? 'bg-yellow-100 text-yellow-800' :
                                                    report.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                        report.status === 'Dismissed' ? 'bg-red-100 text-red-800' :
                                                            'bg-slate-100 text-slate-600'
                                                }`}>
                                                {report.status || 'Pending'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            Student ID: {report.student_details?.student_id || report.student_id || 'N/A'}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            Course: {report.student_details?.course || 'N/A'} - {report.student_details?.department || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-ustp-blue uppercase">{report.violation_type}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {report.created_at ? new Date(report.created_at).toLocaleString() : 'N/A'}
                                        </p>
                                        <p className="text-xs text-slate-400">Reporter: {report.reporting_guard}</p>
                                    </div>
                                </div>
                                {report.description && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-sm text-slate-600">{report.description}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
        </div>
    );
};

export default GuardHistory;

```

### File: frontend\src\pages\guard\ReportViolation.jsx
```javascript
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Shield, Scan, Send, AlertCircle, CheckCircle2, User, UserPlus, ClipboardList, Clock, X, QrCode, LogOut } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const COURSES = [
    "BS Civil Engineering", "BS Electronics Engineering", "BS Electrical Engineering", "BS Mechanical Engineering",
    "BS Computer Engineering", "BS Geodetic Engineering", "BS Food Technology", "BS Information Technology",
    "BS Computer Science", "BS Data Science", "BS Technology Communication Management", "BS Applied Physics",
    "BS Applied Mathematics", "BS Chemistry", "BS Environmental Science", "BS Secondary Education Major in Science",
    "Major in Mathematics", "B. Tech & Livelihood Education (Home Economics)", "B. Tech & Livelihood Education (Industrial Arts)",
    "Bachelor in Technical-Vocational Teacher Education Major in Computer System Servicing", "Major in Fashion and Garments",
    "Major in Food Service Management", "BS AutoTronics", "BS Electro-Mechanical Technology", "BS Electronics Technology",
    "BS Energy Systems and Management", "BS Manufacturing Engineering Technology", "College of Medicine", "Senior High School"
];

const DEPARTMENTS = [
    "College of Engineering and Architecture (CEA)", "College of Information Technology and Computing (CITC)",
    "College of Science and Mathematics (CSM)", "College of Science and Technology Education (CSTE)",
    "College of Technology (CT)", "College of Medicine (COM)", "Senior High School (SHS)"
];

const ReportViolation = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = user.role || 'guard';
    const userName = user.full_name || 'Personnel';

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [form, setForm] = useState({
        student_id: '', name: '', course: '', department: '', contact: '',
        email: '', violation: '',
        incident_date: new Date().toISOString().split('T')[0],
        incident_time: new Date().toTimeString().slice(0, 5)
    });

    // Scanner Effect
    useEffect(() => {
        if (!isScanning) return;
        const scanner = new Html5QrcodeScanner("report-qr-reader", {
            fps: 10, qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0, rememberLastUsedCamera: true
        });
        scanner.render((decodedText) => {
            scanner.clear();
            setIsScanning(false);

            // New Format: NAME, ID, COURSE
            // Example: VINCENT M. DAGARAGA, 2023303188, BSIT
            const parts = decodedText.split(',').map(p => p.trim());

            if (parts.length >= 2) {
                const name = parts[0];
                const studentId = parts[1];
                const course = parts[2] || '';

                setForm(prev => ({
                    ...prev,
                    name: name,
                    student_id: studentId,
                    course: course
                }));
            } else {
                // Fallback for standard ID-only codes
                const idMatch = decodedText.match(/\b(20\d{7,})\b/);
                const studentId = idMatch ? idMatch[1] : decodedText;
                setForm(prev => ({ ...prev, student_id: studentId }));
                if (studentId.length >= 8) fetchStudentData(studentId);
            }
        });
        return () => { scanner.clear().catch(e => { }); };
    }, [isScanning]);

    const fetchStudentData = async (id) => {
        try {
            const response = await fetch(`/api/students/${id}/`);
            if (response.ok) {
                const data = await response.json();
                setForm(prev => ({
                    ...prev, student_id: id, name: data.name, course: data.course,
                    department: data.department, contact: data.contact_number, email: data.email
                }));
            }
        } catch (error) { }
    };

    const handleIdChange = (e) => {
        const id = e.target.value;
        setForm(prev => ({ ...prev, student_id: id }));
        if (id.length >= 8) fetchStudentData(id);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const confirmSubmission = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        setStatusMsg('Syncing with Cloud Database...');
        try {
            const response = await fetch('/api/violations/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, reporting_guard: userName }),
            });
            if (response.ok) setStep(2);
            else {
                const err = await response.json();
                alert(`Error: ${err.error || 'Check fields'}`);
            }
        } catch (error) {
            alert('CRITICAL: Server Unreachable.');
        } finally {
            setLoading(false);
            setStatusMsg('');
        }
    };

    const resetForm = () => {
        setStep(1);
        setForm({
            student_id: '', name: '', course: '', department: '', contact: '',
            email: '', violation: '',
            incident_date: new Date().toISOString().split('T')[0],
            incident_time: new Date().toTimeString().slice(0, 5)
        });
    };

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            {/* Floating Logout */}
            <button 
                onClick={() => { localStorage.clear(); window.location.href = '/login'; }} 
                className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur shadow-sm border border-slate-200 rounded-full text-red-500 hover:bg-red-50 font-bold transition-all text-xs"
            >
                <LogOut size={16} /> Log Out
            </button>
            {/* Modal Scanner */}
            {isScanning && (
                <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <button onClick={() => setIsScanning(false)} className="absolute top-6 right-6 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
                            <X size={24} />
                        </button>
                        <div className="text-center mb-10">
                            <h3 className="font-black text-2xl text-slate-800 tracking-tight">Scanner Hub</h3>
                            <p className="text-sm font-medium text-slate-400 mt-2">Scan Physical ID / QR Code</p>
                        </div>
                        <div id="report-qr-reader" className="w-full rounded-2xl overflow-hidden border-4 border-slate-50 shadow-inner"></div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white rounded-[40px] p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Confirm Incident</h2>
                            <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={28} />
                            </button>
                        </div>
                        <div className="space-y-4 mb-10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Student ID</p>
                                    <p className="font-black text-slate-800 text-lg uppercase">{form.student_id}</p>
                                </div>
                                <div className="bg-red-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-red-400 tracking-widest mb-1">Violation</p>
                                    <p className="font-black text-red-900 uppercase leading-tight">{form.violation}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl">
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Student Full Name</p>
                                <p className="font-bold text-slate-800 text-lg">{form.name || '—'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Email</p>
                                    <p className="font-bold text-slate-700 text-sm">{form.email || '—'}</p>
                                </div>
                                <div className="bg-slate-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Contact</p>
                                    <p className="font-bold text-slate-700 text-sm">{form.contact || '—'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-slate-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Date</p>
                                    <p className="font-bold text-slate-700">{form.incident_date}</p>
                                </div>
                                <div className="bg-slate-50 p-5 rounded-3xl">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Time</p>
                                    <p className="font-bold text-slate-700">{form.incident_time}</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setShowConfirmModal(false)} className="bg-slate-100 text-slate-600 font-black py-5 rounded-[24px] uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                            <button onClick={confirmSubmission} disabled={loading} className="bg-ustp-blue text-white font-black py-5 rounded-[24px] uppercase text-xs tracking-widest hover:bg-slate-900 shadow-xl transition-all">Submit Now</button>
                        </div>
                    </div>
                </div>
            )}
 
            <main className="flex-1 p-3 md:p-10 pt-20 md:pt-10 max-w-7xl mx-auto h-screen overflow-hidden flex flex-col">
                <header className="mb-4 text-center md:text-left shrink-0">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tighter uppercase italic">
                        {userRole === 'guard' ? 'Guard Report' : 'Faculty Report'}
                    </h1>
                    <p className="text-slate-400 mt-1 font-medium italic text-xs md:text-sm">
                        Academic Integrity & Safety Reporting
                    </p>
                </header>
 
                <div className="max-w-4xl mx-auto w-full flex-1 overflow-y-auto pb-20 custom-scrollbar">
                    {step === 1 ? (
                        <div className="card-premium border-2 border-white shadow-2xl p-5 sm:p-8 md:p-10 animate-in slide-in-from-bottom-5 duration-500">
                            <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-3 mb-6 pb-4 border-b border-slate-50 uppercase tracking-tighter">
                                <ClipboardList className="text-ustp-blue" size={24} />
                                New Incident Report
                            </h3>
 
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <label className="text-[9px] uppercase font-black text-slate-300 tracking-[0.2em] ml-1 mb-1 block">Student ID / Scan QR</label>
                                            <div className="relative">
                                                <input required value={form.student_id} onChange={handleIdChange} placeholder="202X-XXXXXXX" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 md:p-4 pr-12 font-black focus:border-ustp-blue outline-none transition-all uppercase placeholder:text-slate-200 text-sm" />
                                                <button type="button" onClick={() => setIsScanning(true)} className="absolute right-2 top-2 bottom-2 aspect-square bg-ustp-blue text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all">
                                                    <Scan size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <input required placeholder="Student Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 md:p-4 font-bold focus:border-ustp-blue outline-none transition-all text-sm" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <select required value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 md:p-4 font-bold outline-none focus:border-ustp-blue text-sm appearance-none truncate">
                                                <option value="">Course</option>
                                                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <select required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 md:p-4 font-bold outline-none focus:border-ustp-blue text-sm appearance-none truncate">
                                                <option value="">Dept</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            <input required type="email" placeholder="Email Address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 md:p-4 font-bold focus:border-ustp-blue outline-none transition-all text-sm" />
                                            <input required placeholder="Contact Number" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 md:p-4 font-bold focus:border-ustp-blue outline-none transition-all text-sm" />
                                        </div>
                                        <select required value={form.violation} onChange={e => setForm({ ...form, violation: e.target.value })} className="w-full bg-red-50 border-2 border-red-100 rounded-2xl p-3 md:p-4 font-black text-red-900 focus:border-red-500 outline-none transition-all cursor-pointer text-sm appearance-none truncate">
                                            <option value="">SELECT VIOLATION</option>
                                            <option value="No ID">No ID</option>
                                            <option value="Improper wearing of ID">Improper Wearing of ID</option>
                                            <option value="Dress code violation">Dress Code</option>
                                            <option value="Littering">Littering</option>
                                            <option value="Smoking inside campus">Smoking</option>
                                            <option value="Serious misconduct">Serious Misconduct</option>
                                        </select>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[9px] uppercase font-black text-slate-300 tracking-widest mb-1 ml-1 block">Date</label>
                                                <input type="date" required value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 md:p-4 font-bold outline-none focus:border-ustp-blue text-xs" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] uppercase font-black text-slate-300 tracking-widest mb-1 ml-1 block">Time</label>
                                                <input type="time" required value={form.incident_time} onChange={e => setForm({ ...form, incident_time: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 md:p-4 font-bold outline-none focus:border-ustp-blue text-xs" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="group relative bg-ustp-blue text-white w-full py-4 rounded-2xl text-lg font-black shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 transition-all hover:bg-slate-900 active:scale-[0.98]">
                                    <Send size={20} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                                    {loading ? "Syncing..." : "SUBMIT REPORT"}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="card-premium border-2 border-green-200 bg-green-50/20 shadow-2xl p-8 md:p-20 text-center animate-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                                <CheckCircle2 className="text-white" size={32} />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Report Stored!</h2>
                            <p className="text-slate-500 mt-4 max-w-xs mx-auto font-bold text-base leading-relaxed">Violation synchronized with cloud database.</p>
                            <button onClick={resetForm} className="mt-8 bg-slate-900 text-white w-full max-w-[240px] py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-800 transition-all">New Entry</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReportViolation;

```

### File: frontend\src\pages\guard\ScanHistory.jsx
```javascript
import React from 'react';
import Sidebar from '../../components/Sidebar';
import { History, Shield, Search, User } from 'lucide-react';

const ScanHistory = () => {
    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="guard" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto overflow-y-auto mobile-top-spacer">
                <header className="mb-8 lg:mb-12 flex flex-col sm:flex-row justify-between sm:items-end gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Scan History</h1>
                        <p className="text-slate-500 mt-1 sm:mt-2 font-medium text-sm sm:text-base">Review your recent activity and submitted violation reports.</p>
                    </div>
                </header>

                <div className="card-premium">
                    <div className="flex justify-between items-center mb-6 lg:mb-10 pb-4 lg:pb-6 border-b border-slate-50">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Student ID or Name..."
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 pl-12 font-semibold text-sm outline-none focus:border-ustp-blue transition-all"
                            />
                        </div>
                    </div>

                    <div className="py-16 sm:py-24 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                            <History size={32} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">No Scan History</h2>
                        <p className="text-slate-400 mt-2 max-w-sm mx-auto font-medium text-sm sm:text-base px-4">
                            You haven't submitted any reports or performed any scans yet for this duty period.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ScanHistory;

```

### File: frontend\src\pages\staff\AllStudents.jsx
```javascript
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Users, Search, Plus, X, QrCode, Download, Edit } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Shield, AlertCircle, CheckCircle2, Send, Clock, LocateFixed } from 'lucide-react';

const COURSES = [
    "BS Civil Engineering",
    "BS Electronics Engineering",
    "BS Electrical Engineering",
    "BS Mechanical Engineering",
    "BS Computer Engineering",
    "BS Geodetic Engineering",
    "BS Food Technology",
    "BS Information Technology",
    "BS Computer Science",
    "BS Data Science",
    "BS Technology Communication Management",
    "BS Applied Physics",
    "BS Applied Mathematics",
    "BS Chemistry",
    "BS Environmental Science",
    "BS Secondary Education Major in Science",
    "Major in Mathematics",
    "B. Tech & Livelihood Education (Home Economics)",
    "B. Tech & Livelihood Education (Industrial Arts)",
    "Bachelor in Technical-Vocational Teacher Education Major in Computer System Servicing",
    "Major in Fashion and Garments",
    "Major in Food Service Management",
    "BS AutoTronics",
    "BS Electro-Mechanical Technology",
    "BS Electronics Technology",
    "BS Energy Systems and Management",
    "BS Manufacturing Engineering Technology",
    "College of Medicine",
    "Senior High School"
];

const DEPARTMENTS = [
    "College of Engineering and Architecture (CEA)",
    "College of Information Technology and Computing (CITC)",
    "College of Science and Mathematics (CSM)",
    "College of Science and Technology Education (CSTE)",
    "College of Technology (CT)",
    "College of Medicine (COM)",
    "Senior High School (SHS)"
];

const PRESET_LOCATIONS = [
    { name: 'OSA Admin Office (5-Foot Test)', lat: 8.4855, lng: 124.6564, radius: 2 },
    { name: 'CITC Dept (5-Foot Test)', lat: 8.4858, lng: 124.6562, radius: 2 },
    { name: 'CSM Dept (5-Foot Test)', lat: 8.4852, lng: 124.6568, radius: 2 },
    { name: 'Campus Grounds', lat: 8.4853, lng: 124.6568, radius: 100 },
];

const AllStudents = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [newStudent, setNewStudent] = useState({
        student_id: '',
        name: '',
        course: '',
        department: '',
        year_level: '',
        email: '',
        contact_number: ''
    });
    const [editStudent, setEditStudent] = useState({
        student_id: '',
        name: '',
        course: '',
        department: '',
        year_level: '',
        email: '',
        contact_number: ''
    });
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [bulkForm, setBulkForm] = useState({
        violation: 'Other',
        hours: 10,
        description: 'Failure to attend mandatory campus event',
        location_type: 'custom',
        lat: '',
        lng: '',
        radius: 100
    });

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await fetch('/api/students/');
                const data = await response.json();
                setStudents(data);
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
        const interval = setInterval(fetchStudents, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch('/api/students/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStudent)
            });

            if (response.ok) {
                const data = await response.json();
                setStudents([...students, data]);
                setShowAddModal(false);
                setNewStudent({
                    student_id: '',
                    name: '',
                    course: '',
                    department: '',
                    year_level: '',
                    email: '',
                    contact_number: ''
                });
            } else {
                alert('Failed to add student');
            }
        } catch (error) {
            console.error('Error adding student:', error);
            alert('Failed to add student');
        } finally {
            setSaving(false);
        }
    };

    const handleShowQR = (student) => {
        setSelectedStudent(student);
        setShowQRModal(true);
    };

    const handleEditClick = (student) => {
        setSelectedStudent(student);
        setEditStudent({
            student_id: student.student_id,
            name: student.name || '',
            course: student.course || '',
            department: student.department || '',
            year_level: student.year_level || '',
            email: student.email || '',
            contact_number: student.contact_number || ''
        });
        setShowEditModal(true);
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch(`/api/students/${selectedStudent.student_id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editStudent)
            });

            if (response.ok) {
                const data = await response.json();
                setStudents(students.map(s => s.student_id === selectedStudent.student_id ? data : s));
                setShowEditModal(false);
            } else {
                alert('Failed to update student');
            }
        } catch (error) {
            console.error('Error updating student:', error);
            alert('Failed to update student');
        } finally {
            setSaving(false);
        }
    };

    const handleBulkReport = async (e) => {
        e.preventDefault();
        setSaving(true);
        const reporter = JSON.parse(localStorage.getItem('user') || '{}').full_name || 'Admin';

        try {
            const response = await fetch('/api/violations/bulk_create/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_ids: selectedIds,
                    violation: bulkForm.violation,
                    hours: bulkForm.hours,
                    description: bulkForm.description,
                    reporter: reporter,
                    lat: bulkForm.lat,
                    lng: bulkForm.lng,
                    radius: bulkForm.radius
                })
            });

            if (response.ok) {
                // Successfully reported
                setSelectedIds([]);
                setShowBulkModal(false);
            } else {
                alert('Bulk reporting failed');
            }
        } catch (error) {
            alert('Server error during bulk reporting');
        } finally {
            setSaving(false);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredStudents.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredStudents.map(s => s.student_id));
        }
    };

    const downloadQR = (student) => {
        const svg = document.getElementById('qr-code-svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        const qrData = formatQRData(student);

        img.onload = () => {
            canvas.width = 256;
            canvas.height = 256;
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL('image/png');

            const downloadLink = document.createElement('a');
            downloadLink.download = `${student.student_id}_qr.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const getDeptAbbreviation = (dept) => {
        if (!dept) return 'N/A';
        const match = dept.match(/\(([^)]+)\)/);
        return match ? `(${match[1]})` : dept;
    };


    const formatQRData = (student) => {
        if (!student.name) return student.student_id;

        const nameParts = student.name.trim().split(/\s+/);
        let firstName = nameParts[0] || '';
        let middleInitial = '';
        let lastName = '';

        if (nameParts.length >= 2) {
            const lastPart = nameParts[nameParts.length - 1];
            if (lastPart.endsWith('.') || lastPart.length <= 3) {
                middleInitial = lastPart;
                lastName = nameParts.length > 2 ? nameParts[nameParts.length - 2] : '';
            } else {
                lastName = lastPart;
                middleInitial = nameParts.length > 2 ? nameParts[1] : '';
            }
        }

        const formattedName = `${firstName.toUpperCase()} ${middleInitial.toUpperCase()} ${lastName.toUpperCase()}`.trim();
        const course = student.course ? student.course.replace(/^BS|^BSIT|^BSCS|^BSCE|^BSEE|^BSME|^BSCpE/i, '').trim() : '';

        return `${student.student_id} ${formattedName} ${course}`.trim();
    };

    const filteredStudents = students
        .filter(student =>
            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.department?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role={userRole} />
            <main className="flex-1 p-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">All Students</h1>
                        <p className="text-slate-500 mt-2 font-medium">
                            {loading ? "Loading students..." : `Viewing ${filteredStudents.length} registered students`}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        {selectedIds.length > 0 && (
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 animate-in slide-in-from-right-4"
                            >
                                <Shield size={20} />
                                Bulk Report ({selectedIds.length})
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-ustp-blue text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            <Plus size={20} />
                            Add Student
                        </button>
                    </div>
                </header>

                <div className="card-premium mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, student ID, course, or department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin w-12 h-12 border-4 border-ustp-blue border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-4 text-slate-500 font-medium">Loading students...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                        <Users className="mx-auto text-slate-200 mb-4" size={48} />
                        <h5 className="font-bold text-slate-400 uppercase tracking-[0.2em] text-xs">No Students Found</h5>
                        {searchTerm && (
                            <p className="text-slate-400 text-sm mt-2">Try adjusting your search terms</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left bg-slate-50 border-b-2 border-slate-200">
                                    <th className="py-3 px-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 text-ustp-blue focus:ring-ustp-blue"
                                        />
                                    </th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Student ID</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Name</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Course</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Dept</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Year</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Email</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs">Contact</th>
                                    <th className="py-3 px-3 font-bold text-slate-600 uppercase tracking-wider text-xs text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className={`border-b border-slate-100 transition-colors ${selectedIds.includes(student.student_id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                        <td className="py-2 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(student.student_id)}
                                                onChange={() => toggleSelect(student.student_id)}
                                                className="w-4 h-4 rounded border-slate-300 text-ustp-blue focus:ring-ustp-blue"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-blue-700 font-bold">{student.student_id}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-slate-600 truncate max-w-[120px] block">{student.course || 'N/A'}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-slate-600">{getDeptAbbreviation(student.department)}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-slate-600">{student.year_level || 'N/A'}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-slate-500 truncate max-w-[120px] block">{student.email || 'N/A'}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className="text-xs text-slate-500">{student.contact_number || 'N/A'}</span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <div className="flex gap-1 justify-center">
                                                <button
                                                    onClick={() => { setSelectedIds([student.student_id]); setShowBulkModal(true); }}
                                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded transition-colors flex items-center gap-1"
                                                >
                                                    <AlertCircle size={10} /> Report
                                                </button>
                                                <button
                                                    onClick={() => handleEditClick(student)}
                                                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleShowQR(student)}
                                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition-colors"
                                                >
                                                    QR
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && students.length > 0 && (
                    <p className="text-center text-slate-400 text-sm mt-8">
                        Showing {filteredStudents.length} of {students.length} students
                    </p>
                )}
            </main>

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Add New Student</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Student ID *</label>
                                <input
                                    type="text"
                                    required
                                    value={newStudent.student_id}
                                    onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., 2023303188"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newStudent.name}
                                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., John Doe"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Course</label>
                                    <select
                                        value={newStudent.course}
                                        onChange={(e) => setNewStudent({ ...newStudent, course: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    >
                                        <option value="">Select Course</option>
                                        {COURSES.map(course => (
                                            <option key={course} value={course}>{course}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                                    <select
                                        value={newStudent.department}
                                        onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    >
                                        <option value="">Select Department</option>
                                        {DEPARTMENTS.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Year Level</label>
                                <select
                                    value={newStudent.year_level}
                                    onChange={(e) => setNewStudent({ ...newStudent, year_level: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                >
                                    <option value="">Select Year</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                    <option value="5">5th Year</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={newStudent.email}
                                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Number</label>
                                <input
                                    type="text"
                                    value={newStudent.contact_number}
                                    onChange={(e) => setNewStudent({ ...newStudent, contact_number: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., 09351234567"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-ustp-blue text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Adding...' : 'Add Student'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900">QR Code</h2>
                            <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="bg-white p-4 rounded-2xl inline-block border-2 border-slate-100">
                            <QRCode
                                id="qr-code-svg"
                                value={formatQRData(selectedStudent)}
                                size={200}
                                level={"H"}
                            />
                        </div>
                        <div className="mt-4">
                            <p className="font-bold text-lg">{selectedStudent.name}</p>
                            <p className="text-slate-500">{selectedStudent.student_id}</p>
                            <p className="text-slate-400 text-sm">{selectedStudent.course} - {getDeptAbbreviation(selectedStudent.department)}</p>
                        </div>
                        <button
                            onClick={() => downloadQR(selectedStudent)}
                            className="mt-4 w-full flex items-center justify-center gap-2 bg-ustp-blue text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors"
                        >
                            <Download size={20} />
                            Download QR Code
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {showEditModal && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Edit Student</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Student ID *</label>
                                <input
                                    type="text"
                                    required
                                    value={editStudent.student_id}
                                    onChange={(e) => setEditStudent({ ...editStudent, student_id: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., 2023303188"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={editStudent.name}
                                    onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., John Doe"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Course</label>
                                    <select
                                        value={editStudent.course}
                                        onChange={(e) => setEditStudent({ ...editStudent, course: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    >
                                        <option value="">Select Course</option>
                                        {COURSES.map(course => (
                                            <option key={course} value={course}>{course}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                                    <select
                                        value={editStudent.department}
                                        onChange={(e) => setEditStudent({ ...editStudent, department: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    >
                                        <option value="">Select Department</option>
                                        {DEPARTMENTS.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Year Level</label>
                                <select
                                    value={editStudent.year_level}
                                    onChange={(e) => setEditStudent({ ...editStudent, year_level: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                >
                                    <option value="">Select Year</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                    <option value="5">5th Year</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editStudent.email}
                                    onChange={(e) => setEditStudent({ ...editStudent, email: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Number</label>
                                <input
                                    type="text"
                                    value={editStudent.contact_number}
                                    onChange={(e) => setEditStudent({ ...editStudent, contact_number: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl focus:border-ustp-blue focus:outline-none"
                                    placeholder="e.g., 09351234567"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-ustp-blue text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Bulk Violation Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase">Bulk Reporting</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedIds.length} Students Selected</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowBulkModal(false); if (selectedIds.length === 1) setSelectedIds([]); }} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleBulkReport} className="space-y-6">
                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 block">Violation Type</label>
                                <select
                                    value={bulkForm.violation}
                                    onChange={e => setBulkForm({ ...bulkForm, violation: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue"
                                >
                                    <option value="Failure to Attend Event">Failure to Attend Event</option>
                                    <option value="No ID">No ID</option>
                                    <option value="Improper wearing of ID">Improper Wearing of ID</option>
                                    <option value="Dress code violation">Dress Code</option>
                                    <option value="Littering">Littering</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 block">Required Community Service Hours</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={bulkForm.hours}
                                        onChange={e => setBulkForm({ ...bulkForm, hours: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 font-black text-lg focus:border-ustp-blue outline-none"
                                        placeholder="10"
                                    />
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2 block">Incident Description</label>
                                <textarea
                                    rows="1"
                                    value={bulkForm.description}
                                    onChange={e => setBulkForm({ ...bulkForm, description: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-medium focus:border-ustp-blue outline-none"
                                    placeholder="Provide details about the incident..."
                                />
                            </div>

                            {/* Geofencing is now handled automatically by Smart QR scan */}
                            <div className="bg-slate-900 p-6 rounded-[32px] text-center border-4 border-slate-800 shadow-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Automated Geofencing</p>
                                <p className="text-white text-xs font-medium leading-relaxed">Location and 5m radius will be applied automatically when the student scans a Department QR code.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-red-600 text-white py-5 rounded-[24px] font-black uppercase text-sm tracking-widest hover:bg-red-700 shadow-xl shadow-red-200 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {saving ? "Processing..." : (
                                    <>
                                        <Send size={18} />
                                        Confirm & Submit Report
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllStudents;

```

### File: frontend\src\pages\staff\Analytics.jsx
```javascript
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Activity, TrendingUp, Users, Calendar, AlertTriangle, CheckCircle, Clock, Filter, BarChart2 } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const TopViolationsChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="py-8 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                <BarChart2 className="mx-auto text-slate-200 mb-2" size={32} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No Data</p>
            </div>
        );
    }

    const top = data.slice(0, 6);

    const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7'];

    const chartData = {
        labels: top.map(d => d.violation_type),
        datasets: [{
            label: 'Reports',
            data: top.map(d => d.count),
            backgroundColor: top.map((_, i) => `${COLORS[i % COLORS.length]}cc`),
            borderColor: top.map((_, i) => COLORS[i % COLORS.length]),
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
        }],
    };

    const options = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 }, color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
            y: { ticks: { font: { size: 10, weight: 'bold' }, color: '#475569' }, grid: { display: false } },
        },
    };

    return (
        <div style={{ height: `${Math.max(140, top.length * 40)}px` }}>
            <Bar data={chartData} options={options} />
        </div>
    );
};

const Analytics = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [activeTab, setActiveTab] = useState('overview');
    const [violations, setViolations] = useState([]);
    const [analyticsData, setAnalyticsData] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchViolations();
    }, []);

    const fetchViolations = async () => {
        try {
            const [vResponse, aResponse] = await Promise.all([
                fetch('/api/violations/'),
                fetch('/api/violations/analytics/')
            ]);
            const vData = await vResponse.json();
            const aData = await aResponse.json();
            setViolations(vData);
            setAnalyticsData(aData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const getMonthlyViolations = () => {
        return violations.filter(v => {
            const created = new Date(v.created_at);
            return created.getMonth() === selectedMonth && created.getFullYear() === selectedYear;
        });
    };

    const getViolationTypes = () => {
        const typeCounts = {};
        violations.forEach(v => {
            const type = v.violation_type || 'Other';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        return typeCounts;
    };

    const monthlyViolations = getMonthlyViolations();
    const violationTypes = getViolationTypes();

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const pieData = {
        labels: Object.keys(violationTypes),
        datasets: [
            {
                data: Object.values(violationTypes),
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#a855f7'],
                hoverOffset: 20,
                borderWidth: 2,
                borderColor: '#ffffff',
            },
        ],
    };

    const barData = {
        labels: months,
        datasets: [
            {
                label: 'Violations Reported',
                data: months.map((_, idx) => violations.filter(v => new Date(v.created_at).getMonth() === idx).length),
                backgroundColor: 'rgba(30, 58, 138, 0.8)',
                hoverBackgroundColor: '#1e3a8a',
                borderRadius: 12,
                barThickness: 20,
            },
        ],
    };

    const analyticsTabs = [
        { id: 'overview', label: 'System Overview', icon: Activity },
        { id: 'monthly', label: 'Monthly Monitoring', icon: Calendar },
    ];

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role={userRole} />
            <div className="flex-1 flex">
                <main className="flex-1 p-10 max-w-7xl mx-auto overflow-y-auto">
                    <header className="mb-12">
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Analytics Dashboard</h1>
                        <p className="text-slate-500 mt-2 font-medium">Real-time trends and data-driven insights into campus compliance.</p>
                    </header>

                    <div className="flex gap-6 mb-10">
                        {analyticsTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-8 py-4 rounded-[24px] font-bold text-sm transition-all duration-300 ${activeTab === tab.id
                                        ? 'bg-ustp-blue text-white shadow-xl shadow-blue-200 scale-105'
                                        : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-slate-100'
                                    }`}
                            >
                                <tab.icon size={18} className={activeTab === tab.id ? 'animate-pulse' : ''} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'overview' && (
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 card-premium p-8">
                                    <div className="flex items-center justify-between mb-8">
                                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Violation Types</h4>
                                        <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                                            <AlertTriangle size={16} />
                                        </div>
                                    </div>
                                    <div className="h-72 flex items-center justify-center">
                                        {Object.keys(violationTypes).length > 0 ? (
                                            <Pie
                                                data={pieData}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        legend: {
                                                            position: 'bottom',
                                                            labels: {
                                                                padding: 20,
                                                                usePointStyle: true,
                                                                font: { size: 10, weight: 'bold' }
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <p className="text-slate-400 font-medium italic">No violation data recorded</p>
                                        )}
                                    </div>
                                </div>

                                <div className="lg:col-span-2 card-premium p-8">
                                    <div className="flex items-center justify-between mb-8">
                                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Annual Trend (2026)</h4>
                                        <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                                            <TrendingUp size={16} />
                                        </div>
                                    </div>
                                    <div className="h-72">
                                        <Bar
                                            data={barData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        ticks: { font: { weight: 'bold' }, stepSize: 5 },
                                                        grid: { color: '#f8fafc' }
                                                    },
                                                    x: {
                                                        grid: { display: false },
                                                        ticks: { font: { weight: 'bold', size: 10 } }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-100">
                                    <Users size={32} className="text-white/40 mb-4" />
                                    <p className="text-indigo-100 font-bold uppercase tracking-widest text-[10px] mb-1">Total Violators</p>
                                    <h3 className="text-4xl font-black">
                                        {new Set(violations.map(v => v.student_details?.student_id)).size}
                                    </h3>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 rounded-[32px] text-white shadow-xl shadow-emerald-100">
                                    <Activity size={32} className="text-white/40 mb-4" />
                                    <p className="text-emerald-100 font-bold uppercase tracking-widest text-[10px] mb-1">Active Cases</p>
                                    <h3 className="text-4xl font-black">{violations.filter(v => v.status.toLowerCase().includes('pending') || v.status === 'Approved').length}</h3>
                                </div>
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[32px] text-white shadow-xl shadow-slate-200">
                                    <TrendingUp size={32} className="text-white/40 mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Compliance Rate</p>
                                    <h3 className="text-4xl font-black">
                                        {violations.length > 0 ? Math.round((violations.filter(v => v.status === 'Completed').length / violations.length) * 100) : 0}%
                                    </h3>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'monthly' && (
                        <div className="space-y-8">
                            <div className="card-premium">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                                    <h4 className="font-bold text-slate-800 uppercase tracking-widest text-sm text-blue-900">Monthly Monitoring</h4>
                                    <div className="flex gap-4">
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                            className="px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl font-semibold focus:border-ustp-blue outline-none"
                                        >
                                            {months.map((month, idx) => (
                                                <option key={month} value={idx}>{month}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                            className="px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl font-semibold focus:border-ustp-blue outline-none"
                                        >
                                            <option value={2026}>2026</option>
                                            <option value={2025}>2025</option>
                                            <option value={2024}>2024</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                    <div className="bg-orange-50 p-6 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-2">
                                            <AlertTriangle className="text-orange-500" size={20} />
                                            <span className="text-xs font-bold text-orange-600 uppercase">Pending</span>
                                        </div>
                                        <p className="text-3xl font-black text-orange-700">
                                            {monthlyViolations.filter(v => v.status.toLowerCase().includes('pending')).length}
                                        </p>
                                    </div>
                                    <div className="bg-green-50 p-6 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CheckCircle className="text-green-500" size={20} />
                                            <span className="text-xs font-bold text-green-600 uppercase">Approved</span>
                                        </div>
                                        <p className="text-3xl font-black text-green-700">
                                            {monthlyViolations.filter(v => v.status === 'Approved').length}
                                        </p>
                                    </div>
                                    <div className="bg-red-50 p-6 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-2">
                                            <AlertTriangle className="text-red-500" size={20} />
                                            <span className="text-xs font-bold text-red-600 uppercase">Dismissed</span>
                                        </div>
                                        <p className="text-3xl font-black text-red-700">
                                            {monthlyViolations.filter(v => v.status === 'Dismissed').length}
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 p-6 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Clock className="text-blue-500" size={20} />
                                            <span className="text-xs font-bold text-blue-600 uppercase">Total</span>
                                        </div>
                                        <p className="text-3xl font-black text-blue-700">
                                            {monthlyViolations.length}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h5 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-4">Violations in {months[selectedMonth]} {selectedYear}</h5>
                                    {monthlyViolations.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-50 rounded-2xl">
                                            <p className="text-slate-400 font-medium">No violations recorded for this month.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                            {monthlyViolations.map(v => (
                                                <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                                    <div>
                                                        <p className="font-bold text-slate-800">{v.student_details?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-slate-500">{v.violation_type}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${v.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                            v.status === 'Dismissed' ? 'bg-red-100 text-red-700' :
                                                                'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {v.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'violators' && (
                        <div className="space-y-8">
                            <div className="card-premium">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                                    <h4 className="font-bold text-slate-800 uppercase tracking-widest text-sm text-blue-900">Top Violators</h4>
                                </div>

                                {topViolators.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 rounded-2xl">
                                        <Users className="mx-auto text-slate-200 mb-4" size={48} />
                                        <p className="text-slate-400 font-medium">No violation data available.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {topViolators.map(([studentId, count], idx) => (
                                            <div key={studentId} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${idx === 0 ? 'bg-yellow-500' :
                                                        idx === 1 ? 'bg-slate-400' :
                                                            idx === 2 ? 'bg-amber-600' :
                                                                'bg-slate-300'
                                                    }`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-800">{studentId}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-slate-700">{count}</p>
                                                    <p className="text-xs text-slate-500 uppercase">violations</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="card-premium">
                                <h4 className="font-bold text-slate-800 uppercase tracking-widest text-sm text-blue-900 mb-6">Violation Types Distribution</h4>
                                <div className="h-80">
                                    <Pie data={pieData} options={{ maintainAspectRatio: false }} />
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Analytics;

```

### File: frontend\src\pages\staff\Archives.jsx
```javascript
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { Archive, User, CheckCircle, Clock, Search, ChevronDown, XCircle, Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Archives = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [violations, setViolations] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [showDismissed, setShowDismissed] = useState(false);

    useEffect(() => {
        fetchData();
        const poll = setInterval(fetchData, 5000);
        return () => clearInterval(poll);
    }, []);

    const fetchData = async () => {
        try {
            const [vResp, tResp, lResp] = await Promise.all([
                fetch('/api/violations/'),
                fetch('/api/etickets/'),
                fetch('/api/timelogs/')
            ]);
            setViolations(await vResp.json());
            setTickets(await tResp.json());
            setLogs(await lResp.json());
        } catch (e) {
            console.error(e);
        }
    };

    // Show completed violations (those with a Completed ticket) AND dismissed violations
    const archivedViolations = violations.filter(v => {
        const isDismissed = (v.status || '').toLowerCase() === 'dismissed';
        const isCompletedStatus = (v.status || '').toLowerCase() === 'completed';
        const isFinishedStatus = (v.status || '').toLowerCase() === 'finished';
        const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
        const isCompletedTicket = ticket && (ticket.status === 'Completed' || ticket.status === 'Finished' || ticket.remaining_hours <= 0.001);
        return isDismissed || isCompletedStatus || isFinishedStatus || isCompletedTicket;
    });

    // Apply search & filter
    const filtered = archivedViolations.filter(v => {
        const isDismissed = v.status?.toLowerCase() === 'dismissed';
        if (showDismissed && !isDismissed) return false;
        if (!showDismissed && isDismissed) return false;
        const matchesSearch = !searchTerm
            || v.student_details?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            || v.student_details?.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'All' || v.violation_type === filterType;
        return matchesSearch && matchesFilter;
    });

    const violationTypes = [...new Set(violations.map(v => v.violation_type))];

    const generatePDF = async () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

        try {
            const loadImage = (src) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = src;
                });
            };

            const [ustpImg, osaImg] = await Promise.all([
                loadImage('/ustp.png').catch(() => null),
                loadImage('/osa-logo.jpg').catch(() => null)
            ]);

            if (ustpImg) {
                doc.addImage(ustpImg, 'PNG', 10, 8, 14, 14);
            }
            if (osaImg) {
                doc.addImage(osaImg, 'JPEG', 26, 8, 14, 14);
            }
        } catch (e) {
            console.log('Logo loading failed');
        }

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text('UNIVERSITY OF SCIENCE AND TECHNOLOGY OF SOUTHERN PHILIPPINES', 44, 10.5);

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.text('OFFICE OF STUDENT AFFAIRS - CAGAYAN DE ORO', 44, 13);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('COMMUNITY SERVICE LOG', 44, 18);

        doc.setFontSize(7.5);
        doc.text(`For the Month of: ${currentMonth}`, 287, 23.5, { align: 'right' });

        const formatDateShort = (dateStr) => {
            if (!dateStr) return '—';
            const d = new Date(dateStr);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${mm}/${dd}/${yyyy}`;
        };

        const tableData = filtered.map((v) => {
            const student = v.student_details || {};
            const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
            const isDismissed = v.status?.toLowerCase() === 'dismissed';
            const ticketLogs = logs.filter(l => (l.eticket === ticket?.id || l.eticket?.id === ticket?.id));
            const totalServed = ticketLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
            const servedHours = Math.floor(totalServed / 3600);

            const nameParts = (student.name || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            return [
                student.student_id || '—',
                firstName.toUpperCase(),
                lastName.toUpperCase(),
                student.contact_number || '—',
                student.year_level || '—',
                student.course || '—',
                student.department || '—',
                v.violation_type || '—',
                formatDateShort(v.created_at),
                v.punishment || '—',
                (isDismissed || !ticket) ? 'N/A' : `${servedHours} hours`,
                isDismissed ? 'DISMISSED' : (ticket?.status === 'Completed' ? 'COMPLETED' : 'ONGOING')
            ];
        });

        // Add dummy rows to reach at least 20 slots (as requested)
        while (tableData.length < 20) {
            tableData.push(['', '', '', '', '', '', '', '', '', '', '', '']);
        }

        autoTable(doc, {
            head: [['ID NUMBER', 'FIRST NAME', 'LAST NAME', 'CONTACT NUMBER', 'YEAR LEVEL', 'COURSE/PROGRAM', 'COLLEGE', 'NATURE OF VIOLATION', 'DATE COMMITTED', 'PENALTY', 'HOURS SERVED', 'STATUS']],
            body: tableData,
            startY: 25,
            styles: {
                fontSize: 7,
                cellPadding: 1.0,
                halign: 'center',
                textColor: [0, 0, 0],
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            headStyles: {
                fontSize: 6.5,
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.15,
                lineColor: [0, 0, 0]
            },
            alternateRowStyles: { fillColor: [255, 255, 255] },
            margin: { left: 8, right: 8 },
            theme: 'grid'
        });

        doc.save(`OSA_Community_Service_Log_${new Date().toISOString().split('T')[0]}.pdf`);
    };
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '—';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            <Sidebar role={userRole} />
            <main className="flex-1 p-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-8">
                    <div className="flex justify-between items-end">
                        <div className="print:hidden">
                            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-4">
                                <Archive className="text-ustp-blue" size={36} /> Archives
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium italic">Completed violations, dismissed cases, and service records.</p>
                        </div>
                        <div className="flex gap-3 print:hidden">
                            <button
                                onClick={generatePDF}
                                className="flex items-center gap-2 px-5 py-3 bg-ustp-blue text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all"
                            >
                                <Download size={18} /> Download PDF
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex gap-4 mb-6 print:hidden">
                    <button
                        onClick={() => setShowDismissed(false)}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${!showDismissed ? 'bg-ustp-blue text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}
                    >
                        Completed
                    </button>
                    <button
                        onClick={() => setShowDismissed(true)}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${showDismissed ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}
                    >
                        Dismissed
                    </button>
                </div>

                <div className="flex gap-4 mb-10 print:hidden">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute top-1/2 left-5 -translate-y-1/2 text-slate-300" />
                        <input
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-14 pr-6 font-bold outline-none focus:border-ustp-blue transition-colors"
                            placeholder="Search by name or student ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <select
                            className="appearance-none bg-white border-2 border-slate-100 rounded-2xl py-4 pl-6 pr-12 font-bold outline-none focus:border-ustp-blue cursor-pointer"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="All">All Types</option>
                            {violationTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="py-32 text-center print:hidden">
                        <Archive className="mx-auto text-slate-200 mb-6" size={64} />
                        <h4 className="font-black text-slate-300 text-xl uppercase tracking-widest">No Archived Records</h4>
                        <p className="text-slate-400 mt-3 font-medium max-w-md mx-auto">
                            Completed violations will appear here once their service obligation hours have been fully served.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 print:hidden">
                        {filtered.map(violation => {
                            const isDismissed = violation.status?.toLowerCase() === 'dismissed';
                            const ticket = tickets.find(t => t.violation_details?.id === violation.id || t.violation === violation.id);
                            const ticketLogs = logs.filter(l => (l.eticket === ticket?.id || l.eticket?.id === ticket?.id));
                            const totalServedSeconds = ticketLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);

                            return (
                                <div key={violation.id} className={`bg-white border-2 border-slate-100 rounded-[28px] p-6 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all group ${isDismissed ? 'opacity-75' : ''}`}>
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${isDismissed ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'} group-hover:${isDismissed ? 'bg-red-100' : 'bg-emerald-100'} transition-colors`}>
                                            {isDismissed ? <XCircle className="text-red-500" size={28} /> : <CheckCircle className="text-emerald-500" size={28} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-black text-slate-900 text-lg tracking-tight truncate">
                                                    {violation.student_details?.name || 'Unknown Student'}
                                                </h3>
                                                <span className={`${isDismissed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap`}>
                                                    {isDismissed ? 'Dismissed' : 'Completed'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-400 font-medium">
                                                <span>{violation.student_details?.student_id}</span>
                                                <span>•</span>
                                                <span>{violation.violation_type}</span>
                                                <span>•</span>
                                                <span>{violation.student_details?.course} / {violation.student_details?.department}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-6 items-center">
                                            {!isDismissed && (
                                                <>
                                                    <div className="text-center px-4">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Required</p>
                                                        <p className="text-xl font-black text-slate-800 tracking-tighter">{ticket?.total_hours_required || 0}h</p>
                                                    </div>
                                                    <div className="text-center px-4 border-l border-slate-100">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Served</p>
                                                        <p className="text-xl font-black text-emerald-600 tracking-tighter">{ticket ? formatDuration(totalServedSeconds) : 'N/A'}</p>
                                                    </div>
                                                </>
                                            )}
                                            <div className={`text-center ${!isDismissed ? 'px-4 border-l border-slate-100' : ''}`}>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Date</p>
                                                <p className="text-sm font-bold text-slate-600">{formatDate(violation.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="hidden print:block" style={{ padding: '2mm', width: '100%', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex gap-0.5">
                            <img src="/ustp.png" alt="USTP" className="w-10 h-10 object-contain" />
                            <img src="/osa-logo.jpg" alt="OSA" className="w-10 h-10 object-contain" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-[7.5px] font-bold uppercase leading-none tracking-tight">University of Science and Technology of Southern Philippines</h1>
                            <h2 className="text-[6.5px] font-normal uppercase leading-tight">Office of Student Affairs - Cagayan de Oro</h2>
                            <h3 className="text-sm font-bold mt-0.5 tracking-tight">COMMUNITY SERVICE LOG</h3>
                        </div>
                        <div className="text-right self-end pb-0.5">
                            <p className="text-[7.5px] font-bold">For the Month of: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
                        </div>
                    </div>

                    <table className="w-full border-collapse border border-black text-[7px]" style={{ width: '100%' }}>
                        <thead>
                            <tr className="bg-white text-black">
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">ID NUMBER</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">FIRST NAME</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">LAST NAME</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">CONTACT NUMBER</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">YEAR LEVEL</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">COURSE/PROGRAM</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">COLLEGE</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">NATURE OF VIOLATION</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">DATE COMMITTED</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">PENALTY</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">COMMUNITY SERVED</th>
                                <th className="border border-black px-0.5 py-1 text-center font-bold text-[6.5px]">STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const rows = [...filtered];
                                while (rows.length < 20) rows.push({ id: `dummy-${rows.length}`, isDummy: true });
                                return rows.map((v) => {
                                    if (v.isDummy) {
                                        return (
                                            <tr key={v.id}>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                                <td className="border border-black p-0.5">&nbsp;</td>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                                <td className="border border-black p-0.5 text-center">&nbsp;</td>
                                            </tr>
                                        );
                                    }
                                const student = v.student_details || {};
                                const ticket = tickets.find(t => t.violation_details?.id === v.id || t.violation === v.id);
                                const isDismissed = v.status?.toLowerCase() === 'dismissed';
                                const ticketLogs = logs.filter(l => (l.eticket === ticket?.id || l.eticket?.id === ticket?.id));
                                const totalServed = ticketLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
                                const servedHours = Math.floor(totalServed / 3600);
                                const nameParts = (student.name || '').split(' ');
                                const firstName = nameParts[0] || '';
                                const lastName = nameParts.slice(1).join(' ') || '';

                                const formatDatePrint = (dateStr) => {
                                    if (!dateStr) return '—';
                                    const d = new Date(dateStr);
                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                    const dd = String(d.getDate()).padStart(2, '0');
                                    const yyyy = d.getFullYear();
                                    return `${mm}/${dd}/${yyyy}`;
                                };

                                return (
                                    <tr key={v.id}>
                                        <td className="border border-black p-0.5 text-center">{student.student_id || '—'}</td>
                                        <td className="border border-black p-0.5">{firstName.toUpperCase()}</td>
                                        <td className="border border-black p-0.5">{lastName.toUpperCase()}</td>
                                        <td className="border border-black p-0.5 text-center">{student.contact_number || '—'}</td>
                                        <td className="border border-black p-0.5 text-center">{student.year_level || '—'}</td>
                                        <td className="border border-black p-0.5">{student.course || '—'}</td>
                                        <td className="border border-black p-0.5">{student.department || '—'}</td>
                                        <td className="border border-black p-0.5">{v.violation_type || '—'}</td>
                                        <td className="border border-black p-0.5 text-center">{formatDatePrint(v.created_at)}</td>
                                        <td className="border border-black p-0.5">{v.punishment || '—'}</td>
                                        <td className="border border-black p-0.5 text-center">{(isDismissed || !ticket) ? 'N/A' : `${servedHours} hours`}</td>
                                        <td className="border border-black p-0.5 text-center">{isDismissed ? 'DISMISSED' : (ticket?.status === 'Completed' ? 'COMPLETED' : 'ONGOING')}</td>
                                    </tr>
                                );
                            });
                        })()}
                        </tbody>
                    </table>
                </div>

                <style>{`
                    @media print {
                        .print\\:hidden { display: none !important; }
                        .print\\:block { display: block !important; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white; }
                        * { box-sizing: border-box; }
                        main { padding: 0 !important; margin: 0 !important; }
                        @page { margin: 5mm; orientation: landscape; }
                    }
                `}</style>
            </main>
        </div>
    );
};

export default Archives;

```

### File: frontend\src\pages\staff\PendingReviews.jsx
```javascript
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Search, Check, X, ShieldAlert, User, Eye, AlertCircle } from 'lucide-react';

const PendingReviews = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await fetch('/api/violations/');
            const data = await response.json();
            const pending = data.filter(r => r.status.toLowerCase().includes('pending'));
            setReports(pending);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (reportId, newStatus) => {
        try {
            const endpoint = newStatus === 'Approved' ? 'approve' : 'dismiss';
            const response = await fetch(`/api/violations/${reportId}/${endpoint}/`, {
                method: 'POST',
            });
            if (response.ok) fetchReports();
        } catch (error) {
            console.error('Error executing action:', error);
        }
    };

    const filteredReports = reports.filter(r =>
        (r.student_details?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.student_details?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            <Sidebar role={userRole} />
            <main className="flex-1 p-4 md:p-10 pt-24 md:pt-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-8 md:mb-12 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight uppercase italic">Pending Reviews</h1>
                    <p className="text-slate-400 mt-2 font-medium italic">Validate and synchronize violation reports from field units.</p>
                </header>

                <div className="card-premium border-2 border-white shadow-xl p-6 md:p-10">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-slate-50 gap-4">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                            <input
                                type="text"
                                placeholder="Search student name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] p-4 pl-14 focus:border-ustp-blue outline-none font-bold text-sm transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-4 py-2 rounded-full">
                            <AlertCircle size={14} className="text-ustp-blue" />
                            {filteredReports.length} reports awaiting action
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-24 text-center animate-pulse text-slate-300 font-black uppercase tracking-[0.3em] text-xs">Syncing Queue...</div>
                    ) : filteredReports.length === 0 ? (
                        <div className="py-24 text-center bg-slate-50/50 rounded-[40px] border-4 border-dotted border-slate-100">
                            <div className="w-20 h-20 bg-white shadow-lg text-ustp-blue rounded-3xl flex items-center justify-center mx-auto mb-8">
                                <ShieldAlert size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">NULL QUEUE</h2>
                            <p className="text-slate-400 mt-3 max-w-xs mx-auto font-medium leading-relaxed">All field reports have been processed. Systems are nominal.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredReports.map((report) => (
                                <div key={report.id} className="p-6 bg-white border-2 border-slate-50 hover:border-ustp-blue rounded-[32px] transition-all shadow-sm hover:shadow-xl group">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="flex gap-6 items-center flex-1">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-ustp-blue group-hover:text-white transition-colors">
                                                <User size={24} />
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="font-black text-lg text-slate-900 uppercase tracking-tight truncate">{report.student_details?.name || 'New Student Record'}</h5>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{report.violation_type}</span>
                                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase">{report.student_details?.student_id}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 w-full md:w-auto">
                                            <button onClick={() => handleAction(report.id, 'Approved')} className="flex-1 md:flex-none px-6 py-4 bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 shadow-lg shadow-green-100 transition-all">Approve</button>
                                            <button onClick={() => handleAction(report.id, 'Dismissed')} className="flex-1 md:flex-none px-6 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Dismiss</button>
                                            <button onClick={() => setSelectedReport(report)} className="px-4 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"><Eye size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail Modal */}
                {selectedReport && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedReport(null)}>
                        <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                            <div className="bg-slate-900 p-8 relative">
                                <button onClick={() => setSelectedReport(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"><X size={20} /></button>
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center"><User size={30} className="text-white" /></div>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase italic">{selectedReport.student_details?.name}</h2>
                                        <p className="text-slate-400 text-xs font-black tracking-widest uppercase mt-1">{selectedReport.student_details?.student_id}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                <div className="bg-slate-50 p-5 rounded-3xl"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Violation Category</p><p className="font-black text-red-600 uppercase">{selectedReport.violation_type}</p></div>
                                <div className="bg-slate-50 p-5 rounded-3xl"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Description</p><p className="font-bold text-slate-700">{selectedReport.description || 'No report description available.'}</p></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-5 rounded-3xl"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Course</p><p className="font-bold text-slate-700 text-xs">{selectedReport.student_details?.course}</p></div>
                                    <div className="bg-slate-50 p-5 rounded-3xl"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Dept</p><p className="font-bold text-slate-700 text-xs">{selectedReport.student_details?.department}</p></div>
                                </div>
                            </div>
                            <div className="p-8 pt-0 flex gap-4">
                                <button onClick={() => { handleAction(selectedReport.id, 'Dismissed'); setSelectedReport(null); }} className="flex-1 py-5 bg-red-50 text-red-500 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Dismiss Case</button>
                                <button onClick={() => { handleAction(selectedReport.id, 'Approved'); setSelectedReport(null); }} className="flex-1 py-5 bg-green-500 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-green-600 shadow-xl shadow-green-100 transition-all">Approve Case</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PendingReviews;

```

### File: frontend\src\pages\staff\Settings.jsx
```javascript
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import QRCode from 'react-qr-code';
import { Settings as SettingsIcon, Shield, Clock, QrCode, Bell, Lock, User, Search, Key, AlertTriangle, Save, LogOut, CheckCircle } from 'lucide-react';

const LiveTimer = ({ remainingHours }) => {
    const formatTime = (hours) => {
        if (!hours) return '00:00:00';
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        const s = Math.floor(((hours - h) * 60 - m) * 60);
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    return <span className="font-mono text-green-600 font-black tracking-tighter">{formatTime(remainingHours)}</span>;
};

const StaffSettings = () => {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role || 'staff';
    const [activeSection, setActiveSection] = useState('codes');
    const [searchId, setSearchId] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [loadingLookup, setLoadingLookup] = useState(false);
    const [adminCode, setAdminCode] = useState('');
    const [tickets, setTickets] = useState([]);
    const [violations, setViolations] = useState([]);
    const [deductHours, setDeductHours] = useState('');
    const [manualStudentId, setManualStudentId] = useState('');
    const [manualMessage, setManualMessage] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

    // Profile State
    const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
    const [profileName, setProfileName] = useState(currentUser.full_name || 'OSA Administrator');
    const [profileBio, setProfileBio] = useState(currentUser.bio || 'University of Science and Technology of Southern Philippines Personnel');

    // Security State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [saveStatus, setSaveStatus] = useState({ msg: '', type: '' });

    const ADMIN_SECRET = "OSA-2026";

    const sections = [
        { id: 'codes', label: 'Action Codes', icon: QrCode, description: 'Service control QR codes' },
        { id: 'tickets', label: 'Service Hub', icon: Shield, description: 'Manual service override' },
        { id: 'account', label: 'Account', icon: User, description: 'Manage your profile' },
        { id: 'security', label: 'Security', icon: Lock, description: 'Password and access' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'System alerts' },
    ];

    useEffect(() => {
        if (activeSection === 'tickets') {
            fetchAdminData();
            const poll = setInterval(fetchAdminData, 3000);
            return () => clearInterval(poll);
        }
    }, [activeSection]);

    const fetchAdminData = async () => {
        try {
            const [vResp, tResp] = await Promise.all([
                fetch('/api/violations/?t=' + Date.now()),
                fetch('/api/etickets/?t=' + Date.now())
            ]);
            setViolations(await vResp.json());
            setTickets(await tResp.json());
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaveStatus({ msg: 'Saving...', type: 'info' });
        try {
            const response = await fetch('/api/users/update_profile/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUser.username,
                    full_name: profileName,
                    bio: profileBio
                })
            });
            const data = await response.json();
            if (response.ok) {
                const updatedUser = { ...currentUser, full_name: data.full_name, bio: data.bio };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setCurrentUser(updatedUser);
                setSaveStatus({ msg: 'Profile updated successfully!', type: 'success' });
            } else {
                setSaveStatus({ msg: data.error || 'Update failed', type: 'error' });
            }
        } catch (error) {
            setSaveStatus({ msg: 'Network error', type: 'error' });
        }
        setTimeout(() => setSaveStatus({ msg: '', type: '' }), 3000);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setSaveStatus({ msg: "Passwords don't match!", type: 'error' });
            return;
        }
        setSaveStatus({ msg: 'Updating...', type: 'info' });
        try {
            const response = await fetch('/api/users/change_password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUser.username,
                    old_password: oldPassword,
                    new_password: newPassword
                })
            });
            const data = await response.json();
            if (response.ok) {
                setSaveStatus({ msg: 'Password changed successfully!', type: 'success' });
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setSaveStatus({ msg: data.error || 'Update failed', type: 'error' });
            }
        } catch (error) {
            setSaveStatus({ msg: 'Network error', type: 'error' });
        }
        setTimeout(() => setSaveStatus({ msg: '', type: '' }), 3000);
    };

    const handleManualTimeIn = async () => {
        if (!manualStudentId || !manualCode) {
            setManualMessage('Please enter Student ID and Code');
            return;
        }
        try {
            const response = await fetch('/api/etickets/manual_time_in/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: manualStudentId, code: manualCode })
            });
            if (response.ok) {
                setManualMessage('Timer Started!');
                setManualCode('');
                fetchAdminData();
            } else { setManualMessage('Error starting timer'); }
        } catch (e) { setManualMessage('Network error'); }
        setTimeout(() => setManualMessage(''), 3000);
    };

    const handleManualTimeOut = async () => {
        if (!manualStudentId) {
            setManualMessage('Please enter Student ID');
            return;
        }
        try {
            const response = await fetch('/api/etickets/manual_time_out/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: manualStudentId })
            });
            const data = await response.json();
            if (response.ok) {
                setManualMessage(data.message);
                fetchAdminData();
            } else { setManualMessage(data.error || 'Error'); }
        } catch (e) { setManualMessage('Network error'); }
        setTimeout(() => setManualMessage(''), 3000);
    };

    const handleLookup = async () => {
        if (!searchId) return;
        setLoadingLookup(true);
        try {
            const resp = await fetch('/api/etickets/');
            const data = await resp.json();
            const cleanSearchId = String(searchId).trim().toLowerCase();
            const studentTicket = data.find(t =>
                String(t.violation_details?.student_details?.student_id).trim().toLowerCase() === cleanSearchId &&
                t.status !== 'Completed'
            );
            setLookupResult(studentTicket || 'Not Found');
        } catch (e) { setLookupResult('Error'); }
        finally { setLoadingLookup(false); }
    };

    const handleSyncLog = async (action, deductHrs = 0) => {
        setActionMessage({ text: '', type: '' });
        if (adminCode !== ADMIN_SECRET) {
            setActionMessage({ text: 'Error: Invalid Admin Override Code!', type: 'error' });
            return;
        }
        try {
            const resp = await fetch('/api/timelogs/log_time/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eticket_id: lookupResult.id,
                    action: action,
                    deduct_hours: deductHrs
                }),
            });
            if (resp.ok) {
                setActionMessage({ text: 'Hours successfully deducted!', type: 'success' });
                setAdminCode('');
                handleLookup();
                fetchAdminData();
            } else { setActionMessage({ text: "Failed to sync.", type: 'error' }); }
        } catch (e) { setActionMessage({ text: "Network error.", type: 'error' }); }
        setTimeout(() => setActionMessage({ text: '', type: '' }), 3000);
    };

    const downloadRegistrationQR = () => {
        const svg = document.getElementById('reg-qr-code-svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = 256;
            canvas.height = 256;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const pngFile = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.download = `registration_poster_qr.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            <Sidebar role={userRole} />
            <main className="flex-1 p-4 md:p-10 pt-24 md:pt-10 max-w-7xl mx-auto overflow-y-auto">
                <header className="mb-8 md:mb-12 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex flex-col md:flex-row items-center gap-4">
                        <div className="p-3 bg-ustp-blue/10 rounded-2xl">
                            <SettingsIcon className="text-ustp-blue" size={32} />
                        </div>
                        Admin Command Center
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium italic">Control system logic, service hub overrides, and security protocols.</p>
                </header>

                {saveStatus.msg && (
                    <div className={`fixed bottom-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-500 flex items-center gap-3 font-bold border-2 ${saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        saveStatus.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                        <Save size={20} />
                        {saveStatus.msg}
                    </div>
                )}

                {actionMessage.text && (
                    <div className={`fixed bottom-10 left-10 z-50 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-left-10 duration-500 flex items-center gap-3 font-bold border-2 ${actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {actionMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        {actionMessage.text}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Navigation Sidebar */}
                    <div className="lg:col-span-1 space-y-3">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-4 p-5 rounded-[24px] transition-all duration-300 ${activeSection === section.id
                                    ? 'bg-ustp-blue text-white shadow-xl shadow-blue-200 translate-x-1'
                                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 hover:border-slate-200'
                                    }`}
                            >
                                <div className={`p-2 rounded-xl ${activeSection === section.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                    <section.icon size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm leading-none uppercase tracking-widest">{section.label}</p>
                                    <p className={`text-[10px] mt-1 font-bold ${activeSection === section.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {section.description}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-3">
                        {activeSection === 'codes' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-50">
                                        <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl">
                                            <QrCode size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Service Control QR</h3>
                                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Live identification codes</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="bg-indigo-950 p-8 flex flex-col items-center justify-center text-center rounded-[32px] shadow-2xl border-4 border-indigo-800/30 group hover:border-indigo-500 transition-all duration-500">
                                            <h4 className="font-black text-xl uppercase tracking-tighter text-indigo-400 mb-6 flex items-center gap-2">
                                                <Clock size={20} /> CITC Building
                                            </h4>
                                            <div className="bg-white p-6 rounded-[32px] mb-6 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                                <QRCode value="CITC-BUILDING-3M" size={140} level="H" />
                                            </div>
                                            <div className="bg-indigo-900/50 text-indigo-300 rounded-2xl px-6 py-3 font-mono font-black text-xs border border-indigo-700/50 tracking-widest uppercase">
                                                CITC-BUILDING
                                            </div>
                                            <p className="text-indigo-400/60 text-[10px] font-bold mt-4 uppercase tracking-widest">Start/Resume Tracking</p>
                                        </div>

                                        <div className="bg-rose-950 p-8 flex flex-col items-center justify-center text-center rounded-[32px] shadow-2xl border-4 border-rose-800/30 group hover:border-rose-500 transition-all duration-500">
                                            <h4 className="font-black text-xl uppercase tracking-tighter text-rose-400 mb-6 flex items-center gap-2">
                                                <Shield size={20} /> Stop Service
                                            </h4>
                                            <div className="bg-white p-6 rounded-[32px] mb-6 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                                <QRCode value="OSA-STOP" size={140} level="H" />
                                            </div>
                                            <div className="bg-rose-900/50 text-rose-300 rounded-2xl px-6 py-3 font-mono font-black text-xs border border-rose-700/50 tracking-widest uppercase">
                                                OSA-STOP
                                            </div>
                                            <p className="text-rose-400/60 text-[10px] font-bold mt-4 uppercase tracking-widest">End Session Immediately</p>
                                        </div>

                                        <div className="bg-blue-950/30 p-8 flex flex-col items-center justify-center text-center rounded-[32px] shadow-sm border-2 border-dashed border-blue-900/30">
                                            <h4 className="font-black text-sm uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
                                                <User size={16} /> Public Registration QR
                                            </h4>
                                            <div className="bg-white p-4 rounded-2xl mb-4 shadow-lg cursor-pointer transition-transform hover:scale-110" onClick={downloadRegistrationQR}>
                                                <QRCode id="reg-qr-code-svg" value={`http://${window.location.hostname}:5173/register`} size={100} level="H" />
                                            </div>
                                            <button onClick={downloadRegistrationQR} className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-blue-300">Download Poster</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'tickets' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="card-premium bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-100 flex flex-col md:flex-row items-center gap-8 p-10">
                                    <div className="flex-1">
                                        <h4 className="font-black text-emerald-800 uppercase tracking-[0.2em] text-[10px] mb-2">Manual Service Override</h4>
                                        <h3 className="text-2xl font-black text-slate-900 mb-6">Timer Control Without Devices</h3>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                className="flex-1 bg-white border-2 border-emerald-100 rounded-2xl p-4 font-bold outline-none focus:border-emerald-500 shadow-sm"
                                                placeholder="Student ID Number"
                                                value={manualStudentId}
                                                onChange={(e) => setManualStudentId(e.target.value)}
                                            />
                                            <input
                                                type="password"
                                                className="w-full sm:w-40 bg-white border-2 border-emerald-100 rounded-2xl p-4 font-bold outline-none focus:border-emerald-500 shadow-sm"
                                                placeholder="CODE"
                                                value={manualCode}
                                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                            />
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <button onClick={handleManualTimeIn} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-200">Time In</button>
                                            <button onClick={handleManualTimeOut} className="flex-1 bg-red-500 hover:bg-red-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-200">Time Out</button>
                                        </div>
                                        {manualMessage && <p className="mt-4 text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-100/50 p-2 rounded-lg text-center">{manualMessage}</p>}
                                    </div>
                                    <div className="w-px h-40 bg-emerald-200 hidden md:block" />
                                    <div className="flex flex-col items-center justify-center p-6 bg-white/50 rounded-3xl border border-emerald-100 min-w-[200px]">
                                        <div className="p-4 bg-emerald-600 text-white rounded-2xl mb-3 shadow-lg">
                                            <Shield size={32} />
                                        </div>
                                        <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Security Verified</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="card-premium">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2 bg-blue-50 text-ustp-blue rounded-xl">
                                                <Search size={18} />
                                            </div>
                                            <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Manual Student Lookup</h4>
                                        </div>

                                        <div className="flex gap-2 mb-8">
                                            <input
                                                className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all"
                                                placeholder="Enter ID..."
                                                value={searchId}
                                                onChange={(e) => setSearchId(e.target.value)}
                                            />
                                            <button onClick={handleLookup} disabled={loadingLookup} className="px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase transition-all shadow-lg shadow-slate-200">Lookup</button>
                                        </div>

                                        {lookupResult && lookupResult !== 'Not Found' && (
                                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in zoom-in max-w-md">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-10 h-10 bg-blue-50 text-ustp-blue rounded-xl flex items-center justify-center font-black">
                                                        {lookupResult.violation_details?.student_details?.name?.charAt(0)}
                                                    </div>
                                                    <p className="font-black text-slate-900 text-sm uppercase truncate">{lookupResult.violation_details?.student_details?.name}</p>
                                                </div>
                                                <div className="space-y-3">
                                                    <input type="password" placeholder="ADMIN CODE" className="w-full bg-slate-50 p-3 rounded-xl text-center font-black text-xs outline-none focus:bg-white focus:ring-2 ring-ustp-blue/10" value={adminCode} onChange={e => setAdminCode(e.target.value)} />
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="number" 
                                                            className="w-20 bg-slate-50 p-3 rounded-xl text-center font-black text-xs outline-none" 
                                                            placeholder="Hrs"
                                                            value={deductHours}
                                                            onChange={(e) => setDeductHours(e.target.value)}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                handleSyncLog('custom', parseFloat(deductHours) || 0);
                                                                setDeductHours('');
                                                            }}
                                                            className="flex-1 bg-ustp-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                                                        >
                                                            Deduct Time
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'account' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="card-premium p-10">
                                    <div className="flex flex-col md:flex-row gap-10">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-32 h-32 bg-slate-100 rounded-[40px] flex items-center justify-center border-4 border-white shadow-xl">
                                                <User size={64} className="text-slate-300" />
                                            </div>
                                            <span className="px-4 py-1.5 bg-ustp-blue/10 text-ustp-blue text-[10px] font-black uppercase tracking-widest rounded-full">
                                                {currentUser.role} Account
                                            </span>
                                        </div>

                                        <form onSubmit={handleUpdateProfile} className="flex-1 space-y-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">Display Name</label>
                                                    <input
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all"
                                                        value={profileName}
                                                        onChange={(e) => setProfileName(e.target.value)}
                                                        placeholder="Enter full name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">Biography / Designations</label>
                                                    <textarea
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all min-h-[120px]"
                                                        value={profileBio}
                                                        onChange={(e) => setProfileBio(e.target.value)}
                                                        placeholder="Brief detail about yourself..."
                                                    />
                                                </div>
                                            </div>
                                            <button type="submit" className="btn-premium bg-ustp-blue text-white px-10 py-4 flex items-center gap-3 shadow-xl shadow-blue-200">
                                                <Save size={18} /> Update Profile
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'security' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="card-premium p-10 max-w-2xl">
                                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                                        <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                                            <Lock size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Access Control</h3>
                                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Manage login credentials</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleChangePassword} className="space-y-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">Current Password</label>
                                                <input
                                                    type="password"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all"
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">New Password</label>
                                                    <input
                                                        type="password"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-2">Confirm Password</label>
                                                    <input
                                                        type="password"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold outline-none focus:border-ustp-blue transition-all"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full btn-premium bg-slate-900 text-white py-5 shadow-xl shadow-slate-200">
                                            Update Password
                                        </button>
                                    </form>

                                    <div className="mt-12 pt-8 border-t border-slate-50">
                                        <button
                                            onClick={() => {
                                                localStorage.removeItem('user');
                                                window.location.href = '/login';
                                            }}
                                            className="flex items-center gap-3 text-red-500 font-black text-[10px] uppercase tracking-widest hover:text-red-600 transition-colors"
                                        >
                                            <LogOut size={16} /> Sign out from all devices
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'notifications' && (
                            <div className="card-premium py-20 flex flex-col items-center justify-center text-center opacity-50 animate-in fade-in duration-500">
                                <Shield size={48} className="text-slate-200 mb-4" />
                                <h4 className="font-black text-slate-300 lowercase uppercase tracking-[0.2em] text-sm">Experimental Section</h4>
                                <p className="text-slate-400 text-xs font-medium mt-2">System alert configuration is currently under development.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StaffSettings;

```

### File: frontend\src\pages\student\Settings.jsx
```javascript
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import QRCode from 'react-qr-code';
import { User, Mail, Phone, BookOpen, Building2 } from 'lucide-react';

const Settings = () => {
    const [studentInfo, setStudentInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const fetchStudentInfo = async () => {
            if (!user.username) return;
            try {
                const response = await fetch(`/api/students/${user.username}/`);
                if (response.ok) {
                    const data = await response.json();
                    setStudentInfo(data);
                }
            } catch (error) {
                console.error('Failed to fetch student profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentInfo();
    }, [user.username]);

    if (loading) {
        return (
            <div className="flex bg-slate-50 min-h-screen">
                <Sidebar role="student" />
                <main className="flex-1 p-4 sm:p-6 lg:p-10 flex items-center justify-center mobile-top-spacer">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </main>
            </div>
        );
    }

    if (!studentInfo) {
        return (
            <div className="flex bg-slate-50 min-h-screen">
                <Sidebar role="student" />
                <main className="flex-1 p-4 sm:p-6 lg:p-10 flex items-center justify-center mobile-top-spacer">
                    <p className="text-slate-500 font-bold text-sm sm:text-base">Profile not found. Please contact administration.</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="student" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto overflow-y-auto mobile-top-spacer">
                <header className="mb-6 sm:mb-8 lg:mb-10">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
                    <p className="text-slate-500 mt-1 font-medium italic text-sm sm:text-base">Manage your personal identification</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                    {/* QR Code Card */}
                    <div className="card-premium flex flex-col items-center justify-center p-8 sm:p-10 lg:p-12 text-center bg-white border-2 border-slate-100 shadow-xl">
                        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[32px] shadow-2xl shadow-blue-900/10 mb-6 sm:mb-8 border-4 border-slate-50">
                            <QRCode
                                value={studentInfo.student_id}
                                size={160}
                                level="H"
                                className="mx-auto w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] lg:w-[200px] lg:h-[200px]"
                            />
                        </div>
                        <h3 className="font-black text-xl sm:text-2xl text-slate-900 tracking-tight">{studentInfo.name}</h3>
                        <p className="text-blue-600 font-black tracking-widest text-xs sm:text-sm mt-1 mb-3 sm:mb-4 uppercase">{studentInfo.student_id}</p>
                        <p className="text-sm font-medium text-slate-400 max-w-[250px] px-2">
                            Present this personalized QR code to campus guards for instant violation registration or service hub scanning.
                        </p>
                    </div>

                    {/* Information Card */}
                    <div className="space-y-4 sm:space-y-6">
                        <div className="card-premium bg-white p-6 sm:p-8 overflow-hidden relative border-2 border-slate-100 shadow-sm">
                            <h4 className="font-black text-xs sm:text-sm uppercase tracking-[0.2em] text-blue-600 mb-6 sm:mb-8 flex items-center gap-3">
                                <User size={18} /> Basic Information
                            </h4>

                            <div className="space-y-4 sm:space-y-6">
                                <div>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Full Identity Name</p>
                                    <p className="font-bold text-slate-800 text-lg sm:text-xl tracking-tight">{studentInfo.name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1 flex items-center gap-2"><BookOpen size={12} /> Course</p>
                                        <p className="font-bold text-slate-800 uppercase text-sm sm:text-base">{studentInfo.course || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1 flex items-center gap-2"><Building2 size={12} /> Department</p>
                                        <p className="font-bold text-slate-800 uppercase text-sm sm:text-base">{studentInfo.department || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card-premium bg-white p-6 sm:p-8 border-2 border-slate-100 shadow-sm">
                            <h4 className="font-black text-xs sm:text-sm uppercase tracking-[0.2em] text-slate-800 mb-6 sm:mb-8 flex items-center gap-3">
                                <Mail size={18} className="text-blue-600" /> Contact Details
                            </h4>

                            <div className="space-y-4 sm:space-y-6">
                                <div>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Institutional Email</p>
                                    <p className="font-bold text-slate-800 text-base sm:text-lg break-all">{studentInfo.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1 flex items-center gap-2"><Phone size={12} /> Primary Contact</p>
                                    <p className="font-bold text-slate-800 text-base sm:text-lg">{studentInfo.contact_number || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Settings;

```

### File: frontend\src\pages\student\TimeLogs.jsx
```javascript
import React from 'react';
import Sidebar from '../../components/Sidebar';
import { Clock, History } from 'lucide-react';

const TimeLogs = () => {
    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="student" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto mobile-top-spacer">
                <header className="mb-6 sm:mb-8 lg:mb-10">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Time Logs</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">Keep track of your community service hours.</p>
                </header>

                <div className="card-premium py-14 sm:py-20 text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <Clock className="text-slate-300" size={32} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">No Active Service Logs</h2>
                    <p className="text-slate-400 mt-2 max-w-sm mx-auto font-medium text-sm sm:text-base px-4">
                        You have no current or past community service logs recorded in the system.
                    </p>
                </div>

                <div className="mt-6 sm:mt-8 border-t border-slate-100 pt-6 sm:pt-8 lg:pt-10">
                    <h3 className="font-extrabold text-slate-800 text-base sm:text-lg flex items-center gap-3 mb-6 sm:mb-8">
                        <History className="text-slate-300" size={22} />
                        Detailed Session History
                    </h3>
                    <div className="text-center py-14 sm:py-20 bg-slate-50/50 rounded-2xl sm:rounded-[32px] border-2 border-dashed border-slate-100">
                        <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">No history to display</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TimeLogs;

```

### File: frontend\src\pages\student\ViolationInfo.jsx
```javascript
import React from 'react';
import Sidebar from '../../components/Sidebar';
import { ShieldCheck, AlertCircle } from 'lucide-react';

const ViolationInfo = () => {
    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar role="student" />
            <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto mobile-top-spacer">
                <header className="mb-6 sm:mb-8 lg:mb-10">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Violation Information</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">Review your record and university policies.</p>
                </header>

                <div className="card-premium py-14 sm:py-20 text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <ShieldCheck className="text-green-500" size={32} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Everything looks good!</h2>
                    <p className="text-slate-400 mt-2 max-w-xs mx-auto text-sm sm:text-base px-4">
                        You have no recorded violations. Always follow the university dress code and carry your student ID at all times.
                    </p>
                </div>

                <div className="mt-6 sm:mt-8 lg:mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="card-premium">
                        <h4 className="font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                            <AlertCircle className="text-ustp-gold shrink-0" size={18} />
                            Dress Code Policy
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Students must wear proper attire as per the Student Handbook. Avoid wearing slippers, shorts (unless for PE), and sleeveless shirts inside the campus.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ViolationInfo;

```

