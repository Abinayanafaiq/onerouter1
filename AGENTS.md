<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project rules

- Default UI language is **Bahasa Indonesia** (`lang="id"`). Keep new user-facing copy in Indonesian.
- **NEVER delete the database.** Do not run `DROP DATABASE`, `TRUNCATE`, `prisma migrate reset`, `db push --force-reset`, or any full data wipe. Migrations must be additive only.
