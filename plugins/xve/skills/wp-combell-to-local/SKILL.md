---
name: wp-combell-to-local
description: "Use when user wants to convert a WordPress site (often Roots Bedrock) from a Combell production backup into a ready-to-run local dev environment. Covers the whole flow after the raw dump has landed locally: URL rewrite, third-party tracking neutralization, SMTP reroute to a local mail catcher (Herd / Mailpit / MailHog), blanking of billable API keys and webhook secrets, admin password reset, and .env alignment so login cookies work. Also covers what belongs in the project's bin/ folder and what stays out of git. Delegates the raw dump import to the sibling skill xve-combell-db-import. Triggers: 'localize wp db', 'convert combell backup for local dev', 'prepare prod dump for .test domain', 'set up local wp from combell'."
---

# WordPress Combell → Local

End-to-end playbook for turning a Combell production dump into a safe, working local WordPress site. Pairs with `xve-combell-db-import` (raw import) — this skill covers everything after the dump is in MySQL.

## When to use

- User just imported a Combell dump locally and the site 500s, redirects to the prod domain, sends real email, loads Piwik/GA, or can't log in.
- User is standing up a fresh local clone of a Bedrock WP project for the first time.
- User asks to "localize", "scrub", "make safe for local" a freshly imported WordPress DB.

## Guiding rules

- **Never run this against prod.** All destructive in scope — rewrites URLs, wipes credentials, resets admin. Confirm target DB name before touching anything.
- **One transaction.** Bundle URL rewrite + tracking + SMTP + secrets + admin reset into a single SQL file wrapped in `START TRANSACTION; … COMMIT;`. Idempotent so reruns are safe.
- **Serialized columns need `wp search-replace`.** Raw `REPLACE()` breaks PHP-serialized length prefixes (e.g. `s:15:"https://site.be"` → `s:17:"https://site.test"` corrupts because the length prefix stays `15`). Raw SQL only on columns that store plain text.
- **Preserve script bodies.** For tracking, flip a gate flag — do not delete the scripts. Re-import the prod dump should be enough to restore.
- **Leave paid-plugin licenses alone** (ACF Pro, Gravity Forms). Low risk locally; re-populating from `.env` on admin visit is the norm.

## Required info

1. **Project type** — Bedrock (most common at XVE) or classic WP? Bedrock controls URL via `.env` `WP_HOME`/`WP_SITEURL`, classic stores them only in `wp_options`.
2. **Local domain** — e.g. `https://sitename.test`. Must match the browser origin or login cookies get blocked.
3. **Prod domain** — e.g. `https://sitename.be`. The *exact* prefix to replace (including scheme).
4. **Local mail catcher** — Herd (`127.0.0.1:2525`, no auth, no TLS), Mailpit, MailHog, or none.
5. **Tracking stack** — typically Piwik Pro / GA / GTM / Facebook Pixel loaded from an ACF options repeater keyed by `environment`.
6. **Whether `bin/localize-db.*` already exists** in the project. Most Bedrock projects at XVE now carry it — if missing, create from the template below.

## Workflow

### 1. Import the dump

Delegate to `xve-combell-db-import`. Confirm count of `wp_posts`, `wp_users`, and `siteurl` value before continuing.

### 2. Plain-text URL rewrite (SQL, in transaction)

Safe columns only — no serialized data. Match only `https://` prefix so that `@sitename.be` email addresses and `https://test.sitename.be` subdomains survive.

```sql
START TRANSACTION;

UPDATE wp_options
   SET option_value = REPLACE(option_value, 'https://PRODDOMAIN', 'https://LOCALDOMAIN')
 WHERE option_name IN ('siteurl', 'home');

UPDATE wp_posts
   SET post_content = REPLACE(post_content, 'https://PRODDOMAIN', 'https://LOCALDOMAIN')
 WHERE post_content LIKE '%https://PRODDOMAIN%';

UPDATE wp_posts
   SET guid = REPLACE(guid, 'https://PRODDOMAIN', 'https://LOCALDOMAIN')
 WHERE guid LIKE 'https://PRODDOMAIN%';

UPDATE wp_comments
   SET comment_content = REPLACE(comment_content, 'https://PRODDOMAIN', 'https://LOCALDOMAIN')
 WHERE comment_content LIKE '%https://PRODDOMAIN%';
```

Deliberately NOT touched by raw SQL (would corrupt serialized length prefixes):
- `wp_options.option_value` for non-`siteurl`/`home` rows (widgets, theme_mods, plugin settings)
- `wp_postmeta.meta_value` (ACF repeaters, Gutenberg meta)
- `wp_usermeta.meta_value` (capabilities, session tokens)

### 3. Serialized URL rewrite (WP-CLI, outside the transaction)

