# 🏗️ OSAConnect Master Rebuild Guide (Step-by-Step)

This document serves as the **Master Curriculum** for rebuilding the OSAConnect system from scratch. It is designed to be read by AI models to ensure that every feature is built systematically, without skipping architectural steps.

---

## 🎯 Project Principles
1. **Understand Everything**: No boilerplate without explanation.
2. **One Feature at a Time**: Complete the backend AND frontend for a feature before moving to the next.
3. **Clean Code**: Use consistent naming conventions and modular file structures.
4. **AI Persistence**: This guide ensures the "mental model" of the project is preserved across AI sessions.

---

## 💻 Tech Stack
- **Frontend**: React (Vite), Tailwind CSS 4.
- **Backend**: Django REST Framework (DRF).
- **Database**: MongoDB via MongoEngine.
- **Auth**: SimpleJWT (JSON Web Tokens).

---

## 🗺️ Phase 1: Foundation & Authentication
*Goal: Create a secure gateway for Admin, Guard, and Student roles.*

### Step 1: Workspace Initialization
**Terminal Commands:**
```powershell
# 1. Create the project structure
mkdir osaconnect_v2
cd osaconnect_v2
mkdir backend
mkdir frontend

# 2. Setup Backend Environment
cd backend
python -m venv venv
.\venv\Scripts\activate

# 3. Install Core dependencies
pip install django djangorestframework django-rest-framework-mongoengine mongoengine djangorestframework-simplejwt django-cors-headers python-dotenv

# 4. Initialize Django
django-admin startproject osaconnect_backend .
python manage.py startapp users
```

### Step 2: Custom User Document & DB Connection
**Settings Configuration (`osaconnect_backend/settings.py`):**
```python
import mongoengine

# Disconnect default SQL DB (Optional, but keeps it clean)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.dummy',
    }
}

# Connect to MongoDB
mongoengine.connect(
    db='osa_v2_db',
    host=os.getenv('MONGODB_URI', 'mongodb://localhost:27017/osa_v2_db')
)
```

**Model Definition (`users/models.py`):**
```python
from mongoengine import Document, StringField, DateTimeField, EmailField
from datetime import datetime
from django.contrib.auth.hashers import make_password, check_password

class User(Document):
    email = EmailField(required=True, unique=True)
    password = StringField(required=True)
    full_name = StringField(required=True)
    role = StringField(choices=('admin', 'guard', 'student'), default='student')
    created_at = DateTimeField(default=datetime.utcnow)

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)
```

### Step 3: JWT & Login API
**Serializer (`users/serializers.py`):**
```python
from rest_framework import serializers

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
```

**Login View (`users/views.py`):**
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import User
from rest_framework_simplejwt.tokens import RefreshToken

class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            user = User.objects(email=email).first()
            if user and user.check_password(password):
                refresh = RefreshToken.for_user(user) # Note: Needs custom token logic for Mongo
                return Response({
                    'token': str(refresh.access_token),
                    'role': user.role,
                    'name': user.full_name
                })
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

### Step 5: Frontend Login UI
- Build a beautiful, responsive Login page using Tailwind.
- Implement `AuthContext` to manage tokens and login state.
- Create protected routes using React Router.

---

## 🗺️ Phase 2: Student & QR Ecosystem
*Goal: Manage students and generate unique identity keys.*

### Step 6: Student Management API
- Create `Student` document (extending/linked to User).
- Fields: `student_id`, `course`, `year_level`, `qr_data`.

### Step 7: QR Code Generation
- Implement backend logic to generate a unique string for each student.
- Display the QR code on the Student Dashboard using `react-qr-code`.

### Step 8: Admin Panel for Students
- Build UI for Admins to view/add/edit student records.
- Implement search and filtering by Course/ID.

---

## 🗺️ Phase 3: Violation & E-Ticket System
*Goal: The core violation reporting and verification flow.*

### Step 9: QR Scanner for Guards
- Implement `html5-qrcode` on the Guard Landing Page.
- Scan logic: Detect ID -> Fetch Student info from Backend.

### Step 10: Violation Reporting API
- Create `Violation` document.
- Fields: `student_id`, `type`, `description`, `timestamp`, `guard_id`, `status`.

### Step 11: E-Ticket Generation
- Auto-generate a violation summary (E-Ticket) upon report.
- Visual feedback for the Guard: "Violation Recorded Successfully".

---

## 🗺️ Phase 4: Tracking & Community Service
*Goal: Monitor progress and fulfillment of penalties.*

### Step 12: Community Service Tracking
- Create `ServiceLog` document.
- Link violations to community service hours.

### Step 13: Student Violation History
- Allow students to view their own recorded violations and remaining service hours.

---

## 🗺️ Phase 5: Polishing & Dashboards
*Goal: High-level visibility and final UX refinements.*

### Step 14: Admin Analytics
- Use `Chart.js` to show violation trends (monthly, by department).

### Step 15: Global Search & Cleanup
- Implement a global search bar for Admins.
- Conduct a final code audit and documentation pass.

---

## 🚀 How to use this guide with AI:
1. **Initialize Step 1.**
2. **DO NOT start Step 2** until the developer confirms Step 1 is verified and working.
3. **Ask for the current state** at the start of each session to ensure no drift.
