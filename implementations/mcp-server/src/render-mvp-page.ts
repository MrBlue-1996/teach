export function renderMvpPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TopShelf Teaching MVP</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f3efe5;
        --panel: #fffaf2;
        --panel-strong: #f8edd8;
        --text: #1b1c1d;
        --muted: #675f52;
        --accent: #0f6c5c;
        --accent-strong: #0a5246;
        --border: #d8cdbb;
        --danger: #9d2f2f;
        --warning: #8a6200;
        --shadow: 0 20px 50px rgba(27, 28, 29, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(15, 108, 92, 0.16), transparent 24%),
          radial-gradient(circle at top right, rgba(207, 148, 72, 0.2), transparent 22%),
          linear-gradient(180deg, #f8f4ea 0%, var(--bg) 100%);
      }

      main {
        max-width: 1200px;
        margin: 0 auto;
        padding: 32px 20px 56px;
      }

      .hero {
        display: grid;
        gap: 14px;
        margin-bottom: 28px;
      }

      h1,
      h2,
      h3 {
        margin: 0;
        font-weight: 600;
      }

      h1 {
        font-size: clamp(2.2rem, 4vw, 4.2rem);
        line-height: 0.95;
        max-width: 10ch;
      }

      .hero p,
      .hint,
      .meta {
        color: var(--muted);
      }

      .layout {
        display: grid;
        gap: 18px;
        grid-template-columns: repeat(12, minmax(0, 1fr));
      }

      .card {
        background: linear-gradient(180deg, rgba(255, 250, 242, 0.98), rgba(248, 237, 216, 0.94));
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: var(--shadow);
        padding: 18px;
      }

      .card.primary {
        grid-column: span 7;
      }

      .card.secondary {
        grid-column: span 5;
      }

      .stack {
        display: grid;
        gap: 14px;
      }

      .grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      label {
        display: grid;
        gap: 6px;
        font-size: 0.95rem;
      }

      input,
      select,
      textarea,
      button {
        font: inherit;
      }

      input,
      select,
      textarea {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.72);
        color: var(--text);
      }

      textarea {
        min-height: 120px;
        resize: vertical;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      button {
        border: 0;
        border-radius: 999px;
        padding: 10px 16px;
        background: var(--accent);
        color: white;
        cursor: pointer;
        transition: transform 120ms ease, background 120ms ease, opacity 120ms ease;
      }

      button:hover:not(:disabled) {
        background: var(--accent-strong);
        transform: translateY(-1px);
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
        transform: none;
      }

      button.secondary {
        background: transparent;
        color: var(--text);
        border: 1px solid var(--border);
      }

      button.secondary:hover:not(:disabled) {
        background: rgba(27, 28, 29, 0.04);
      }

      button.danger {
        background: var(--danger);
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        background: rgba(27, 28, 29, 0.92);
        color: #f7f1e3;
        padding: 16px;
        border-radius: 14px;
        min-height: 360px;
        overflow: auto;
      }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        padding: 6px 12px;
        width: fit-content;
        background: rgba(15, 108, 92, 0.1);
        color: var(--accent-strong);
      }

      .status.warning {
        background: rgba(138, 98, 0, 0.12);
        color: var(--warning);
      }

      .status.error {
        background: rgba(157, 47, 47, 0.12);
        color: var(--danger);
      }

      .hint {
        font-size: 0.92rem;
        line-height: 1.5;
      }

      @media (max-width: 960px) {
        .card.primary,
        .card.secondary {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 720px) {
        .grid {
          grid-template-columns: 1fr;
        }

        main {
          padding-inline: 14px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="status warning" id="health-status">Checking server health...</div>
        <h1>Click through the teaching MVP.</h1>
        <p>Use the controls below to initialize a session, send teaching content, inspect triggers, change mode, and delete the session without leaving the browser.</p>
      </section>

      <section class="layout">
        <div class="card primary stack">
          <div>
            <h2>Session Controls</h2>
            <p class="hint">The page talks to the same server that served it, so you only need the app running on port 3000.</p>
          </div>

          <div class="grid">
            <label>
              Session ID
              <input id="sessionId" autocomplete="off" spellcheck="false" />
            </label>
            <label>
              Mode
              <select id="mode">
                <option value="0">L0 Silent</option>
                <option value="1">L1 Minimal</option>
                <option value="2" selected>L2 Contextual</option>
                <option value="3">L3 Active</option>
                <option value="4">L4 Tutorial</option>
              </select>
            </label>
            <label>
              Device Profile
              <select id="deviceProfile">
                <option value="chromebook_low">Chromebook Low</option>
                <option value="chromebook_standard" selected>Chromebook Standard</option>
                <option value="desktop_low">Desktop Low</option>
                <option value="desktop_standard">Desktop Standard</option>
                <option value="desktop_high">Desktop High</option>
              </select>
            </label>
            <label>
              Errors Encountered
              <input id="errorCount" type="number" min="0" step="1" value="0" inputmode="numeric" />
            </label>
            <label>
              Problems Solved
              <input id="problemsSolved" type="number" min="0" step="1" value="0" inputmode="numeric" />
            </label>
          </div>

          <label>
            Teaching Content
            <textarea id="content">Break the task into smaller steps and verify each DOM query before wiring events.</textarea>
          </label>

          <div class="actions">
            <button data-action="init">Initialize Session</button>
            <button data-action="teach">Send Teaching Request</button>
            <button data-action="triggers" class="secondary">Detect Triggers</button>
            <button data-action="status" class="secondary">Fetch Session Status</button>
            <button data-action="mode" class="secondary">Update Mode</button>
            <button data-action="delete" class="danger">Delete Session</button>
          </div>
        </div>

        <div class="card secondary stack">
          <div>
            <h2>API Output</h2>
            <p class="meta" id="last-request">No request yet.</p>
          </div>
          <pre id="output">Waiting for a request...</pre>
        </div>
      </section>
    </main>

    <script>
      (function () {
        function getRequiredElement(id) {
          const element = document.getElementById(id);
          if (!element) {
            throw new Error('Missing required element: ' + id);
          }
          return element;
        }

        const output = getRequiredElement('output');
        const lastRequest = getRequiredElement('last-request');
        const healthStatus = getRequiredElement('health-status');

        const sessionId = getRequiredElement('sessionId');
        const mode = getRequiredElement('mode');
        const deviceProfile = getRequiredElement('deviceProfile');
        const errorCount = getRequiredElement('errorCount');
        const problemsSolved = getRequiredElement('problemsSolved');
        const content = getRequiredElement('content');
        const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

        const REQUEST_TIMEOUT_MS = 15000;
        let isBusy = false;

        function makeDefaultSessionId() {
          return 'mvp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        }

        function setHealthState(text, variant) {
          healthStatus.textContent = text;
          healthStatus.className = 'status' + (variant ? ' ' + variant : '');
        }

        function setBusy(nextBusy) {
          isBusy = nextBusy;
          for (const button of actionButtons) {
            button.disabled = nextBusy;
          }
        }

        function safeTrim(value) {
          return typeof value === 'string' ? value.trim() : '';
        }

        function parseNonNegativeInteger(value, fieldName) {
          const trimmed = safeTrim(value);

          if (trimmed === '') {
            throw new Error(fieldName + ' is required.');
          }

          if (!/^[0-9]+$/.test(trimmed)) {
            throw new Error(fieldName + ' must be a non-negative whole number.');
          }

          const parsed = Number(trimmed);

          if (!Number.isSafeInteger(parsed) || parsed < 0) {
            throw new Error(fieldName + ' must be a safe non-negative whole number.');
          }

          return parsed;
        }

        function buildPayload() {
          const payload = {
            sessionId: safeTrim(sessionId.value),
            mode: Number(mode.value),
            deviceProfile: deviceProfile.value,
            errorCount: parseNonNegativeInteger(errorCount.value, 'Errors Encountered'),
            problemsSolved: parseNonNegativeInteger(problemsSolved.value, 'Problems Solved'),
            content: content.value,
          };

          if (!payload.sessionId) {
            throw new Error('Session ID is required.');
          }

          if (!Number.isInteger(payload.mode) || payload.mode < 0 || payload.mode > 4) {
            throw new Error('Mode must be an integer between 0 and 4.');
          }

          if (!payload.deviceProfile) {
            throw new Error('Device Profile is required.');
          }

          return payload;
        }

        function renderJson(value) {
          return JSON.stringify(value, null, 2);
        }

        function renderError(message, details) {
          const body = { error: message };

          if (details !== undefined) {
            body.details = details;
          }

          output.textContent = renderJson(body);
        }

        async function fetchWithTimeout(path, options) {
          const controller = new AbortController();
          const timer = window.setTimeout(function () {
            controller.abort();
          }, REQUEST_TIMEOUT_MS);

          try {
            return await fetch(path, {
              cache: 'no-store',
              ...options,
              signal: controller.signal,
            });
          } finally {
            window.clearTimeout(timer);
          }
        }

        async function parseResponseBody(response) {
          const text = await response.text();

          if (!text) {
            return null;
          }

          try {
            return JSON.parse(text);
          } catch (_error) {
            return text;
          }
        }

        async function callApi(label, path, options) {
          if (isBusy) {
            return;
          }

          setBusy(true);
          lastRequest.textContent = label;
          output.textContent = 'Processing...';

          try {
            const response = await fetchWithTimeout(path, options);
            const body = await parseResponseBody(response);

            if (!response.ok) {
              output.textContent = renderJson({
                ok: false,
                status: response.status,
                statusText: response.statusText,
                body: body,
              });
              return;
            }

            output.textContent = renderJson({
              ok: true,
              status: response.status,
              statusText: response.statusText,
              body: body,
            });
          } catch (error) {
            const message =
              error && error.name === 'AbortError'
                ? 'Request timed out after ' + REQUEST_TIMEOUT_MS + 'ms.'
                : error instanceof Error
                  ? error.message
                  : 'Unknown request error.';

            renderError(message);
          } finally {
            setBusy(false);
          }
        }

        async function checkHealth() {
          const paths = ['/health', '/api/health'];

          setHealthState('Checking server health...', 'warning');

          for (const path of paths) {
            try {
              const response = await fetchWithTimeout(path, { method: 'GET' });
              const body = await parseResponseBody(response);

              if (!response.ok) {
                continue;
              }

              setHealthState('Server healthy (' + path + ')', '');

              if (lastRequest.textContent === 'No request yet.') {
                output.textContent = renderJson({
                  ok: true,
                  path: path,
                  body: body,
                });
              }

              return;
            } catch (_error) {
              continue;
            }
          }

          setHealthState('Server unreachable', 'error');

          if (lastRequest.textContent === 'No request yet.') {
            renderError('Health check failed. No reachable endpoint at /health or /api/health.');
          }
        }

        actionButtons.forEach(function (button) {
          button.addEventListener('click', async function () {
            let values;

            try {
              values = buildPayload();
            } catch (error) {
              renderError(error instanceof Error ? error.message : 'Invalid form input.');
              return;
            }

            switch (button.dataset.action) {
              case 'init':
                await callApi('POST /api/session/init', '/api/session/init', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: values.sessionId,
                    mode: values.mode,
                    deviceProfile: values.deviceProfile,
                  }),
                });
                break;

              case 'teach':
                await callApi('POST /api/teach', '/api/teach', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: values.sessionId,
                    content: values.content,
                    errorCount: values.errorCount,
                    problemsSolved: values.problemsSolved,
                  }),
                });
                break;

              case 'triggers':
                await callApi('POST /api/triggers/detect', '/api/triggers/detect', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: values.sessionId,
                    errorCount: values.errorCount,
                    problemsSolved: values.problemsSolved,
                    content: values.content,
                  }),
                });
                break;

              case 'status':
                await callApi(
                  'GET /api/session/:sessionId',
                  '/api/session/' + encodeURIComponent(values.sessionId),
                  {
                    method: 'GET',
                  }
                );
                break;

              case 'mode':
                await callApi('POST /api/session/mode', '/api/session/mode', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: values.sessionId,
                    mode: values.mode,
                  }),
                });
                break;

              case 'delete':
                await callApi(
                  'DELETE /api/session/:sessionId',
                  '/api/session/' + encodeURIComponent(values.sessionId),
                  {
                    method: 'DELETE',
                  }
                );
                break;

              default:
                renderError('Unknown action: ' + button.dataset.action);
                break;
            }
          });
        });

        if (!safeTrim(sessionId.value)) {
          sessionId.value = makeDefaultSessionId();
        }

        checkHealth().catch(function (error) {
          setHealthState('Server unreachable', 'error');
          renderError(
            error instanceof Error ? error.message : 'Unexpected health check failure.'
          );
        });
      })();
    </script>
  </body>
</html>`;
}
