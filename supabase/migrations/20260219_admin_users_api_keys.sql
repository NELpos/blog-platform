ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS account_role TEXT NOT NULL DEFAULT 'viewer',
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id
  AND (p.email IS NULL OR p.email = '');

ALTER TABLE public.profiles
  ALTER COLUMN email SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_role_check
      CHECK (account_role IN ('owner', 'editor', 'viewer'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('active', 'pending', 'suspended'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_idx
  ON public.profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS profiles_role_status_idx
  ON public.profiles (account_role, account_status);
CREATE INDEX IF NOT EXISTS profiles_last_active_idx
  ON public.profiles (last_active_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.workspaces (owner_id, name, slug)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'My Blog'),
    LOWER(REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
      '[^a-zA-Z0-9]', '-', 'g'
    )) || '-' || SUBSTRING(NEW.id::text, 1, 8)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'mcp' CHECK (scope = 'mcp'),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT api_keys_name_len CHECK (char_length(name) BETWEEN 2 AND 80),
  CONSTRAINT api_keys_hash_len CHECK (char_length(key_hash) >= 32)
);

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_uq
  ON public.api_keys (key_hash);
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_one_per_user_uq
  ON public.api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_status_last_used_idx
  ON public.api_keys (status, last_used_at DESC NULLS LAST);

DROP TRIGGER IF EXISTS set_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER set_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own api keys" ON public.api_keys;
CREATE POLICY "Users can view their own api keys"
  ON public.api_keys FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create one api key for themselves" ON public.api_keys;
CREATE POLICY "Users can create one api key for themselves"
  ON public.api_keys FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
