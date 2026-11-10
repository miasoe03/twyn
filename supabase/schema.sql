-- TWYN MVP DATABASE
-- Supabase Dashboard > SQL Editor > New query > paste and Run.
-- Also enable Anonymous Sign-Ins: Authentication > Providers > Anonymous.

create extension if not exists pgcrypto;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  creator_id uuid not null references auth.users(id) on delete cascade,
  joiner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  participant_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null,
  completed_at timestamptz not null default now(),
  unique(match_id, participant_id)
);

alter table public.matches enable row level security;
alter table public.answers enable row level security;

drop policy if exists "participants can read their match" on public.matches;
create policy "participants can read their match"
on public.matches for select to authenticated
using (auth.uid() = creator_id or auth.uid() = joiner_id);

drop policy if exists "guest can create match" on public.matches;
create policy "guest can create match"
on public.matches for insert to authenticated
with check (auth.uid() = creator_id and joiner_id is null);

drop policy if exists "participants can read answers" on public.answers;
create policy "participants can read answers"
on public.answers for select to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = match_id
      and (m.creator_id = auth.uid() or m.joiner_id = auth.uid())
  )
);

drop policy if exists "participants can submit own answers" on public.answers;
create policy "participants can submit own answers"
on public.answers for insert to authenticated
with check (
  participant_id = auth.uid()
  and exists (
    select 1 from public.matches m
    where m.id = match_id
      and (m.creator_id = auth.uid() or m.joiner_id = auth.uid())
  )
);

drop policy if exists "participants can update own answers" on public.answers;
create policy "participants can update own answers"
on public.answers for update to authenticated
using (participant_id = auth.uid())
with check (participant_id = auth.uid());

create or replace function public.join_match(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
begin
  if auth.uid() is null then
    raise exception 'Please start a guest session first.';
  end if;

  select * into v_match
  from public.matches
  where code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'Invitation code not found.';
  end if;

  if v_match.creator_id = auth.uid() then
    raise exception 'You created this match. Invite someone else to join.';
  end if;

  if v_match.joiner_id is null then
    update public.matches
      set joiner_id = auth.uid()
      where id = v_match.id;
  elsif v_match.joiner_id <> auth.uid() then
    raise exception 'This match already has two participants.';
  end if;

  return v_match.id;
end;
$$;

revoke all on function public.join_match(text) from public;
grant execute on function public.join_match(text) to authenticated;

grant select, insert on public.matches to authenticated;
grant select, insert, update on public.answers to authenticated;