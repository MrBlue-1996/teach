# 10. Contributing Guide

## Welcome!

Thank you for considering contributing to TopShelf Teaching. This guide will help you get started.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment
- Follow community guidelines

## Getting Started

### 1. Fork and Clone
```bash
git clone https://github.com/your-username/teach.git
cd teach
```

### 2. Set Up Development Environment
```bash
cd implementations/mcp-server
npm install
npm run dev
```

### 3. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

## Development Workflow

### 1. Write Tests First (TDD)
```typescript
// tests/new-feature.test.ts
describe('New Feature', () => {
  it('should work correctly', () => {
    // Write failing test
  });
});
```

### 2. Implement Feature
```typescript
// src/new-feature.ts
export function newFeature() {
  // Implementation
}
```

### 3. Verify Tests Pass
```bash
npm test
```

### 4. Type Check
```bash
npm run type-check
```

### 5. Build
```bash
npm run build
```

## Code Standards

### TypeScript
- **Strict Mode**: Always enabled
- **No `any`**: Use proper types
- **Explicit Returns**: Type return values
- **ESM Modules**: Use import/export

```typescript
// Good
function processRequest(data: RequestData): ProcessedResult {
  return { success: true, data };
}

// Bad
function processRequest(data: any) {
  return { success: true, data };
}
```

### Naming Conventions
- **Classes**: PascalCase (`PedagogyEngine`)
- **Functions**: camelCase (`detectTriggers`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RESPONSE_SIZE`)
- **Files**: kebab-case (`constraint-engine.ts`)

### Comments
- Use JSDoc for public APIs
- Explain "why", not "what"
- Keep comments up to date

```typescript
/**
 * Detect triggers based on teaching context
 * 
 * Analyzes error patterns, time spent, and progress
 * to determine when teaching intervention is needed
 * 
 * @param context - Current teaching session context
 * @returns Array of detected trigger types
 */
export function detectTriggers(context: TeachingContext): TriggerType[] {
  // Implementation
}
```

## Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Adding tests
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `chore`: Maintenance tasks

### Examples
```bash
feat(triggers): add concept gap detection

fix(constraints): correct memory limit for Chromebook low

docs(api): update session initialization example

test(pedagogy): add edge cases for mode elevation
```

## Pull Request Process

### 1. Update Documentation
- README if needed
- API docs if changed
- Code comments

### 2. Add/Update Tests
- New features need tests
- Bug fixes need regression tests
- Maintain > 80% coverage

### 3. Run Full Test Suite
```bash
npm test
npm run type-check
npm run build
```

### 4. Create Pull Request
- Clear title and description
- Reference related issues
- Include screenshots if UI changes
- List breaking changes

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
How was this tested?

## Checklist
- [ ] Tests pass
- [ ] Type check passes
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## Areas for Contribution

### High Priority
- Additional device profiles
- More trigger types
- Performance optimizations
- Documentation improvements

### Content Creation
- Domain packs
- Hands-on projects
- Example lessons
- Tutorials

### Testing
- Edge case coverage
- Integration tests
- Performance tests
- Device testing

### Features
- Session persistence (Redis)
- Analytics dashboard
- Advanced triggers
- Custom constraints

## Review Process

1. Automated CI checks must pass
2. Code review by maintainers
3. Discussion and revisions
4. Approval and merge

## Getting Help

- **Issues**: Open an issue for bugs or questions
- **Discussions**: Use GitHub Discussions for ideas
- **Documentation**: Check docs/ folder first

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Project documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to ask! Open an issue or discussion.

Thank you for contributing to TopShelf Teaching! 🎓
