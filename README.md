# PWA Onboarding Application

Minimal backend-first signup foundation for a restaurant onboarding app.

## Features

- Username + email + password signup
- Email + password login
- Password minimum length of 8 characters
- Password hashing with `bcryptjs` (server-side, never stored in plain text)
- Password show/hide toggle on signup page
- Google signup flow with username field support
- Default landing route redirects to signup page
- Top-right page navigation between signup and login
- PWA setup with manifest + service worker caching
- SQLite database for users (`data/app.db`) instead of JSON
- Capacity dashboard for storage and bandwidth estimation (`/admin.html`)
- CMS builder for onboarding templates (`/cms.html`)
- User profile API showing team-assigned released courses (`/api/cms/user/profile`)

## MVC Structure

- `models/userModel.js` manages the users table in SQLite (`data/app.db`)
- `controllers/authController.js` handles auth business logic
- `routes/authRoutes.js` exposes auth endpoints
- `controllers/adminController.js` and `routes/adminRoutes.js` expose capacity metrics
- `controllers/cmsController.js`, `routes/cmsRoutes.js`, and `models/cmsModel.js` expose onboarding CMS workflows
- `server.js` is the app entry point and route wiring

## PWA Files

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/pwa.js`
- `public/icons/icon-any.svg`
- `public/icons/icon-maskable.svg`

The app is installable when served from `http://localhost` (dev) or HTTPS (prod).

## Setup

1. Install dependencies:
   - `npm install`
2. Copy environment template:
   - `copy .env.example .env`
3. Set `GOOGLE_CLIENT_ID` in `.env`.
4. Set `GOOGLE_CLIENT_ID` in `public/signup.js`.
5. Start server:
   - `npm start`

Open: `http://localhost:4000/signup.html`

## API

- `POST /api/auth/signup`
  - Body: `{ "username": "staff1", "email": "staff@site.com", "password": "min8chars" }`
- `POST /api/auth/login`
  - Body: `{ "email": "staff@site.com", "password": "min8chars" }`
- `POST /api/auth/google`
  - Body: `{ "username": "staff1", "credential": "<google-id-token>" }`
- `GET /api/health`
- `GET /api/admin/capacity`
  - Query params:
    - `activeUsers`
    - `avgVideoMb`
    - `viewsPerUserPerMonth`
    - `avgStreamMbps`
    - `uplinkMbps`
- `POST /api/cms/restaurants`
- `POST /api/cms/teams`
- `POST /api/cms/courses`
- `POST /api/cms/modules`
- `POST /api/cms/questions` (multiple-choice + video URL)
- `POST /api/cms/releases` (schedule release datetime)
- `POST /api/cms/assignments` (assign course to team)
- `POST /api/cms/users/team` (assign user to team)
- `GET /api/cms/template`
- `GET /api/cms/user/profile?email=<user-email>`

## CMS Login

- URL: `/cms-login.html`
- Default admin email: `admin@onboarding.local`
- Default admin password: `AdminPass123!`
- Override via `.env`:
  - `CMS_ADMIN_EMAIL=...`
  - `CMS_ADMIN_PASSWORD=...`
