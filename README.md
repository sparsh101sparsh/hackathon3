# CodeForge

An interactive full-stack competitive coding platform and DSA learning workspace built for engineers, interview preparation, and real-time coding battles.

CodeForge brings together a curated catalog of Data Structures & Algorithms problems, an in-browser Monaco code editor, multi-language code execution, interactive algorithm visualizers, rated contests, and multiplayer battle rooms into a single cohesive platform.

---

## ✨ Features

- **DSA Problem Bank:** 600+ curated problems filtered by topic, difficulty (Easy, Medium, Hard), and targeted tech companies (Google, Meta, Amazon, Apple, Microsoft, etc.).
- **In-Browser Code Execution:** Integrated with Judge0 / Piston engine supporting Python, C++, Java, JavaScript, and Go.
- **Interactive Algorithm Visualizers:** Animated step-by-step visualizations with synchronized commentary for key algorithms and data structure operations.
- **Real-Time Battle Rooms & Contests:** Create custom multiplayer rooms for timed 1v1 duels or group coding battles, complete with live commentary and leaderboards.
- **AI-Powered Code Assistance:** Progressive 3-level hints, code analysis, and mock interview practice.
- **Revision & Progress Tracking:** Spaced-repetition revision cards created automatically from solved and attempted problems.
- **Authentication & User Profiles:** Support for Email/OTP verification and Google OAuth authentication.
- **Admin Dashboard:** Management interface for problem sets, users, and platform analytics.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts, Monaco Editor
- **Backend & Database:** Next.js Route Handlers, Prisma ORM, PostgreSQL
- **Code Execution Engine:** Judge0 CE / Piston API
- **Deployment:** Zerops Cloud Platform (`zerops.yml`) / Docker / Node.js host

---

## 📂 Project Structure

```text
app/                 Next.js App Router pages and API routes
components/          UI components (Navbar, Footer, Editor, Visualizer, Landing, etc.)
context/             React authentication & application state context
hooks/               Custom React hooks
lib/                 Prisma DB client, Auth helpers, Rate limiting, Execution engine wrappers
prisma/              Database schema, seeds, and migration definitions
public/              Public assets and visualizer static assets
scripts/             Verification scripts, catalog tooling, and test runners
zerops.yml           Zerops deployment configuration
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sparsh101sparsh/hackathon3.git
   cd hackathon3
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Configure your `DATABASE_URL` and `JWT_SECRET` in `.env.local`.

4. **Initialize Database & Prisma Client:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deployment

CodeForge is configured for deployment on **Zerops** using the included `zerops.yml` setup file.

For detailed production configuration, database setup, environment variable management, and smoke tests, refer to [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md).

---

## 🧪 Testing & Verification

Run the comprehensive quality and test suite:

```bash
# Run linting
npm run lint

# Check TypeScript types
npx tsc --noEmit

# Run full platform quality suite
npm run verify:quality
```

---

## 📄 License

This project is open-source under the MIT License.
