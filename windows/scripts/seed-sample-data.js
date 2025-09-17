const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const DAY = 24 * 60 * 60 * 1000;
const APP_NAME = 'xiaojia-desktop';

const now = new Date();

const toDate = (offset) => new Date(now.getTime() + offset * DAY);
const ts = (date) => date.getTime();
const fmt = (date) => date.toISOString().slice(0, 10);

const resolveUserDataPath = () => {
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(process.env.USERPROFILE || process.env.HOME || '.', 'AppData', 'Roaming');
    return path.join(base, APP_NAME);
  }
  if (process.platform === 'darwin') {
    return path.join(process.env.HOME || '.', 'Library', 'Application Support', APP_NAME);
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || '.', '.config'), APP_NAME);
};

const patients = [
  { id: 'seed-patient-001', name: '\u5f20\u5c0f\u82b3', idCard: '440101198901011234', phone: '13800000001', createdAt: toDate(-45) },
  { id: 'seed-patient-002', name: '\u674e\u5fd7\u5f3a', idCard: '440101199212127654', phone: '13900000002', createdAt: toDate(-12) },
  { id: 'seed-patient-003', name: '\u738b\u6653\u71d5', idCard: '440101198406303333', phone: '13700000003', createdAt: toDate(-4) },
];

const services = [
  { id: 'seed-service-001', patientId: 'seed-patient-001', type: 'visit', date: fmt(toDate(-20)), status: 'approved', createdBy: 'worker.liu', createdAt: toDate(-20) },
  { id: 'seed-service-002', patientId: 'seed-patient-002', type: 'psych', date: fmt(toDate(-8)), status: 'approved', createdBy: 'worker.liu', createdAt: toDate(-8) },
  { id: 'seed-service-003', patientId: 'seed-patient-003', type: 'goods', date: fmt(toDate(-5)), status: 'review', createdBy: 'worker.chen', createdAt: toDate(-5) },
  { id: 'seed-service-004', patientId: 'seed-patient-002', type: 'followup', date: fmt(toDate(-2)), status: 'approved', createdBy: 'worker.chen', createdAt: toDate(-2) },
  { id: 'seed-service-005', patientId: 'seed-patient-001', type: 'referral', date: fmt(toDate(-1)), status: 'rejected', createdBy: 'worker.liu', createdAt: toDate(-1), reviewReason: '\u8d44\u6599\u4e0d\u5b8c\u6574' },
  { id: 'seed-service-006', patientId: 'seed-patient-003', type: 'visit', date: fmt(toDate(-34)), status: 'approved', createdBy: 'worker.chen', createdAt: toDate(-34) },
];

const activities = [
  { id: 'seed-activity-001', title: '\u4eb2\u5b50\u6c9f\u901a\u5de5\u4f5c\u574a', date: fmt(toDate(5)), status: 'published', createdAt: toDate(-7) },
  { id: 'seed-activity-002', title: '\u75c5\u623f\u97f3\u4e50\u5206\u4eab\u4f1a', date: fmt(toDate(-15)), status: 'completed', createdAt: toDate(-40) },
];

const tenancies = [
  { id: 'seed-tenancy-001', patientId: 'seed-patient-001', idCard: '440101198901011234', checkIn: fmt(toDate(-18)), checkOut: null, room: 'A101', bed: '1', createdAt: toDate(-18) },
  { id: 'seed-tenancy-002', patientId: 'seed-patient-002', idCard: '440101199212127654', checkIn: fmt(toDate(-60)), checkOut: fmt(toDate(-10)), room: 'B205', bed: '2', createdAt: toDate(-60) },
];

