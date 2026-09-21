begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users(id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001', 'one@test.local', '{"is_admin": true}'),
 ('00000000-0000-0000-0000-000000000002', 'two@test.local', '{}'),
 ('00000000-0000-0000-0000-000000000003', 'admin@test.local', '{}');
update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-000000000003';
select is((select count(*) from public.profiles), 3::bigint, 'auth trigger creates profiles');
select is((select is_admin from public.profiles where id = '00000000-0000-0000-0000-000000000001'), false, 'user metadata cannot grant admin');

set local role anon;
select is((select count(*) from public.profiles), 0::bigint, 'anonymous cannot read profiles');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.profiles), 1::bigint, 'user reads only own profile');
select lives_ok($$update public.profiles set display_name = 'Owner' where id = '00000000-0000-0000-0000-000000000001'$$, 'owner can edit safe fields');
select throws_ok($$update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-000000000001'$$, '42501', null, 'owner cannot self-promote');
select throws_ok($$delete from public.profiles where id = '00000000-0000-0000-0000-000000000001'$$, '42501', null, 'owner cannot bypass deletion flow');
select throws_ok($$insert into public.profiles(id, is_admin) values ('00000000-0000-0000-0000-000000000004', true)$$, '42501', null, 'user cannot create privileged profiles');
select throws_ok($$update public.profiles set deleted_at = now() where id = '00000000-0000-0000-0000-000000000001'$$, '42501', null, 'user cannot modify protected lifecycle fields');
select ok(not public.is_admin(), 'ordinary user is not an admin');
update public.profiles set display_name = 'Attack' where id = '00000000-0000-0000-0000-000000000002';
reset role;
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000002'), '', 'other profile unchanged');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select ok(public.is_admin(), 'trusted admin recognized');
select is((select count(*) from public.profiles), 3::bigint, 'admin reads profiles without RLS recursion');
select * from finish();
rollback;