Required for anything in widgets, theme_mods, ACF, postmeta, usermeta:

```bash
wp search-replace 'https://PRODDOMAIN' 'https://LOCALDOMAIN' \
  --all-tables --skip-columns=guid
```

`--skip-columns=guid` prevents double-rewrite (already handled in SQL) and keeps GUIDs stable per WP guidance.

If wp-cli not available locally: fall back to the [interconnect/it Search Replace DB](https://interconnectit.com/search-replace-db/) script or install wp-cli via `brew install wp-cli` / `composer global require wp-cli/wp-cli-bundle`.

### 4. Neutralize tracking scripts

Most XVE Bedrock themes gate script loading with `env('WP_ENV') === $script['environment']` reading from an ACF options repeater (`options_settings_scripts_<n>_environment`). Flip the flag to a value that can never match:

```sql
UPDATE wp_options
   SET option_value = 'local-disabled'
 WHERE option_name REGEXP '^options_settings_scripts_[0-9]+_environment$'
   AND option_value <> 'local-disabled';
```

Script bodies (`_script`, `_name`) stay untouched — re-importing prod restores normal behaviour.

If the project uses a different gate (e.g. GTM container ID in a single option, GA4 ID, FB Pixel ID): blank those specific options instead. Scan for suspects:

```sql
SELECT option_name, option_value
  FROM wp_options
 WHERE option_name REGEXP 'gtm|google_tag|analytics|pixel|piwik|matomo'
    OR option_value LIKE '%UA-%'
    OR option_value LIKE '%G-%'
    OR option_value LIKE '%GTM-%';
```

### 5. SMTP reroute to local mail catcher

Production SMTP creds (mailprotect.be, SendGrid, Mailgun…) must not run locally. For the `wp_mail_smtp` plugin, replace the serialized blob with a minimal local-safe config pointing at Herd / Mailpit / MailHog:

```sql
UPDATE wp_options
   SET option_value = 'a:2:{s:4:"mail";a:6:{s:10:"from_email";s:17:"hello@example.com";s:9:"from_name";s:5:"Local";s:6:"mailer";s:4:"smtp";s:11:"return_path";b:0;s:16:"from_email_force";b:1;s:15:"from_name_force";b:0;}s:4:"smtp";a:5:{s:7:"autotls";b:0;s:4:"auth";b:0;s:4:"host";s:9:"127.0.0.1";s:10:"encryption";s:4:"none";s:4:"port";i:2525;}}'
 WHERE option_name = 'wp_mail_smtp';
```

Port / from-name / from-email can be tuned per project. Plugin fills in defaults for unset top-level keys on first access.

If a different mail plugin (Fluent SMTP, Easy WP SMTP, Post SMTP): either blank its option row or craft an equivalent serialized blob. Validate with:

```bash
php -r 'var_dump(unserialize('\''a:2:{...}'\''));'
```

### 6. Blank billable / sensitive third-party keys

Run against any option keys that hit paid endpoints or webhooks on load. Typical suspects in a Bedrock + ACF + Events Calendar stack:

```sql
UPDATE wp_options
   SET option_value = ''
 WHERE option_name IN (
   'options_settings_google_maps_api_key',
   'tec_automator_power_automate_secret_key',
   'tec_automator_zapier_secret_key'
 );
```

Scan for more with:

```sql
SELECT option_name FROM wp_options
 WHERE option_name REGEXP 'api_key|secret|webhook|token|mapbox|stripe|mollie|recaptcha';
```

Per-project discretion: some are safe to leave (test-mode Stripe keys), some must be blanked (live Mollie, Google Maps JS key — billable per page load).

### 7. Leave paid-plugin licenses

Do **not** blank these — they auto-repopulate from `.env` on admin visit and licenses are low-risk locally:
- `acf_pro_license`, `acf_pro_license_status`
- `rg_gforms_key`, `_transient_rg_gforms_license`, `_transient_timeout_rg_gforms_license`

### 8. Reset primary admin

Pick user ID 1 (Bedrock convention). Use a native bcrypt hash (WP 6.8+):

```sql
UPDATE wp_users
   SET user_email           = 'admin@example.com',
       user_pass            = '$2y$12$ZQCWAPa6J5LLxcn8DOFkMuiy7KgJwV4Y231CbSn0.poc.hVIf6w6.',
       user_activation_key  = ''
 WHERE ID = 1;
```

Hash above verifies `password`. Non-deterministic — any valid bcrypt hash of `password` works. Regenerate with:

```bash
php -r 'echo password_hash("password", PASSWORD_BCRYPT), "\n";'
```

If the project is still on WP < 6.8 and uses `roots/wp-password-bcrypt`: the same hash format works (that plugin predates native bcrypt and uses identical `$2y$` PHPass-style hashes).

Optional: if multiple admins exist and user wants all reset, broaden the `WHERE` to `ID IN (SELECT user_id FROM wp_usermeta WHERE meta_key = 'wp_capabilities' AND meta_value LIKE '%administrator%')`.

### 9. Align `.env` with the local domain — **MOST COMMON GOTCHA**

For Bedrock: `config/application.php` calls `Config::define('WP_HOME', env('WP_HOME'))` and the same for `WP_SITEURL`. These constants **override** the `siteurl`/`home` rows in `wp_options`. If `.env` still points at the prod or staging URL (the value the `.env.example` was originally set up with, or leftover from a previous clone), you get:

- **301 redirect loop** — loading `https://LOCALDOMAIN/` 301s to the prod/staging URL. DB rows show `LOCALDOMAIN` but Bedrock's constant overrides them. Trap: looks like the SQL localization failed, but the DB is clean.
- **"Cookies blocked" on login** — same root cause. WP emits Set-Cookie for the domain in `WP_HOME`. Browser origin differs → cookie rejected → login fails with cookies-blocked error.

Fix — `.env` must match browser origin exactly:

```env
WP_HOME=https://LOCALDOMAIN
WP_SITEURL=${WP_HOME}/wp
WP_ENV=development
```

Checks:
- Scheme matches (`https` vs `http`). Herd serves HTTPS by default — don't set `http://`.
- Host matches exactly. `https://site.test` ≠ `https://www.site.test`.
- `/wp` suffix on `WP_SITEURL` only — never on `WP_HOME`. Bedrock structural convention.
- `WP_ENV=development` (anything other than the production tracking-environment value — e.g. not `production`).

Diagnostic one-liner when a redirect is happening:

```bash
curl -sSI -k https://LOCALDOMAIN/ | grep -iE '^(HTTP|location|server)'
```

If `location:` shows prod/staging host, `.env` is the culprit (unless a Redirection/Yoast plugin option is enforcing — check `wp_options` for `kinabe.107.be`-style staging host references as a follow-up).

Admin URL after this: `https://LOCALDOMAIN/wp/wp-login.php`.

Also: ship a project-local `.env.example` with sane local defaults (`DB_HOST=127.0.0.1`, `DB_NAME=<project>`, `WP_HOME=https://<project>.test`) so the next clone doesn't inherit a prod URL from the upstream Bedrock boilerplate.

### 10. Clear WordPress caches

After URL rewrite + option changes, stale caches will serve HTML with the old prod URL and can stack on top of the `.env` redirect loop. Flush everything:

```bash
# Page cache (WP Rocket / WP Super Cache / W3 Total Cache — location varies)
rm -rf web/app/cache/
rm -rf web/app/wp-rocket-config/

# Object cache + transients + rewrite rules
wp cache flush
wp transient delete --all
wp rocket clean --confirm       # only if WP Rocket CLI plugin installed
wp rewrite flush
```

Raw SQL fallback if wp-cli is unavailable:

```sql
DELETE FROM wp_options WHERE option_name LIKE '\_transient\_%' ESCAPE '\\';
DELETE FROM wp_options WHERE option_name LIKE '\_site\_transient\_%' ESCAPE '\\';
```

Browser-side:
- Hard reload (`Cmd/Ctrl+Shift+R`) to bypass disk cache.
- If prod host has HSTS, the browser may still upgrade `http://LOCALDOMAIN` → `https://` — usually desired, but Chrome's `chrome://net-internals/#hsts` lets you delete HSTS entries per host if testing non-TLS.
- Clear cookies for `LOCALDOMAIN` if login loops or a stale `wordpress_logged_in_*` cookie was set for the prod host.

Opcache (Herd / PHP-FPM) caches compiled PHP — restart the Herd PHP service if plugin file paths changed:

```bash
herd restart php@8.0     # or whichever version the project uses
```

### 11. Commit the script to the project

Ship `bin/localize-db.{sql,sh,ps1}` in the project repo so the next developer runs one command. Template structure:

```
bin/
├── localize-db.sql   # transaction-wrapped; idempotent; documented
├── localize-db.sh    # env-var-driven bash wrapper (DB_HOST/PORT/USER/NAME/PASSWORD)
└── localize-db.ps1   # Windows PowerShell equivalent
```

Both wrappers should default to `127.0.0.1:3306 root <project-db-name>` and end with a verification `SELECT` on `siteurl`/`home`/tracking env values. README should document:

1. `gunzip | sed | mysql` import (one-liner)
2. `./bin/localize-db.sh`
3. `wp search-replace` for serialized columns

Safe to commit: **yes** — no secrets in the script, the bcrypt hash is of the literal string `password`, and the SMTP config points at loopback. Do NOT commit any Combell dump files (add `*.sql.gz` to `.gitignore`).

### 12. Build theme assets

A fresh clone from the project repo ships source files only — no `node_modules/`, no `build/` / `dist/` / `public/` directory. Theme PHP enqueues compiled bundles (e.g. `get_template_directory_uri() . '/build/js/main.js'`). Until these are built, nginx returns the 404 HTML page for every script URL and the browser console lights up with:

```
Uncaught SyntaxError: Unexpected token '<'
```

(The `<` is the first char of `<!DOCTYPE html>` — JS parser choking on the 404 page.)

Find the build tool via `package.json` — Roots Sage uses `yarn build`, XVE themes often use Buildozer (gulp-based) invoked as `yarn buildozer build`:

```bash
cd web/app/themes/<theme>

# Node version — README often pins an old version (e.g. 17.8.0).
# Buildozer builds on Node 22 despite that; try current first, fall back to nvm only if install fails.
node --version

# Deps + build
yarn install && yarn buildozer build
# or, without yarn:
npm install && npx buildozer build
```

Verify output dir exists and nginx serves it as JS:

```bash
ls web/app/themes/<theme>/build/js/
curl -sSI -k https://LOCALDOMAIN/app/themes/<theme>/build/js/main.js | grep -iE '^(HTTP|content-type)'
# expect: HTTP/2 200  +  content-type: application/javascript
```

If node-sass / gulp-image chokes on newer Node: use `nvm install <pinned-version> && nvm use <pinned-version>` and retry. Don't bother "fixing" deprecation warnings (chokidar 2, fsevents 1, phantomjs-prebuilt) — they're cosmetic on build-time-only deps.

Admin / frontend won't fully render until this step is done — CSS classes, Bootstrap JS, slick-carousel, Venobox lightboxes all depend on the bundle.

### 13. Verify

```bash
# URL rewrite landed
mysql -h 127.0.0.1 -P 3306 -u root DBNAME -e "
  SELECT option_name, option_value FROM wp_options WHERE option_name IN ('siteurl','home');"

# Tracking neutralized
mysql -h 127.0.0.1 -P 3306 -u root DBNAME -e "
  SELECT option_name, option_value FROM wp_options
   WHERE option_name REGEXP '^options_settings_scripts_[0-9]+_environment$';"

# Admin usable
mysql -h 127.0.0.1 -P 3306 -u root DBNAME -e "
  SELECT ID, user_login, user_email FROM wp_users WHERE ID = 1;"
```

Browser check: load `https://LOCALDOMAIN/wp/wp-login.php`, log in with `admin@example.com` / `password`, confirm dashboard renders without mixed-content warnings and no outbound requests to Piwik / GA / GTM / Google Maps in DevTools Network tab.

## Common failures

- **"Cookies blocked" at login / 301 loop to prod** — `.env` `WP_HOME`/`WP_SITEURL` don't match the browser origin (scheme or host mismatch), or still point at the prod/staging URL inherited from `.env.example`. Bedrock's `Config::define()` overrides the DB rows, so the SQL localization looks like it silently failed. Fix `.env`, restart PHP-FPM / Herd service. See Step 9.
- **Mixed content warnings** — serialized columns still carry `http://` or prod hostname. Run `wp search-replace` again including `--all-tables`.
- **Login loops / logs out immediately** — often a stale `auth_cookie` from a previous browser session. Clear cookies for the local domain.
- **"Error establishing database connection"** — Bedrock `.env` `DB_*` values don't match local MySQL. Herd MySQL: `127.0.0.1:3306`, user `root`, no password.
- **500 on admin** — license or plugin expects a real network call. Check `web/app/debug.log` / PHP error log; disable the offending plugin via `UPDATE wp_options SET option_value = REPLACE(option_value, 'plugin-folder/plugin-file.php', '') WHERE option_name = 'active_plugins';` (serialized — easier to just rename the plugin folder under `web/app/plugins/`).
- **Corrupted accents** — dump landed in `latin1` but tables are `utf8mb4`. Re-import with target DB pre-created as `utf8mb4` (see `xve-combell-db-import`).

## One-liner (full flow, once `bin/localize-db.*` exists)

```bash
gunzip -c ID######_sitename_YYYY-MM-DD_HHMM.sql.gz \
  | LC_ALL=C sed 's/ID######_sitename/DBNAME/g' \
  | mysql -h 127.0.0.1 -P 3306 -u root DBNAME \
  && ./bin/localize-db.sh \
  && wp search-replace 'https://PRODDOMAIN' 'https://LOCALDOMAIN' --all-tables --skip-columns=guid
```

Log in at `https://LOCALDOMAIN/wp/wp-login.php` with `admin@example.com` / `password`. Done.
