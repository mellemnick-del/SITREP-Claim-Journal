import * as SQLite from 'expo-sqlite';
import { addDays, dayKey, lastDays, today } from './dates';

export type ConditionStatus = 'Planned' | 'Filed' | 'Service connected' | 'Denied';
export type EvidenceStatus = 'Need' | 'Requested' | 'Have';

export type Condition = { id: number; name: string; dc: string; status: ConditionStatus; sort: number };
export type CheckIn = {
  day: string; // YYYY-MM-DD
  sleep: number | null;
  limited: boolean;
  note: string;
  savedAt: number;
  severity: Record<number, number>; // condition id -> 0..10
};
export type Flare = { id: number; conditionId: number; start: number; hours: number; liedDown: boolean; note: string };
export type Evidence = {
  id: number;
  title: string;
  type: string;
  conditionId: number | null; // null = applies to every condition
  status: EvidenceStatus;
  fileUri: string | null;
  fileName: string | null;
};
export type Deadline = { id: number; title: string; detail: string; date: string };
export type AssessmentKind = 'PHQ9' | 'GAD7' | 'PCL5';
export type Assessment = { id: number; kind: AssessmentKind; takenAt: number; answers: number[]; total: number };

export const EVIDENCE_STATUSES: EvidenceStatus[] = ['Need', 'Requested', 'Have'];
export const CONDITION_STATUSES: ConditionStatus[] = ['Planned', 'Filed', 'Service connected', 'Denied'];
export const EVIDENCE_TYPES = ['Private medical', 'Military records', 'VA records', 'Lay statement', 'Photo', 'Other'];

const db = SQLite.openDatabaseSync('sitrep.db');

export function migrate() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, dc TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Planned', sort INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS checkins (
      day TEXT PRIMARY KEY, sleep REAL, limited INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '', saved_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS severities (
      day TEXT NOT NULL REFERENCES checkins(day) ON DELETE CASCADE,
      condition_id INTEGER NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
      value INTEGER NOT NULL, PRIMARY KEY (day, condition_id));
    CREATE TABLE IF NOT EXISTS flares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condition_id INTEGER NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
      start INTEGER NOT NULL, hours REAL NOT NULL, lied_down INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, type TEXT NOT NULL,
      condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'Need', file_uri TEXT, file_name TEXT);
    CREATE TABLE IF NOT EXISTS deadlines (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', date TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, taken_at INTEGER NOT NULL,
      answers TEXT NOT NULL, total INTEGER NOT NULL);
  `);
}

// ---- meta ----
export function getMeta(key: string): string | null {
  return db.getFirstSync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key)?.value ?? null;
}
export function deleteMeta(key: string) {
  db.runSync('DELETE FROM meta WHERE key = ?', key);
}
export function setMeta(key: string, value: string) {
  db.runSync('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

// ---- reads ----
export function loadAll() {
  const conditions = db.getAllSync<Condition>('SELECT id, name, dc, status, sort FROM conditions ORDER BY sort, id');
  const rows = db.getAllSync<{ day: string; sleep: number | null; limited: number; note: string; saved_at: number }>(
    'SELECT * FROM checkins ORDER BY day',
  );
  const sev = db.getAllSync<{ day: string; condition_id: number; value: number }>('SELECT * FROM severities');
  const checkins: Record<string, CheckIn> = {};
  for (const r of rows) {
    checkins[r.day] = { day: r.day, sleep: r.sleep, limited: !!r.limited, note: r.note, savedAt: r.saved_at, severity: {} };
  }
  for (const s of sev) {
    if (checkins[s.day]) checkins[s.day].severity[s.condition_id] = s.value;
  }
  const flares = db
    .getAllSync<{ id: number; condition_id: number; start: number; hours: number; lied_down: number; note: string }>(
      'SELECT * FROM flares ORDER BY start DESC',
    )
    .map(f => ({ id: f.id, conditionId: f.condition_id, start: f.start, hours: f.hours, liedDown: !!f.lied_down, note: f.note }));
  const evidence = db
    .getAllSync<{ id: number; title: string; type: string; condition_id: number | null; status: EvidenceStatus; file_uri: string | null; file_name: string | null }>(
      'SELECT * FROM evidence ORDER BY id',
    )
    .map(e => ({ id: e.id, title: e.title, type: e.type, conditionId: e.condition_id, status: e.status, fileUri: e.file_uri, fileName: e.file_name }));
  const deadlines = db.getAllSync<Deadline>('SELECT * FROM deadlines ORDER BY date');
  const assessments = db
    .getAllSync<{ id: number; kind: AssessmentKind; taken_at: number; answers: string; total: number }>(
      'SELECT * FROM assessments ORDER BY taken_at DESC',
    )
    .map(a => ({ id: a.id, kind: a.kind, takenAt: a.taken_at, answers: JSON.parse(a.answers) as number[], total: a.total }));
  return { conditions, checkins, flares, evidence, deadlines, assessments };
}

// ---- writes ----
export function addCondition(name: string, dc: string, status: ConditionStatus): number {
  const max = db.getFirstSync<{ m: number | null }>('SELECT MAX(sort) AS m FROM conditions')?.m ?? 0;
  return db.runSync('INSERT INTO conditions (name, dc, status, sort) VALUES (?, ?, ?, ?)', name, dc, status, max + 1).lastInsertRowId;
}
export function updateCondition(id: number, name: string, dc: string, status: ConditionStatus) {
  db.runSync('UPDATE conditions SET name = ?, dc = ?, status = ? WHERE id = ?', name, dc, status, id);
}
export function deleteCondition(id: number) {
  db.runSync('DELETE FROM conditions WHERE id = ?', id);
}

export function saveCheckIn(c: Omit<CheckIn, 'savedAt'>) {
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO checkins (day, sleep, limited, note, saved_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(day) DO UPDATE SET sleep = excluded.sleep, limited = excluded.limited, note = excluded.note, saved_at = excluded.saved_at`,
      c.day, c.sleep, c.limited ? 1 : 0, c.note, Date.now(),
    );
    db.runSync('DELETE FROM severities WHERE day = ?', c.day);
    for (const [cid, v] of Object.entries(c.severity)) {
      db.runSync('INSERT INTO severities (day, condition_id, value) VALUES (?, ?, ?)', c.day, Number(cid), v);
    }
  });
}

