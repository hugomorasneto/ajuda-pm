-- ProdForge - Promote requested owner account to admin.
-- If this returns zero rows, create the account first and run again.

insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where lower(email) = lower('hugomoraesneto@gmail.com')
on conflict (id) do update
set email = excluded.email,
    role = 'admin'
returning id, email, role;
