import express, { Express, Request, Response } from 'express';
import {
  TeachingMode,
  DeviceProfile,
  PedagogyEngine,
  TriggerDetector,
  type TeachingContext,
} from '@topshelf/engine';
import { renderMvpPage } from './render-mvp-page.js';

const app: Express = express();

// Middleware
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.redirect('/mvp');
});

app.get('/mvp', (_req: Request, res: Response) => {
  res.type('html').send(renderMvpPage());
});

// Store active teaching contexts
const contexts = new Map<string, TeachingContext>();

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'topshelf-teach-mcp' });
});

/**
 * Initialize teaching session
 */
app.post('/api/session/init', (req: Request, res: Response): void => {
  const {
    sessionId,
    mode = TeachingMode.L2_CONTEXTUAL,
    deviceProfile = DeviceProfile.CHROMEBOOK_STANDARD,
  } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  const context = PedagogyEngine.createContext(mode, deviceProfile);
  contexts.set(sessionId, context);

  res.json({
    sessionId,
    mode: context.mode,
    deviceProfile: context.deviceProfile,
    constraints: context.constraints,
  });
});

/**
 * Process teaching request
 */
app.post('/api/teach', (req: Request, res: Response): void => {
  const { sessionId, content, errorCount, problemsSolved } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  const context = contexts.get(sessionId);
  if (!context) {
    res.status(404).json({ error: 'Session not found. Initialize session first.' });
    return;
  }

  // Update context with new metrics
  if (typeof errorCount === 'number') {
    context.errorsEncountered = errorCount;
  }
  if (typeof problemsSolved === 'number') {
    context.problemsSolved = problemsSolved;
  }

  // Process teaching request
  const response = PedagogyEngine.processTeachingRequest(context, content);

  res.json(response);
});

/**
 * Trigger evaluation endpoint
 */
app.post('/api/triggers/detect', (req: Request, res: Response): void => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  const context = contexts.get(sessionId);
  if (!context) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const triggers = TriggerDetector.detectTriggers(context);
  const suggestedMode = TriggerDetector.suggestModeElevation(context.mode, triggers);

  res.json({
    currentMode: context.mode,
    suggestedMode,
    triggers,
    shouldElevate: suggestedMode > context.mode,
  });
});

/**
 * Update teaching mode
 */
app.post('/api/session/mode', (req: Request, res: Response): void => {
  const { sessionId, mode } = req.body;

  if (!sessionId || mode === undefined) {
    res.status(400).json({ error: 'sessionId and mode are required' });
    return;
  }

  const context = contexts.get(sessionId);
  if (!context) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  context.mode = mode;
  res.json({ sessionId, mode: context.mode });
});

/**
 * Get session status
 */
app.get('/api/session/:sessionId', (req: Request, res: Response): void => {
  const { sessionId } = req.params;

  const context = contexts.get(sessionId);
  if (!context) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json({
    sessionId,
    mode: context.mode,
    deviceProfile: context.deviceProfile,
    problemsSolved: context.problemsSolved,
    errorsEncountered: context.errorsEncountered,
    sessionDuration: Date.now() - context.sessionStartTime.getTime(),
    triggers: context.triggers,
  });
});

/**
 * Cleanup session
 */
app.delete('/api/session/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (contexts.delete(sessionId)) {
    res.json({ message: 'Session deleted', sessionId });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

/**
 * Start server
 */
export function startServer(port = Number(process.env.PORT ?? 3000)) {
  return app.listen(port, () => {
    console.log(`🎓 TopShelf Teaching MCP Server running on port ${port}`);
    console.log(`📚 Enforce "Solve First, Teach Second" pedagogy`);
    console.log(`💻 Chromebook-first with device constraints`);
  });
}

// Export app for testing
export { app };

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
