// ═══════════════════════════════════════════════════════════════
// ROOMI Error Code System
// Structured error codes for diagnostics & debugging
// Format: ROOMI-<CATEGORY>-<NUMBER>
// ═══════════════════════════════════════════════════════════════

/**
 * Error code registry. Each code has:
 *  - code:        Unique identifier (e.g., "ROOMI-API-001")
 *  - severity:    "critical" | "warning" | "info"
 *  - userMessage: Safe message shown to the user
 *  - devMessage:  Detailed message for console/logging
 *  - resolution:  Steps to fix
 */
export const ERROR_CODES = {
  // ─── API / Gemini Errors (ROOMI-API-xxx) ─────────────────
  'ROOMI-API-001': {
    code: 'ROOMI-API-001',
    severity: 'critical',
    userMessage: 'ROOMI is having trouble connecting right now.',
    devMessage: 'Gemini API key is missing or undefined (VITE_GEMINI_API_KEY not set)',
    resolution: 'Set VITE_GEMINI_API_KEY in .env locally or in GitHub Secrets for production',
  },
  'ROOMI-API-002': {
    code: 'ROOMI-API-002',
    severity: 'critical',
    userMessage: 'ROOMI couldn\'t process your message.',
    devMessage: 'Gemini API returned an invalid/empty response',
    resolution: 'Check API key validity and quota at https://aistudio.google.com/apikey',
  },
  'ROOMI-API-003': {
    code: 'ROOMI-API-003',
    severity: 'warning',
    userMessage: 'ROOMI is a little overwhelmed right now. Try again in a moment.',
    devMessage: 'Gemini API rate limit exceeded (HTTP 429)',
    resolution: 'Wait and retry, or upgrade API quota',
  },
  'ROOMI-API-004': {
    code: 'ROOMI-API-004',
    severity: 'critical',
    userMessage: 'ROOMI ran into a connection issue.',
    devMessage: 'Gemini API network fetch failed',
    resolution: 'Check network connectivity, CORS settings, and API endpoint URL',
  },
  'ROOMI-API-005': {
    code: 'ROOMI-API-005',
    severity: 'warning',
    userMessage: 'ROOMI couldn\'t respond to that one.',
    devMessage: 'Gemini API response was blocked by safety filters',
    resolution: 'Review safety threshold settings — content triggered HARM_CATEGORY block',
  },
  'ROOMI-API-006': {
    code: 'ROOMI-API-006',
    severity: 'critical',
    userMessage: 'ROOMI is having trouble connecting.',
    devMessage: 'Gemini API key is invalid or expired (HTTP 401/403)',
    resolution: 'Regenerate API key at https://aistudio.google.com/apikey and update env vars',
  },
  'ROOMI-API-007': {
    code: 'ROOMI-API-007',
    severity: 'warning',
    userMessage: 'ROOMI took too long to respond.',
    devMessage: 'Gemini API request timed out (>12s)',
    resolution: 'Check network speed; API may be experiencing high latency',
  },
  'ROOMI-API-008': {
    code: 'ROOMI-API-008',
    severity: 'critical',
    userMessage: 'ROOMI ran into an unexpected error.',
    devMessage: 'Gemini SDK threw an unhandled exception during generateContent()',
    resolution: 'Check browser console for stack trace; may be SDK version mismatch',
  },

  // ─── Firebase Errors (ROOMI-FB-xxx) ──────────────────────
  'ROOMI-FB-001': {
    code: 'ROOMI-FB-001',
    severity: 'warning',
    userMessage: 'ROOMI is running in demo mode (no cloud features).',
    devMessage: 'Firebase not initialized — VITE_FIREBASE_PROJECT_ID is missing',
    resolution: 'Set Firebase env vars in .env or GitHub Secrets',
  },
  'ROOMI-FB-002': {
    code: 'ROOMI-FB-002',
    severity: 'warning',
    userMessage: 'ROOMI couldn\'t save your conversation.',
    devMessage: 'Firestore write failed (conversation save)',
    resolution: 'Check Firestore security rules and user authentication state',
  },
  'ROOMI-FB-003': {
    code: 'ROOMI-FB-003',
    severity: 'info',
    userMessage: 'ROOMI couldn\'t load your previous chat.',
    devMessage: 'Firestore read failed (conversation load)',
    resolution: 'Check Firestore security rules, indexes, and network connectivity',
  },
  'ROOMI-FB-004': {
    code: 'ROOMI-FB-004',
    severity: 'warning',
    userMessage: 'ROOMI couldn\'t load your profile.',
    devMessage: 'Firestore user profile read failed',
    resolution: 'Verify user is authenticated and Firestore rules allow reads on /users/{uid}',
  },
  'ROOMI-FB-005': {
    code: 'ROOMI-FB-005',
    severity: 'info',
    userMessage: 'Memory features temporarily unavailable.',
    devMessage: 'Firestore memory/summary load failed',
    resolution: 'Check composite indexes for dailySummaries and weeklySummaries collections',
  },

  // ─── Network Errors (ROOMI-NET-xxx) ──────────────────────
  'ROOMI-NET-001': {
    code: 'ROOMI-NET-001',
    severity: 'warning',
    userMessage: 'You appear to be offline.',
    devMessage: 'Navigator.onLine returned false — device has no network',
    resolution: 'Check Wi-Fi/cellular connection',
  },
  'ROOMI-NET-002': {
    code: 'ROOMI-NET-002',
    severity: 'critical',
    userMessage: 'ROOMI couldn\'t reach the server.',
    devMessage: 'Fetch failed — TypeError: Failed to fetch (CORS, DNS, or network error)',
    resolution: 'Check server URL, CORS headers, and network connectivity',
  },
  'ROOMI-NET-003': {
    code: 'ROOMI-NET-003',
    severity: 'warning',
    userMessage: 'ROOMI\'s connection timed out.',
    devMessage: 'Request aborted by AbortController after timeout period',
    resolution: 'Increase timeout or check network latency',
  },

  // ─── Client Errors (ROOMI-CLI-xxx) ───────────────────────
  'ROOMI-CLI-001': {
    code: 'ROOMI-CLI-001',
    severity: 'info',
    userMessage: 'Take a breath — no rush! 🦊',
    devMessage: 'Rate limit triggered — user sent >5 messages in 10 seconds',
    resolution: 'Normal rate limiting — wait 5 seconds',
  },
  'ROOMI-CLI-002': {
    code: 'ROOMI-CLI-002',
    severity: 'warning',
    userMessage: 'ROOMI got confused. Refreshing might help.',
    devMessage: 'Conversation history corrupted or in unexpected format',
    resolution: 'Clear conversation state and reload',
  },
  'ROOMI-CLI-003': {
    code: 'ROOMI-CLI-003',
    severity: 'info',
    userMessage: 'ROOMI intercepted that for your safety. 💙',
    devMessage: 'Client-side safety filter triggered (Layer 1)',
    resolution: 'Normal safety behavior — no action needed',
  },
  'ROOMI-CLI-004': {
    code: 'ROOMI-CLI-004',
    severity: 'info',
    userMessage: 'ROOMI cleaned up that response.',
    devMessage: 'Response validation modified Gemini output (Layer 3)',
    resolution: 'Normal safety behavior — no action needed',
  },

  // ─── Server Proxy Errors (ROOMI-SRV-xxx) ─────────────────
  'ROOMI-SRV-001': {
    code: 'ROOMI-SRV-001',
    severity: 'critical',
    userMessage: 'ROOMI\'s server isn\'t available.',
    devMessage: 'Server proxy returned non-200 status (not 429)',
    resolution: 'Check VITE_CHAT_API_URL and ensure the server is running',
  },
  'ROOMI-SRV-002': {
    code: 'ROOMI-SRV-002',
    severity: 'critical',
    userMessage: 'ROOMI\'s server returned an unexpected response.',
    devMessage: 'Server proxy response could not be parsed as JSON',
    resolution: 'Check server logs — may be returning HTML error page instead of JSON',
  },
};