const permissionRequests = [
  {
    id: 'seed-permission-001',
    requesterId: 'user.worker.001',
    patientId: 'seed-patient-003',
    fields: ['id_card', 'phone'],
    reason: '用于家访前核实联系方式，预计用于 30 天访谈期。',
    status: 'pending',
    createdAt: toDate(-1),
    expiresAt: toDate(6),
  },
  {
    id: 'seed-permission-002',
    requesterId: 'user.worker.002',
    patientId: 'seed-patient-001',
    fields: ['diagnosis'],
    reason: '审核住院补助申请，需查看病历摘要。',
    status: 'approved',
    createdAt: toDate(-20),
    expiresAt: toDate(10),
    decisionBy: 'admin.seed',
    decisionReason: null,
    approvedAt: toDate(-10),
  },
  {
    id: 'seed-permission-003',
    requesterId: 'user.worker.003',
    patientId: 'seed-patient-002',
    fields: ['phone'],
    reason: '希望获取联系方式用于志愿者采访。',
    status: 'rejected',
    createdAt: toDate(-12),
    expiresAt: null,
    decisionBy: 'admin.seed',
    decisionReason: '用途不明确，建议线下对接。',
    rejectedAt: toDate(-5),
  },
];

const ensureTables = (db) => {
  const statements = [
    'CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)',
    'CREATE TABLE IF NOT EXISTS patients (\
      id TEXT PRIMARY KEY,\
      name TEXT NOT NULL,\
      id_card TEXT UNIQUE,\
      id_card_tail TEXT,\
      phone TEXT,\
      birth_date TEXT,\
      gender TEXT,\
      native_place TEXT,\
      ethnicity TEXT,\
      hospital TEXT,\
      hospital_diagnosis TEXT,\
      doctor_name TEXT,\
      symptoms TEXT,\
      medical_course TEXT,\
      followup_plan TEXT,\
      family_economy TEXT,\
      created_at INTEGER NOT NULL,\
      updated_at INTEGER NOT NULL\
    )',
    'CREATE INDEX IF NOT EXISTS idx_patients_name_tail ON patients(name, id_card_tail)',
    'CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC)',
    'CREATE TABLE IF NOT EXISTS services (\
      id TEXT PRIMARY KEY,\
      patient_id TEXT NOT NULL,\
      type TEXT NOT NULL,\
      date TEXT NOT NULL,\
      description TEXT,\
      images TEXT,\
      status TEXT NOT NULL,      expires_at INTEGER,      decision_by TEXT,      decision_reason TEXT,      approved_at INTEGER,      rejected_at INTEGER,\
      created_by TEXT,\
      created_at INTEGER NOT NULL,\
      updated_at INTEGER,\
      review_reason TEXT,\
      reviewed_at INTEGER\
    )',
    'CREATE INDEX IF NOT EXISTS idx_services_created_by_date ON services(created_by, date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_services_patient_date ON services(patient_id, date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_services_status ON services(status)',
    'CREATE TABLE IF NOT EXISTS activities (\
      id TEXT PRIMARY KEY,\
      title TEXT NOT NULL,\
      date TEXT NOT NULL,\
      location TEXT,\
      capacity INTEGER,\
      status TEXT NOT NULL,\
      description TEXT,\
      created_at INTEGER NOT NULL,\
      updated_at INTEGER NOT NULL\
    )',
    'CREATE INDEX IF NOT EXISTS idx_activities_status_date ON activities(status, date)',
    'CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date DESC)',
    'CREATE TABLE IF NOT EXISTS tenancies (\
      id TEXT PRIMARY KEY,\
      patient_id TEXT,\
      id_card TEXT,\
      check_in_date TEXT NOT NULL,\
      check_out_date TEXT,\
      room TEXT,\
      bed TEXT,\
      subsidy REAL,\
      extra TEXT,\
      created_at INTEGER NOT NULL,\
      updated_at INTEGER NOT NULL\
    )',
    'CREATE INDEX IF NOT EXISTS idx_tenancies_patient_checkin ON tenancies(patient_id, check_in_date DESC)',
    'CREATE TABLE IF NOT EXISTS permission_requests (\
      id TEXT PRIMARY KEY,\
      requester_id TEXT NOT NULL,\
      patient_id TEXT,\
      fields TEXT,\
      reason TEXT,\
      status TEXT NOT NULL,\
      expires_at INTEGER,\
      created_at INTEGER NOT NULL,\
      updated_at INTEGER NOT NULL\
    )',
    'CREATE INDEX IF NOT EXISTS idx_permission_requests_requester_status ON permission_requests(requester_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_permission_requests_patient_status ON permission_requests(patient_id, status)'
  ];

  statements.forEach((sql) => db.exec(sql));

  const alterStatements = [
    'ALTER TABLE permission_requests ADD COLUMN decision_by TEXT',
    'ALTER TABLE permission_requests ADD COLUMN decision_reason TEXT',
    'ALTER TABLE permission_requests ADD COLUMN approved_at INTEGER',
    'ALTER TABLE permission_requests ADD COLUMN rejected_at INTEGER',
    'ALTER TABLE permission_requests ADD COLUMN expires_at INTEGER',
  ];
  alterStatements.forEach((sql) => {
    try {
      db.exec(sql);
    } catch (error) {
      if (!String(error.message || '').includes('duplicate column')) {
        throw error;
      }
    }
  });
};

