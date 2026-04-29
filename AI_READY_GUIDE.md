# AI Handoff & Context Guide

If you want another AI (like ChatGPT, Claude, or a new session) to understand and work on this project, simply give it the **`PROJECT_CONTEXT_FOR_AI.md`** file.

### What is in `PROJECT_CONTEXT_FOR_AI.md`?
- **Full Directory Member Tree**: Shows the folder structure.
- **Source Code**: Contains the code for all `.jsx`, `.js`, `.py`, `.css`, and `.html` files.
- **Configuration**: Includes `.env` templates, `package.json`, and `requirements.txt`.

### How to use it with other AIs:
1.  **Upload the file**: If the AI supports file uploads, upload `PROJECT_CONTEXT_FOR_AI.md`.
2.  **Use this prompt**: 
    > "I am working on a project called OSAConnect. I have uploaded a file that contains the entire codebase. Please read it and use it as your primary context for all my future questions."
3.  **Update the file**: If you make many changes, run `python aggregate_for_ai.py` (or use the venv) again to refresh the context file.

### Key Logic & Architecture:
- **Frontend**: React + Vite + Tailwind 4.
- **Backend**: Django REST Framework + MongoDB (MongoEngine).
- **Core Feature**: Student violation tracking through QR code verification.
- **Roles**: Admin, Staff/Faculty, Guard, and Student.

This makes the system "AI-ready" for any model you choose to use in the future!
