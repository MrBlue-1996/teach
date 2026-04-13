import type { Server } from 'node:http';
import express, { Express, Request, Response } from 'express';
import {
  TeachingMode,
  DeviceProfile,
  PedagogyEngine,
  TriggerDetector,
  type TeachingContext,
} from '@topshelf/engine';
import { renderMvpPage } from './render-mvp-page.js';

interface SessionInitBody {
  sessionId?: string;
  mode?: TeachingMode;
  deviceProfile?: DeviceProfile;
}

interface TeachBody {
  sessionId?: string;
  content?: string;
  errorCount?: number;
  problemsSolved?: number;
}

interface DetectTriggersBody {
  sessionId?: string;
}

interface SessionModeBody {
  sessionId?: string;
  mode?: TeachingMode;
}

interface SessionParams {
  sessionId: string;
}

function isTeachingMode(value: unknown): value is TeachingMode {
  return typeof value === 'number' && Object.values(TeachingMode).includes(value);
}

function isDeviceProfile(value: unknown): value is DeviceProfile {
  return typeof value === 'string' && Object.values(DeviceProfile).includes(value as DeviceProfile);
}

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
app.post(
  '/api/session/init',
  (req: Request<Record<string, never>, unknown, SessionInitBody>, res: Response): void => {
    const {
      sessionId,
      mode = TeachingMode.L2_CONTEXTUAL,
      deviceProfile = DeviceProfile.CHROMEBOOK_STANDARD,
    } = req.body;

    if (sessionId === undefined || sessionId.length === 0) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    if (!isTeachingMode(mode)) {
      res.status(400).json({ error: 'mode is invalid' });
      return;
    }

    if (!isDeviceProfile(deviceProfile)) {
      res.status(400).json({ error: 'deviceProfile is invalid' });
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
  }
);

/**
 * Process teaching request
 */
app.post(
  '/api/teach',
  (req: Request<Record<string, never>, unknown, TeachBody>, res: Response): void => {
    const { sessionId, content, errorCount, problemsSolved } = req.body;

    if (sessionId === undefined || sessionId.length === 0) {
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
  }
);

/**
 * Trigger evaluation endpoint
 */
app.post(
  '/api/triggers/detect',
  (req: Request<Record<string, never>, unknown, DetectTriggersBody>, res: Response): void => {
    const { sessionId } = req.body;

    if (sessionId === undefined || sessionId.length === 0) {
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
  }
);

/**
 * Update teaching mode
 */
app.post(
  '/api/session/mode',
  (req: Request<Record<string, never>, unknown, SessionModeBody>, res: Response): void => {
    const { sessionId, mode } = req.body;

    if (sessionId === undefined || sessionId.length === 0 || mode === undefined) {
      res.status(400).json({ error: 'sessionId and mode are required' });
      return;
    }

    if (!isTeachingMode(mode)) {
      res.status(400).json({ error: 'mode is invalid' });
      return;
    }

    const context = contexts.get(sessionId);
    if (!context) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    context.mode = mode;
    res.json({ sessionId, mode: context.mode });
  }
);

/**
 * Get session status
 */
app.get('/api/session/:sessionId', (req: Request<SessionParams>, res: Response): void => {
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
app.delete('/api/session/:sessionId', (req: Request<SessionParams>, res: Response): void => {
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
export function startServer(port = Number(process.env.PORT ?? 3000)): Server {
  return app.listen(port, () => {
    console.info(`🎓 TopShelf Teaching MCP Server running on port ${port}`);
    console.info(`📚 Enforce "Solve First, Teach Second" pedagogy`);
    console.info(`💻 Chromebook-first with device constraints`);
  });
}

// Export app for testing
export { app };

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