export function addFlare(f: Omit<Flare, 'id'>) {
  db.runSync(
    'INSERT INTO flares (condition_id, start, hours, lied_down, note) VALUES (?, ?, ?, ?, ?)',
    f.conditionId, f.start, f.hours, f.liedDown ? 1 : 0, f.note,
  );
}
export function deleteFlare(id: number) {
  db.runSync('DELETE FROM flares WHERE id = ?', id);
}

export function addEvidence(e: Omit<Evidence, 'id'>) {
  db.runSync(
    'INSERT INTO evidence (title, type, condition_id, status, file_uri, file_name) VALUES (?, ?, ?, ?, ?, ?)',
    e.title, e.type, e.conditionId, e.status, e.fileUri, e.fileName,
  );
}
export function setEvidenceStatus(id: number, status: EvidenceStatus) {
  db.runSync('UPDATE evidence SET status = ? WHERE id = ?', status, id);
}
export function deleteEvidence(id: number) {
  db.runSync('DELETE FROM evidence WHERE id = ?', id);
}

export function addDeadline(d: Omit<Deadline, 'id'>) {
  db.runSync('INSERT INTO deadlines (title, detail, date) VALUES (?, ?, ?)', d.title, d.detail, d.date);
}
export function deleteDeadline(id: number) {
  db.runSync('DELETE FROM deadlines WHERE id = ?', id);
}

export function addAssessment(kind: AssessmentKind, answers: number[], takenAt = Date.now()) {
  const total = answers.reduce((a, b) => a + b, 0);
  db.runSync('INSERT INTO assessments (kind, taken_at, answers, total) VALUES (?, ?, ?, ?)', kind, takenAt, JSON.stringify(answers), total);
}
export function deleteAssessment(id: number) {
  db.runSync('DELETE FROM assessments WHERE id = ?', id);
}

// ---- backup and restore ----
const BACKUP_TABLES = ['meta', 'conditions', 'checkins', 'severities', 'flares', 'evidence', 'deadlines', 'assessments'] as const;
export const BACKUP_FORMAT = 'sitrep-backup';

/** Every table as plain rows. Evidence files themselves aren't included, only their records. */
export function exportBackup() {
  const tables: Record<string, unknown[]> = {};
  for (const t of BACKUP_TABLES) tables[t] = db.getAllSync(`SELECT * FROM ${t}`);
  return { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), tables };
}

/** Replace everything on this phone with a backup. Throws if the file isn't a SITREP backup. */
export function importBackup(data: unknown) {
  const b = data as { format?: string; version?: number; tables?: Record<string, Record<string, unknown>[]> };
  if (!b || b.format !== BACKUP_FORMAT || b.version !== 1 || typeof b.tables !== 'object') {
    throw new Error('This file is not a SITREP backup.');
  }
  db.withTransactionSync(() => {
    eraseEverything();
    // Parents before children so foreign keys resolve.
    for (const t of BACKUP_TABLES) {
      for (const row of b.tables![t] ?? []) {
        const cols = Object.keys(row).filter(c => /^[a-z_]+$/.test(c));
        if (!cols.length) continue;
        const vals = cols.map(c => {
          const v = row[c];
          return v === null || typeof v === 'number' || typeof v === 'string' ? v : String(v);
        });
        // Evidence files don't travel with a backup, so drop links to files on the old phone.
        if (t === 'evidence') {
          const fi = cols.indexOf('file_uri');
          if (fi >= 0) vals[fi] = null;
        }
        db.runSync(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals as SQLite.SQLiteBindValue[]);
      }
    }
  });
}

export function eraseEverything() {
  db.execSync(`
    DELETE FROM assessments; DELETE FROM severities; DELETE FROM checkins; DELETE FROM flares;
    DELETE FROM evidence; DELETE FROM deadlines; DELETE FROM conditions; DELETE FROM meta;
  `);
}

