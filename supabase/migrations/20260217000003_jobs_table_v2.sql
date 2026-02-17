DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'email', 'order_processing', etc.
  payload JSONB NOT NULL,
  status job_status DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster fetching of pending jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status) WHERE status = 'pending';

-- RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Only service role can access jobs ideally, or admins
DROP POLICY IF EXISTS "Admins can view jobs" ON jobs;
CREATE POLICY "Admins can view jobs" ON jobs
  FOR SELECT USING (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
