-- Enable UUID generation (Postgres 13+ uses pgcrypto for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Optional enum for form status (simple + safe for POC)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_status') THEN
CREATE TYPE form_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
END IF;
END$$;

-- 1) Forms master
CREATE TABLE IF NOT EXISTS forms (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    status        form_status NOT NULL DEFAULT 'DRAFT',
    created_by    VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

-- 2) Form versions: stores the schema as JSONB
CREATE TABLE IF NOT EXISTS form_versions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id       UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    version       INT NOT NULL,
    schema_json   JSONB NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT FALSE,
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_form_version UNIQUE(form_id, version)
    );

-- Only one active version per form
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_version_per_form
    ON form_versions(form_id)
    WHERE is_active = TRUE;

-- Helpful JSONB index for schema querying (optional but nice)
CREATE INDEX IF NOT EXISTS idx_form_versions_schema_gin
    ON form_versions USING GIN (schema_json);

-- 3) Submissions: stores answers as JSONB, tied to a form version
CREATE TABLE IF NOT EXISTS form_submissions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id          UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    form_version_id  UUID NOT NULL REFERENCES form_versions(id),
    submitted_by     VARCHAR(255),
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    answers_json     JSONB NOT NULL
    );

-- Helpful index for filtering submissions by form/time
CREATE INDEX IF NOT EXISTS idx_submissions_form_time
    ON form_submissions(form_id, submitted_at DESC);

-- Helpful JSONB index for searching answers (optional)
CREATE INDEX IF NOT EXISTS idx_submissions_answers_gin
    ON form_submissions USING GIN (answers_json);

-- Trigger to auto-update updated_at on forms changes
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forms_updated_at ON forms;
CREATE TRIGGER trg_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
