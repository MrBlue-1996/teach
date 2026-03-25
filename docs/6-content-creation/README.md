# 6. Content Creation Guide

## Overview

Content packs are self-contained educational modules that work within the TopShelf Teaching system.

## Content Pack Structure

```
content/
└── domain-name/
    ├── manifest.json       # Pack metadata
    ├── lessons/            # Teaching content
    │   ├── 01-intro.md
    │   ├── 02-basics.md
    │   └── 03-advanced.md
    ├── exercises/          # Practice problems
    │   ├── exercise-1.md
    │   └── exercise-2.md
    └── resources/          # Supporting materials
        ├── cheatsheet.md
        └── examples/
```

## Manifest Format

```json
{
  "domain": "domain-name",
  "version": "1.0.0",
  "title": "Human-Readable Title",
  "description": "Clear description of what's taught",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedHours": 10,
  "chromebookCompatible": true,
  "offlineCapable": true,
  "topics": [
    "Topic 1",
    "Topic 2"
  ],
  "prerequisites": ["other-domain"],
  "constraints": {
    "maxFrameworkSize": 0,
    "requiresOffline": true,
    "targetDeviceProfile": "chromebook_standard"
  }
}
```

## Chromebook-First Guidelines

### ✅ DO
- Use vanilla JavaScript, HTML, CSS
- Keep examples simple and focused
- Provide text-based content
- Use small SVG icons
- Include offline versions
- Test on real Chromebooks

### ❌ DON'T
- Require heavy frameworks (React, Angular)
- Use large images or videos
- Depend on external CDNs
- Require powerful hardware
- Use bleeding-edge features

## Content Quality Standards

### 1. Clear Learning Objectives
Every lesson should state:
- What you'll learn
- Prerequisites
- Expected outcomes

### 2. Progressive Difficulty
- Start simple
- Build incrementally
- Provide scaffolding
- Remove scaffolding gradually

### 3. Practice-Oriented
- More exercises than explanations
- Real-world scenarios
- Immediate feedback
- Multiple attempts encouraged

### 4. Device-Aware
- Consider device constraints in examples
- Provide alternative approaches
- Test on target hardware

## Lesson Format

```markdown
# Lesson Title

## Learning Objectives
- Objective 1
- Objective 2

## Prerequisites
- Concept A
- Concept B

## Introduction
Brief overview...

## Core Concepts

### Concept 1
Explanation with examples...

## Practice Exercise
Problem statement...

## Summary
Key takeaways...

## Next Steps
What to learn next...
```

## Exercise Format

```markdown
# Exercise: Title

## Difficulty: ★★☆☆☆

## Objective
What this exercise teaches...

## Problem Statement
Clear description of what to build...

## Constraints
- Must work offline
- Vanilla JS only
- < 100 lines of code

## Starter Code
\`\`\`javascript
// Your code here
\`\`\`

## Tests
How to verify correctness...

## Hints (Collapsed)
<details>
<summary>Hint 1</summary>
First hint...
</details>

## Solution (Collapsed)
<details>
<summary>Solution</summary>
\`\`\`javascript
// Solution code
\`\`\`
</details>
```

## Creating a New Domain Pack

1. **Create Directory Structure**
   ```bash
   mkdir -p content/my-domain/{lessons,exercises,resources}
   ```

2. **Create Manifest**
   Fill in all required fields

3. **Write Lessons**
   Follow lesson format, progressive difficulty

4. **Create Exercises**
   Aligned with lessons, testable

5. **Add Resources**
   Cheat sheets, reference materials

6. **Test on Chromebook**
   Validate everything works

7. **Submit for Review**
   Ensure quality standards met

## Best Practices

1. **Keep It Simple**: Complexity is the enemy of learning
2. **Show, Don't Tell**: Examples over explanations
3. **Test Early**: Validate on target device
4. **Iterate**: Improve based on feedback
5. **Document**: Clear instructions and expectations
