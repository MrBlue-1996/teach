# Content Domain Packs

This directory contains educational content organized by domain.

## Structure

Each domain pack should contain:

- `manifest.json` - Domain metadata and configuration
- `lessons/` - Teaching lessons and materials
- `exercises/` - Practice problems
- `resources/` - Additional learning resources

## Example Domains

- **Web Development** - HTML, CSS, JavaScript fundamentals
- **Python Basics** - Core Python programming concepts
- **Data Structures** - Arrays, lists, trees, graphs
- **Algorithms** - Sorting, searching, optimization

## Creating a Domain Pack

1. Create a new directory with the domain name
2. Add a `manifest.json` with domain metadata
3. Organize content by difficulty level
4. Ensure all content is Chromebook-compatible
5. Include offline fallback materials

## Device Constraints

All content must respect device constraints:

- Keep file sizes small (< 100KB per resource)
- Avoid heavy frameworks
- Provide text-based alternatives
- Support offline access
