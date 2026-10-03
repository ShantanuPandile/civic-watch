# Civic Watch

PROBLEM STATEMENT:
[Smart Civic Issue Reporting & Tracking Platform
PROBLEM
Citizens report potholes, broken streetlights and garbage problems, but complaints get lost, duplicated
or ignored.
CHALLENGE
Build a platform where issues can be reported with location and details, automatically categorised and
prioritised by severity, and tracked until resolved. It must merge duplicate reports of the same problem,
give citizens live status updates, and give authorities a dashboard for managing and closing issues.]
PREFERRED LANGUAGE/FRAMEWORK:
[e.g., React, Next.js, Python Flask, Vue, Svelte, etc.]
Generate a Replit-ready prompt that:

Focuses on 3 CORE features only (minimum viable, demo-ready)

Uses the specified tech stack

Includes ONE free API integration (if needed)

Prioritizes visual appeal for demo
Can be built in 3-4 hours MAX

NO test cases, NO authentication (unless critical), NO complex backend

Keep it under 200 words. Make it copy-paste ready for Replit.Hum first-year students hain, 8 ghante hain. Is problem ke liye Flask + SQLite +
HTML/JS (Leaflet map) ki website banao: "Smart Civic Issue Reporting & Tracking
Platform". Pehle sirf ye do: (1) citizen ka report form (description, category
auto-select baad mein, GPS location, photo) jo SQLite mein save ho, (2) saare
reports ki list. Poora code do, folder structure aur chalane ke commands ke saath.
Code simple rakho aur comments Hinglish mein likho.Hum first-year students hain, 8 ghante hain. Is problem ke liye Flask + SQLite +
HTML/JS (Leaflet map) ki website banao: "Smart Civic Issue Reporting & Tracking
Platform". Pehle sirf ye do: (1) citizen ka report form (description, category
auto-select baad mein, GPS location, photo) jo SQLite mein save ho, (2) saare
reports ki list. Poora code do, folder structure aur chalane ke commands ke saath.
Code simple rakho aur comments Hinglish mein likho.I am a first-year student with no coding experience, in an 8-hour hackathon.
Build a complete website for this problem statement, in STAGES.

PROBLEM: "Smart Civic Issue Reporting & Tracking Platform". Citizens report
potholes, broken streetlights and garbage problems, but complaints get lost,
duplicated or ignored. Build a platform where issues are reported with
location and details, automatically categorised and prioritised by severity,
and tracked until resolved. It must merge duplicate reports, give citizens
live status updates, and give authorities a dashboard to manage and close issues.

TECH (keep it simple, free, no paid services):
- Backend: Python Flask, serving JSON APIs and the HTML pages
- Database: SQLite (file: civic.db)
- Frontend: plain HTML, CSS, JavaScript (no React), Leaflet map (OpenStreetMap)
  and Chart.js via CDN
- AI: an LLM API for classification (key in .env as AI_API_KEY). If the API
  fails or no key, fall back to keyword rules (English, Hindi, Marathi words)

DATABASE TABLES:
- users(id, name, phone, credits, created_at)
- reports(id, tracking_id, user_id, description, category, severity 1-5,
  ai_reason, department, priority_score, latitude, longitude, address,
  photo_path, status, duplicate_count, parent_id, created_at, updated_at)
- status_history(id, report_id, status, note, changed_at)
- credit_log(id, user_id, report_id, points, reason, created_at)

FEATURES:
1. Citizen report form: name, phone, description (English/Hindi/Marathi),
   photo upload (max 2 MB), location via browser GPS or clicking on the map.
2. AI classification: category (pothole/streetlight/garbage/other), severity
   1-5, a one-line reason, and department (Roads/Electricity/Sanitation).
3. Priority score = severity*10 + duplicate_count*5 + days_open*2.
4. Duplicate merge: if an open issue has the same category, is within 50 m
   (haversine) and is under 7 days old, do NOT create a new issue. Increase
   the original's duplicate_count, link the new report to it, recompute
   priority, and tell the citizen "merged with existing issue".
5. Status flow: Reported -> Verified -> Assigned -> In Progress -> Resolved
   (also Rejected as fake). Every change is saved in status_history with a note.
6. Citizen tracking page: enter tracking_id, see a timeline. Auto-refresh
   every 5 seconds (live updates).
7. Authority dashboard (login with ADMIN_PASSWORD from .env): table sorted
   by priority, filters (category, status), map with markers, buttons to
   change status/assign/close with a note, stats charts (by category,
   open vs resolved).
8. Civic Credits: +5 on report, +10 when verified, +20 when resolved,
   +3 when a report merges into an existing issue, -10 if marked fake.
   Show credits and level on the citizen page (Bronze 0-49, Silver 50-149,
   Gold Civic Hero 150+) and a leaderboard (top 10). Log every change in credit_log.
9. A seed.py script that adds 12 realistic sample reports around Nagpur
   (21.1458, 79.0882) so the demo looks full.
10. Clean, mobile-friendly CSS with a simple blue/white theme.

RULES FOR YOU:
- Give ONE stage at a time and wait for me to say "next".
- STAGE 1 NOW: folder structure, requirements.txt, database setup (db.py),
  the report form page and the list of reports. Give complete code for every
  file, Windows commands to install and run, and what I should see in the browser.
- Write comments in simple Hinglish. Never give partial snippets; give full files.
- Never put API keys in code. Use .env and tell me to add it to .gitignore.next: Stage 2 - Leaflet map, GPS location aur photo upload
next: Stage 3 - AI classification, severity aur fallback keyword rules
next: Stage 4 - duplicate merge aur priority score
next: Stage 5 - tracking page, timeline aur 5 second auto-refresh
next: Stage 6 - admin login aur dashboard (table, filters, map, charts)
next: Stage 7 - Civic Credits, levels aur leaderboard, seed.py

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/88701b0d-c4e5-4a30-86c7-639f1f0c6a74).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
