import Database from 'better-sqlite3';

type DatabaseHandle = InstanceType<typeof Database>;

export type Migration = {
  id: number;
  statements: string[];
};

const MIGRATIONS: Migration[] = [
  {
    id: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        open_id TEXT UNIQUE,
        status TEXT NOT NULL,
        role TEXT,
        roles TEXT,
        name TEXT,
        avatar TEXT,
        starred_patients TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_users_status_created_at ON users(status, created_at DESC)`
    ]
  },
  {
    id: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        id_card TEXT UNIQUE,
        id_card_tail TEXT,
        phone TEXT,
        birth_date TEXT,
        gender TEXT,
        native_place TEXT,
        ethnicity TEXT,
        hospital TEXT,
        hospital_diagnosis TEXT,
        doctor_name TEXT,
        symptoms TEXT,
        medical_course TEXT,
        followup_plan TEXT,
        family_economy TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_patients_name_tail ON patients(name, id_card_tail)` ,
      `CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC)`
    ]
  },
  {
    id: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS tenancies (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        id_card TEXT,
        check_in_date TEXT NOT NULL,
        check_out_date TEXT,
        room TEXT,
        bed TEXT,
        subsidy REAL,
        extra TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenancies_patient_checkin ON tenancies(patient_id, check_in_date DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_tenancies_idcard_checkin ON tenancies(id_card, check_in_date DESC)`
    ]
  },
  {
    id: 4,
    statements: [
      `CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        images TEXT,
        status TEXT NOT NULL,
        created_by TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        review_reason TEXT,
        reviewed_at INTEGER
      )`,
      `CREATE INDEX IF NOT EXISTS idx_services_created_by_date ON services(created_by, date DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_services_patient_date ON services(patient_id, date DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_services_status ON services(status)`
    ]
  },
  {
    id: 5,
    statements: [
      `CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        location TEXT,
        capacity INTEGER,
        status TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_activities_status_date ON activities(status, date)` ,
      `CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date DESC)`
    ]
  },
  {
    id: 6,
    statements: [
      `CREATE TABLE IF NOT EXISTS registrations (
        id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL,
        user_id TEXT,
        status TEXT NOT NULL,
        guest_contact TEXT,
        registered_at INTEGER,
        cancelled_at INTEGER,
        checked_in_at INTEGER,
        created_at INTEGER NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uniq_registrations_activity_user ON registrations(activity_id, COALESCE(user_id, 'guest'))`,
      `CREATE INDEX IF NOT EXISTS idx_registrations_activity_status ON registrations(activity_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_registrations_user_created_at ON registrations(user_id, created_at DESC)`
    ]
  },
  {
    id: 7,
    statements: [
      `CREATE TABLE IF NOT EXISTS permission_requests (
        id TEXT PRIMARY KEY,
        requester_id TEXT NOT NULL,
        patient_id TEXT,
        fields TEXT,
        reason TEXT,
        status TEXT NOT NULL,
        expires_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_permission_requests_requester_status ON permission_requests(requester_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_permission_requests_patient_status ON permission_requests(patient_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_permission_requests_expires_at ON permission_requests(expires_at)`
    ]
  },
  {
    id: 8,
    statements: [
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT,
        action TEXT NOT NULL,
        target TEXT,
        request_id TEXT,
        details TEXT,
        created_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at ON audit_logs(action, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at ON audit_logs(actor_id, created_at DESC)`
    ]
  },
  {
    id: 9,
    statements: [
      `CREATE TABLE IF NOT EXISTS export_tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        params TEXT,
        status TEXT NOT NULL,
        download_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_export_tasks_status ON export_tasks(status)`,
      `CREATE INDEX IF NOT EXISTS idx_export_tasks_type_created_at ON export_tasks(type, created_at DESC)`
    ]
  },
  {
    id: 10,
    statements: [
      'ALTER TABLE export_tasks ADD COLUMN template_id TEXT',
      'ALTER TABLE export_tasks ADD COLUMN client_token TEXT',
      'ALTER TABLE export_tasks ADD COLUMN request_id TEXT',
      'ALTER TABLE export_tasks ADD COLUMN expires_at INTEGER',
      'ALTER TABLE export_tasks ADD COLUMN error TEXT',
      'ALTER TABLE export_tasks ADD COLUMN created_by TEXT'
    ]
  }
];

export const runMigrations = (db: DatabaseHandle): void => {
  db.exec('BEGIN');
  try {
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    const appliedStmt = db.prepare('SELECT id FROM schema_migrations');
    const applied = new Set<number>(appliedStmt.all().map((row: { id: number }) => row.id));

    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) {
        continue;
      }

      for (const stmt of migration.statements) {
        db.exec(stmt);
      }

      const insert = db.prepare('INSERT INTO schema_migrations(id, applied_at) VALUES (?, ?)');
      insert.run(migration.id, new Date().toISOString());
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

