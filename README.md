# Career Nova

An ML-based career recommendation system that analyzes software and essential skills to recommend suitable career paths, with a FastAPI backend and an animated React frontend.

## Objective

The system uses occupational skill data to predict suitable careers based on a student's skills. It also performs skill-gap analysis and calculates career readiness.

## Dataset

This project uses O*NET occupational data containing:

- Occupation information
- Software skills
- Essential skills
- Career interest information

## Quick start

Requires Python 3.10+ and Node.js 18+. From the `career_ai` folder:

```powershell
powershell -ExecutionPolicy Bypass -File start.ps1
```

Then open **http://careernova**. Press `Ctrl+C` in that terminal to stop both
servers. `start.cmd` does the same thing if you prefer to double-click it.

That one command is all that is ever needed. It checks the environment first and
repairs whatever is missing, so nothing below has to be run by hand:

| Step | When it runs |
|---|---|
| `pip install -r backend/requirements.txt` | Only if FastAPI, uvicorn or scikit-learn are missing |
| `npm install` | Only if `frontend/node_modules` is missing |
| `python backend/train.py` | Only if `backend/artifacts/model.joblib` is missing (~45 s) |
| Hosts entry for `careernova` | Only if absent, prompting once for administrator rights |
| Stopping a leftover API or Vite server | Only if one is still holding port 8000 or 80 |
| Removing an out-of-date `frontend/dist` | Only if the build is older than the sources |

It then starts the API on port 8000, waits until `/api/health` reports the model
is loaded, and only afterwards starts the web app on port 80, so the UI never
opens against an API that is not ready. If the API fails to start, the last lines
of `logs/api.err.log` are printed instead of a blank screen.

To check the setup without starting anything:

```powershell
powershell -ExecutionPolicy Bypass -File verify_setup.ps1
```

It reports Python and Node availability, installed packages, the model artifact,
account and saved-path counts, the hosts entry, what is holding ports 80 and
8000, and whether the running servers answer. Adding `-Build` also runs the
production build. It only reads; it never changes or deletes anything.

## One-time Windows setup

Two things are machine-level rather than project-level. Both are one-off.

**1. The `careernova` hostname.** The name resolves through the Windows hosts
file at `C:\Windows\System32\drivers\etc\hosts`, which needs a single line:

```
127.0.0.1 careernova
```

`start.ps1` adds it automatically the first time and asks for administrator
rights through a UAC prompt to do so. To add it yourself, or to repair it later:

```powershell
powershell -ExecutionPolicy Bypass -File setup_hostname.ps1
```

That script is idempotent, backs the hosts file up to `hosts.careernova.bak`
before its first edit, and flushes the DNS cache afterwards. Because the entry
lives on this machine, `http://careernova` works here only; other devices use the
LAN IP as described below.

**2. Inbound port 80**, only if you want to reach the app from a phone or another
PC. From an elevated PowerShell:

```powershell
New-NetFirewallRule -DisplayName 'Career Nova (TCP 80)' -Direction Inbound `
  -Protocol TCP -LocalPort 80 -Action Allow -Profile Private
