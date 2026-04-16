# ROOMI Master Context

## Project Identity
ROOMI — "Responsive Online Observation & Mentoring Interface." A conversational AI companion for people with intellectual and developmental differences (IDD), designed to support daily routines while providing a "context, not alarms" transparency dashboard for caregivers.

- **Tagline**: "Your Co-Pilot for Everyday Independence"
- **Core values**: Independence at your pace · Privacy by design · Dignity always first
- **Mascot**: Fox (🦊), amber/teal/neon palette
- **Font**: Nunito (Google Fonts)
- **Demo user**: "Cassie" / "Cass" — has a cat named Biscuit, loves drawing manga, favorite color teal, takes Lamotrigine 100mg + Vitamin D 2000 IU, anchor person: Mom (Linda / POA)

## Tech Stack
| Layer | Tech | Details |
|-------|------|---------|
| Frontend | Vite + React 19 | State-based routing via `currentView` in App.jsx |
| Styling | Vanilla CSS | Glassmorphism, glass-card class, CSS animations |
| AI Chat | Gemini 2.0 Flash | Direct frontend API with 3-layer safety |
| Voice | Gemini 2.5 Flash Native Audio | `gemini-2.5-flash-native-audio-latest` via Live API |
| Auth | Firebase Auth | Google Sign-In + Anonymous guest mode |
| Database | Firestore | `users`, `conversations`, `anchorSummaries`, `userRoles`, `fcmTokens` |
| Notifications | Web Notifications API | Local scheduled reminders + crisis alerts |
| CI/CD | GitHub Actions | `deploy.yml` → GitHub Pages |

## Vite Config
- **Base path**: `/roomi-prototype/` (for GitHub Pages subfolder)
- **Dev port**: 5174
- **Auto-open**: true

## Firebase Project: `roomi-companion`
- **Auth Domain**: `roomi-companion.firebaseapp.com`
- **Storage Bucket**: `roomi-companion.firebasestorage.app`
- **Messaging Sender ID**: `934625668511`
- Firestore rules with `isOwner()`, `isCaregiver()`, `isCaregiverFor()` helpers
- Role system: `resident` vs `caregiver`, linked via `caregiverUids[]` array in `userRoles`
- Graceful demo mode: if `VITE_FIREBASE_PROJECT_ID` is missing, app runs without persistence

## Component Map (10 components, 20 files with CSS)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `App.jsx` | 184 | Root: AuthProvider wrapper, view routing, profile loading, caregiver auto-route |
| `Landing.jsx` | 295 | Marketing page: hero with IntersectionObserver reveal animations, mission, how-it-works cards, demo chat preview, individual/anchor relationship diagram, CTA |
| `ChatInterface.jsx` | 679 | AI chat: 5 scenarios, 3-layer safety, Gemini API, quick-reply chips, voice mode toggle, schedule overlay, notification prompt |
| `AnchorView.jsx` | 223 | Caregiver dashboard: mood stars, medication checklist, 70% SVG progress ring, mood timeline, quiet flags, weekly bar chart, fox narrative footer |
| `VoiceMode.jsx` | 312 | Real-time voice: WebSocket to server, AudioWorklet mic capture, Aoede/Kore voice selection, orb animation states, live transcript |
| `Onboarding.jsx` | 192 | 6-step flow: welcome → name → wake time → medications toggle → personal fact → summary |
| `Login.jsx` | 73 | Google sign-in (claims resident role), guest mode, caregiver portal link |
| `CaregiverLogin.jsx` | 89 | Dedicated caregiver auth (claims caregiver role via `claimCaregiverRole`) |
| `Navbar.jsx` | 78 | Role-aware nav: caregivers see only Anchor + Universe; residents see all 4 views |
| `Universe.jsx` | 26 | Iframe embed of ecosystem map from `public/universe/index.html` |
| `NotificationPrompt.jsx` | ~60 | One-time push notification opt-in after first AI response |

## Hooks
| Hook | Purpose |
|------|---------|
| `useAuth.jsx` (131 lines) | AuthContext provider, Google/anonymous sign-in, role management, `isDemoMode` flag |
| `useFirestore.js` (200 lines) | CRUD for profiles, conversations (upsert per-scenario per-day), anchor summaries, roles |
| `usePushNotifications.js` (158 lines) | Web Notifications API, 3 scheduled daily reminders (9AM/12:30PM/7PM), crisis alerts, FCM token storage |