// ---- example data (for trying the app before entering real info) ----
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function loadExampleData() {
  const rnd = mulberry32(11);
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const notes: Record<number, string> = {
    27: 'Migraine hit at work around 1400. Left early and lay down in a dark room.',
    22: 'Bad sleep. Ringing louder than usual at night.',
    19: "Back locked up loading the truck. Couldn't finish yard work.",
    16: "Migraine with light sensitivity. Missed my kid's practice.",
    12: 'Knee gave out on the stairs at the stadium.',
    9: 'Migraine in the morning. Took meds, lay down 3 hours.',
    6: 'Back flare. Took the day off, mostly on the floor with ice.',
    4: 'Migraine. Pushed through work but had to sit in the car at lunch.',
    2: 'Tinnitus loud after a meeting in a noisy room.',
  };
  const migDays = new Set([27, 16, 9, 4]);
  const backDays = new Set([19, 6]);

  db.withTransactionSync(() => {
    const tin = addCondition('Tinnitus', '6260', 'Filed');
    const back = addCondition('Lower back strain', '5237', 'Filed');
    const mig = addCondition('Migraines', '8100', 'Filed');
    const knee = addCondition('Right knee', '5260', 'Planned');

    const days = lastDays(30).slice(0, -1); // leave today open for a real check-in
    days.forEach((d, idx) => {
      const ago = days.length - idx;
      if (rnd() < 0.12 && !migDays.has(ago) && !backDays.has(ago) && !notes[ago]) return;
      const isMig = migDays.has(ago);
      const isBack = backDays.has(ago);
      const saved = new Date(d);
      saved.setHours(ri(20, 22), ri(0, 59));
      db.runSync(
        'INSERT INTO checkins (day, sleep, limited, note, saved_at) VALUES (?, ?, ?, ?, ?)',
        dayKey(d), ago === 22 ? 4 : ri(5, 7), isMig || isBack || ago === 12 ? 1 : 0, notes[ago] ?? '', saved.getTime(),
      );
      const sev: [number, number][] = [
        [tin, ri(3, 5) + (ago === 22 || ago === 2 ? 2 : 0)],
        [back, isBack ? ri(7, 8) : ri(2, 5)],
        [mig, isMig ? ri(7, 9) : ri(0, 2)],
        [knee, ago === 12 ? 7 : ri(2, 4)],
      ];
      for (const [cid, v] of sev) db.runSync('INSERT INTO severities (day, condition_id, value) VALUES (?, ?, ?)', dayKey(d), cid, v);
      if (isMig || isBack) {
        const s = new Date(d);
        s.setHours(ri(8, 14), ri(0, 59));
        addFlare({
          conditionId: isMig ? mig : back,
          start: s.getTime(),
          hours: isMig ? ri(3, 9) : ri(18, 36),
          liedDown: isMig ? ago !== 4 : false,
          note: notes[ago] ?? '',
        });
      }
    });

    const t = today();
    addDeadline({ title: 'VSO appointment', detail: 'Review evidence list and personal statement', date: dayKey(addDays(t, 6)) });
    addDeadline({ title: 'C&P exam: migraines and back', detail: 'Bring your symptom summary', date: dayKey(addDays(t, 21)) });
    addDeadline({ title: 'Intent to File expires', detail: 'Submit the full claim before this date to keep your effective date', date: dayKey(addDays(t, 137)) });

    const ev: [string, string, number | null, EvidenceStatus][] = [
      ['Service treatment records', 'Military records', null, 'Requested'],
      ['Separation exam audiogram', 'Military records', tin, 'Have'],
      ['Lumbar MRI report', 'Private medical', back, 'Have'],
      ['Buddy statement from squad member (VA Form 21-10210)', 'Lay statement', back, 'Need'],
      ['Neurologist visit notes', 'Private medical', mig, 'Requested'],
      ['Personal statement (VA Form 21-4138)', 'Lay statement', null, 'Need'],
      ['Knee brace prescription', 'Private medical', knee, 'Have'],
    ];
    for (const [title, type, cid, status] of ev) addEvidence({ title, type, conditionId: cid, status, fileUri: null, fileName: null });

    // Example check-up history, every two weeks, trending slightly better.
    const DAYMS = 86_400_000;
    const now = Date.now();
    [56, 42, 28, 14].forEach((ago, i) => {
      const at = now - ago * DAYMS;
      addAssessment('PHQ9', [2, 2, 3, 2, 1, 1, 2, 1, 0].map(v => Math.max(0, v - (i > 2 ? 1 : 0))), at);
      addAssessment('GAD7', [2, 2, 2, 1, 2, 2, 1].map(v => Math.max(0, v - (i > 1 ? 1 : 0))), at);
      addAssessment('PCL5', [3, 3, 2, 3, 3, 3, 2, 1, 2, 2, 3, 2, 3, 2, 3, 1, 3, 3, 2, 3].map(v => Math.max(0, v - (i > 2 ? 1 : 0))), at);
    });
    setMeta('example', '1');
  });
}
