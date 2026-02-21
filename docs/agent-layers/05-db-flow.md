# Layer 05: DB Flow

## Trigger
Any schema add/update/delete/index/performance change.

## Required Process
1. Apply DB best-practice skill review before migration authoring.
2. Update migration under `supabase/migrations/*`.
3. Check `supabase/schema.sql`, `supabase/rls.sql`, `supabase/triggers.sql` impact.
4. Define rollback or mitigation path.
5. Validate application compatibility.
