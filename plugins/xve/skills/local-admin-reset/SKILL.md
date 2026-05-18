---
name: local-admin-reset-skill
description: Use PROACTIVELY when the user is setting up a local dev environment and needs to log in, or reports they cannot log in locally. Triggers: 'can't log in', 'reset local password', 'set up local login', 'admin password local', 'localize credentials', 'update user password', 'need to log in locally'. Resets jonas@xve.be to password 'password' across any app type (WordPress, Laravel, Django, Node/Prisma, raw SQL). Local databases only, never production.
---

# Local Admin Reset

Reset credentials for `jonas@xve.be` in a local development database. Password is always the literal string `password` (safe local-only value, not a real credential).

## Detect app type first

Check the project root for framework markers:
- `wp-config.php` or `composer.json` with `roots/bedrock` → WordPress
- `artisan` → Laravel
- `manage.py` → Django
- `package.json` with `prisma` or `sequelize` → Node ORM
- Otherwise → raw SQL

## WordPress

```bash
wp user update jonas@xve.be --user_pass="password" --user_email="jonas@xve.be"
```

If WP-CLI is unavailable, use SQL (WP 6.8+ native bcrypt):

```sql
UPDATE wp_users
   SET user_email          = 'jonas@xve.be',
       user_pass           = '$2y$12$ZQCWAPa6J5LLxcn8DOFkMuiy7KgJwV4Y231CbSn0.poc.hVIf6w6.',
       user_activation_key = ''
 WHERE user_email = 'jonas@xve.be' OR ID = 1;
```

Regenerate hash: `php -r 'echo password_hash("password", PASSWORD_BCRYPT), "\n";'`

## Laravel

```bash
php artisan tinker --execute="
  \$u = \App\Models\User::where('email', 'jonas@xve.be')->firstOrFail();
  \$u->password = bcrypt('password');
  \$u->save();
  echo 'done';
"
```

## Django

```bash
python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
u = U.objects.get(email='jonas@xve.be')
u.set_password('password')
u.save()
print('done')
"
```

## Node (Prisma)

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const db = new PrismaClient();
bcrypt.hash('password', 10).then(hash =>
  db.user.update({ where: { email: 'jonas@xve.be' }, data: { password: hash } })
).then(() => { console.log('done'); db.\$disconnect(); });
"
```

If bcrypt is not the hash library in use, check the auth package (`argon2`, `bcryptjs`, etc.) and adjust.

## Raw SQL (generic)

```sql
-- Find the users table and password column first:
SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name REGEXP 'user|account|member';

-- Then update (adjust table/column names):
UPDATE users SET password = '$2y$12$ZQCWAPa6J5LLxcn8DOFkMuiy7KgJwV4Y231CbSn0.poc.hVIf6w6.'
 WHERE email = 'jonas@xve.be';
```

Hash format depends on the app's auth library. Inspect an existing hash to determine algorithm.

## Verify

After resetting, use `xve:chrome-dev` to open the local login page and confirm the credentials work.
