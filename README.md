# TopShelf Teaching Platform

> Learn the fastest way possible. A two-piece template system for building adaptive learning experiences.

**Version:** 1.0.0-mvp
**Owner:** TopShelf Service LLC
**License:** Proprietary

---

## What Is This?

TopShelf Teaching is a **template system** for building educational platforms. It has two pieces:

| Piece            | What It Is            | What It Does                                   |
| ---------------- | --------------------- | ---------------------------------------------- |
| **Platform**     | The learning system   | Auth, dashboard, progress tracking, badges, UI |
| **Content Pack** | The teaching material | Questions, answers, hints, explanations        |

The Platform stays the same. The Content Pack changes based on what you're teaching.

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM (apps/web)                      │
│  Landing → Signup → Dashboard → Learn → Achievements        │
│  • Always the same structure                                │
│  • Handles user experience                                  │
│  • Tracks progress and awards badges                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    Loads content from
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 CONTENT PACK (content-packs/)               │
│  • Questions, correct answers, hints                        │
│  • Customized per project (Uncle Julio's, Network+, etc.)   │
│  • Follows a standard schema                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start (For Developers)

### Prerequisites

- Node.js 20+
- pnpm 8+ (`npm install -g pnpm`)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd teach

# Install dependencies
pnpm install

# Run the frontend
pnpm --filter @topshelf/web dev

# Open http://localhost:3000
```

### Build for Production

```bash
pnpm --filter @topshelf/web build
```

---

## Project Structure

```
teach/
├── apps/
│   └── web/                    # Next.js 14 frontend (THE PLATFORM)
│       ├── src/
│       │   ├── app/            # Pages (App Router)
│       │   │   ├── (app)/      # Authenticated pages
│       │   │   │   ├── dashboard/
│       │   │   │   ├── content/
│       │   │   │   ├── achievements/
│       │   │   │   ├── settings/
│       │   │   │   └── profile/
│       │   │   ├── (legal)/    # Legal pages
│       │   │   ├── auth/       # Login, signup, forgot-password
│       │   │   └── learn/      # Learning interface
│       │   ├── components/     # Reusable UI components
│       │   ├── hooks/          # React hooks
│       │   ├── lib/            # Utilities and API client
│       │   └── stores/         # State management (Zustand)
│       └── package.json
│
├── packages/                   # Backend services (not yet connected)
│   ├── api-server/             # REST API (Hono)
│   ├── auth/                   # JWT authentication
│   ├── database/               # PostgreSQL schema (Drizzle)
│   ├── billing/                # Stripe integration
│   ├── email/                  # Transactional emails
│   ├── config/                 # Environment configuration
│   └── ...                     # Other services
│
├── content-packs/              # CONTENT PACKS GO HERE
│   ├── template_content_pack.json
│   ├── content_pack_linux_v1.json
│   └── content_pack_networkplus_v1.json
│
├── legal/                      # Terms, Privacy Policy
├── docs/                       # Documentation
└── policy/                     # Promotion rules
```

---

## The Golden Path

This is the user journey the platform is optimized for:

```
1. LANDING (/)
   ↓ "Start Learning Free" button
2. SIGNUP (/auth/signup)
   ↓ Google OAuth or email (30 seconds)
3. DASHBOARD (/dashboard)
   ↓ "Continue Learning" button
4. CONTENT BROWSER (/content)
   ↓ Select a course
5. COURSE DETAIL (/content/[id])
   ↓ "Start Learning" button
6. LEARN (/learn/[courseId])
   ↓ Complete challenges, get immediate feedback
7. ACHIEVEMENTS (/achievements)
   ↓ View earned badges, share credentials
```

---

## Content Pack Specification

Content packs follow this schema:

```json
{
  "id": "pack-unique-id",
  "name": "Course Name",
  "version": "1.0.0",
  "description": "What this course teaches",
  "teachingBlocks": [
    {
      "id": "block-001",
      "type": "challenge",
      "concept": "Topic Name",
      "question": "The question to ask the learner",
      "correctAnswer": "The expected answer",
      "hints": [
        "First hint (subtle)",
        "Second hint (more direct)",
        "Third hint (nearly gives it away)"
      ],
      "explanation": "Why this is the correct answer",
      "level": "L1_RECALL"
    }
  ],
  "badges": [
    {
      "id": "badge-001",
      "title": "Badge Name",
      "description": "How to earn this badge",
      "requirements": {
        "blocksCompleted": ["block-001", "block-002"]
      }
    }
  ]
}
```

### Levels

| Level      | Name    | Description                     |
| ---------- | ------- | ------------------------------- |
| L1_RECALL  | Recall  | Remember facts                  |
| L2_EXPLAIN | Explain | Understand concepts             |
| L3_APPLY   | Apply   | Use knowledge in new situations |
| L4_ANALYZE | Analyze | Break down complex problems     |
| L5_EXPERT  | Expert  | Create and evaluate             |

---

## How to Customize for a New Project

### Step 1: Fork or Copy

```bash
# Option A: Fork the repo (for ongoing updates)
# Option B: Copy the directory (for standalone project)
cp -r teach my-project
cd my-project
```

### Step 2: Update Branding

Edit these files:

- `apps/web/src/app/layout.tsx` - Title, metadata
- `apps/web/src/app/page.tsx` - Landing page content
- `apps/web/tailwind.config.ts` - Colors (topshelf brand colors)

### Step 3: Create Your Content Pack

```bash
# Copy the template
cp content-packs/template_content_pack.json content-packs/my_project_v1.json

# Edit with your content
```

### Step 4: Update the Frontend to Load Your Content

Currently, content is mocked in the page files. To use your content pack:

1. Import it in the relevant page
2. Replace mock data with content pack data

---

## Current State (MVP)

| Component        | Status      | Notes                    |
| ---------------- | ----------- | ------------------------ |
| Frontend UI      | Complete    | All 16 pages working     |
| Golden Path      | Complete    | Fully walkable           |
| Mock Data        | In Place    | Simulates real behavior  |
| API Client       | Written     | Not connected to backend |
| Backend Packages | Written     | Not running              |
| Database         | Schema Only | Not deployed             |
| Authentication   | Mock        | Real auth needs backend  |

### What Works Now

- Click through entire app
- All pages render correctly
- Mobile responsive
- Dark/light theme
- Form validation

### What Needs Backend

- User persistence
- Progress saving
- Real authentication
- Badge issuance

---

## Technology Stack

| Layer    | Technology                         |
| -------- | ---------------------------------- |
| Frontend | Next.js 14, React 18, TypeScript   |
| Styling  | Tailwind CSS, shadcn/ui components |
| State    | Zustand, React hooks               |
| Backend  | Hono (Node.js), Drizzle ORM        |
| Database | PostgreSQL                         |
| Auth     | JWT (jose), bcrypt                 |
| Payments | Stripe                             |
| Email    | SendGrid/SMTP                      |

---

## Commands Reference

```bash
# Development
pnpm install              # Install all dependencies
pnpm --filter @topshelf/web dev    # Run frontend dev server
pnpm --filter @topshelf/web build  # Build frontend for production

# Type Checking
pnpm --filter @topshelf/web typecheck  # Check TypeScript

# All Packages
pnpm run build            # Build all packages
pnpm run typecheck        # Typecheck all packages
```

---

## Support

- **Documentation:** `/docs/` directory
- **Legal:** `/legal/` directory
- **Issues:** Contact TopShelf Service LLC

---

## Version History

| Version   | Date       | Description                          |
| --------- | ---------- | ------------------------------------ |
| 1.0.0-mvp | 2026-02-02 | Initial MVP - Complete UI, mock data |

---

_Built by TopShelf Service LLC. All rights reserved._
