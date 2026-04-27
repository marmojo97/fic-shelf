const db = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

console.log('🌱 Seeding demo data...');

// Clear existing demo user
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@archivd.app');
if (existing) {
  db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
}

// Create demo user
const userId = uuidv4();
const passwordHash = bcrypt.hashSync('archivd', 10);
db.prepare(
  'INSERT INTO users (id, email, password_hash, username, display_name, bio, reading_speed, annual_goal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
).run(
  userId, 'demo@archivd.app', passwordHash, 'fandom_archivist',
  'Fandom Archivist', 'Professional crier. Emotional support character for fictional characters. My heart lives in the margins of fanfiction.',
  250, 100
);

const FICS = [
  {
    title: "All the Young Dudes", author: "MsKingBean89",
    fandom: "Harry Potter", ships: ["Remus Lupin/Sirius Black"],
    characters: ["Remus Lupin", "Sirius Black", "James Potter", "Lily Evans"],
    wordCount: 526969, chapterCount: 188, chaptersRead: 188,
    completionStatus: "complete", contentRating: "M",
    contentWarnings: ["Major Character Death"],
    tags: ["Marauders Era", "Slow Burn", "Coming of Age", "Found Family", "Emotional Damage"],
    shelf: "read", personalRating: 5, coverColor: "#1e3a8a",
    dateStarted: "2023-01-10", dateFinished: "2023-03-15",
    personalNotes: "This fic destroyed me completely. The found family, the tragedy, the love. Remus deserved better. We all deserved better. Read it. Weep.",
    emotionalDamage: true, rereadCount: 2,
    sourceUrl: "https://archiveofourown.org/works/11118771"
  },
  {
    title: "The Dead of July", author: "whatarefears",
    fandom: "Marvel Cinematic Universe", ships: ["Steve Rogers/Bucky Barnes"],
    characters: ["Steve Rogers", "Bucky Barnes"],
    wordCount: 35293, chapterCount: 1, chaptersRead: 1,
    completionStatus: "complete", contentRating: "M", contentWarnings: [],
    tags: ["Ghost AU", "Horror", "Haunting", "Romance", "One Shot", "Atmospheric"],
    shelf: "read", personalRating: 4.5, coverColor: "#3b0764",
    dateStarted: "2023-04-02", dateFinished: "2023-04-02",
    personalNotes: "Haunted the hell out of me. Perfect atmosphere. Steve as a ghost is tragic and beautiful.",
    emotionalDamage: true, rereadCount: 1,
    sourceUrl: "https://archiveofourown.org/works/776622"
  },
  {
    title: "What You Don't Know", author: "hollimichele",
    fandom: "Marvel Cinematic Universe", ships: ["Steve Rogers/Bucky Barnes"],
    characters: ["Steve Rogers", "Bucky Barnes", "Sam Wilson", "Natasha Romanov"],
    wordCount: 75678, chapterCount: 15, chaptersRead: 15,
    completionStatus: "complete", contentRating: "M", contentWarnings: [],
    tags: ["Post-Winter Soldier", "Recovery", "Memory", "Hurt/Comfort", "Found Family"],
    shelf: "read", personalRating: 4.5, coverColor: "#3b0764",
    dateStarted: "2023-04-10", dateFinished: "2023-04-28",
    personalNotes: "The slow recovery arc is so beautifully written. Sam Wilson appreciation fic at its finest.",
    emotionalDamage: false, rereadCount: 0,
    sourceUrl: "https://archiveofourown.org/works/1595921"
  },
  {
    title: "Twist and Shout", author: "gabriel & standbyme",
    fandom: "Supernatural", ships: ["Dean Winchester/Castiel"],
    characters: ["Dean Winchester", "Castiel", "Sam Winchester"],
    wordCount: 97556, chapterCount: 26, chaptersRead: 26,
    completionStatus: "complete", contentRating: "M",
    contentWarnings: ["Major Character Death", "Graphic Violence"],
    tags: ["Historical AU", "1960s", "Vietnam War", "Tragedy", "Angst", "Period-Typical Homophobia"],
    shelf: "read", personalRating: 4, coverColor: "#78350f",
    dateStarted: "2023-05-05", dateFinished: "2023-05-20",
    personalNotes: "I have never recovered. The ending broke something in me. Historical AUs hit different when the tragedy feels earned.",
    emotionalDamage: true, rereadCount: 0,
    sourceUrl: "https://archiveofourown.org/works/710074"
  },
  {
    title: "A Gentleman's Guide to Vice and Virtue (AO3)", author: "Tangerinehamster",
    fandom: "Good Omens", ships: ["Aziraphale/Crowley"],
    characters: ["Aziraphale", "Crowley"],
    wordCount: 89432, chapterCount: 24, chaptersRead: 24,
    completionStatus: "complete", contentRating: "T", contentWarnings: [],
    tags: ["Regency AU", "Historical", "Slow Burn", "Pining", "Idiots in Love", "Dancing"],
    shelf: "read", personalRating: 5, coverColor: "#14532d",
    dateStarted: "2023-06-01", dateFinished: "2023-06-22",
    personalNotes: "Ineffable husbands in waistcoats. Need I say more? The ballroom scene chapter absolutely sent me.",
    emotionalDamage: false, rereadCount: 1,
    sourceUrl: "https://archiveofourown.org/works/19906537"
  },
  {
    title: "The Light More Beautiful", author: "firethesound",
    fandom: "Harry Potter", ships: ["Harry Potter/Draco Malfoy"],
    characters: ["Harry Potter", "Draco Malfoy", "Hermione Granger"],
    wordCount: 81000, chapterCount: 14, chaptersRead: 14,
    completionStatus: "complete", contentRating: "M", contentWarnings: [],
    tags: ["Post-War", "Auror Partners", "Enemies to Lovers", "Slow Burn", "Pining", "Canon Compliant"],
    shelf: "read", personalRating: 4.5, coverColor: "#1e3a8a",
    dateStarted: "2023-07-10", dateFinished: "2023-07-30",
    personalNotes: "The enemies to lovers pipeline really said 'twelve years of pining' and I believed every word.",
    emotionalDamage: false, rereadCount: 0,
    sourceUrl: "https://archiveofourown.org/works/3102630"
  },
  {
    title: "Tessellation", author: "neomeruru",
    fandom: "Haikyuu!!", ships: ["Kageyama Tobio/Hinata Shouyou"],
    characters: ["Hinata Shouyou", "Kageyama Tobio"],
    wordCount: 26000, chapterCount: 1, chaptersRead: 1,
    completionStatus: "complete", contentRating: "E", contentWarnings: [],
    tags: ["Post-Canon", "Timeskip", "Reunion", "Pining", "One Shot", "Growth"],
    shelf: "read", personalRating: 5, coverColor: "#831843",
    dateStarted: "2023-08-05", dateFinished: "2023-08-05",
    personalNotes: "The reunion hit me like a volleyball. How does a one-shot make you feel this much? Perfect in every way.",
    emotionalDamage: true, rereadCount: 3,
    sourceUrl: "https://archiveofourown.org/works/28777552"
  },
  {
    title: "Professional Advice", author: "Quarra",
    fandom: "The Untamed | MDZS", ships: ["Lan Wangji/Wei Wuxian"],
    characters: ["Wei Wuxian", "Lan Wangji", "Jiang Cheng"],
    wordCount: 42800, chapterCount: 10, chaptersRead: 7,
    completionStatus: "in-progress", contentRating: "T", contentWarnings: [],
    tags: ["Modern AU", "Coffee Shop", "Slow Burn", "Oblivious Wei Wuxian", "Pining Lan Wangji"],
    shelf: "reading", personalRating: 0, coverColor: "#312e81",
    dateStarted: "2024-01-15", dateFinished: "",
    personalNotes: "Wei Wuxian somehow manages to be even more oblivious in a modern setting. I'm in physical pain.",
    emotionalDamage: false, rereadCount: 0,
    sourceUrl: "https://archiveofourown.org/works/43218950"
  },
  {
    title: "i carry your heart (i carry it in my heart)", author: "sprinkle_of_cinnamon",
    fandom: "Stranger Things", ships: ["Steve Harrington/Eddie Munson"],
    characters: ["Steve Harrington", "Eddie Munson", "Robin Buckley"],
    wordCount: 115000, chapterCount: 35, chaptersRead: 12,
    completionStatus: "in-progress", contentRating: "M", contentWarnings: [],
    tags: ["Fix-It", "Eddie Lives", "Recovery", "Slow Burn", "Hurt/Comfort", "Mutual Pining"],
    shelf: "reading", personalRating: 0, coverColor: "#4a1942",
    dateStarted: "2024-02-01", dateFinished: "",
    personalNotes: "Eddie lives and everything is being fixed. I need this fic like I need air.",
    emotionalDamage: false, rereadCount: 0,
    sourceUrl: "https://archiveofourown.org/works/39785210"
  },
  {
    title: "The Roommate Situation", author: "lazywaterbottle",
    fandom: "One Direction RPF", ships: ["Harry Styles/Louis Tomlinson"],
    characters: ["Harry Styles", "Louis Tomlinson", "Liam Payne"],
    wordCount: 62000, chapterCount: 18, chaptersRead: 0,
    completionStatus: "complete", contentRating: "M", contentWarnings: [],
    tags: ["AU - No Band", "Roommates", "Slow Burn", "Domestic", "Falling in Love"],
    shelf: "want-to-read", personalRating: 0, coverColor: "#1a3a2a",
    dateStarted: "", dateFinished: "",
    personalNotes: "On my list. Everyone says this is peak Larry domestic fic.",
    emotionalDamage: false, rereadCount: 0,
    sourceUrl: ""
  },
  {
    title: "Dex is not straight (a love story)", author: "magneticwave",
    fandom: "Check Please!", ships: ["Derek 'Nursey' Nurse/William 'Dex' Poindexter"],
    characters: ["William 'Dex' Poindexter", "Derek 'Nursey' Nurse", "Eric 'Bitty' Bittle"],
    wordCount: 18500, chapterCount: 5, chaptersRead: 0,
    completionStatus: "complete", contentRating: "T", contentWarnings: [],
    tags: ["Humor", "Pining", "Coming Out", "College", "Hockey"],
    shelf: "want-to-read", personalRating: 0, coverColor: "#78350f",
    dateStarted: "", dateFinished: "",
    personalNotes: "The title alone is selling me. Need to read this immediately.",
    emotionalDamage: false, rereadCount: 0,
    sourceUrl: ""
  },
  {
    title: "Vienna Waits For You", author: "Selden",
    fandom: "Harry Potter", ships: ["Hermione Granger/Draco Malfoy"],
    characters: ["Hermione Granger", "Draco Malfoy"],
    wordCount: 38000, chapterCount: 8, chaptersRead: 8,
    completionStatus: "complete", contentRating: "T", contentWarnings: [],
    tags: ["Epistolary", "Time Travel", "Slow Burn", "Letters", "Mystery"],
    shelf: "read", personalRating: 4.5, coverColor: "#1e3a8a",
    dateStarted: "2023-09-01", dateFinished: "2023-09-12",
    personalNotes: "The epistolary format is perfect. Writing letters through time and somehow it's a love story. Gorgeous.",
    emotionalDamage: false, rereadCount: 0,
    sourceUrl: ""
  },
  {
    title: "you were always gold to me", author: "exfatale",
    fandom: "Supernatural", ships: ["Dean Winchester/Castiel"],
    characters: ["Dean Winchester", "Castiel"],
    wordCount: 27000, chapterCount: 1, chaptersRead: 5,
    completionStatus: "abandoned", contentRating: "M", contentWarnings: [],
    tags: ["College AU", "Poetry", "Literary References", "Pining", "Angst"],
    shelf: "dnf", personalRating: 0, coverColor: "#78350f",
    dateStarted: "2023-10-01", dateFinished: "",
    personalNotes: "Started strong but lost the thread around chapter 5. The prose was gorgeous but the plot stalled. Might return someday.",
    emotionalDamage: false, rereadCount: 0,
    sourceUrl: ""
  },
  {
    title: "The Fourth Kind", author: "thecrimsonpetite",
    fandom: "Good Omens", ships: ["Aziraphale/Crowley"],
    characters: ["Aziraphale", "Crowley", "Beelzebub", "Gabriel"],
    wordCount: 213000, chapterCount: 52, chaptersRead: 52,
    completionStatus: "complete", contentRating: "T", contentWarnings: [],
    tags: ["Post-Season 2", "Fix-It", "Slow Burn", "Pining", "Reunion", "Emotional"],
    shelf: "re-reading", personalRating: 5, coverColor: "#14532d",
    dateStarted: "2024-03-01", dateFinished: "",
    personalNotes: "On my second read. This was THE post-S2 fix-it fic that healed me after that ending. Every chapter is perfection.",
    emotionalDamage: true, rereadCount: 1,
    sourceUrl: ""
  },
  {
    title: "Sansûkh", author: "determamfidd",
    fandom: "The Hobbit & Lord of the Rings", ships: ["Thorin Oakenshield/Bilbo Baggins"],
    characters: ["Thorin Oakenshield", "Bilbo Baggins", "Dwalin", "Gimli", "Legolas"],
    wordCount: 718920, chapterCount: 38, chaptersRead: 20,
    completionStatus: "in-progress", contentRating: "T",
    contentWarnings: ["Major Character Death"],
    tags: ["Post-Canon", "Dwarf Culture", "Afterlife", "Long Fic", "World Building", "Slow Build"],
    shelf: "reading", personalRating: 0, coverColor: "#78350f",
    dateStarted: "2024-01-01", dateFinished: "",
    personalNotes: "718k words and it DESERVES EVERY SINGLE ONE. The dwarf lore is extraordinary. I will finish this if it takes me a year.",
    emotionalDamage: false, rereadCount: 0,
    sourceUrl: "https://archiveofourown.org/works/907339"
  },
];

