-- Barangay search ignores accents, so "santo nino" finds "Santo Niño" and
-- "espana" finds "España" - most phones make ñ a long-press away.
-- Same results and order as before otherwise.

create or replace function public.psgc_fold(value text)
returns text
language sql immutable
as $$
  select translate(lower(coalesce(value, '')), 'ñáàâäéèêëíìîïóòôöúùûü', 'naaaaeeeeiiiioooouuuu');
$$;

create or replace function public.search_barangays(q text, max_results integer default 20)
returns table (code text, name text, city text, province text)
language sql stable
set search_path = public
as $$
  with words as (
    select w from unnest(string_to_array(psgc_fold(trim(coalesce(q, ''))), ' ')) as w
    where w <> ''
  ), first_word as (
    select coalesce((select w from words limit 1), '') as w
  )
  select a.code, a.name, a.city, a.province
  from psgc_areas a, first_word f
  where a.level = 'Bgy'
    and char_length(trim(coalesce(q, ''))) >= 2
    and not exists (
      select 1 from words
      where position(words.w in psgc_fold(a.name || ' ' || a.city || ' ' || a.province)) = 0)
  order by
    psgc_fold(a.name) = psgc_fold(trim(q)) desc,
    starts_with(psgc_fold(a.name), f.w) desc,
    a.population_2024 desc nulls last,
    a.name
  limit least(greatest(coalesce(max_results, 20), 1), 50);
$$;
grant execute on function public.search_barangays(text, integer) to anon, authenticated;
