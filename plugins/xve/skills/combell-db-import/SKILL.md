---
name: combell-db-import-skill
description: "Use when user wants to import a Combell MySQL backup (gzipped SQL dump, typically named like ID######_<sitename>_YYYY-MM-DD_HHMM.sql.gz) into a local MySQL/MariaDB database. Handles the Combell quirk where the dump contains a CREATE DATABASE and USE statement for the original Combell database name (e.g. ID######_sitename) — this skill rewrites those to target any local DB name the user specifies. Triggers: 'import combell dump', 'restore combell backup', 'load combell sql', 'import this into <db>'."
---

# Combell DB Import

Import a Combell MySQL backup (`ID*.sql.gz`) into a local database, rewriting the embedded database name so the dump lands in the target local DB.

## When to use

- User has a Combell backup file (gzipped SQL) and wants it imported locally.
- The dump's embedded `CREATE DATABASE` / `USE` points at Combell's internal name (e.g. `ID######_sitename`) and the local DB is named differently (`myproject`, `clientname`, etc.).

## Required info

Ask user or infer:

1. **Dump file path** — `.sql.gz` from Combell FTP / control panel.
2. **Target local DB name** — e.g. `kina`.
3. **MySQL connection** — host/port/user. Default: `127.0.0.1:3306`, user `root`, no password.

If MySQL is Herd-managed, socket is UUID'd; use TCP `-h 127.0.0.1 -P 3306` instead of the default socket.

## Steps

### 1. Inspect the dump

```bash
gunzip -c <dump>.sql.gz | head -40
```

Confirm the embedded DB name (line with `-- Host: ... Database: <name>` and `CREATE DATABASE ... <name> ...`). This is the string to replace.

Also count references to catch any edge cases (views, DEFINER clauses):

```bash
gunzip -c <dump>.sql.gz | grep -c '<original_db_name>'
```

Typical Combell dump: 4–8 occurrences (comments + CREATE + USE + events/routines headers). All safe to replace.

### 2. Verify target DB exists (create if not)

```bash
mysql -h 127.0.0.1 -P 3306 -u root -e "SHOW DATABASES LIKE '<target>'"
# if empty:
mysql -h 127.0.0.1 -P 3306 -u root -e "CREATE DATABASE \`<target>\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
```

Note: Combell dumps often default to `latin1` in the `CREATE DATABASE` clause, but the actual tables are `utf8mb4`. Creating the target DB as `utf8mb4` ahead of time is safer — the `IF NOT EXISTS` in the dump will then no-op.

### 3. Confirm DB is empty (or user wants overwrite)

```bash
mysql -h 127.0.0.1 -P 3306 -u root -e "USE <target>; SHOW TABLES"
```

If non-empty, ask before proceeding — import will `DROP TABLE IF EXISTS` and overwrite.

### 4. Import with db-name rewrite

**macOS (BSD sed) — must set `LC_ALL=C`** to avoid `illegal byte sequence` on non-UTF8 bytes:

```bash
gunzip -c <dump>.sql.gz \
  | LC_ALL=C sed 's/<original_db_name>/<target>/g' \
  | mysql -h 127.0.0.1 -P 3306 -u root <target>
```

Linux (GNU sed) — `LC_ALL=C` not required but harmless.

### 5. Verify

```bash
mysql -h 127.0.0.1 -P 3306 -u root -e "USE <target>; SHOW TABLES" | wc -l
mysql -h 127.0.0.1 -P 3306 -u root -e "USE <target>;
  SELECT COUNT(*) AS posts FROM wp_posts;
  SELECT COUNT(*) AS users FROM wp_users;
  SELECT option_value FROM wp_options WHERE option_name='siteurl';"
```

For WordPress sites, report counts and siteurl so user can sanity-check. Offer to run `wp search-replace` or SQL `UPDATE wp_options` if they want to rewrite the siteurl to the local dev URL.

## Quirks / Gotchas

- **BSD sed on macOS** chokes without `LC_ALL=C` — binary bytes inside BLOB columns trigger `illegal byte sequence`.
- **Herd MySQL socket** is UUID'd at `/tmp/mysql-<UUID>.sock` — always use TCP (`-h 127.0.0.1 -P 3306`) unless you know the socket.
- **Herd MariaDB** runs on `3307` alongside MySQL `3306` — confirm which one user wants.
- **Combell dumps > ~100 MB** may take a minute. Use `pv` for a progress bar if user wants:
  ```bash
  gunzip -c <dump>.sql.gz | pv | LC_ALL=C sed 's/ID.../<target>/g' | mysql ...
  ```
- **DEFINER clauses** on views/triggers may reference a Combell MySQL user that doesn't exist locally. If import errors on `CREATE VIEW`/`CREATE TRIGGER` with `definer is not a user`, retry with `--force` on `mysql` or pre-strip `DEFINER=` with an additional sed: `sed -E 's/DEFINER=`[^`]+`@`[^`]+`//g'`.
- **Character set mismatch**: if the dump's `CREATE DATABASE ... latin1` slips through (shouldn't, since `IF NOT EXISTS` skips when target exists), you may see garbled accents. Verify with a `SELECT` on a table with known non-ASCII content.

## One-liner (for confident users)

```bash
gunzip -c DUMP.sql.gz | LC_ALL=C sed 's/ORIGINAL_DB/TARGET_DB/g' | mysql -h 127.0.0.1 -P 3306 -u root TARGET_DB
```
