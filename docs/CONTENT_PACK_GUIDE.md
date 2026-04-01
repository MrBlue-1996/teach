# Content Pack Guide

> How to create content for the TopShelf Teaching platform.

---

## Overview

A **Content Pack** is a JSON file containing everything needed to teach a specific subject. It includes:

- **Teaching Blocks** - Individual lessons/challenges
- **Badges** - Achievements learners can earn
- **Metadata** - Title, description, difficulty

---

## Quick Start

### 1. Copy the Template

```bash
cp content-packs/template_content_pack.json content-packs/my_course_v1.json
```

### 2. Update Metadata

```json
{
  "id": "pack-my-course-v1",
  "name": "My Course Name",
  "version": "1.0.0",
  "description": "What this course teaches",
  "difficulty": "beginner"
}
```

### 3. Add Teaching Blocks

```json
{
  "teachingBlocks": [
    {
      "id": "tb-001",
      "concept": "Introduction to Topic",
      "question": "What is the command to list files?",
      "correctAnswer": "ls",
      "hints": ["It's a two-letter command", "It stands for 'list'", "The command is 'ls'"],
      "explanation": "The ls command lists directory contents..."
    }
  ]
}
```

### 4. Define Badges

```json
{
  "badges": [
    {
      "id": "badge-basics",
      "title": "Course Basics",
      "description": "Completed the introduction module",
      "requirements": {
        "blocksCompleted": ["tb-001", "tb-002", "tb-003"]
      }
    }
  ]
}
```

---

## Full Schema Reference

### Content Pack (Root)

| Field          | Type   | Required | Description                               |
| -------------- | ------ | -------- | ----------------------------------------- |
| id             | string | Yes      | Unique identifier (e.g., `pack-linux-v1`) |
| name           | string | Yes      | Display name                              |
| version        | string | Yes      | Semantic version (e.g., `1.0.0`)          |
| description    | string | Yes      | What this course teaches                  |
| difficulty     | string | Yes      | `beginner`, `intermediate`, `advanced`    |
| teachingBlocks | array  | Yes      | Array of teaching blocks                  |
| badges         | array  | No       | Array of badge definitions                |
| author         | string | No       | Who created this content                  |

### Teaching Block

| Field             | Type   | Required | Description                                          |
| ----------------- | ------ | -------- | ---------------------------------------------------- |
| id                | string | Yes      | Unique identifier (e.g., `tb-001`)                   |
| concept           | string | Yes      | Topic/concept name                                   |
| type              | string | No       | `lesson`, `challenge`, `quiz` (default: `challenge`) |
| question          | string | Yes      | The question or prompt                               |
| correctAnswer     | string | Yes      | Expected answer                                      |
| hints             | array  | Yes      | Progressive hints (3 recommended)                    |
| explanation       | string | Yes      | Why this is correct                                  |
| level             | string | No       | Learning level (see below)                           |
| timeBudgetSeconds | number | No       | Expected completion time                             |

### Learning Levels

| Level   | Code       | Description           | Example                              |
| ------- | ---------- | --------------------- | ------------------------------------ |
| Recall  | L1_RECALL  | Remember facts        | "What command lists files?"          |
| Explain | L2_EXPLAIN | Understand why        | "Why does ls -la show hidden files?" |
| Apply   | L3_APPLY   | Use in new situations | "List all .txt files modified today" |
| Analyze | L4_ANALYZE | Break down problems   | "Debug why this script fails"        |
| Expert  | L5_EXPERT  | Create & evaluate     | "Design a backup strategy"           |

### Badge

| Field        | Type   | Required | Description       |
| ------------ | ------ | -------- | ----------------- |
| id           | string | Yes      | Unique identifier |
| title        | string | Yes      | Display name      |
| description  | string | Yes      | How to earn it    |
| requirements | object | Yes      | Earning criteria  |

### Badge Requirements

```json
{
  "requirements": {
    "blocksCompleted": ["tb-001", "tb-002"], // Must complete these blocks
    "minScore": 80, // Minimum percentage
    "maxTime": 3600 // Maximum seconds (optional)
  }
}
```

---

## Best Practices

### Hints

Write hints that progress from subtle to obvious:

```json
{
  "hints": [
    "Think about what information you need to see", // Subtle
    "You need to list the contents of the directory", // Direct
    "The command starts with 'l' and ends with 's'" // Nearly gives it away
  ]
}
```

### Explanations

Focus on **why**, not just **what**:

```json
{
  "explanation": "The ls command lists directory contents. The -l flag provides 'long' format with permissions, owner, size, and date. The -a flag shows 'all' files including hidden ones (those starting with a dot). Together, ls -la gives you complete visibility into a directory."
}
```

### Answer Validation

Keep answers simple and normalized:

- Lowercase preferred
- No trailing whitespace
- Commands without the $ prompt

```json
{
  "correctAnswer": "ls -la"      // Good
  "correctAnswer": "$ ls -la"    // Bad (includes prompt)
  "correctAnswer": "LS -LA"      // Bad (uppercase)
}
```

---

## Example: Complete Content Pack

```json
{
  "id": "pack-linux-basics-v1",
  "name": "Linux Basics",
  "version": "1.0.0",
  "description": "Essential Linux command line skills",
  "difficulty": "beginner",

  "teachingBlocks": [
    {
      "id": "tb-linux-001",
      "concept": "Listing Files",
      "type": "challenge",
      "question": "What command lists all files in a directory, including hidden files?",
      "correctAnswer": "ls -a",
      "hints": [
        "The base command for listing is two letters",
        "You need a flag to show hidden files",
        "ls -a (the 'a' stands for 'all')"
      ],
      "explanation": "The ls command lists directory contents. Adding -a shows ALL files, including hidden ones that start with a dot (like .bashrc).",
      "level": "L1_RECALL",
      "timeBudgetSeconds": 60
    },
    {
      "id": "tb-linux-002",
      "concept": "Changing Directories",
      "type": "challenge",
      "question": "What command takes you to your home directory from anywhere?",
      "correctAnswer": "cd ~",
      "hints": [
        "The command to change location is two letters",
        "There's a special character for 'home'",
        "cd ~ (tilde represents your home directory)"
      ],
      "explanation": "The cd command changes your current directory. The tilde (~) is a shortcut that always points to your home directory, no matter where you are.",
      "level": "L1_RECALL",
      "timeBudgetSeconds": 60
    }
  ],

  "badges": [
    {
      "id": "badge-linux-navigator",
      "title": "Linux Navigator",
      "description": "Master basic navigation commands",
      "requirements": {
        "blocksCompleted": ["tb-linux-001", "tb-linux-002"]
      }
    }
  ],

  "author": "TopShelf Teaching",
  "schemaVersion": "1.0.0"
}
```

---

## Validation

Before using a content pack, validate it:

```bash
# Run the content pack validator
pnpm run validate:content-packs

# Or check a specific file
node packages/content-authoring/validate.js content-packs/my_course_v1.json
```

---

## Integration with Platform

The platform loads content packs and displays them in the learning interface. Currently this is done via imports:

```typescript
// In a page file
import contentPack from '@/content-packs/my_course_v1.json';

// Access teaching blocks
const blocks = contentPack.teachingBlocks;
const firstQuestion = blocks[0].question;
```

Future versions will support dynamic loading from a database.

---

## Need Help?

- Check existing content packs in `/content-packs/` for examples
- Review the schema in `/packages/shared/schemas/`
- Contact TopShelf Service LLC for support