/**
 * Classify a raw error into a structured ROOMI error code.
 * @param {Error} err - The raw error
 * @param {object} context - Additional context: { source: 'gemini'|'server'|'firebase', httpStatus? }
 * @returns {{ errorCode: object, rawError: Error, timestamp: string, context: object }}
 */
export function classifyError(err, context = {}) {
  const { source = 'unknown', httpStatus } = context;
  let code = 'ROOMI-API-008'; // Default: unknown API error

  const msg = (err?.message || '').toLowerCase();

  // ─── API Key Issues ─────────────────────────────────────
  if (msg.includes('api key') || msg.includes('not configured') || msg.includes('api_key')) {
    code = 'ROOMI-API-001';
  }
  // ─── Auth Errors ────────────────────────────────────────
  else if (httpStatus === 401 || httpStatus === 403 || msg.includes('permission') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('api_key_invalid')) {
    code = 'ROOMI-API-006';
  }
  // ─── Rate Limiting ──────────────────────────────────────
  else if (httpStatus === 429 || msg.includes('rate limit') || msg.includes('quota') || msg.includes('resource_exhausted')) {
    code = 'ROOMI-API-003';
  }
  // ─── Timeout / Abort ────────────────────────────────────
  else if (msg.includes('abort') || msg.includes('timeout') || msg.includes('timed out') || err?.name === 'AbortError') {
    code = source === 'server' ? 'ROOMI-NET-003' : 'ROOMI-API-007';
  }
  // ─── Network / Fetch Failures ───────────────────────────
  else if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network') || msg.includes('cors') || msg.includes('dns') || err?.name === 'TypeError') {
    code = source === 'server' ? 'ROOMI-NET-002' : 'ROOMI-API-004';
  }
  // ─── Empty Response ─────────────────────────────────────
  else if (msg.includes('no response') || msg.includes('empty') || msg.includes('no content')) {
    code = 'ROOMI-API-002';
  }
  // ─── Safety Block ───────────────────────────────────────
  else if (msg.includes('safety') || msg.includes('blocked') || msg.includes('harm_category')) {
    code = 'ROOMI-API-005';
  }
  // ─── Server-specific ───────────────────────────────────
  else if (source === 'server' && httpStatus && httpStatus >= 400) {
    code = 'ROOMI-SRV-001';
  }
  // ─── Firebase ──────────────────────────────────────────
  else if (source === 'firebase') {
    if (msg.includes('permission') || msg.includes('denied')) code = 'ROOMI-FB-002';
    else if (msg.includes('not-found') || msg.includes('unavailable')) code = 'ROOMI-FB-003';
    else code = 'ROOMI-FB-004';
  }

  const errorDef = ERROR_CODES[code] || ERROR_CODES['ROOMI-API-008'];

  return {
    errorCode: errorDef,
    rawError: err,
    timestamp: new Date().toISOString(),
    context: { source, httpStatus, originalMessage: err?.message },
  };
}

