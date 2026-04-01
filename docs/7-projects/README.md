# 7. Hands-on Lab Projects

## Overview

Projects are practical, hands-on exercises where students build complete applications or features.

## Project Structure

```
projects/
└── project-name/
    ├── README.md          # Project overview
    ├── starter/           # Initial code
    │   ├── index.html
    │   ├── style.css
    │   └── script.js
    ├── solution/          # Reference implementation
    │   └── [same structure]
    ├── tests/             # Validation tests
    │   └── tests.js
    └── rubric.md          # Grading criteria
```

## Project README Template

```markdown
# Project: Title

## Overview

Brief description of what you'll build

## Learning Objectives

- Skill 1
- Skill 2

## Requirements

- Vanilla JavaScript
- Works offline
- Chromebook-compatible
- < 500 lines total

## Getting Started

1. Open starter/index.html
2. Read the TODO comments
3. Start coding!

## Features to Implement

- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

## Testing

Run tests: [instructions]

## Stretch Goals (Optional)

- Advanced feature 1
- Advanced feature 2

## Resources

- [Link to relevant docs]
```

## Rubric Template

```markdown
# Grading Rubric

## Core Functionality (60 points)

- [ ] Feature 1 works correctly (20 pts)
- [ ] Feature 2 works correctly (20 pts)
- [ ] Feature 3 works correctly (20 pts)

## Code Quality (20 points)

- [ ] Clean, readable code (10 pts)
- [ ] Proper variable names (5 pts)
- [ ] Comments where needed (5 pts)

## Device Compatibility (20 points)

- [ ] Works on Chromebook (10 pts)
- [ ] Works offline (10 pts)

## Total: \_\_\_ / 100
```

## Example Projects

### Beginner: Todo List

- Add/remove items
- Mark complete
- Local storage
- Vanilla JS only

### Intermediate: Quiz Game

- Multiple choice questions
- Score tracking
- Timer
- Result summary

### Advanced: Code Editor

- Syntax highlighting
- Run JavaScript
- Save/load
- Offline capable

## Design Principles

### 1. Solve First, Teach Second

- Minimal starter code
- Students implement core logic
- Hints available but hidden
- Solution only after attempts

### 2. Incremental Complexity

- Start with MVP
- Add features progressively
- Stretch goals for advanced students
- Clear checkpoints

### 3. Real-World Relevance

- Practical applications
- Common patterns
- Industry practices
- Portfolio-worthy

### 4. Chromebook-First

- No heavy dependencies
- Offline capable
- Performance conscious
- Resource efficient

## Creating a New Project

1. **Define Scope**
   - What will students build?
   - What skills does it teach?
   - Estimated time to complete?

2. **Create Starter Code**
   - Minimal scaffolding
   - Clear TODOs
   - Structure without implementation

3. **Build Solution**
   - Complete working version
   - Well-commented
   - Best practices

4. **Write Tests**
   - Validate core features
   - Automated where possible
   - Clear pass/fail criteria

5. **Create Rubric**
   - Objective criteria
   - Point allocation
   - Clear expectations

6. **Test with Students**
   - Watch for confusion points
   - Adjust difficulty
   - Improve instructions

## Starter Code Guidelines

### ✅ DO Provide

- Basic HTML structure
- CSS boilerplate
- Event listener stubs
- Clear TODO comments
- Function signatures

### ❌ DON'T Provide

- Core logic
- Algorithm implementations
- Complete solutions
- Too much scaffolding

## Testing Projects

### Manual Testing Checklist

- [ ] Works on Chromebook
- [ ] Loads offline
- [ ] All features functional
- [ ] No console errors
- [ ] Responsive design
- [ ] Clear instructions

### Automated Testing

```javascript
// Example test structure
describe('Todo List', () => {
  it('should add new item', () => {
    // Test implementation
  });

  it('should mark item complete', () => {
    // Test implementation
  });
});
```

## Best Practices

1. **Clear Instructions**: No ambiguity
2. **Achievable Goals**: Success builds confidence
3. **Multiple Paths**: Allow creative solutions
4. **Immediate Feedback**: Tests provide validation
5. **Celebrate Success**: Recognition for completion
