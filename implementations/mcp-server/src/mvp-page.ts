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
        transition: transform 120ms ease, background 120ms ease;
      }

      button:hover {
        background: var(--accent-strong);
        transform: translateY(-1px);
      }

      button.secondary {
        background: transparent;
        color: var(--text);
        border: 1px solid var(--border);
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
        background: rgba(15, 108, 92, 0.1);
        color: var(--accent-strong);
        width: fit-content;
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
        <div class="status" id="health-status">Checking server health...</div>
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
              <input id="sessionId" value="mvp-browser" />
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
              <input id="errorCount" type="number" min="0" value="0" />
            </label>
            <label>
              Problems Solved
              <input id="problemsSolved" type="number" min="0" value="0" />
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
      const output = document.getElementById('output');
      const lastRequest = document.getElementById('last-request');
      const healthStatus = document.getElementById('health-status');

      const sessionId = document.getElementById('sessionId');
      const mode = document.getElementById('mode');
      const deviceProfile = document.getElementById('deviceProfile');
      const errorCount = document.getElementById('errorCount');
      const problemsSolved = document.getElementById('problemsSolved');
      const content = document.getElementById('content');

      function payloadBase() {
        return {
          sessionId: sessionId.value,
          mode: Number(mode.value),
          deviceProfile: deviceProfile.value,
          errorCount: Number(errorCount.value),
          problemsSolved: Number(problemsSolved.value),
          content: content.value,
        };
      }

      async function callApi(label, path, options = {}) {
        lastRequest.textContent = label;

        try {
          const response = await fetch(path, options);
          const body = await response.json();
          output.textContent = JSON.stringify({ status: response.status, body }, null, 2);
        } catch (error) {
          output.textContent = JSON.stringify({ error: error.message }, null, 2);
        }
      }

      async function checkHealth() {
        try {
          const response = await fetch('/health');
          const body = await response.json();
          healthStatus.textContent = response.ok ? 'Server healthy' : 'Server unhealthy';
          output.textContent = JSON.stringify(body, null, 2);
        } catch (_error) {
          healthStatus.textContent = 'Server unreachable';
        }
      }

      document.querySelectorAll('[data-action]').forEach((button) => {
        button.addEventListener('click', async () => {
          const values = payloadBase();

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
                body: JSON.stringify({ sessionId: values.sessionId }),
              });
              break;
            case 'status':
              await callApi('GET /api/session/:sessionId', '/api/session/' + encodeURIComponent(values.sessionId));
              break;
            case 'mode':
              await callApi('POST /api/session/mode', '/api/session/mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: values.sessionId, mode: values.mode }),
              });
              break;
            case 'delete':
              await callApi('DELETE /api/session/:sessionId', '/api/session/' + encodeURIComponent(values.sessionId), {
                method: 'DELETE',
              });
              break;
            default:
              break;
          }
        });
      });

      checkHealth();
    </script>
  </body>
</html>`;
}