/**
 * Format an error for console output with full diagnostic info.
 * @param {object} classifiedError - Output from classifyError()
 */
export function logErrorToConsole(classifiedError) {
  const { errorCode, rawError, timestamp, context } = classifiedError;

  const banner = `
╔══════════════════════════════════════════════════════════════╗
║  ROOMI ERROR: ${errorCode.code.padEnd(45)}║
╠══════════════════════════════════════════════════════════════╣
║  Severity:   ${errorCode.severity.padEnd(45)}║
║  Time:       ${timestamp.padEnd(45)}║
╠══════════════════════════════════════════════════════════════╣
║  ${errorCode.devMessage.slice(0, 58).padEnd(58)}  ║
╠══════════════════════════════════════════════════════════════╣
║  Resolution: ${errorCode.resolution.slice(0, 45).padEnd(45)}║
╚══════════════════════════════════════════════════════════════╝`;

  if (errorCode.severity === 'critical') {
    console.error(banner);
    console.error('[ROOMI-DIAG]', {
      code: errorCode.code,
      source: context.source,
      httpStatus: context.httpStatus,
      originalError: rawError?.message,
      stack: rawError?.stack?.split('\n').slice(0, 5).join('\n'),
    });
  } else if (errorCode.severity === 'warning') {
    console.warn(banner);
    console.warn('[ROOMI-DIAG]', { code: errorCode.code, source: context.source, msg: rawError?.message });
  } else {
    console.info(`[ROOMI-${errorCode.code}]`, errorCode.devMessage);
  }
}

