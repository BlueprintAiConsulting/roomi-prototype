// ROOMI Sample Data
// Fictional demo user: Cassie

export const userProfile = {
  name: 'Cassie',
  preferredName: 'Cass',
  wakeTime: '7:30 AM',
  bedTime: '10:00 PM',
  medications: [
    { name: 'Lamotrigine', time: '8:00 AM', dosage: '100mg' },
    { name: 'Vitamin D', time: '8:00 AM', dosage: '2000 IU' },
  ],
  personalFacts: [
    'Loves drawing manga characters',
    'Has a cat named Biscuit',
    'Favorite color is teal',
  ],
  anchorName: 'Mom (Linda)',
  anchorRelationship: 'Parent / POA',
};

export const dailySchedule = [
  { time: '7:30 AM', activity: 'Wake up', icon: '🌅', done: true },
  { time: '8:00 AM', activity: 'Meds + Breakfast', icon: '💊', done: true },
  { time: '9:00 AM', activity: 'Drawing time', icon: '🎨', done: true },
  { time: '10:30 AM', activity: 'Video call with support team', icon: '📱', done: false },
  { time: '12:00 PM', activity: 'Lunch', icon: '🥗', done: false },
  { time: '1:30 PM', activity: 'Walk with Biscuit', icon: '🐱', done: false },
  { time: '3:00 PM', activity: 'Life skills practice', icon: '📋', done: false },
  { time: '5:00 PM', activity: 'Free time', icon: '🎮', done: false },
  { time: '6:30 PM', activity: 'Dinner', icon: '🍽️', done: false },
  { time: '9:30 PM', activity: 'Wind down', icon: '🌙', done: false },
];

export const demoConversations = {
  morning: [
    { sender: 'roomi', text: 'Good morning, Cass. 🌅 Glad you\'re up. How are you feeling so far?' },
    { sender: 'user', text: 'pretty good tbh' },
    { sender: 'roomi', text: 'Love that. Here\'s what we\'ve got lined up today:' },
    { sender: 'roomi', text: '☀️ Meds at 8:00\n🎨 Drawing time at 9:00\n📱 Video call at 10:30\n\nWant to start with meds now, or take a few minutes first?' },
    { sender: 'user', text: 'give me a few minutes' },
    { sender: 'roomi', text: 'Of course. I\'ll be here at 8:00. Enjoy your morning, Cass. 🦊' },
  ],
  medication: [
    { sender: 'roomi', text: 'Hey Cass — 8:00! Quick meds check. 💊' },
    { sender: 'roomi', text: 'Just these two today:\n• Lamotrigine 100mg\n• Vitamin D 2000 IU\n\nLet me know when you\'ve got them.' },
    { sender: 'user', text: 'done' },
    { sender: 'roomi', text: 'Logged. 💊 Now go eat something — you\'ve got drawing time at 9:00 to look forward to.' },
    { sender: 'user', text: 'having cereal' },
    { sender: 'roomi', text: 'Solid choice. Drawing time starts at 9:00 — Biscuit will be there to supervise, I\'m sure. 🐱' },
  ],
  overwhelm: [
    { sender: 'user', text: 'roomi i\'m really stressed right now' },
    { sender: 'roomi', text: 'I\'m here. That\'s okay. Can you take one slow breath with me? 💙' },
    { sender: 'roomi', text: '🫁 In for 4… hold for 4… out for 6.\n\nDon\'t rush. I\'m not going anywhere.' },
    { sender: 'user', text: 'the video call is really stressing me out' },
    { sender: 'roomi', text: 'That makes sense. Video calls can feel like a lot. Here\'s what we could do:\n\n1. 📝 Prep 2–3 things you want to say, together\n2. 🎧 I can help you write a quick script\n3. 📅 We could see if rescheduling is an option\n\nWhat feels most right?' },
    { sender: 'user', text: 'let\'s prep together' },
    { sender: 'roomi', text: 'Let\'s do it. Tell me what the call is about and we\'ll figure out 2–3 things you want to say. That\'s all you need.' },
  ],
  schedule: [
    { sender: 'user', text: 'what\'s left today' },
    { sender: 'roomi', text: 'Good question. Here\'s where you stand, Cass:' },
    { sender: 'roomi', text: '✅ Wake up\n✅ Meds + Breakfast\n✅ Drawing time\n\n⏳ 10:30 — Video call\n⬜ 12:00 — Lunch\n⬜ 1:30 — Walk with Biscuit 🐱\n⬜ 3:00 — Life skills\n⬜ 5:00 — Free time\n⬜ 6:30 — Dinner\n⬜ 9:30 — Wind down' },
    { sender: 'user', text: 'okay thanks' },
    { sender: 'roomi', text: 'Three things done before 10 AM. That\'s not nothing — that\'s your morning. 🦊✨' },
  ],
  reflection: [
    { sender: 'roomi', text: 'Hey Cass. Ready to wind down? 🌙 How did today feel overall?' },
    { sender: 'user', text: 'it was okay. the call went better than i thought' },
    { sender: 'roomi', text: 'I\'m really glad. That took courage — and you showed up anyway. What was the best part of your day?' },
    { sender: 'user', text: 'drawing and the walk with biscuit' },
    { sender: 'roomi', text: 'Two things that are just for you. That balance matters. 💛\n\nHow would you rate today, 1–5?' },
    { sender: 'user', text: '4. pretty solid.' },
    { sender: 'roomi', text: 'Four stars — that sounds right. You showed up for yourself today. Rest well, Cass. I\'ll be here in the morning. 🦊🌙' },
  ],
};

