# Digital Evidence Protection System (SHA-512)

This project is a high-end Digital Evidence Protection System featuring role-based access control, SHA-512 hashing for integrity checks, and a forensic-style terminal UI.

## 🚀 Deployment Guide

### Frontend (Netlify)
1. Log in to [Netlify](https://app.netlify.com/).
2. Click **Add new site** > **Import from an existing project**.
3. Select **GitHub** and authorize access to your repository: `radhika-k-23/sha-512`.
4. Configure the build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Click **Deploy site**.

### Backend (Django)
The backend needs to be hosted on a platform that supports Python/Django (e.g., Render, Fly.io, or Railway).
1. Ensure `db.sqlite3` is replaced with a production database (like PostgreSQL) if planning for long-term use.
2. Set the `ALLOWED_HOSTS` in `settings.py` to your backend URL.
3. Update the frontend's API base URL in `frontend/src/api/axiosClient.js` to point to your live backend.

## 🛠️ Local Development
1. **Backend**: 
   - `cd backend`
   - `python manage.py runserver`
2. **Frontend**:
   - `cd frontend`
   - `npm run dev`

## 🔑 Demo Credentials
| Role | Username | Password |
| :--- | :--- | :--- |
| **Police** | `police_officer` | `password123` |
| **FSL** | `fsl_demo` | `password123` |
| **Judiciary** | `judge_demo` | `password123` |
| **Evidence Room** | `evidence_clerk` | `password123` |
