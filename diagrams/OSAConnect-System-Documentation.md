# OSAConnect — Complete System Reference

> **For the AI reading this.** This file describes the whole OSAConnect system: its purpose, people, data,
> rules, processes, every API endpoint, every screen on the website and the Android app, and the known
> limitations. It was written from a full read of the source code on **2026-10-03** at commit
> `d0e5d29`, then updated the same day for the handbook penalties and the retired legacy QR codes
> (working-copy changes on top of `d0e5d29`) ("additional fix", 2026-10-03 10:24 +08:00, the newest commit on `main` that day). Numbers,
> limits and labels are the exact values in the code at that commit. Where the website and the app
> differ, both are described. **If this document and the code disagree, the code wins.** Documents
> go stale; the code is what runs. Any other OSAConnect write-up dated before this one (for example a
> project-knowledge file at commit `d5776a3` or earlier) is older and should be replaced by this file.
>
> No passwords, keys, connection strings or secret QR codes are included. Environment variable
> *names* are listed; their values live only in `.env` files and on Vercel.

---

## Contents

1. [What the system is](#1-what-the-system-is)
2. [Glossary](#2-glossary)
3. [Architecture and technology](#3-architecture-and-technology)
4. [Repository layout](#4-repository-layout)
5. [Running, building and deploying](#5-running-building-and-deploying)
6. [Roles, logins and permissions](#6-roles-logins-and-permissions)
7. [Authentication and sessions](#7-authentication-and-sessions)
8. [Data model](#8-data-model)
9. [Business rules and constants](#9-business-rules-and-constants)
10. [End-to-end processes](#10-end-to-end-processes)
11. [REST API reference](#11-rest-api-reference)
12. [Website: every page](#12-website-every-page)
13. [Android app: every screen](#13-android-app-every-screen)
14. [QR codes](#14-qr-codes)
15. [Emails](#15-emails)
16. [Notifications](#16-notifications)
17. [Background jobs](#17-background-jobs)
18. [Time and time zones](#18-time-and-time-zones)
19. [Performance and data use](#19-performance-and-data-use)
20. [Code shared or mirrored between platforms](#20-code-shared-or-mirrored-between-platforms)
21. [Known limitations and open issues](#21-known-limitations-and-open-issues)
22. [Thesis wording vs. the system](#22-thesis-wording-vs-the-system)
23. [Diagrams in this folder](#23-diagrams-in-this-folder)

---

## 1. What the system is

**OSAConnect** (also written "OSA Connect") is the student violation and community-service system of the
**Office of Student Affairs (OSA)** of the **University of Science and Technology of Southern Philippines
(USTP)**, Cagayan de Oro. It replaces paper slips and logbooks:

1. A **security guard** or a **faculty & staff** member reports a student's violation (scans the student's
   ID QR code or types the 10-digit student ID). The student gets an email notice.
2. An **OSA admin** reviews the report: **dismisses** it, or **approves** it. The penalty comes from the **OSA
   Student Handbook** for the offense number: 3 hours of community service, then 6 hours, then **no entry into
   the campus**. For a penalty with hours, the admin chooses the **service site** (a "building"), and approving
   creates an **e-ticket**. A no-entry sanction is recorded and archived.
3. The **student** goes to the assigned service site and scans the site's QR code to **time in**. The
   phone's GPS must be inside the site's circle (**geofence**). While the timer runs, the location is
   checked; leaving the area for 30 seconds or turning location off ends the session. Scanning the site
   QR again **times out**. Each session's time is subtracted from the remaining hours.
4. The student must finish within **3 days** (Sundays not counted). After that, every missed day adds 1 hour.
5. When the hours reach zero, the e-ticket is **Completed**. The student brings the signed **ISO form**
   (FM-USTP-OSA-013, "Community Service Time Log and Summary") and a **reflection paper** (FM-USTP-OSA-14)
   to the OSA office. The admin photographs both with a phone (QR link) and **approves the clearance**: the
   case becomes **Cleared** and moves to the **Archives**.
6. Admins also manage service sites (GPS-registered, with printable QR codes), students, and analytics
   reports (PDF). Guards see campus-wide violation counts.

**Platforms**

| Part | What | Who uses it |
|---|---|---|
| Website | React single-page app | Admins, guards, faculty & staff, students (iPhone students use the website) |
| Android app | Expo / React Native, version 1.2.0, package `com.osaconnect.student` | Students, guards, faculty & staff (admins are refused) |
| Backend | Django REST API under `/api/` | Both clients |
| Database | MongoDB Atlas, database `OSAConnect_deploymenttest` | The same database for local development and the live site |

**Live address:** `https://osaconnect.vercel.app` (website, and the API under `/api/`). Hosted on Vercel,
region `hkg1` (Hong Kong).

---

## 2. Glossary

> **Watch the word "staff".** In the thesis manuscript, "OSA staff" means the **admins**. In the system,
> the role `staff` means **faculty & staff** (teachers and other school employees who file reports).
> They are different people with different permissions.

| Term | Meaning |
|---|---|
| OSA | Office of Student Affairs (USTP). The admins are OSA staff. |
| Admin | Role `admin`: OSA staff. Full access on the website only. |
| Faculty & Staff | Role `staff`: teachers and other school staff. They file reports. |
| Guard | Role `guard`: campus security. Guard accounts are **shared**, so a guard types the **name of the guard on duty** on each report. |
| Student | A `Student` record that has a password (registered). Logs in with student ID or email. |
| Placeholder student | A `Student` record made from a report for an ID that has no account yet. It has no password, so nobody can log in with it. When the real student registers with that ID, the record becomes their account and keeps the reports. Its name is "Unregistered Student" unless a name was typed. |
| Reporter | Anyone who can file reports: admin, staff, guard (`IsReporter`). |
| Violation report | One `ViolationReport` document: one violation type for one student. A guard ticking 3 violations creates 3 reports. |
| Offense count | How many reports of the same violation type the student has, not counting dismissed ones, including this one. |
| Punishment / sanction | Text like "3 hours community service" or "No Entry into the Campus", from the OSA Student Handbook table (or the hours the admin types for an event report). |
| E-ticket | `ETicket`: the community service assignment created when a report is approved with hours > 0. One per violation. |
| Service site / building | `ServiceSite`: a GPS-registered place where students serve, with a code like `LIB-01`, a radius (geofence) and a capacity. The UI calls it a "building" ("Assign Building"). |
| Geofence | The circle of `radius_m` meters around a site. The student must be inside to start and must stay inside. |
| Session / time log | `TimeLog`: one time-in → time-out period on an e-ticket. |
| Receipt | The summary of a session: date, building, time in/out, duration, how it ended, and events (left area, returned, location off/on). |
| Clearance | The last step: the admin photographs the signed ISO form and the reflection paper, then approves. The case becomes "Cleared". |
| ISO form | (Sample form.) FM-USTP-OSA-013 "Community Service Time Log and Summary" (A4 landscape, two copies side by side). Students download it blank as a PDF and fill it in by hand. |
| Reflection form | (Sample form.) FM-USTP-OSA-14 "Student Reflection Form" (A4 portrait). Downloaded blank as a PDF. |
| Capture link | A signed, 30-minute link (shown as a QR code to the admin) that opens a phone page to photograph the clearance documents without logging in. |
| 3-day rule | A student has 3 counted days (Monday–Saturday) after approval to finish. Each missed Monday–Saturday after that adds 1 hour. |
| Data saver | Student setting, **on by default**: the map loads only when tapped, and idle refreshes happen every 3 minutes instead of every 30 seconds. |
| PH time | Philippine time, UTC+8, no daylight saving. All "day" rules use it. |

---

## 3. Architecture and technology

```
 Student (Android app) ─┐
 Student (website) ─────┤        HTTPS + JSON, "Authorization: Bearer <token>"
 Guard / Faculty & Staff├──►  Vercel ──►  /api/*  ──► Django + DRF (wsgi.py → backend/)
   (website or app)     │       │                        │  mongoengine ODM
 Admin (website) ───────┘       │                        ├──► MongoDB Atlas (8 collections)
 Admin's phone (capture page)   └─► static website        └──► Gmail SMTP (codes, violation notices)
                                    (frontend/dist)
 Maps: OpenStreetMap tiles (Leaflet on the website; plain tiles on Android; react-native-maps on iOS builds)
```

### Backend (`backend/`)
- **Python** (Vercel runtime `python3.10`), **Django** (project generated with 6.0.2), **Django REST Framework**,
  **django-rest-framework-mongoengine** (ViewSets/serializers for mongoengine documents), **mongoengine** + **pymongo**.
- Other packages (`requirements.txt`): django-cors-headers, whitenoise, dj-database-url, python-dotenv, certifi,
  dnspython, cryptography, **segno** (QR code PNGs), gunicorn (not used on Vercel), djangorestframework-simplejwt
  (installed but **not used**: login tokens use `django.core.signing`).
- Django's SQL database setting (SQLite by default) is unused for app data. All app data is in MongoDB.
- MongoDB connection: `MONGODB_URI`, `serverSelectionTimeoutMS=5000`, `read_preference=PRIMARY_PREFERRED`
  (reads can fall back to a secondary while the primary is briefly unreachable).
- All models use `strict: False` (old code can load records with newer fields) and `auto_create_index: False`
  (avoids a slow index check on each Vercel cold start; indexes are created once by a command).

### Website (`frontend/`)
- **React 18.3**, **Vite 5.4**, **Tailwind CSS 4.2**, **react-router-dom 7**, **framer-motion** (page fades),
  **lucide-react** icons, **qr-scanner** (camera QR decoding), **react-qr-code** (QR rendering),
  **chart.js / react-chartjs-2**, **jsPDF + jspdf-autotable** (PDFs), html2canvas (form PDFs),
  **Leaflet 1.9.4** loaded from the unpkg CDN in `index.html`, OpenStreetMap tiles.
- Pages are lazy-loaded (code-split). After a new deploy, a missing page chunk triggers one reload.
- `lib/apiAuth.js` wraps `window.fetch` so every `/api/` request carries the login token, and a 401
  sends the person back to their login page.
- `lib/autoUpdate.js` reloads open tabs when a newer deploy is live (compares the hashed main script name;
  checks when the tab becomes visible and every 5 minutes; not while a dialog or camera is open).

### Android app (`mobile/`)
- **Expo SDK 57**, **React Native 0.86.3**, **React 19.2.3**, **Expo Router** (file-based routes), **axios**,
  **AsyncStorage**, **expo-camera** (QR scanning), **expo-location + expo-task-manager** (background location),
  **expo-notifications** (local notifications), **expo-print + expo-sharing + expo-file-system** (form PDFs),
  **expo-media-library** (save the student QR to photos), react-native-qrcode-svg, react-native-view-shot,
  react-native-maps (iOS only), **expo-updates** (over-the-air updates), Reanimated 4, React Compiler on.
- Android map: OpenStreetMap tiles drawn with plain Views (`MapViewComponent.android.jsx`). Google Maps would
  need an API key, and without one the app crashed.
- API base URL (`services/api.js`): `EXPO_PUBLIC_API_URL`. Without it, it uses the development machine
  (web: same host on port 8000; phone: the Expo LAN IP on port 8000).
- Version 1.2.0; EAS project owner `beansilog26`; OTA updates from `u.expo.dev`; `runtimeVersion` policy `appVersion`.

### External services
- **MongoDB Atlas** (M0 free tier: 512 MB counted as data + indexes).
- **Gmail SMTP** `smtp.gmail.com:465` (SSL), timeout 20 s, sender "OSAConnect <account>".
- **Vercel** for hosting; **Expo/EAS** for Android builds and OTA updates.
- **OpenStreetMap** tiles; **unpkg** CDN for Leaflet.

---

## 4. Repository layout

```
OSAConnect_testdeploy/
├── vercel.json              Vercel build + routes (see §5)
├── wsgi.py                  Vercel Python entry: adds backend/ to sys.path, loads Django
├── requirements.txt         Python packages (same list as backend/requirements.txt)
├── .vercelignore, .gitignore
├── AUDIT-2026-09-28.md      Pre-pilot security audit (most items since fixed; see §21). Keep private.
├── diagrams/                This document + the 6 diagrams (PNG + SVG)
├── shared/                  Used by both the website and the app
│   ├── help-content.json    Help/FAQ text for every role (penalty table is NOT here; it comes from the API)
│   ├── iso-form.js          HTML of the blank FM-USTP-OSA-013 form (turned into a PDF)
│   ├── reflection-form.js   HTML of the blank FM-USTP-OSA-14 form
│   └── osaconnect-logo.js   Logo as data for the forms
├── backend/
│   ├── manage.py
│   ├── osaconnect_backend/  settings.py (DB, email, DRF, CORS), urls.py (/api/ + SPA catch-all), wsgi.py, asgi.py
│   └── core/                The whole app
│       ├── models.py        8 mongoengine documents + status enums + name formatting
│       ├── views.py         Login, students, violations, e-tickets, time logs, users, capture page, health
│       ├── site_views.py    Service sites (admin): list/create/edit/re-locate/QR PNG
│       ├── serializers.py   API shapes (computed e-ticket fields, password never sent)
│       ├── auth.py          Signed login tokens, Identity, permission classes, owns_ticket
│       ├── passwords.py     PBKDF2 hashing, legacy plain-text upgrade
│       ├── deadlines.py     3-day rule and missed-day hours
│       ├── emails.py        Code emails and violation notices (plain + HTML)
│       ├── urls.py          API routes
│       └── management/commands/
│           ├── create_account.py   Create/reset/disable system accounts (the only way to make them)
│           └── ensure_indexes.py   Create the performance indexes
├── frontend/
│   ├── index.html (Leaflet CDN), vite.config.js (/api proxy → :8000), package.json
│   └── src/
│       ├── main.jsx, App.jsx (routes, ProtectedRoute, page fades), index.css, App.css
│       ├── pages/           LandingPage, Login, AdminLogin, StudentRegistration, ForgotPassword,
│       │                    ClearanceCapture, Help, StudentDashboard, StaffDashboard (admin overview)
│       │   ├── guard/       ReportViolation, GuardHistory, GuardAnalytics
│       │   ├── staff/       (admin pages) AllStudents, PendingReviews, Archives, Analytics, ServiceSites, Settings
│       │   └── student/     Settings, PersonalInfo, ChangePassword, Notifications, Help
│       ├── components/      StudentShell, ReporterShell, Sidebar, QrScannerModal, ReportViolationModal,
│       │                    TicketDetails, SessionReceipt, ArchivedCase, MapGate, SiteMapPreview,
│       │                    SettingsList, ThemeToggle, NotificationItem, BreakdownBars, StudentIdleGuard,
│       │                    LoginSwitchGuard, useServiceSites, useStudentTheme, studentQr.js, studentSession.js
│       └── lib/             portals, apiAuth, autoUpdate, usePolling, names, academics, violationTypes,
│                            ticketStatus, studentNotifications, greeting, geo, photo, isoFormPdf, violationReport
└── mobile/
    ├── app.json (permissions, plugins, OTA), eas.json (build profiles), package.json
    ├── services/api.js      axios client + token + 401 handling
    ├── constants/           Colors.js, Data.js (departments, courses, genders, year levels)
    ├── app/                 _layout, index (role redirect), login, register, forgot-password, help
    │   ├── student/         _layout, dashboard, scan, settings, personal-info, notifications, change-password
    │   └── staff/           _layout, dashboard (report form), scan, settings
    └── components/          AuthContext, StudentShell, TicketDetails, SessionReceipt, ServiceForms,
                             QrScannerView, MapViewComponent(.android/.native/.web), MapGate, SelectField,
                             ContactDetailsCard, NotificationItem, SettingsList, ThemeContext, RequireRole,
                             backgroundTracking.js, serviceQr.js, studentQr.js, studentSession.js,
                             studentNotifications.js, ticketStatus.js, geo.js, names.js, greeting.js,
                             useAutoUpdate.js, useStudentActivityGuard.js, showAlert.js, cameraResults.js
```

---

## 5. Running, building and deploying

### Environment variables (names only)
| Variable | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | backend `.env` / Vercel | Atlas connection string (database `OSAConnect_deploymenttest`) |
| `SECRET_KEY` | backend `.env` / Vercel | Django secret; also signs login tokens and capture links |
| `DEBUG` | backend `.env` | `True` only on a dev laptop (default False) |
| `ALLOWED_HOSTS` | backend `.env` / Vercel | Comma list (default `*`) |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | backend `.env` / Vercel | Gmail account + app password (spaces removed automatically) |
| `EXPO_PUBLIC_API_URL` | mobile build env | API base, e.g. the deployed `/api` |

The backend loads `backend/.env` and the repo-root `.env`. A local `runserver` must be restarted after `.env` changes.

### Local development (Windows)
- Backend: `cd backend` → `venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000`
- Website: `cd frontend` → `npm run dev` (port 5173; `/api` is proxied to `localhost:8000`)
- Android app: `cd mobile` → `npx expo start --go` (Expo Go; `expo-dev-client` is installed, so a plain `start`
  expects a dev build). Background location only works in a real build, not Expo Go.
- The project lives outside OneDrive. OneDrive turned `node_modules` files into cloud placeholders and broke Metro builds.

### Management commands (write to whatever `MONGODB_URI` points at)
- `python manage.py create_account <username> --role admin|staff|guard [--name "Full Name"] [--password X | --generate]`:
  creates the account, or resets the password of an existing one. Without `--name`, the full name defaults to
  "OSA Administrator" / "Faculty & Staff" / "Security Guard".
- `python manage.py create_account <username> --disable | --enable`: blocks or allows login (also invalidates tokens).
- `python manage.py ensure_indexes`: creates these indexes (safe to rerun):
  violation_reports (student, created_at), (status, created_at), (created_at), (reporting_account, created_at),
  (status, cleared_at); etickets (status); timelogs (eticket, time_in), (time_out, tracked, last_ping_at);
  clearance_proofs (violation, kind). The unique indexes (student_id, username, OTP email, site_code, one
  e-ticket per violation) already exist.

### Vercel deployment (`vercel.json`)
- Builds: `frontend/package.json` with `@vercel/static-build` (output `dist`), and `wsgi.py` with `@vercel/python`
  (`python3.10`, max lambda 15 MB). Region `hkg1`.
- Routes, in order: `/api/(.*)` → `wsgi.py`; `/static/(.*)` → `wsgi.py`; `/assets/(.*)` → `frontend/assets/$1`;
  any root file ending in png/jpg/jpeg/svg/ico/webp → `frontend/$1`; then the filesystem; everything else → `frontend/index.html`.
- A new public file of another type (.webmanifest, .txt, .json) needs its own route, or it returns index.html.
- Vercel passes URL paths to Django **without decoding** them (`%3A` stays). Anything read from the path must be
  `urllib.parse.unquote`d. The capture-link token is the one place this matters.

### Android builds (`eas.json`)
- Profiles: `development` (dev client, internal), `preview` (APK, internal, channel preview), `production` (APK, channel production).
- `useAutoUpdate` checks for an OTA update when the app opens and when it returns to the foreground, then downloads and restarts.
- Permissions: camera, (record audio), coarse/fine/background location, foreground service (location), post notifications.

---

## 6. Roles, logins and permissions

### Login pages
| Login | URL (website) | Accepts | Field label |
|---|---|---|---|
| Student | `/student` | role `student` (student ID **or** email + password) | Student ID |
| Faculty | `/faculty` (`/guardnstaff` redirects here) | roles `guard`, `staff` | Username |
| Admin | `/admin` | role `admin` | Admin ID |
| Android app | Login screen | students, guards, staff. **Admins are refused** ("Admin login is not supported on mobile.") | |

A wrong-portal login is refused with a hint ("This is the student login. Faculty members log in at /faculty.").
The admin page gives no hint ("Invalid credentials"). After login: admin → `/admin/overview`, staff → `/staff/report`,
guard → `/guard/report`, student → `/student/dashboard`. On Android: students → `/student/dashboard`,
guards/staff → `/staff/dashboard`.

Opening another group's login while logged in shows "Log out?" (LoginSwitchGuard). For a student, it warns that
the running timer will stop.

### Server permission classes (`core/auth.py`)
- `IsAdmin` (role admin), `IsReporter` (admin, staff, guard), `IsStudent`, `IsLoggedIn` (any valid token), `AllowAny`.
- Default for anything not set per view: **IsAdmin**.
- `owns_ticket`: an admin may act on any e-ticket; a student only on their own.

### Capability matrix
| Capability | Student | Guard | Faculty & Staff | Admin |
|---|---|---|---|---|
| Register (email code) / reset forgotten password | ✓ | – | – | – |
| Log in | ✓ (web + app) | ✓ (web + app) | ✓ (web + app) | ✓ (web only) |
| See own violations, e-tickets, receipts, notifications | ✓ | – | – | – |
| Time in / out at a service site (QR + GPS) | ✓ | – | – | – |
| Download blank ISO & reflection forms | ✓ | – | – | (sees them in archives) |
| Change own password / email / contact number | ✓ | (API only, no UI) | (API only, no UI) | ✓ password |
| File a violation report (scan student QR or type ID) | – | ✓ | ✓ | ✓ (can open `/guard/report`) |
| See reports they filed (History) | – | ✓ web | ✓ web | – |
| Campus-wide violation counts | – | ✓ web | – | – |
| Review pending reports (approve with site & hours / dismiss) | – | – | – | ✓ |
| Report violations for many IDs at once (event no-show) | – | – | – | ✓ |
| Monitor violators, change building, view case details | – | – | – | ✓ |
| Clear completed cases (phone photos + approve) | – | – | – | ✓ |
| Archives (+ PDF community service log) | – | – | – | ✓ |
| Analytics reports (daily/monthly/quarterly/annual + PDF) | – | – | – | ✓ |
| Manage students (list, filter, edit, view/download QR) | – | – | – | ✓ |
| Manage service sites (GPS capture, radius, capacity, QR) | – | – | – | ✓ |
| Create/disable system accounts | – | – | – | Terminal command only |

---

## 7. Authentication and sessions

- **Login** `POST /api/login/ {username, password}`:
  1. Looks for a `SystemUser` with that username (case-insensitive) that isn't disabled; checks the password.
  2. Otherwise looks for a `Student` by `student_id`, then by `email` (case-insensitive). A placeholder student
     (no password) gets 401 "This student ID isn't registered yet. Tap Register to create your account."
  3. Success returns `{success, token, role, username, full_name, bio}` for system users, or
     `{success, token, role: "student", username: <student_id>, student_id, name}` for students. Otherwise 401
     "Invalid credentials".
- **Token**: `django.core.signing.dumps({r: role, u: username, p: <first 12 hex chars of SHA-256 of the stored
  password hash>}, salt="osaconnect-login", compress=True)`. It is stateless and valid **30 days**. It is sent as
  `Authorization: Bearer <token>`.
- **Checking a token**: verifies the signature and age, loads the account, and checks that the role matches, the
  account isn't disabled, and the password mark matches. Changing the password or disabling the account
  therefore invalidates old tokens. A checked token is cached for **60 s** per server process; a password
  change clears the cache for that account immediately. An invalid token gets **401** "Your login has expired.
  Please log in again." The clients then clear the saved login and open the login page.
- **Passwords**: Django PBKDF2 hashes (`passwords.py`). Accounts saved before hashing still hold plain text;
  the first successful login re-saves them hashed. The password is never sent in any API response.
- **Saved login**: website `localStorage.user` (token, role, username, names); Android AsyncStorage `user`.
- **Website page guard** (`ProtectedRoute`) checks the saved role. This only decides what the UI shows; the
  server enforces every permission.
- **Student inactivity**:
  - Website: after **60 minutes** without input, "Still there?" counts down **60 s**, then logs out and stops
    any running timer (end reason `idle`). The last-activity time is shared across tabs and survives sleep.
  - Android: **5 minutes** without touching the app logs out, **except while a session is being tracked**
    (the phone sits in a pocket while serving).
- **Logging out a student** always stops their running session first (end reason `logout`), on either platform.
- **System accounts** can only be made with `manage.py create_account`. `POST/PUT/PATCH/DELETE /api/users/` return 405.

---

## 8. Data model

All times are stored as **naive UTC** (`utc_now()`). The API sends them marked as UTC. Collection names are
in parentheses.

### Student (`students`)
| Field | Type | Notes |
|---|---|---|
| id | ObjectId | |
| student_id | string, **unique**, required | Exactly 10 digits, e.g. `2023303188` |
| name | string, required | Full name; saved capitalized ("vincent DELA cruz" → "Vincent Dela Cruz"; Roman numerals kept upper) |
| course | string | Program, e.g. "BS Information Technology" |
| department | string | College, e.g. "College of Information Technology and Computing (CITC)" |
| year_level | string | "1"–"5" or "Grade 11"/"Grade 12" (SHS) |
| gender | string | "Male" / "Female" (optional; from registration or the guard's report) |
| contact_number | string | 11 digits, e.g. 09123456789 |
| email | string | Unique among students (checked case-insensitively) |
| password | string | PBKDF2 hash; empty = placeholder (can't log in) |
| qr_data | string | Legacy field, unused |

API adds `has_account` (true if a password is set). The password is never included.

### SystemUser (`system_users`)
| Field | Type | Notes |
|---|---|---|
| username | string, **unique** | Login name |
| password | string | PBKDF2 hash |
| full_name | string | Default "OSA Administrator"; shown as the reporter name |
| bio | string | Default "University of Science and Technology of Southern Philippines Personnel" |
| role | `admin` / `staff` / `guard` (`student` exists in the choices but students are in `students`) | |
| is_active | bool, default true | false = can't log in |

### ViolationReport (`violation_reports`)
| Field | Type | Notes |
|---|---|---|
| student | ref → Student | Required |
| violation_type | string | e.g. "Curfew Violation" |
| description | string | ≤ 1000 chars (current report forms send none) |
| reporting_guard | string | Name shown as "Reported by": the guard on duty's typed name (guard accounts), the account's name (staff), or the admin's name |
| reporting_account | string | Username that filed it (a guard's/staff's History lists by this) |
| status | string | `Pending OSA Review` → `Approved` / `Dismissed`; `Approved` → `Completed` → `Cleared`. (`Finished` is legacy and shown as cleared.) |
| offense_count | int | Non-dismissed reports of this type for this student, including this one |
| punishment | string | e.g. "5 hours community service" / "To be determined" |
| assigned_building | string | Service site name chosen on approval |
| building_history | list of {name, at (ISO), by} | Every building assigned, oldest first |
| created_at | datetime | When the server received the report |
| iso_form_uploaded_at, reflection_uploaded_at | datetime | When each clearance photo was saved |
| cleared_at, cleared_by | datetime, string | When/which admin cleared it |
| photos_removed_at | datetime | When the clearance photos were deleted (365 days after clearing) |

### ETicket (`etickets`) — one per violation (unique index)
| Field | Type | Notes |
|---|---|---|
| violation | ref → ViolationReport, unique | |
| assigned_location | string | Site name |
| total_hours_required | float | Includes added penalty hours |
| remaining_hours | float | Decreases at each time-out; never below 0 |
| status | `Active` / `Ongoing` / `Completed` / `Cleared` (`Finished` legacy) | |
| lat, lng, radius | float | Geofence of the session/assigned site (radius default 100 before a site is set) |
| site_code | string | Site of the current/last session |
| assigned_site_code | string | Site the admin assigned; only its QR starts the timer |
| iso_form_printed_at | datetime | Unused (forms can be downloaded any number of times) |
| added_hours | float, default 0 | Hours added for missed days (already inside total/remaining) |
| missed_days | list of "YYYY-MM-DD" | PH dates that added an hour |
| missed_checked_through | string date | Last day already checked (no double counting) |
| created_at | datetime | Approval time (the 3-day count starts the next day) |
| completed_at | datetime | When the last hour was served |

Displayed labels: `Active` → **Not started** (nothing served) or **In progress** (some served);
`Ongoing` → **Serving now**; `Completed` → **For clearance**; `Cleared` → **Cleared**.

### TimeLog (`timelogs`) — one service session
| Field | Type | Notes |
|---|---|---|
| eticket | ref → ETicket | |
| time_in, time_out | datetime | time_out empty while running |
| duration_seconds | float | Set at time-out |
| photo_proof_in, photo_proof_out | string | Legacy selfies; never loaded anymore |
| site_code, site_name | string | Where it was served (for the receipt) |
| end_reason | `scanned_out`, `left_area`, `location_off`, `app_closed`, `logout`, `idle`, `completed` | |
| out_lat, out_lng, out_distance_m | float | Position/distance when it ended |
| events | list of {type, at, lat, lng, distance_m} | `left_area`, `returned`, `location_off`, `location_on` (max 200) |
| tracked | bool | The client sends location pings (Android background tracking) |
| last_ping_at, last_lat, last_lng | | Last confirmed position |
| outside_since | datetime | Set while the student is outside the site |

### ClearanceProof (`clearance_proofs`)
| Field | Type | Notes |
|---|---|---|
| violation | ref → ViolationReport | |
| kind | `iso_form` / `reflection` | One of each per violation (upsert) |
| data | binary | The photo bytes (WebP/JPEG/PNG, ≤ 200 KB) |
| content_type | string | e.g. `image/webp` |
| image | string | Legacy (before 2026-09-30): base64 data URL text |
| uploaded_at, uploaded_by | datetime, string | `uploaded_by` = admin name, "(phone)" when from the capture page |

### ServiceSite (`service_sites`)
| Field | Type | Notes |
|---|---|---|
| site_code | string, **unique** | `^[A-Z0-9]{2,10}-[A-Z0-9]{1,6}$`, e.g. `LIB-01`. Never changes after creation. |
| name | string | e.g. "Library" |
| description | string | Optional |
| latitude, longitude | float | Rounded to 7 decimals |
| radius_m | int | 10–300, default 50 |
| capacity | int | 1–500, default 10: students with an unfinished ticket there at once |
| accuracy_m, sample_count | int | Averaged GPS accuracy and number of readings at capture |
| is_active | bool | Inactive sites can't be assigned or used to time in |
| registered_by | ref → SystemUser | The admin (from the token, never the request body) |
| registered_at, updated_at | datetime | |

### OTPVerification (`otp_verifications`)
| Field | Type | Notes |
|---|---|---|
| email | string, **unique** | Lower-cased |
| otp | string | 6 digits |
| created_at | datetime | Valid 5 minutes |
| attempts | int | Wrong tries; at 5 the code is deleted |

### Relationships
Student 1 — 0..* ViolationReport; ViolationReport 1 — 0..1 ETicket; ETicket 1 — 0..* TimeLog;
ViolationReport 1 — 0..2 ClearanceProof; SystemUser 0..1 — 0..* ServiceSite (registered_by);
ServiceSite 0..1 — 0..* ETicket (`assigned_site_code` = `site_code`); SystemUser 0..1 — 0..* ViolationReport
(`reporting_account` = `username`); Student — OTPVerification matched by email only (no stored reference).

---

## 9. Business rules and constants

### Validation
| Rule | Value |
|---|---|
| Student ID | Exactly 10 digits (`STUDENT_ID_LENGTH = 10`). QR parsers look for `\b20\d{8}\b`. |
| Contact number | Exactly 11 digits |
| Middle name (registration) | Required, written in full: every word ≥ 2 letters, no periods. "N/A", "n/a", "NA" = none (left out of the name and QR). Same rule on server, website and app. |
| Names | May repeat; the student ID tells students apart. Reports match students by ID only. |
| Password | UI requires 8+ characters at registration and reset; the server enforces 8+ on reset |
| Email | Unique among students; must look like `x@y.z` when changed |
| Violations per report | 1–10, duplicates removed; one ViolationReport per violation type |
| Bulk report | 1–500 student IDs; all IDs validated before anything is saved |
| Hours (bulk event report only) | 0–100, typed by the admin. Approvals never take hours. |
| Description | Trimmed to 1000 characters; names to 100 |

### Email codes (OTP)
6 random digits. Valid **5 minutes**. At most **5 wrong tries**, then the code is deleted and a new one is
needed. Requesting a new code deletes the old one. The UIs allow "Resend" after **60 s**. The same rules apply
to registration, password reset and email change.

### Penalty table (`PUNISHMENT_SYSTEM`) — OSA Student Handbook, Section 3, Non-Academic Light Offenses
| Violation (handbook wording) | 1st offense | 2nd offense | 3rd offense and later |
|---|---|---|---|
| Curfew Violation (staying on campus beyond 10:00 p.m.) | Community service, 3 h | Community service, 6 h | No Entry into the Campus |
| No ID / Improper ID Sling | 3 h | 6 h | No Entry into the Campus |
| No School Uniform (regular class days except Wednesdays, weekends and PE days) | 3 h | 6 h | No Entry into the Campus |
| Dress Code Violation | 3 h | 6 h | No Entry into the Campus |
| Any other type | "To be determined", 4 h | | |

In the code, "No Entry into the Campus" is a penalty with 0 hours. Past the 3rd offense, the last penalty repeats. Guards and faculty & staff can report only these four types.
The admin's bulk report uses "Failure to attend mandatory campus event", with hours the admin types. The penalty
table is served by `GET /api/violations/punishments/` and shown on the website's admin/faculty Help page and on
the app's Help screen.

### Approval
- **The admin doesn't choose the hours.** Approval always applies the handbook table to the report's violation
  type and offense number (`get_punishment`); any `custom_hours` sent is ignored. Pending Reviews shows this
  "Penalty (OSA Student Handbook)" before approving.
- Penalty with hours (1st/2nd offense): a building (service site) is required. The endpoint accepts the site code
  (or a site name, for older clients); the site's name is saved as `assigned_building`.
- **No Entry into the Campus** (3rd offense and later): no building is needed. Approving records the sanction
  (`punishment`), sets the report straight to `Completed` with no e-ticket, and the case appears in the Archives.
- **Capacity**: counts open tickets (Active/Ongoing) per site. If adding one would exceed `capacity`, the API
  answers 409 `site_full`, and the page asks "Assign anyway?" (resend with `allow_over_capacity`).
- **Atomic claim**: the status changes only if it is still "Pending OSA Review". Two admins acting at once get
  "already reviewed by someone else" (409). There is also a unique index: one e-ticket per violation.
- Hours > 0 → e-ticket `Active` with the site's code and geofence copied in.
- **Dismiss**: same atomic claim; status `Dismissed`. Dismissed reports don't count as offenses and are left out
  of analytics charts.
- **Reassign building**: only after approval and not while a session is running (`Ongoing`). Capacity is checked,
  not counting the ticket's own seat. It appends to `building_history` and re-links the ticket to the new site.

### 3-day deadline and missed days (`deadlines.py`)
- `DAYS_TO_FINISH = 3` counted days. Counting starts the day after approval (the ticket's `created_at`, PH date).
  Only Monday–Saturday count (Sundays skipped). The deadline is the end of the 3rd counted day.
- After the deadline, each Monday–Saturday with **zero** service time adds `MISSED_DAY_HOURS = 1` hour to
  `total_hours_required`, `remaining_hours` and `added_hours`, and the date goes into `missed_days`. Any time
  served that day counts (a session past midnight counts for both days).
- It only looks at days that are already over, records `missed_checked_through`, and updates atomically, so no
  day is counted twice. It runs when tickets are listed, at most every 60 s per server process.

### Time-in (start of a session)
- The student must have an open e-ticket (Active).
- Only a registered service site's QR (its site code) starts the timer; a request without `site_code` is refused
  ("Scan the QR code posted at your service site to start your timer."). If the ticket has an assigned site,
  **only that site's QR** works. Otherwise: "You're assigned to
  <Site> (<CODE>). Scan the QR code posted there to start your timer."
- The site must be active. The student's position (`student_lat/lng`, `accuracy_m`) is required ("We couldn't get
  your location...").
- Allowed distance = `radius + min(0.7 × GPS accuracy, 20 m)` (Haversine, meters). Outside: "You're N m away from
  <Site>. Go inside the service area (within R m) and scan again to start your timer." The clients run the same
  check first, so the message shows without waiting for the server.
- Start creates a TimeLog (`tracked` = the client will send pings), copies the site's geofence into the ticket,
  and sets the ticket to `Ongoing`. Scanning in while a session already runs returns that session.

### During a session
- **End cooldown**: the student can't end a session in its first **20 seconds** (both clients).
- **Location pings**: the website sends one about every **15 s** while the page is visible. The Android app sends
  one every **10 s**, also in the background (foreground service).
- The server ends the session when the student has been **outside** the allowed radius for **30 s**
  (`OUT_OF_AREA_LIMIT_S`) → `left_area`.
- **Location turned off** → ends immediately at the last confirmed position time → `location_off`.
- A **tracked** session with **no ping for 120 s** (`NO_LOCATION_LIMIT_S`) ends at the last ping → `location_off`.
  This is checked at most every 15 s when tickets are listed.
- The clients also count down 30 s while out of bounds (radius + 0.7 × accuracy) and stop the session themselves.
  They also stop it when the location permission is denied or GPS fails, and when the remaining time reaches
  0:00:00 (`completed`).
- Leaving, returning, location off and location on are saved as session `events` (max 200) for the receipt.

### Time-out (end of a session)
- By scanning the **same site's QR** (it must match the session's site). Automatic stops (left the area,
  location off, hours done, logout, idle) send no code.
- Served time = `time_out − time_in` (never negative), subtracted from `remaining_hours` (floored at 0).
- Remaining ≤ 0.01 h → set to 0, ticket **Completed**, violation **Completed**, `completed_at` set, end reason
  `completed`. Otherwise the ticket goes back to **Active**.
- The response includes the **receipt**.
- **Offline stop (website)**: if the stop can't be sent, it is saved in `localStorage` (`osa-pending-stop`) with
  the real end time and sent when the connection returns, as `ended_seconds_ago`. The server only allows moving
  the end *earlier* (max 30 days back), so being offline never adds time.
- A time-out for a session that already ended returns `{already_ended: true, receipt}`.

### Clearance
- Allowed only when the e-ticket is **Completed** and the violation isn't Cleared.
- Two photos: `iso_form` (signed FM-USTP-OSA-013) and `reflection` (reflection paper). Each is a data URL
  (JPEG/PNG/WebP). The browser shrinks it to about 50–90 KB (≤ 1280 px, WebP where supported, lower quality
  steps). The server refuses anything over **200 KB**. Stored as bytes; re-uploading replaces it.
- The website takes these photos **only through the phone capture link**: a QR code in the case details opens
  `/capture/<token>` on the admin's phone. No login is needed; the token is signed and valid **30 minutes** for
  that one violation. The computer checks for new photos every 3 s.
- **Clear** requires both photos → violation `Cleared` (`cleared_at`, `cleared_by`), ticket `Cleared` → Archives.
- **Retention**: photos of cases cleared more than **365 days** ago are deleted (`photos_removed_at` set). The
  case record stays, and asking for a photo then returns 410. This runs at most every 6 h per process when
  tickets are listed.

### Service sites
- Code suggestion: one-word name → first 3 letters; several words → initials (max 4); then `-01`, `-02`... until free
  ("Library" → `LIB-01`, "Main Gym" → `MG-01`).
- GPS capture (admin's phone, website): readings for **30 s**, keeping only those with accuracy ≤ **25 m**, and at
  least **5** are needed. The coordinates are averaged; accuracy and sample count are stored.
- **Re-capture** replaces only the coordinates. The code and QR stay the same, so printed QRs keep working.
- The QR holds only the site code, never the location. The QR PNG is generated by the server (segno, error
  correction H, scale 16), or printed from the page with the site name and "Scan with OSAConnect to start your
  community service session".

### List scopes (so pages don't download everything)
- Violations `?scope=open`: not Cleared/Dismissed, **or** created in the last 36 h (for "today" counts).
  `?scope=archived`: Cleared or Completed. `?year=YYYY`: one PH calendar year. `?student_id=`: one student.
- E-tickets `?scope=open`: not Cleared; `?scope=archived`: Cleared or Completed.
- Time logs `?scope=archived`: sessions of Cleared/Completed tickets.

---

## 10. End-to-end processes

### 10.1 Student registration (website `/register`, app "Register")
1. Step 1 — details: Student ID (10 digits), first / middle (full or N/A) / last name, college (department), then
   program (only that college's courses), year level (Year 1–5, or Grade 11/12 for SHS), gender, contact number
   (11 digits), email, password (8+) and confirm.
2. "Send verification code" → `POST /students/request_otp/`. The server checks the email isn't used by another
   student, the ID format, that the ID isn't already registered, the contact number and the middle name. The page
   moves to step 2 right away ("Sending code to …"); if the server refuses, it returns to step 1 with the reason.
3. Step 2 — six code boxes (typing moves to the next; pasting fills all), "Code expires in m:ss", "Resend code"
   after 60 s, and a hint to check Spam/Junk.
4. `POST /students/register_with_otp/` with all details + code. If a **placeholder** record exists for that ID (made
   from an earlier report), it becomes the student's account and keeps its reports. Otherwise a new student is
   created. The password is hashed.
5. Step 3 — the student's QR code ("ID FIRST MIDDLE LAST COURSE"), with name and program. The app can save it to photos.

### 10.2 Login and logout
See §6 and §7. Logout stops a running student session first.

### 10.3 Forgot password (students only; website `/forgot-password`, app screen)
1. Email → `request_password_reset` (404 if no student has that email); code email sent.
2. Code → `verify_reset_code` (counts toward the 5 tries).
3. New password (8+) and confirm → `reset_password`. If the code expired meanwhile, the page goes back to the code step.
4. Done screen → log in. Old tokens stop working.

### 10.4 Student account changes (Personal Info, Settings)
- Email: current password + new email → a code is sent to the new address (`request_email_change`) → code →
  `confirm_email_change`.
- Contact number: current password + 11 digits → `update_contact`.
- Password: current + new → `change_password`.
- Name, course and college can't be changed by the student ("Visit the OSA office to have it corrected"); the
  admin edits them.

### 10.5 Filing a violation report (guard or faculty & staff; website `/guard/report` or `/staff/report`, app dashboard)
1. Guard accounts first type the **guard on duty**'s full name. It is remembered on that device
   (`osa-guard-on-duty`), shown as "Reported by" and saved capitalized.
2. Find the student: scan the student QR (only student-ID codes are accepted; others show "Not a student ID QR
   code") or type the 10-digit ID. When all 10 digits are in, `GET /students/<id>/` fills in the registered
   student's details. For an unknown ID, the reporter fills in name, college, program, gender, contact and email.
3. Tick one or more violations (the four standard types). The incident date/time fields default to now.
4. Check the slip (initials, name, ID, course · college · gender; the violations in red with an "N reports" badge;
   when and who) → **Send** → `POST /violations/`.
5. The server creates a placeholder student if the ID is unknown (or fills in a missing gender), then one
   **Pending OSA Review** report per violation (own offense count and penalty). It emails the student a
   violation notice if an email is known.
6. "Report sent" shows the same slip with a "For review" tag. Reporters see their reports in **History**
   (website only): filters All / For review / Approved / Dismissed, polled every 30 s.

### 10.6 Admin review (`/admin/pending`)
- Lists pending reports (search by name or ID). Opening one shows the student (course, department), the
  violation type and the offense count.
- It shows **Penalty (OSA Student Handbook)** for the offense number: "3 hours community service",
  "6 hours community service", or "No Entry into the Campus" (in red, with "No community service: approving
  records this sanction and moves the case to the archives").
- **Approve Case**: for a penalty with hours, choose a building first (active service sites, shown as
  "Name · assigned/capacity", "Full" when full); for no entry, no building. → `approve` (see §9 Approval).
  **Dismiss Case** → `dismiss`.

### 10.7 Admin bulk report (Students page → "Report Violation")
For students who missed a mandatory campus event:
1. Paste or type IDs (split on new lines, commas or spaces). Non-10-digit tokens stay in the box with a note;
   duplicates are reported ("ID already added").
2. Choose the building and type the hours (0–100). The violation is fixed to "Failure to attend mandatory campus
   event". IDs without an account show "Not registered yet".
3. A confirmation receipt (violation, building, hours each, "Approved right away", the student list folded when
   more than 3) → **Confirm & report** → `POST /violations/bulk_create/`.
4. Results per student: success, or the error. Reports are **approved immediately**: e-tickets for hours > 0, or
   Completed for 0 h. Students get emails if their email is known. Placeholders are created for unknown IDs.

### 10.8 Serving community service (student, website dashboard or app)
1. Home shows **Community service remaining** (hh:mm:ss, "of N hrs required · Site", progress bar), an ⓘ with
   the 3-day deadline, a map with the route to the site (loaded on tap when data saver is on), "Go to <Site> and
   scan the QR code to start your timer", and **Scan QR Code to Time-In**.
2. Scanning the site QR → GPS fix (one from the last 10 s is reused) → local geofence check → `log_time in`.
   The Android app first asks for background location ("Allow all the time") and notifications, then starts
   background tracking with a foreground-service notification "Service timer running".
3. While serving: a live countdown, "Within service area — N m from hub" or "Out of bounds — N m away", a live map
   (green inside, red outside), and a red **"Warning: Out of Boundary"** banner with a 30-second countdown.
   **Scan to End Service** unlocks after 20 s.
4. Ending: scan the same site's QR → `log_time out` → a **receipt** pop-up. If the session is stopped
   automatically (left the area, location off, hours done, logout, idle), the receipt says how it ended. On
   Android, a stop that happened while the app was closed shows a notification "Service timer stopped", and the
   saved receipt appears when the app is opened.
5. Repeat until 0:00:00. A one-time pop-up then says **"Service hours completed!"** and to go to the OSA office
   with the signed ISO form and reflection paper. A green "Go to the OSA office to be cleared" card stays until
   clearance.
6. **E-tickets** list (all of the student's tickets, with status badges). Tapping one opens **TicketDetails**: the
   receipt-style summary (violation, offense, date caught, reported by; sanction, hours required (+ missed-day
   hours), served, remaining, sessions, deadline met/missed/passed; every building assigned), the **service log**
   grouped by date (each date lists Session 1, 2… and each opens its receipt), and the **ISO Form** and
   **Reflection Form** PDF downloads (while not cleared).

### 10.9 Monitoring and clearance (admin overview `/admin/overview`)
- Greeting, "N reports are awaiting your review", light/dark toggle.
- **Violators Feed**: approved cases until cleared (pending, dismissed, cleared and no-hours cases are not listed).
  Search by name/ID, and filters for offense (1st / 2nd / 3rd & up), gender, department and violation type.
  Cases waiting for clearance (amber, "Hours done · for clearance") come first; serving students are green.
  Polled every 10 s.
- **Case details**: the student (expandable profile), the violation (type, offense, date caught, reported by), the
  assigned building with **Change building** (not while serving), sanction, deadline (and "passed"), hours added
  for missed days, time remaining with a progress bar, and the completion receipt with every session.
- **Clearance Documents** (when hours are done): the two photo slots, **Use phone camera** (a QR to the capture
  page; "Waiting for photos"; works 30 min), then **Approve** (enabled when both photos exist) → `clear`.
- Right column (wide screens): **Today's Activity** (violations, assigned, completed) and **Notifications**
  (pending reviews, and pending more than 3 days).

### 10.10 Archives (`/admin/archives`)
- Cleared cases and approved no-hours cases (dismissed ones are not archived). Search, filter by violation type,
  polled every 60 s. Clicking a case opens **ArchivedCase**: the student's ticket view + service log + the
  clearance photos (or "Photos removed").
- **Download PDF**: an A4 landscape "COMMUNITY SERVICE LOG" (USTP/OSA letterhead) with columns ID NUMBER, FIRST NAME,
  LAST NAME, CONTACT NUMBER, YEAR LEVEL, COURSE/PROGRAM, COLLEGE, NATURE OF VIOLATION, DATE COMMITTED, PENALTY,
  HOURS SERVED, STATUS. Blank rows fill the page up to at least 20.

### 10.11 Analytics
- **Admin** `/admin/analytics`: choose **Daily / Monthly / Quarterly / Annually** and the date/month/quarter/year
  (years from 2025). It downloads only that year's reports (`?year=`). Shown: total reports, distinct students,
  status counts (Pending review, Serving hours, Hours completed, Cleared, Dismissed), a trend (by hour, day or
  month), and breakdowns by violation type, department, gender, year level and course (dismissed left out).
  **Download PDF** → `GET /violations/monthly_report/?start&end&prev_start` → an A4 report with letterhead:
  1) Summary tiles (violations with % change vs the previous period, approved with dismissed/pending, hours
  rendered of assigned, completed with completion %), 2) Charts (top 6 violation types; weekly trend for a month,
  4-hour blocks for a day, months otherwise), 3) Breakdowns (by college; repeat violators = 2+ cases, top 10),
  4) Case list (the rest in an appendix), "Prepared by / Noted by" signature lines, and "Page x of y".
- **Guards** `/guard/analytics`: campus-wide **counts only** (no names), by department, violation type, gender,
  year level and course, for today / this month / quarter / year / all (`GET /violations/summary/?period=`).
  Dismissed reports aren't counted.

### 10.12 Service site setup (`/admin/settings` → Service Sites)
"Register New Site" while standing at the location → GPS capture (30 s, progress shown) → name, description,
radius (10–300 m), max students (1–500), code (suggested) → save. Each site card shows Active/Inactive, radius,
students assigned/capacity, accuracy, samples and who registered it, with actions: **Edit**, **Re-capture**,
**QR** (download/print), **Deactivate/Activate**. Security tab: change password (current, new, confirm).

### 10.13 Student management (`/admin/students`)
Table of all students (search by name/ID; filters by program and year), polled every 60 s. **Edit Student** (ID,
full name, gender, year level, course, department, email, contact). **QR Code** (view and download PNG).
**Report Violation** (bulk, §10.7).

---

## 11. REST API reference

Base path `/api/`. JSON in and out. Errors are `{"error": "message"}` (some add fields). The "Who" column is the
permission. Lookup for students is `student_id`; for users it is `username`; for other resources it is the ObjectId.

### Auth and health
| Method & path | Who | Body / query → response |
|---|---|---|
| POST `login/` | public | `{username, password}` → `{success, token, role, username, ...}` (see §7) |
| GET `health/` | public | `{status: "healthy", database: "connected", users: <count>}` |

### Students `students/`
| Method & path | Who | Notes |
|---|---|---|
| GET `students/` | admin | All students (+ `has_account`, no password) |
| GET `students/<student_id>/` | logged in | A student may only read their own (403 otherwise) |
| POST `students/` | admin | Generic create (ID must be unused) |
| PUT/PATCH `students/<student_id>/` | admin | name, student_id (10 digits, unique), course, department, year_level, email, contact_number, gender |
| DELETE `students/<student_id>/` | admin | Generic delete (not used by the UI) |
| POST `students/request_otp/` | public | `{email, student_id?, contact_number?, middle_name?, name?}` → emails a code |
| POST `students/register_with_otp/` | public | `{email, otp, password, student_id, name, middle_name, course, department, year_level, gender, contact_number}` → 201 student |
| POST `students/request_password_reset/` | public | `{email}` |
| POST `students/verify_reset_code/` | public | `{email, otp}` → `{valid: true}` |
| POST `students/reset_password/` | public | `{email, otp, password}` (8+) |
| POST `students/change_password/` | student | `{current_password, new_password}` |
| POST `students/request_email_change/` | student | `{current_password, new_email}` |
| POST `students/confirm_email_change/` | student | `{new_email, otp}` |
| POST `students/update_contact/` | student | `{current_password, contact_number}` |

### Violations `violations/`
| Method & path | Who | Notes |
|---|---|---|
| GET `violations/` | logged in | Student → own; guard/staff → reports their account filed (plus older ones saved under their name); admin → all, with `?student_id=`, `?scope=open\|archived`, `?year=`. Each item includes `student_details`. |
| GET `violations/<id>/` | admin | One report |
| POST `violations/` | reporters | `{student_id, violation_types: [..], name?, course?, department?, gender?, contact?, email?, on_duty_name? (guards), description?}`; old clients may send `violation_type`/`violation`. The forms also send `incident_date`/`incident_time`, which are ignored. → first report + `reports: [{id, violation_type, offense_count, punishment}]` |
| PUT/PATCH/DELETE `violations/<id>/` | admin | Generic (not used by the UI) |
| POST `violations/<id>/approve/` | admin | `{assigned_building (only when the penalty has hours), allow_over_capacity?}`; the hours come from the handbook table. → `{message, punishment}`. 409 if already reviewed or `site_full` (`{code, site, assigned, capacity}`) |
| POST `violations/<id>/dismiss/` | admin | 409 if already reviewed |
| POST `violations/<id>/reassign/` | admin | `{assigned_building, allow_over_capacity?}` → `{assigned_building}` |
| POST `violations/bulk_create/` | admin | `{students: [{student_id, name?}], violation_type?, description?, assigned_building, custom_hours?, allow_over_capacity?}` → 201 `{message, results: [{student_id, status, name?, has_account?, error?}]}` |
| GET `violations/punishments/` | public | `{rules: [{violation_type, offenses: [{offense, punishment, hours}]}], default, repeat_last_offense: true}` |
| GET `violations/summary/?period=day\|month\|quarter\|year` | reporters | `{total, department, violation_type, gender, year_level, course}`, each a list of `{label, count}` |
| GET `violations/monthly_report/?month=YYYY-MM` or `?start=&end=&prev_start=` (ISO, ≤ 400 days) | reporters | `{month, month_label, generated_at, generated_by, summary{violations, previous_month, approved, dismissed, pending, hours_rendered, hours_assigned, completed}, by_type, weekly, by_college}`; admins also get `repeat_violators` and `cases [{date, student_id, violation, status, hours}]` |
| GET `violations/analytics/` | admin | Legacy counts by type (unused) |
| GET `violations/<id>/clearance_proof/?kind=iso_form\|reflection` | admin | `{kind, image (data URL), uploaded_at, uploaded_by}`; 404 none; 410 removed |
| POST `violations/<id>/clearance_proof/` | admin | `{kind, image}` (data URL ≤ 200 KB) |
| POST `violations/<id>/capture_link/` | admin | `{token, expires_in: 1800}` |
| POST `violations/<id>/clear/` | admin | Needs ticket Completed + both photos → `{message, cleared_at}` |

### Phone capture page
| Method & path | Who | Notes |
|---|---|---|
| GET `capture/<token>/` | signed token | `{student_name, student_id, violation_type, uploaded: {iso_form, reflection}, error}`; 410 expired; 400 invalid |
| POST `capture/<token>/` | signed token | `{kind, image}` (uploaded_by = "<admin> (phone)") |

### E-tickets `etickets/`
| Method & path | Who | Notes |
|---|---|---|
| GET `etickets/` | logged in | Student → own; admin → all, `?student_id=`, `?scope=open\|archived`; others → none. Each call also runs the lazy jobs (§17). |
| GET/PUT/PATCH/DELETE `etickets/<id>/` | admin | Generic |
| POST `etickets/<id>/print_iso_form/` | logged in | Legacy; always `{printed: true}` |

E-ticket response adds: `id`, `violation` (id), `base_remaining_hours` (stored balance), `remaining_hours` (**live**
balance while Ongoing), `active_time_in`, `deadline` (ISO, end of the last day), `days_to_finish`, `added_hours`,
`completed_at`, `served_today`, `station {lat, lng, radius, site_code}`, `assigned_site {site_code, name}`,
`violation_details {id, violation_type, status, punishment, offense_count, reporting_guard, created_at,
assigned_building, building_history, cleared_at, student_details {student_id, name, id}}`.

### Time logs `timelogs/`
| Method & path | Who | Notes |
|---|---|---|
| GET `timelogs/` | admin | `?scope=archived`; selfie fields never loaded |
| POST `timelogs/log_time/` | logged in (own ticket) | **in**: `{eticket_id, action: "in", site_code, student_lat, student_lng, accuracy_m, track_location?}` (`site_code` required). **out**: `{eticket_id, action: "out", site_code?, end_reason?, ended_seconds_ago?, lat?, lng?, distance_m?}` → log + `receipt`. `custom`/`set_start` → 400 "no longer available". |
| POST `timelogs/location_ping/` | logged in (own ticket) | `{eticket_id, lat, lng, accuracy_m}` or `{eticket_id, location_off: true}` → `{state: "running", inside, distance_m, seconds_left?}` / `{state: "stopped", reason, receipt}` / `{state: "none", receipt}` |
| POST `timelogs/log_event/` | logged in (own ticket) | `{eticket_id, type: left_area\|returned\|location_off\|location_on, lat?, lng?, distance_m?}` |
| GET `timelogs/receipts/?student_id=` or `?eticket_id=` | logged in | Up to 50 newest receipts (students: only their own) |

Receipt object: `{id, eticket_id, student_id, student_name, violation_type, site_code, building, time_in, time_out,
duration_seconds, end_reason, end_reason_label, out_lat, out_lng, out_distance_m, events, left_area_count,
remaining_hours, ticket_status}`. End reason labels: "Scanned the time-out QR", "Left the service area",
"Location turned off or lost", "Left the app", "Logged out", "Logged out for inactivity", "Finished the required hours".

### System users `users/`
| Method & path | Who | Notes |
|---|---|---|
| GET `users/` | admin | List (password write-only) |
| POST/PUT/PATCH/DELETE `users/...` | — | 405 "Accounts are managed by OSA administrators." |
| POST `users/change_password/` | reporters | `{old_password, new_password}` (used by admin Settings) |
| POST `users/update_profile/` | reporters | `{full_name?, bio?}` (unused) |

### Service sites `admin/sites/` (admin only; checked from the token)
| Method & path | Notes |
|---|---|
| GET `admin/sites/` | All sites with `assigned_count` |
| POST `admin/sites/` | `{name, latitude, longitude, description?, radius_m?, capacity?, site_code?, accuracy_m?, sample_count?}` → 201 |
| GET `admin/sites/suggest-code/?name=` | `{site_code}` |
| PUT `admin/sites/<id>/` | `{name?, description?, radius_m?, capacity?, is_active?}` (code never changes) |
| PUT `admin/sites/<id>/location/` | `{latitude, longitude, accuracy_m?, sample_count?}` |
| GET `admin/sites/<id>/qr/` | PNG download `<CODE>_qr.png` |

Django's catch-all route serves the website's `index.html` for every path no other route matches,
**including mistyped `/api/...` paths**. An unknown API path therefore answers HTTP 200 with HTML, not a JSON
404 (checked on the live site on 2026-10-03).

---

## 12. Website: every page

### Public
| Route | Page |
|---|---|
| `/` | Landing page: About OSA Connect, features (manage violations faster, less paperwork, transparency), Login/Register links |
| `/student`, `/faculty`, `/admin` | The three logins (same design: blue glass box over the campus photo; show/hide password). Old `/login` → `/student`, `/login/admin` → `/admin`, `/mobile-only` → `/student` |
| `/register` | Student registration (3 steps, §10.1) |
| `/forgot-password` | Password reset (4 steps, §10.3) |
| `/capture/:token` | Admin's phone page "OSAConnect · Clearance — Take photos": student and violation, two buttons that open the camera (ISO Form, Reflection Paper), previews, "Saved" |

### Student pages (inside **StudentShell**: top bar with menu button, page title and a notification bell with the
latest 5; side menu **Home, Personal Info, Notifications (badge), Settings, Log out**)
| Route | Page |
|---|---|
| `/student/dashboard` | Home: greeting, status line, clearance card, service card (remaining / live session / map / scan buttons), E-Tickets list (§10.8). Empty: "No e-tickets. You have no community service to serve." |
| `/student/personal-info` | Profile (name, ID, college, course, year, gender), email and contact number with "Change" (§10.4) |
| `/student/notifications` | All notifications; opening marks them read (§16) |
| `/student/settings` | Appearance (Dark mode), Notifications (Deadline reminders), Data (Data saver), Security (Change password), Support (Help & Support; About OSAConnect, Version 1.2.0), Log out |
| `/student/settings/password` | Change password |
| `/student/help` | Help & Support: "How it works" steps, FAQ groups, Troubleshooting, Privacy and safety, contact and "report a problem" (osaconnect.system@gmail.com). Unlike the app's Help screen, it does not show the penalty table. |

### Guard and Faculty & Staff pages (inside **ReporterShell**: top bar + side menu with the account, pages and Log out)
| Route | Page |
|---|---|
| `/guard/report`, `/staff/report` | Report Violation form (§10.5) |
| `/guard/history`, `/staff/history` | The reports this account filed: compact cards (name + status, ID · course, violation · when · who), filters All / For review / Approved / Dismissed. Status names: For review, Approved, Hours done, Cleared, Dismissed. |
| `/guard/analytics` | Campus violation counts (guards only, §10.11) |
| `/staff/help` | Help for faculty & staff (filing reports, penalties, contact). Guards have no Help page. |

Admins may also open `/guard/*`.

### Admin pages (each with the **Sidebar**: Dashboard, Students, Pending Reviews, Archives, Analytics, Settings,
Help, Log out; light/dark toggle in the title row)
| Route | Page |
|---|---|
| `/admin/overview` | Dashboard (§10.9) |
| `/admin/students` | All Students (§10.13) |
| `/admin/pending` | Pending Reviews (§10.6) |
| `/admin/archives` | Archives (§10.10) |
| `/admin/analytics` | Analytics reports + PDF (§10.11) |
| `/admin/settings` | Service Sites (§10.12) and Security (change password) |
| `/help` | Admin guide (Help) |

### Shared UI behaviors
- **QR scanner** (`QrScannerModal`): full screen, decodes only the square inside the viewfinder, reacts to the
  same code once per 2.5 s, a short success flash, a validate step that rejects wrong codes and keeps scanning.
  Students must scan live (no "scan from photo").
- **Maps** (Leaflet + OpenStreetMap): before a session a faded dashed circle, the student's dot and a dashed
  route line ("ROUTE TO SITE"); during a session a green/red circle ("LIVE GPS FEED"). With data saver on, the
  map appears only after tapping "Show map". It is hidden while a scanner is open (iPhone Safari drew it over the camera).
- **Theme**: the student pages follow their own setting ('system' | 'light' | 'dark', saved as `themeMode`,
  starting light). The admin pages use a `dark` class toggle.
- **Polling** happens only while the tab is visible (`usePolling`).

---

## 13. Android app: every screen

| Route / screen | What it does |
|---|---|
| `index` | Redirects by saved role (student → `/student/dashboard`, guard/staff → `/staff/dashboard`, else login) |
| `login` | Username/student ID + password; admins refused |
| `register` | Same 3 steps as the website; the QR can be saved to the phone's photos |
| `forgot-password` | Same 4 steps as the website |
| `help` | Help content from `shared/help-content.json` + penalties from the API |
| `student/dashboard` | Same as the website Home, plus pull-to-refresh, background tracking, notifications, and showing a receipt saved while the app was closed |
| `student/scan` | Full-screen camera QR scanner (its own screen; a camera inside a modal didn't render on iPhone). Only OSA service codes are accepted. |
| `student/settings`, `student/personal-info`, `student/notifications`, `student/change-password` | Same as the website |
| `staff/dashboard` | "Guard Report": the report form (guard on duty name for guard accounts, student lookup, violations, slip, "Report sent"), header buttons Help and Profile |
| `staff/scan` | Student-QR scanner (only student ID codes) |
| `staff/settings` | "Profile Settings": Personnel Information (full name, role), Log Out |

Not in the app for guards/staff: History and Analytics (website only).

### Background tracking (Android, `components/backgroundTracking.js`)
- Task `osaconnect-session-tracking` (expo-task-manager), registered at startup, so Android can wake it without the UI.
- Asks for notification permission, then background location ("Allow all the time"). It doesn't run in Expo Go.
- `Location.startLocationUpdatesAsync` with high accuracy, every **10 s**, as a foreground service with the
  notification "Service timer running — OSAConnect is checking that you stay at your service site."
- Every fix → `location_ping`. A **watchdog** every 10 s sends `location_off` if location services are turned off.
- When the server says the session stopped: tracking stops, the receipt is saved (`lastStoppedReceipt`), and, if
  the app isn't on screen, a notification is shown: "Service timer stopped — You left your service area / Your
  location was turned off ... Open OSAConnect to see your receipt."
- Without background permission, pings only go out while the app is open, and the location is checked again
  when the student returns to the app.

---

## 14. QR codes

| QR | Content | Made by | Read by |
|---|---|---|---|
| Student ID QR | `"<ID> <FIRST MIDDLE LAST in caps> <COURSE>"`, e.g. `2023303188 JUAN SANTOS DELA CRUZ BS Information Technology` (N/A middle names left out). The admin's Students page also shows/downloads a QR built from the stored name. | Registration (web/app), admin Students page | Guard/staff report form |
| Service site QR | Only the site code, e.g. `LIB-01` | `/api/admin/sites/<id>/qr/` or printed from Service Sites | Student time-in/out |
| Capture link QR | `https://<host>/capture/<signed token>` | Admin case details ("Use phone camera") | Admin's phone camera |

**Student QR parser** (website and app, kept identical) accepts the ID alone, `"ID NAME COURSE"`,
`"NAME, ID, COURSE"`, or JSON `{student_id}`, and finds the ID with `\b(20\d{8})\b`. Anything else → "Not a
student ID QR code. Only student ID codes can be scanned here."

**Service QR parser** (website `processCode`/`processStopCode`, app `serviceQr.js`): only the site-code
pattern `^[A-Z0-9]{2,10}-[A-Z0-9]{1,6}$`. The same QR starts a session and ends the one started there. The
legacy codes from before service sites existed (a coordinate code, three hard-coded building codes, and OSA
start/stop codes) were **retired on 2026-10-03** in the website, the app and the server. A legacy code that
happens to look like a site code is passed on, and the server refuses it because no such site exists.

The server refuses a start without `site_code`, with an inactive or unknown site, or (when the ticket has an
assigned site) with any other site's code. A ticket without an assigned site (possible only through an API
approval with a plain building name, or for old tickets) can be served at any active registered site.

---

## 15. Emails

Sent synchronously through Gmail SMTP (port 465 SSL, 20 s timeout) from "OSAConnect <account>". Each email has a
plain-text and a simple HTML version (no images, no tracking, one link to the site). The footer is "Office of
Student Affairs, University of Science and Technology of Southern Philippines (USTP)", `osaconnect.vercel.app`,
"This email was sent automatically. Replies to it are not read."

| Email | Subject | When |
|---|---|---|
| Registration code | "Your OSAConnect verification code" | `request_otp` |
| Password reset code | "Your OSAConnect password reset code" | `request_password_reset` |
| New email code | "Confirm your new email for OSAConnect" | `request_email_change` (sent to the new address) |
| Violation notice | "A violation report was filed for you (OSAConnect)" | Each report filed (guard/staff) and each bulk report, if the student has an email |

Code emails greet the student by first name, explain why they got it, show the 6-digit code large, say "The code
expires in 5 minutes", and say what to do if it wasn't them. The violation notice lists the violation, date and
time (PH), details, reported by and student ID. It says OSA will review it, and to visit OSA if it's wrong.

---

## 16. Notifications

### Student (website and app; built on the device from the student's own reports and tickets; nothing extra stored on the server)
| Notification | Tone | When |
|---|---|---|
| Violation reported | info | A report is Pending OSA Review |
| Report dismissed | good | A report was dismissed |
| Community service assigned | info | Each e-ticket ("<type>: N hrs at <site>") |
| Community service completed | good | Ticket Completed or Cleared ("Bring your signed ISO form and reflection paper to the OSA office") |
| Clearance approved | good | Ticket (or no-ticket case) Cleared |
| Violation approved | bad | Approved with nothing to serve (no e-ticket), e.g. "Curfew Violation (offense #3): No Entry into the Campus." |
| Deadline passed (<day>) | bad | An open ticket is past its 3-day deadline (+ hours added so far) |
| You haven't served today | warn | Reminders on, ticket Active, no time served today, not Sunday, from 6:00 AM PH |

Newest first. Read state is kept per device (`osa-notifications-seen:<username>`, last 300). The bell shows the
latest 5. A one-time "Service hours completed!" pop-up appears per ticket (`osa-completed-notice-seen`).

### Admin overview notifications
Pending reviews (with the student's name), and pending reviews older than 3 days. Top 10.

### Android system notifications
The foreground-service notification while tracking, and "Service timer stopped" when the server ends a session
while the app isn't on screen.

---

## 17. Background jobs

There is **no scheduler**. These run inside `GET /api/etickets/` (which the dashboards poll), each throttled per
server process:

| Job | Throttle | What |
|---|---|---|
| `stop_silent_sessions` | ≤ every 15 s | Ends tracked sessions with no ping for 120 s (at the last ping) |
| `apply_missed_day_hours` | ≤ every 60 s | Adds 1 h per missed Mon–Sat day after the deadline |
| `remove_old_clearance_photos` | ≤ every 6 h | Deletes photos of cases cleared > 365 days ago |

On Vercel each cold start resets the throttle timers. If nobody loads the ticket list, nothing runs until someone does.

---

## 18. Time and time zones

- Stored: naive UTC (`utc_now()`), whether the backend runs on a laptop (PH time) or Vercel (UTC). The API marks
  times as UTC (`...Z` or `+00:00`).
- Day-based rules (deadline, missed days, "served today", summary periods, monthly report, `?year=`) use PH
  calendar days (UTC+8).
- The clients format times in Asia/Manila (`en-PH`).
- The live countdown never parses `active_time_in` against the device clock. Time served is
  `base_remaining_hours − remaining_hours` from the server, anchored to the device clock between polls. This
  avoids errors when the phone's time zone or clock differs.

---

## 19. Performance and data use

| What | Value |
|---|---|
| Student dashboard refresh | every 5 s while a session runs; otherwise every 30 s (every 3 min with data saver, the default) |
| Admin overview | every 10 s (open cases only) |
| Archives, All Students | every 60 s |
| Guard history | every 30 s |
| Clearance photos (phone link open) | every 3 s |
| Website auto-update check | on tab focus + every 5 min |
| Auth token check cache | 60 s per process |

Other measures: lazy-loaded pages; polling paused in hidden tabs; list scopes (§9); `select_related` and
`ticket_list_extras` (4 queries for a whole ticket list instead of several per ticket); photo compression;
selfie fields excluded; Atlas `primaryPreferred` reads.

---

## 20. Code shared or mirrored between platforms

Shared files: `shared/help-content.json`, `shared/iso-form.js`, `shared/reflection-form.js`, `shared/osaconnect-logo.js`.

Mirrored pairs (website ↔ app). A change in one must be made in the other:
`lib/names.js` ↔ `components/names.js` (middle-name rule; also `middle_name_error` on the server);
`components/studentQr.js` ↔ `components/studentQr.js`; `lib/academics.js` ↔ `constants/Data.js`
(departments, courses, year levels, genders); `lib/violationTypes.js` ↔ the app's report form list (both must
match `PUNISHMENT_SYSTEM`); `lib/ticketStatus.js` ↔ `components/ticketStatus.js`;
`lib/studentNotifications.js` ↔ `components/studentNotifications.js`; `lib/greeting.js` ↔ `components/greeting.js`;
StudentDashboard `processCode` ↔ `components/serviceQr.js`; `SessionReceipt`, `TicketDetails`, `NotificationItem`,
`MapGate`, `StudentShell`, student Settings/PersonalInfo/Notifications/ChangePassword, registration and forgot
password screens. The website and app also share the geofence rule (radius + 0.7 × accuracy, max 20 m buffer at
start), the 30-second out-of-area countdown, and the 20-second end cooldown.

---

## 21. Known limitations and open issues

Checked against the code on 2026-10-03. Most items in `AUDIT-2026-09-28.md` have been fixed since: tokens and
roles on every endpoint, hashed passwords, no passwords in responses, placeholders can't log in, atomic approval,
reset attempt limits, `DEBUG` off by default, no hardcoded logins, no seeding from `/health/`, offense counts
skip dismissed reports, and Guard History is limited to the account's own reports.

**Secrets status.** After the audit, the MongoDB Atlas password was **rotated on 2026-09-28**. The old
password (which is also in the git history) was tested and is rejected. Vercel production was given
`DEBUG=False` and its own `SECRET_KEY` the same day. This comes from the deployment notes of that day, not from
the code. Re-check it after any change to the Vercel project. Keep `AUDIT-2026-09-28.md` private.

Still open:

1. **Incident date/time is ignored.** The report form sends `incident_date`/`incident_time`, but the server saves
   the time it received the report.
2. **Admin overview "Completed today"** is always 0, and "completed service" notifications never appear (they read
   `ticket.updated_at`, which doesn't exist).
3. **"No Entry into the Campus" is only recorded.** The sanction is saved, shown to the student as a notification,
   and listed in the Archives, but nothing enforces it (for example, guards scanning the student's QR aren't warned).
4. **The website can't track location in the background.** Browsers pause the page when the tab is hidden or the
   phone is locked, so iPhone students' sessions are only checked while the page is open. Android tracks in the
   background. The 120-second silence rule applies only to tracked (Android) sessions.
5. **GPS is reported by the device.** A spoofed location could pass the geofence, so the system isn't
   "tamper-proof". Mitigations: the site QR is required, and receipts record exits, returns and distances for review.
6. **Event reports still take typed hours.** The admin's "Report Violation" for students who missed a mandatory
   campus event isn't in the handbook's Section 3, so the admin still enters its hours (0–100).
7. **Live and local development share one database.** `backend/.env` points at the same Atlas database the live
   site uses, so a test on a laptop changes real data. Use a separate database for development and tests.
8. **No automated tests.** There are no test files in the repository. Earlier checks were one-off scripts run
   against an in-memory mock database.
9. **No login rate limit** on `/api/login/` (the email-code endpoints have the 5-try limit).
10. **Config hardening**: CORS allows all origins; `ALLOWED_HOSTS` defaults to `*`; `SECRET_KEY` falls back to an
    insecure default if the environment variable is missing (it must be set in production, see above).
11. **Mistyped API paths return the website** (HTTP 200 HTML) instead of a JSON 404, because of the catch-all route.
12. The violation-notice email says "A campus guard or staff member filed a violation report", even for an admin's bulk report.
13. Guards and faculty & staff have no password-change screen (the API allows it); their accounts are managed with
    `create_account`.
14. History and analytics for guards/staff are website-only.
15. The Help contact details are placeholders (`[OSA office location]`, hours, email, phone) to be filled in by OSA.
    The student FAQ mentions "the table below", but the website's student Help page doesn't show the penalty table
    (the app's Help screen does).
16. The website's version label (`APP_VERSION` in `pages/student/Settings.jsx`) is typed by hand; keep it equal
    to `mobile/app.json` "version" (both 1.2.0).
17. The ISO and reflection forms are samples of the OSA forms.
18. The changes of 2026-10-03 (handbook penalties, retired legacy codes) reach Android phones only after an EAS
    update is published, and the live site only after a deploy.
19. Unused leftovers: `GET /violations/analytics/`, `POST /users/update_profile/`, `POST /etickets/<id>/print_iso_form/`,
    `Student.qr_data`, `ETicket.iso_form_printed_at`, `TimeLog.photo_proof_*`, the "Finished" status, and an
    approve/dismiss block in the overview's details dialog that pending reports never reach.
20. The background jobs only run when someone loads the ticket list (§17).
21. Before the pilot, any test or default account passwords must be changed (`create_account <name> --generate`).

## 22. Thesis wording vs. the system

A review that compared this system with the thesis manuscript (which is not in this repository) raised these
points. **The system is the reference**: the manuscript is older, and the system's design isn't changed to
match it. Each row states what the system actually does, so the manuscript can be worded to match. A panel is
likely to ask about them.

| Topic | What the system does |
|---|---|
| iPhone | There is no iPhone app in use. iPhone students use the **website**; only Android students use the app. |
| Status names | E-tickets show **Not started / In progress / Serving now / For clearance / Cleared**. There is no "Ready for Clearance" status. Reports are **Pending OSA Review / Approved / Dismissed / Completed / Cleared**. |
| Clearance | Not fully online. The student must still **bring the signed ISO form and reflection paper to the OSA office**. The admin photographs them with a phone and approves. |
| "Tamper-proof" | Too strong. The location comes from the student's phone (it can be spoofed), and the website can't check it while the page is in the background. More accurate: "QR check-in at a GPS-registered site, with location checks and receipts that record exits". |
| Notifications | Emails (codes and violation notices), notifications computed in the app/website, and Android local notifications. There are **no real-time push notifications** from a server. |
| Penalties | From the OSA Student Handbook (Section 3): 3 hours, then 6 hours, then no entry into the campus. Admins don't choose the hours. |
| Deadline | 3 counted days after approval, Sundays excluded; +1 hour for each missed Monday–Saturday after that. |

## 23. Diagrams in this folder

Each diagram is saved as a PNG (2× resolution, for documents) and an SVG (scalable, editable). They were drawn
from this code.

| File | Diagram | Summary |
|---|---|---|
| `1-architecture-diagram` | System architecture | Student / Guard & Faculty & Staff / Admin → OSA Connect portals (Android app, website) → API request/response (HTTPS JSON) → Django REST Framework services (authentication, violation management, e-ticket & time tracking, service site & geofence, Gmail notifications) → MongoDB Atlas |
| `2-context-diagram` | Context diagram (Level 0 DFD) | Process 0 "OSA Connect System" with Admin, Student and Guard / Faculty & Staff and every data flow (solid = into the system, dashed = out) |
| `3-dfd-level-1` | Level 1 DFD | P1 Record Violation Incident, P2 Validate Violation & Issue E-Ticket, P3 Monitor Community Service Timekeeping, P4 Process Clearance & Generate Analytics, P5 Authenticate & Manage Accounts, P6 Manage Service Sites; D1 Violation Report, D2 Student, D3 TimeLog, D4 E-Ticket, D5 System User, D6 OTP Verification, D7 Clearance Proof, D8 Service Site |
| `4-erd` | Entity relationship diagram | The 8 collections with every field, PK/FK/UK, crow's-foot cardinalities |
| `5-use-case-diagram` | Use case diagram | Student, Security Guard, Faculty & Staff and Admin use cases with include/extend |
| `6-system-flowchart` | System flowchart | Login/registration, then the guard/staff reporting branch, the student service branch (geofence, auto-stop, 3-day rule) and the admin review → e-ticket → clearance branch, linked by connectors A and B |
