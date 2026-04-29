// Uses node:sqlite — built into Node 22+ (stable in Node 24). No compilation needed.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'archivd.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys via exec (node:sqlite has no .pragma() method)
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    bio TEXT,
    reading_speed INTEGER DEFAULT 250,
    annual_goal INTEGER DEFAULT 50,
    is_public INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fics (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    fandom TEXT DEFAULT '',
    ships TEXT DEFAULT '[]',
    characters TEXT DEFAULT '[]',
    word_count INTEGER DEFAULT 0,
    chapter_count INTEGER DEFAULT 1,
    chapters_read INTEGER DEFAULT 0,
    completion_status TEXT DEFAULT 'in-progress',
    content_rating TEXT DEFAULT 'T',
    content_warnings TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    language TEXT DEFAULT 'English',
    series_name TEXT DEFAULT '',
    source_url TEXT DEFAULT '',
    source_platform TEXT DEFAULT 'other',
    last_updated_date TEXT DEFAULT '',
    shelf TEXT DEFAULT 'want-to-read',
    custom_shelf TEXT DEFAULT '',
    personal_rating REAL DEFAULT 0,
    personal_notes TEXT DEFAULT '',
    date_started TEXT DEFAULT '',
    date_finished TEXT DEFAULT '',
    reread_count INTEGER DEFAULT 0,
    emotional_damage INTEGER DEFAULT 0,
    cover_color TEXT DEFAULT '#0d4f4f',
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS custom_shelves (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#14b8a6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    fic_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    chapter INTEGER DEFAULT 1,
    note TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fic_id) REFERENCES fics(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS rec_lists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    is_public INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS rec_list_items (
    id TEXT PRIMARY KEY,
    rec_list_id TEXT NOT NULL,
    fic_id TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    FOREIGN KEY (rec_list_id) REFERENCES rec_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (fic_id) REFERENCES fics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reading_activity (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    fics_completed INTEGER DEFAULT 0,
    words_read INTEGER DEFAULT 0,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- V2: notifications for WIP updates and social events
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fic_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- V2: user following for social rec lists
  CREATE TABLE IF NOT EXISTS user_follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL,
    followed_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, followed_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- V2: saved/followed rec lists
  CREATE TABLE IF NOT EXISTS saved_rec_lists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    rec_list_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, rec_list_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rec_list_id) REFERENCES rec_lists(id) ON DELETE CASCADE
  );

  -- Beta: invite codes for gated registration
  CREATE TABLE IF NOT EXISTS invite_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    max_uses INTEGER DEFAULT 1,
    use_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Beta: track which email used which invite code
  CREATE TABLE IF NOT EXISTS invite_code_uses (
    id TEXT PRIMARY KEY,
    invite_code_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Beta: user feedback submissions
  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    page_url TEXT DEFAULT '',
    screenshot_data TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Beta: changelog entries (admin-created)
  CREATE TABLE IF NOT EXISTS changelog_entries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Beta: global app settings (key-value store)
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// V2: add columns to existing tables if they don't exist yet (idempotent migrations)
try { db.exec('ALTER TABLE fics ADD COLUMN last_checked_at TEXT DEFAULT NULL'); } catch {}
try { db.exec('ALTER TABLE fics ADD COLUMN has_update INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE fics ADD COLUMN ao3_chapter_count_cached INTEGER DEFAULT NULL'); } catch {}
try { db.exec('ALTER TABLE rec_lists ADD COLUMN fandom_tag TEXT DEFAULT NULL'); } catch {}
try { db.exec('ALTER TABLE rec_lists ADD COLUMN vibe_tag TEXT DEFAULT NULL'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN onboarding_done INTEGER DEFAULT 0'); } catch {}

// Beta: add columns for beta features
try { db.exec('ALTER TABLE users ADD COLUMN banner_dismissed INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN last_changelog_viewed_at DATETIME DEFAULT NULL'); } catch {}

// V3: fic description/summary + AO3 history stats for sorting
try { db.exec("ALTER TABLE fics ADD COLUMN description TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE fics ADD COLUMN last_visited TEXT DEFAULT ''"); } catch {}
try { db.exec('ALTER TABLE fics ADD COLUMN total_visits INTEGER DEFAULT 0'); } catch {}

module.exports = db;
