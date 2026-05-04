# Task 7 - seed-updater

## Task
Update the seed script at `/home/z/my-project/prisma/seed.ts` to use the new `User` model (replacing `Admin`) with bcrypt-hashed passwords.

## What was done
1. Rewrote `prisma/seed.ts` completely:
   - Added `import bcrypt from 'bcryptjs'` and `const hash = (pw: string) => bcrypt.hashSync(pw, 12)`
   - Created 7 users with `db.user.create()` using proper roles and bcrypt-hashed passwords:
     - superadmin (super_admin), admin (admin), encargado (encargado)
     - camarero1, camarero2 (camarero), cocina1 (cocina), caja1 (caja)
   - Preserved all 18 products (5 bebidas, 3 tapas frías, 4 tapas calientes, 3 montaditos, 3 raciones)
   - Preserved all 25 tables (5 barra, 10 salón, 10 terraza)
   - Preserved all 3 CRM clients
   - Removed old `db.admin` findFirst/create logic with plaintext password
   - Updated summary output to include user count

## Verification
- Seed script ran successfully: 7 usuarios, 18 productos, 25 mesas, 3 clientes
- Passwords verified as bcrypt $2b$12$ hashes
- All existing product/table/client data preserved unchanged