```

## Configuration

There are no environment variables to set and no `.env` file; every setting is a
literal in a tracked file, and the defaults are what `start.ps1` expects.

| Setting | Value | Defined in |
|---|---|---|
| Web app port | 80 | `frontend/vite.config.js` (`PORT`), `start.ps1` (`$webPort`) |
| API port | 8000 | `start.ps1` (`$apiPort`), proxy target in `frontend/vite.config.js` |
| Hostname | `careernova` | `frontend/vite.config.js`, `setup_hostname.ps1`, CORS list in `backend/app/main.py` |
| API base URL used by the browser | `/api`, same origin via the Vite proxy | `frontend/src/api.js` |
| Account and saved-path store | `backend/data/*.json` | `backend/app/storage.py` |
| Model artifact | `backend/artifacts/model.joblib` | `backend/train.py` |

The frontend never talks to port 8000 directly: it calls `/api/...` on its own
origin and Vite proxies that to `http://127.0.0.1:8000`. That is why no API URL
has to be configured per device, and why a phone on the LAN works unchanged.

If port 80 is permanently taken on your machine (IIS or the "Web Deployment
Agent" are the usual causes, and `start.ps1` will name the culprit), either free
it with an elevated `net stop http` or change `PORT` in `frontend/vite.config.js`
and `$webPort` in `start.ps1` to the same new value — the address then becomes
`http://careernova:<port>`.

## Opening it on a phone or another PC

The dev server binds every network interface, and `/api` is proxied server-side,
so other devices need nothing beyond the address:

1. On the machine running the app, note the LAN IP that `start.ps1` prints on
   startup (or run `ipconfig` and take the IPv4 address).
2. Allow inbound port 80 once, using the firewall rule above.
3. On the phone or other PC, connected to the same Wi-Fi, open
   `http://192.168.x.x` using that address.

`http://careernova` only works on the host machine, because the name comes from
its hosts file. Other devices need the IP address, unless you add the same name
to your router's DNS.

To run the two servers separately while working on one of them:

```powershell
python -m uvicorn backend.app.main:app --reload --port 8000   # API on :8000
cd frontend; npm run dev                                      # UI on :80
```

For a single-origin production build, run `npm run build` in `frontend/` and then
start only the API — it serves `frontend/dist` at http://127.0.0.1:8000. Note
that `start.ps1` deletes that folder when it is older than the sources, so the
dev server is never shadowed by a stale bundle.

## Project layout

```
career_ai/
  AI_career_recommendation.ipynb   Original exploratory notebook
  *.csv                            Raw O*NET data
  backend/
    pipeline.py                    CSV -> career_data + synthetic student profiles
    train.py                       Trains models, writes artifacts/model.joblib
    eval_ranking.py                Measures ranking strategies under sparse input
    app/
      main.py                      FastAPI routes
      recommender.py               Serving logic: ranking, skill gap, roadmap
      storage.py                   Accounts, sessions and saved paths (JSON)
      schemas.py                   Request/response models
    data/                          Account and saved-path store (git-ignored)
  frontend/
    src/components/                React + Framer Motion UI
    vite.config.js                 Port 80, LAN binding, /api proxy to :8000
  start.ps1                        The one command: checks, then runs both servers
  start.cmd                        Double-click wrapper around start.ps1
  verify_setup.ps1                 Read-only report on the whole setup
  setup_hostname.ps1               Adds 127.0.0.1 careernova to the hosts file
  run_dev.ps1                      Thin alias kept for older notes; calls start.ps1
  logs/                            API output from the last run (git-ignored)
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Service and artifact status |
| GET | `/api/skills` | The 134 software and 10 essential skill options |
| GET | `/api/careers` | Career list, filterable with `?search=` |
| GET | `/api/careers/{title}` | Full requirement lists for one career |
| POST | `/api/recommend` | Ranked career matches for a skill profile |
| POST | `/api/analyze` | Skill gap, readiness and roadmap for one career |
| GET | `/api/metrics` | Model comparison and training statistics |
| POST | `/api/auth/register` | Create an account, returns a bearer token |
| POST | `/api/auth/login` | Sign in, returns a bearer token |
| GET | `/api/auth/available` | Whether a username is free, used live while typing |
| GET | `/api/auth/me` | The signed-in account, its saved-path count and avatar |
| PUT | `/api/auth/avatar` | Set or clear the profile picture |
| POST | `/api/auth/logout` | Revoke the current token |
| POST | `/api/saved-paths` | Save the current career path (auth required) |
| GET | `/api/saved-paths` | The signed-in user's saved paths |
| GET | `/api/saved-paths/{id}` | One saved path |
| DELETE | `/api/saved-paths/{id}` | Remove a saved path |

Interactive documentation is available at http://127.0.0.1:8000/docs.

## Accounts and saved paths

The app opens on a sign-in screen: create an account once, then sign in on later
visits to reach your own saved paths from the **My paths** button in the header.
Usernames are claimed case-insensitively and checked as you type, so once
`andrea` exists nobody else can register `Andrea`.

Being signed in belongs to the browser tab you signed in from. The token is kept
in `sessionStorage`, so refreshing keeps you signed in, while closing the tab
ends the session. Opening the address on a phone, on another PC, or in a new
window therefore always starts at the sign-in screen — a login never follows the
link to another device.

When you press **Done** at the end of a result, a celebration screen appears with
an animated scene and a motivational quote, then offers to save the path — the
career, your match and readiness scores, every skill you selected, and the
roadmap steps. Paths are filed under your account, so there is nothing to name.
Afterwards you can jump straight into building another path or open **My paths**,
where any saved path can be expanded or deleted.

Click the avatar in the header to set a profile picture, either from a file on
your device or from six built-in colours. Uploads are center-cropped to a 256px
square and re-encoded as JPEG in the browser, so only a small thumbnail is sent
and stored.

Accounts, sessions, avatars and saved paths live in `backend/data/*.json`. Passwords are
stored as PBKDF2-SHA256 hashes (200,000 rounds) with a per-user salt, never in
the clear, and tokens are opaque random strings. This is a local single-node
store, so the folder is git-ignored; delete it to reset all accounts.

## Machine Learning Models

The following algorithms were evaluated:

- Logistic Regression
- Bernoulli Naive Bayes
- K-Nearest Neighbors (KNN)
- Decision Tree
- Random Forest
- Support Vector Machine (SVM)
- Linear Regression

## Model Results

Original notebook results:

| Model | Accuracy |
|---|---:|
| SVM | 63.88% |
| Random Forest | 63.29% |
| Logistic Regression | 62.40% |
| Bernoulli Naive Bayes | 60.09% |
| KNN | 33.22% |
| Decision Tree | 9.25% |

Retrained by `backend/train.py`:

| Model | Accuracy |
|---|---:|
| SVM (LinearSVC) | 69.23% |
| Random Forest | 67.71% |
| Logistic Regression | 67.12% |
| Bernoulli Naive Bayes | 64.79% |
| KNN | 35.48% |
| Decision Tree | 11.05% |

Two changes account for the improvement over the notebook. The label binarizers are fitted on the full career skill vocabulary instead of only on the sampled student skills, which removes the `unknown class(es) will be ignored` warnings and stops valid skills from being silently dropped. Careers with no recorded skills are also excluded from training, because their all-zero feature rows matched every sparse query equally well; they remain browsable through the API.

## How the match score is built

Logistic Regression is the served model because it is the only strong performer that returns calibrated probabilities. On its own, though, it ranks poorly for real usage: it was trained on profiles holding roughly 70% of a career's skills, while a person using the app ticks a handful. `backend/eval_ranking.py` measures this directly by sampling K skills from a known career and checking whether that career comes back:

| Ranking signal | Top-5 recall from 5 skills | Top-5 recall from 10 skills |
|---|---:|---:|
| Classifier only | 38.0% | 79.3% |
| Skill fit only | 84.7% | 99.3% |

So the final `match` score blends a small amount of classifier confidence (10%) with a skill-fit score (90%) that compares your selections against each occupation's real requirement list. The fit score is an F-measure of precision and recall weighted by inverse document frequency, so a diagnostic skill like "Web platform development software" counts far more than one like "Spreadsheet software" that nearly every occupation lists. Each career card surfaces all three numbers separately, so the classifier's own confidence stays visible.

## Features

- Career recommendation
- Top career predictions
- Skill-gap analysis
- Career readiness score
- Personalized learning roadmap
- Animated web interface with searchable skill picker and quick-start profiles
- User accounts, with every saved career path kept under **My paths**

## Workflow

O*NET Data  
↓  
Data Cleaning  
↓  
Feature Engineering  
↓  
Student Skill Profiles  
↓  
Train/Test Split  
↓  
ML Model Training  
↓  
Model Comparison  
↓  
Career Recommendation  
↓  
Skill Gap Analysis  
↓  
Learning Roadmap

## Important Note

The student profiles used in this experiment are synthetically generated from O*NET occupational requirements. Therefore, the reported accuracy is an experimental benchmark and should not be interpreted as accuracy on real student populations.

## Future Improvements

- Use real student skill data
- Improve career recommendation confidence
- Add explainable AI
- Add career-family classification
- Generate more personalized learning recommendations
