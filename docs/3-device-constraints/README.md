# 3. Device Constraints

## Overview

TopShelf Teaching is Chromebook-first, designed to work seamlessly on low-resource devices while scaling up for more capable hardware.

## Device Profiles

### Chromebook Low

- **Memory**: 2GB RAM
- **CPU**: 2 cores
- **Max Response**: 50KB
- **Frameworks**: None allowed
- **Assets**: Text-only
- **Offline**: Required

### Chromebook Standard (Default for Education)

- **Memory**: 4GB RAM
- **CPU**: 4 cores
- **Max Response**: 100KB
- **Frameworks**: Vanilla JS only
- **Assets**: Small images ok
- **Offline**: Required

### Desktop Profiles

- **Low**: 4GB RAM, basic web dev
- **Standard**: 8GB RAM, modern frameworks ok
- **High**: 16GB+ RAM, no restrictions

## Constraint Engine

### Response Size Filtering

```typescript
// Automatically truncates responses exceeding device limits
if (response.length > constraints.maxResponseSize) {
  response = truncate(response);
}
```

### Framework Detection

Blocks suggestions for heavy frameworks on Chromebooks:

- ❌ React, Angular, Vue
- ❌ Webpack, Parcel
- ✅ Vanilla JavaScript
- ✅ Lightweight libraries (< 50KB)

### Asset Filtering

Prevents large asset suggestions:

- ❌ "Use high-res images"
- ❌ "Add video files"
- ✅ "Use SVG icons"
- ✅ "Text-based content"

## Offline Support

### Required for Chromebooks

All Chromebook profiles require offline capability:

- Content cached locally
- No CDN dependencies
- Embedded resources
- Progressive enhancement

### Implementation

```typescript
const constraints = ConstraintEngine.getConstraints(DeviceProfile.CHROMEBOOK_STANDARD);

if (constraints.offlineCapable) {
  // Use local resources only
  // Cache all dependencies
  // No external API calls
}
```

## Best Practices

1. **Test on Real Chromebooks**: Always validate on actual hardware
2. **Measure Performance**: Track response times and memory usage
3. **Optimize Assets**: Compress, minify, and lazy-load
4. **Progressive Enhancement**: Start minimal, add features for capable devices
5. **Offline First**: Design for offline, add online as enhancement

## Validation

Use the constraint checker before suggesting content:

```typescript
const result = ConstraintEngine.isSuggestionSuitable(suggestion, deviceProfile);

if (!result.suitable) {
  console.log(`Blocked: ${result.reason}`);
}
```
