CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT UNIQUE NOT NULL,
  phone          TEXT,
  role           TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  password_hash  TEXT NOT NULL,
  is_primary     BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS works (
  id                  BIGSERIAL PRIMARY KEY,
  ref                 TEXT UNIQUE,
  title               TEXT NOT NULL,
  description         TEXT,
  received_date       DATE,
  assigned_date       DATE,
  assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_name       TEXT,
  mobile              TEXT,
  due_date            DATE,
  priority            TEXT DEFAULT 'Normal',
  remarks             TEXT,
  status              TEXT DEFAULT 'Pending',
  completed           BOOLEAN DEFAULT FALSE,
  submitted           BOOLEAN DEFAULT FALSE,
  rejected            BOOLEAN DEFAULT FALSE,
  returned            BOOLEAN DEFAULT FALSE,
  resubmitted         BOOLEAN DEFAULT FALSE,
  in_review           BOOLEAN DEFAULT FALSE,
  submission_details  TEXT,
  submission_remarks  TEXT,
  return_reason       TEXT,
  document_path       TEXT,
  document_name       TEXT,
  document_type       TEXT,
  document_size       BIGINT,
  reminder_sent_date  DATE,
  completion_date     DATE,
  rejected_date       DATE,
  returned_date       DATE,
  resubmitted_date    DATE,
  submission_date     DATE,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_works_assigned_to ON works(assigned_to);
CREATE INDEX IF NOT EXISTS idx_works_status      ON works(status);

CREATE TABLE IF NOT EXISTS comments (
  id           BIGSERIAL PRIMARY KEY,
  work_id      BIGINT REFERENCES works(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name  TEXT,
  text         TEXT NOT NULL,
  type         TEXT DEFAULT 'comment',
  is_admin     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_work ON comments(work_id);

CREATE TABLE IF NOT EXISTS notifications (
  id           BIGSERIAL PRIMARY KEY,
  title        TEXT,
  description  TEXT,
  type         TEXT,
  work_id      BIGINT,
  read         BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  file_name       TEXT,
  storage_path    TEXT,
  file_type       TEXT,
  file_size       BIGINT,
  shared_with     TEXT DEFAULT 'selected',
  uploaded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_by_name TEXT,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_shares (
  document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, user_id)
);

CREATE TABLE IF NOT EXISTS doc_responses (
  id                 BIGSERIAL PRIMARY KEY,
  doc_id             BIGINT REFERENCES documents(id) ON DELETE CASCADE,
  user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name          TEXT,
  text               TEXT,
  file_storage_path  TEXT,
  file_name          TEXT,
  file_type          TEXT,
  file_size          BIGINT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
  token      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);