const openDatabase = () => {
  const userDataDir = resolveUserDataPath();
  fs.mkdirSync(userDataDir, { recursive: true });
  const dbPath = path.join(userDataDir, 'xiaojia-desktop.sqlite');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  ensureTables(db);
  return { db, dbPath };
};

const seed = () => {
  const { db, dbPath } = openDatabase();
  const run = db.transaction(() => {
    db.prepare('DELETE FROM services WHERE id LIKE \'seed-service-%\'').run();
    db.prepare('DELETE FROM activities WHERE id LIKE \'seed-activity-%\'').run();
    db.prepare('DELETE FROM patients WHERE id LIKE \'seed-patient-%\'').run();
    db.prepare('DELETE FROM tenancies WHERE id LIKE \'seed-tenancy-%\'').run();
    db.prepare('DELETE FROM permission_requests WHERE id LIKE \'seed-permission-%\'').run();

    const patientSql =
      'INSERT INTO patients (' +
      'id, name, id_card, id_card_tail, phone, birth_date, gender, native_place, ethnicity, ' +
      'hospital, hospital_diagnosis, doctor_name, symptoms, medical_course, followup_plan, ' +
      'family_economy, created_at, updated_at' +
      ') VALUES (' +
      '@id, @name, @id_card, @id_card_tail, @phone, @birth_date, @gender, @native_place, @ethnicity, ' +
      '@hospital, @hospital_diagnosis, @doctor_name, @symptoms, @medical_course, @followup_plan, ' +
      '@family_economy, @created_at, @updated_at' +
      ') ON CONFLICT(id) DO UPDATE SET ' +
      'name=excluded.name, phone=excluded.phone, updated_at=excluded.updated_at';
    const patientStmt = db.prepare(patientSql);

    patients.forEach((p) => {
      patientStmt.run({
        id: p.id,
        name: p.name,
        id_card: p.idCard,
        id_card_tail: p.idCard.slice(-4),
        phone: p.phone,
        birth_date: '1989-01-01',
        gender: 'female',
        native_place: '\u5e7f\u4e1c\u5e7f\u5dde',
        ethnicity: '\u6c49\u65cf',
        hospital: '\u4e2d\u5c71\u5927\u5b66\u9644\u5c5e\u7b2c\u4e00\u533b\u9662',
        hospital_diagnosis: '\u767d\u8840\u75c5',
        doctor_name: '\u5218\u533b\u751f',
        symptoms: null,
        medical_course: null,
        followup_plan: null,
        family_economy: '\u4f4e\u4fdd',
        created_at: ts(p.createdAt),
        updated_at: ts(now),
      });
    });

    const serviceSql =
      'INSERT INTO services (' +
      'id, patient_id, type, date, description, images, status, created_by, created_at, ' +
      'updated_at, review_reason, reviewed_at' +
      ') VALUES (' +
      '@id, @patient_id, @type, @date, @description, @images, @status, @created_by, ' +
      '@created_at, @updated_at, @review_reason, @reviewed_at' +
      ') ON CONFLICT(id) DO UPDATE SET ' +
      'type=excluded.type, date=excluded.date, status=excluded.status, ' +
      'updated_at=excluded.updated_at, review_reason=excluded.review_reason, reviewed_at=excluded.reviewed_at';
    const serviceStmt = db.prepare(serviceSql);

    services.forEach((s) => {
      serviceStmt.run({
        id: s.id,
        patient_id: s.patientId,
        type: s.type,
        date: s.date,
        description: null,
        images: null,
        status: s.status,
        created_by: s.createdBy,
        created_at: ts(s.createdAt),
        updated_at: ts(now),
        review_reason: s.reviewReason ?? null,
        reviewed_at: s.status === 'review' ? null : ts(now),
      });
    });

    const activitySql =
      'INSERT INTO activities (' +
      'id, title, date, location, capacity, status, description, created_at, updated_at' +
      ') VALUES (' +
      '@id, @title, @date, @location, @capacity, @status, @description, @created_at, @updated_at' +
      ') ON CONFLICT(id) DO UPDATE SET ' +
      'title=excluded.title, date=excluded.date, status=excluded.status, updated_at=excluded.updated_at';
    const activityStmt = db.prepare(activitySql);

    activities.forEach((a) => {
      activityStmt.run({
        id: a.id,
        title: a.title,
        date: a.date,
        location: '\u4ea4\u6d41\u4e2d\u5fc3',
        capacity: 25,
        status: a.status,
        description: null,
        created_at: ts(a.createdAt),
        updated_at: ts(now),
      });
    });

    const tenancySql =
      'INSERT INTO tenancies (' +
      'id, patient_id, id_card, check_in_date, check_out_date, room, bed, subsidy, extra, ' +
      'created_at, updated_at' +
      ') VALUES (' +
      '@id, @patient_id, @id_card, @check_in_date, @check_out_date, @room, @bed, @subsidy, @extra, ' +
      '@created_at, @updated_at' +
      ') ON CONFLICT(id) DO UPDATE SET ' +
      'check_in_date=excluded.check_in_date, check_out_date=excluded.check_out_date, ' +
      'room=excluded.room, bed=excluded.bed, updated_at=excluded.updated_at';
    const tenancyStmt = db.prepare(tenancySql);

    tenancies.forEach((t) => {
      tenancyStmt.run({
        id: t.id,
        patient_id: t.patientId,
        id_card: t.idCard,
        check_in_date: t.checkIn,
        check_out_date: t.checkOut,
        room: t.room,
        bed: t.bed,
        subsidy: t.checkOut ? 0 : 80,
        extra: null,
        created_at: ts(t.createdAt),
        updated_at: ts(now),
      });
    });

    const permissionSql =
      'INSERT INTO permission_requests (' +
      'id, requester_id, patient_id, fields, reason, status, expires_at, decision_by, decision_reason, approved_at, rejected_at, created_at, updated_at' +
      ') VALUES (' +
      '@id, @requester_id, @patient_id, @fields, @reason, @status, @expires_at, @decision_by, @decision_reason, @approved_at, @rejected_at, @created_at, @updated_at' +
      ') ON CONFLICT(id) DO UPDATE SET ' +
      'status=excluded.status, expires_at=excluded.expires_at, decision_by=excluded.decision_by, decision_reason=excluded.decision_reason, ' +
      'approved_at=excluded.approved_at, rejected_at=excluded.rejected_at, updated_at=excluded.updated_at';
    const permissionStmt = db.prepare(permissionSql);


    permissionRequests.forEach((req) => {
      permissionStmt.run({
        id: req.id,
        requester_id: req.requesterId,
        patient_id: req.patientId,
        fields: JSON.stringify(req.fields ?? []),
        reason: req.reason,
        status: req.status,
        expires_at: req.expiresAt ? ts(req.expiresAt) : null,
        decision_by: req.decisionBy ?? null,
        decision_reason: req.decisionReason ?? null,
        approved_at: req.approvedAt ? ts(req.approvedAt) : null,
        rejected_at: req.rejectedAt ? ts(req.rejectedAt) : null,
        created_at: ts(req.createdAt),
        updated_at: ts(now),
      });
    });
  });

  run();
  console.log('[seed] userData:', dbPath);
  console.log('[seed] \u5df2\u5199\u5165\u793a\u4f8b\u6570\u636e\u3002');
};

try {
  seed();
} catch (error) {
  console.error('[seed] \u5931\u8d25:', error);
  process.exitCode = 1;
}