export const anchorSummary = {
  date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  userName: 'Cassie',
  overallMood: 4,
  moodLabel: 'Good day',
  moodEmoji: '😊',
  medicationStatus: {
    morning: { taken: true, meds: ['Lamotrigine 100mg', 'Vitamin D 2000 IU'] },
  },
  routineCompletion: {
    completed: 7,
    total: 10,
    percentage: 70,
    highlights: [
      'Started the morning on her own',
      'Drawing time — a full session',
      'Walk with Biscuit',
    ],
  },
  checkIns: {
    morning: { mood: 'calm', note: 'She said she was feeling pretty good.' },
    midday: { mood: 'anxious', note: 'Felt stressed about a video call. Took a breath, made a plan, and handled it.' },
    evening: { mood: 'content', note: 'Said today felt solid. Happy with how things went.' },
  },
  quietFlags: [
    {
      type: 'note',
      icon: '📝',
      text: 'Cassie felt anxious about a video call today. She asked for help preparing — not avoiding. She made a plan and moved forward on her own.',
      color: 'teal',
    },
    {
      type: 'positive',
      icon: '🌟',
      text: 'She reached for a tool she knew would help, and used it. That kind of self-awareness is something worth recognizing.',
      color: 'amber',
    },
  ],
  weeklyTrend: [3, 4, 3, 5, 4, 3, 4],
  weekDays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
};

export const onboardingSteps = [
  {
    id: 'welcome',
    title: 'Welcome to ROOMI',
    subtitle: "I\'m a daily companion — not a tracker, not an app. Just someone in your corner. This takes about a minute.",
    field: null,
  },
  {
    id: 'name',
    title: 'What should I call you?',
    subtitle: 'Whatever feels most like you — first name, nickname, anything.',
    field: { type: 'text', placeholder: 'Your name or nickname', key: 'preferredName' },
  },
  {
    id: 'wakeTime',
    title: 'When do you usually wake up?',
    subtitle: "No pressure — just so I know when to say good morning.",
    field: { type: 'time-select', key: 'wakeTime', options: ['6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM'] },
  },
  {
    id: 'medication',
    title: 'Any daily medications?',
    subtitle: "Totally optional. If you want, I can give you a nudge each morning.",
    field: { type: 'toggle', key: 'hasMedications', label: 'Yes, I\'d like reminders' },
  },
  {
    id: 'facts',
    title: 'Tell me one thing about you',
    subtitle: 'A hobby, a pet, a favorite food — anything. It helps me know you better.',
    field: { type: 'text', placeholder: 'e.g., I love drawing, I have a cat named Biscuit', key: 'personalFact' },
  },
  {
    id: 'ready',
    title: "You\'re all set.",
    subtitle: "I\'m ready when you are. This is your space — let\'s make it work for you.",
    field: null,
  },
];