// Insert fics
for (const fic of FICS) {
  const id = uuidv4();
  const colors = ['#0d4f4f', '#3b0764', '#1e3a8a', '#831843', '#78350f', '#14532d', '#312e81', '#1e293b'];
  let hash = 0;
  for (let i = 0; i < fic.fandom.length; i++) hash = (hash * 31 + fic.fandom.charCodeAt(i)) & 0xffffffff;
  const color = fic.coverColor || colors[Math.abs(hash) % colors.length];

  db.prepare(`
    INSERT INTO fics (
      id, user_id, title, author, fandom, ships, characters, word_count, chapter_count,
      chapters_read, completion_status, content_rating, content_warnings, tags, language,
      series_name, source_url, source_platform, shelf, personal_rating, personal_notes,
      date_started, date_finished, reread_count, emotional_damage, cover_color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, fic.title, fic.author, fic.fandom,
    JSON.stringify(fic.ships || []), JSON.stringify(fic.characters || []),
    fic.wordCount, fic.chapterCount, fic.chaptersRead || 0,
    fic.completionStatus, fic.contentRating,
    JSON.stringify(fic.contentWarnings || []), JSON.stringify(fic.tags || []),
    'English', '', fic.sourceUrl || '', fic.sourceUrl ? 'ao3' : 'other',
    fic.shelf, fic.personalRating || 0, fic.personalNotes || '',
    fic.dateStarted || '', fic.dateFinished || '',
    fic.rereadCount || 0, fic.emotionalDamage ? 1 : 0, color
  );

  // Log activity for read fics
  if (fic.shelf === 'read' && fic.dateFinished) {
    const actId = uuidv4();
    try {
      db.prepare('INSERT OR IGNORE INTO reading_activity (id, user_id, date, fics_completed, words_read) VALUES (?, ?, ?, ?, ?)')
        .run(actId, userId, fic.dateFinished, 1, fic.wordCount || 0);
    } catch (e) {}
  }
}

// Create some custom shelves
const shelves = [
  { name: 'Comfort Fics', color: '#0d9488' },
  { name: 'Slow Burn Hall of Fame', color: '#7c3aed' },
  { name: 'Holiday Reads', color: '#dc2626' },
  { name: 'Crying Zone', color: '#2563eb' },
];
for (const s of shelves) {
  db.prepare('INSERT INTO custom_shelves (id, user_id, name, color) VALUES (?, ?, ?, ?)').run(uuidv4(), userId, s.name, s.color);
}

// Create a rec list
const recListId = uuidv4();
db.prepare('INSERT INTO rec_lists (id, user_id, title, description, is_public) VALUES (?, ?, ?, ?, ?)').run(
  recListId, userId,
  'Essential Slow Burns 🔥',
  'Fics that will make you wait 50 chapters for a single hand hold and you will LOVE it.',
  1
);

console.log(`
✅ Seed complete!

Demo account:
  Email:    demo@archivd.app
  Password: archivd

${FICS.length} fics added across all shelves.
`);