## Safety Architecture (ChatInterface.jsx)
1. **Layer 1 — Client regex**: Intercepts crisis (self-harm, abuse, immediate danger), exploitation (personal info, jailbreak, romance), confusion patterns → blocked before Gemini
2. **Layer 2 — System prompt**: IDD-specific rules including patience with repetition, echolalia handling, yes/no fallback, emotional swing tolerance, no clinical language, explicit safety protocols
3. **Layer 3 — Response validation**: Blocks AI self-identification, clinical terms, medical advice (dosage changes), and truncates responses >500 chars to 2 sentences

## Server (`server/` — separate Node.js app)
| File | Purpose |
|------|---------|
| `index.js` (73 lines) | Express + WebSocket server on port 3001. CORS enabled. `/health` endpoint. Handles binary PCM16 audio + JSON control messages |
| `roomiSession.js` (144 lines) | Creates Gemini Live session using `@google/genai` SDK. Model: `gemini-2.5-flash-native-audio-latest`. Personalizes system prompt from userData. Streams audio chunks back as binary buffers |
| `smoke_test.mjs` | E2E test script |
| `Dockerfile` | Container build config |
| `package.json` | Dependencies: `@google/genai`, `dotenv`, `express`, `ws` |

## Audio Pipeline
- **Browser → Server**: AudioWorklet (`micWorklet.js`) captures mic at native sample rate → resamples to 16kHz PCM16 → sends binary over WebSocket
- **Server → Browser**: Gemini Live returns 24kHz PCM16 → server forwards raw binary → browser decodes via `AudioContext.createBuffer()` with gapless scheduling via `nextPlayTimeRef`

## Data Model (`sampleData.js` — demo defaults)
- **userProfile**: Cassie/Cass, meds array, personalFacts array, anchorName/anchorRelationship
- **dailySchedule**: 10 items from 7:30 AM wake to 9:30 PM wind down
- **demoConversations**: Full scripted dialogues for all 5 scenarios
- **anchorSummary**: Mood/med/routine data with quietFlags and weeklyTrend
- **onboardingSteps**: 6-step configuration (welcome, name, wakeTime, medication, facts, ready)

## ROOMI Universe (Ecosystem Map)
- **Location**: `public/universe/index.html` (77KB single file)
- **Tech**: HTML/Canvas/SVG beams with zero dependencies
- **Assets in `public/universe/`**: 6 AI-enhanced WebP module icons (Ledger, Beacon, Guardian, Circuit, Horizon, Echo), `people.png`, `headshots/` directory
- **Mobile**: 3-tier responsive (820px/520px/375px), GPU pruning (no backdrop-filter, reduced nebula 8→3, stars 850→300, hub rays hidden, animations frozen)
- **Iframe config**: `sandbox="allow-scripts allow-same-origin"`, `loading="eager"`, path resolved via `import.meta.env.BASE_URL`
- **Build history**: ~22-27 hours over 5 days (April 10-15, 2026)

### Founding Executive Council
| Name | Role | Headshot Slot | Fallback |
|------|------|--------------|----------|
| Wade Smith | Founder | wade.jpg | WS |
| Drew Hufnagle | Founder | drew.jpg | DH |
| Cassie Smith | Design/Ops | cassie.jpg | CS |
| Alyssa Senft | Council | alyssa.jpg | AS |
| Dalton Senft | Council | dalton.jpg | DS |
| Breanna McCullough | Council | breanna.jpg | BM |

## Deployments
| URL | Purpose |
|-----|---------|
| https://blueprintaiconsulting.github.io/roomi-prototype/ | Primary production |
| https://roomiuniverse.netlify.app/ | Universe standalone (legacy) |
| https://blueprintaiconsulting.github.io/roomi-ecosystem/ | Universe standalone |

## GitHub Actions (`deploy.yml`)
- Triggers: push to `main` + manual `workflow_dispatch`
- Node 20, `npm ci`, `npm run build`
- Injects 8 secrets: `VITE_GEMINI_API_KEY`, `VITE_VOICE_WS_URL`, + 6 Firebase config vars
- Deploys `dist/` to GitHub Pages via `actions/deploy-pages@v4`

## Key Design Decisions
- Fox mascot + amber/neon palette = canonical brand
- `backdrop-filter: blur()` disabled on mobile for performance
- State-based routing (not react-router) — views: landing, chat, anchor, universe
- Conversations upsert per-scenario per-day to Firestore
- Caregivers auto-route to Anchor View on login
- Navbar is role-aware (caregivers see fewer links)
- Voice server is separate from frontend (different port, own Dockerfile)
- `micWorklet.js` uses Blob URL pattern to avoid separate file serving
- AnchorView currently reads from `sampleData.js` (Firestore integration stubbed but data still static)