/**
 * Build user-facing error message with error code reference.
 * @param {object} classifiedError - Output from classifyError()
 * @param {string} userName - User's preferred name
 * @returns {string} - Message to display in chat
 */
export function buildUserErrorMessage(classifiedError, userName = 'friend') {
  const { errorCode } = classifiedError;

  // For critical errors, include the error code so user can report it
  if (errorCode.severity === 'critical') {
    return `${errorCode.userMessage} If this keeps happening, let someone know the code: ${errorCode.code}. I'll be right here, ${userName}. 🦊`;
  }

  // For warnings, give a softer message with code only in dev mode
  if (errorCode.severity === 'warning') {
    const devSuffix = import.meta.env.DEV ? ` [${errorCode.code}]` : '';
    return `${errorCode.userMessage}${devSuffix} 🦊`;
  }

  // For info, just a gentle message
  return `${errorCode.userMessage}`;
}

/**
 * Run a startup diagnostic check and log all issues.
 * Call this on app mount to surface misconfigurations immediately.
 * @returns {object[]} - Array of diagnostic issues found
 */
export function runDiagnostics() {
  const issues = [];

  // Check Gemini API key
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!geminiKey) {
    issues.push({
      ...ERROR_CODES['ROOMI-API-001'],
      detail: 'VITE_GEMINI_API_KEY is undefined — chat will not work',
    });
  } else if (geminiKey.length < 20) {
    issues.push({
      ...ERROR_CODES['ROOMI-API-006'],
      detail: `VITE_GEMINI_API_KEY looks malformed (${geminiKey.length} chars — expected ~39)`,
    });
  }

  // Check Firebase config
  const fbProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!fbProjectId) {
    issues.push({
      ...ERROR_CODES['ROOMI-FB-001'],
      detail: 'VITE_FIREBASE_PROJECT_ID is undefined — running in demo mode',
    });
  }

  // Check server proxy config (only warn if set but looks wrong)
  const chatApiUrl = import.meta.env.VITE_CHAT_API_URL;
  if (chatApiUrl && !chatApiUrl.startsWith('http')) {
    issues.push({
      code: 'ROOMI-SRV-001',
      severity: 'warning',
      detail: `VITE_CHAT_API_URL looks malformed: "${chatApiUrl}"`,
    });
  }

  // Log results
  if (issues.length === 0) {
    console.info(
      '%c🦊 ROOMI Diagnostics: All systems GO',
      'color: #4caf50; font-weight: bold; font-size: 14px;'
    );
  } else {
    console.group(
      `%c🦊 ROOMI Diagnostics: ${issues.length} issue(s) found`,
      'color: #ff9800; font-weight: bold; font-size: 14px;'
    );
    issues.forEach((issue, i) => {
      const style = issue.severity === 'critical'
        ? 'color: #f44336; font-weight: bold;'
        : 'color: #ff9800;';
      console.log(`%c  ${i + 1}. [${issue.code}] ${issue.detail}`, style);
      if (issue.resolution) {
        console.log(`     → Fix: ${issue.resolution}`);
      }
    });
    console.groupEnd();
  }

  return issues;
}
