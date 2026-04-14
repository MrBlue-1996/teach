# 5. API Reference

## Base URL

```
http://localhost:3000
```

## Manual MVP Page

Open `http://localhost:3000/mvp` to initialize sessions, send teaching requests, inspect triggers, update modes, and delete sessions from the browser.

## Endpoints

### Health Check

```http
GET /health
```

**Response**

```json
{
  "status": "healthy",
  "service": "topshelf-teach-mcp"
}
```

---

### Initialize Session

```http
POST /api/session/init
```

**Request Body**

```json
{
  "sessionId": "string",
  "mode": 0-4,  // Optional, default: 2
  "deviceProfile": "chromebook_low" | "chromebook_standard" | "desktop_low" | "desktop_standard" | "desktop_high"
}
```

**Response**

```json
{
  "sessionId": "abc123",
  "mode": 2,
  "deviceProfile": "chromebook_standard",
  "constraints": {
    "maxMemoryMB": 4096,
    "maxCPUCores": 4,
    "offlineCapable": true,
    "maxResponseSize": 100000,
    "allowHeavyFrameworks": false,
    "allowLargeAssets": false
  }
}
```

---

### Process Teaching Request

```http
POST /api/teach
```

**Request Body**

```json
{
  "sessionId": "string",
  "content": "string", // Teaching content to evaluate
  "errorCount": 0, // Optional
  "problemsSolved": 0 // Optional
}
```

**Response**

```json
{
  "shouldTeach": true,
  "content": "📚 Guidance:\n\nYour teaching content here",
  "mode": 2,
  "filtered": false,
  "filterReason": null
}
```

---

### Detect Triggers

```http
POST /api/triggers/detect
```

**Request Body**

```json
{
  "sessionId": "string"
}
```

**Response**

```json
{
  "currentMode": 2,
  "suggestedMode": 3,
  "triggers": ["error_repeated", "stuck_detected"],
  "shouldElevate": true
}
```

---

### Update Teaching Mode

```http
POST /api/session/mode
```

**Request Body**

```json
{
  "sessionId": "string",
  "mode": 0-4
}
```

**Response**

```json
{
  "sessionId": "abc123",
  "mode": 3
}
```

---

### Get Session Status

```http
GET /api/session/:sessionId
```

**Response**

```json
{
  "sessionId": "abc123",
  "mode": 2,
  "deviceProfile": "chromebook_standard",
  "problemsSolved": 5,
  "errorsEncountered": 2,
  "sessionDuration": 300000,
  "triggers": ["time_threshold"]
}
```

---

### Delete Session

```http
DELETE /api/session/:sessionId
```

**Response**

```json
{
  "message": "Session deleted",
  "sessionId": "abc123"
}
```

## Error Responses

All endpoints may return standard error responses:

```json
{
  "error": "Error message description"
}
```

**Status Codes**

- `400` - Bad Request (missing or invalid parameters)
- `404` - Not Found (session not found)
- `500` - Internal Server Error

## Usage Example

```typescript
// Initialize session
const initResponse = await fetch('http://localhost:3000/api/session/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'user-123',
    mode: 2,
    deviceProfile: 'chromebook_standard',
  }),
});

// Process teaching request
const teachResponse = await fetch('http://localhost:3000/api/teach', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'user-123',
    content: 'Consider using a for loop here',
    errorCount: 2,
  }),
});

const result = await teachResponse.json();
if (result.shouldTeach) {
  console.log(result.content);
}
```
