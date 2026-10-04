# Contact Book

A small contact book: a static HTML/CSS/JS frontend plus one serverless API
route (`/api/contacts`) that reads and writes a Postgres database, so
contacts persist across devices and browsers instead of living only in
localStorage.

## What changed from the original version

- `script.js` now calls `fetch('/api/contacts', ...)` instead of reading and
  writing `localStorage`.
- `api/contacts.js` is a new serverless function (runs on Vercel, not in the
  browser) that handles `GET`/`POST`/`PUT`/`DELETE` against a `contacts`
  table, using the [`@vercel/postgres`](https://vercel.com/docs/storage/vercel-postgres)
  package.
- The table (`contacts: id, name, phone, created_at`) is created
  automatically the first time the API runs — no manual migration step.

## Deploy it

1. **Push this folder to a GitHub repo** (or drag-and-drop deploy it — see
   below).

2. **Import the repo into Vercel**: [vercel.com/new](https://vercel.com/new)
   → select the repo → Deploy. No build settings needed; it's a static site
   plus one API route.

3. **Add a Postgres database**: in your new Vercel project, go to
   **Storage → Create Database → Postgres** (this is Vercel's
   Neon-backed Postgres). Create it and click **Connect** to link it to this
   project — Vercel automatically adds the `POSTGRES_URL` and related
   environment variables for you, no copy-pasting connection strings needed.

4. **Redeploy**: Vercel → your project → **Deployments** → ⋯ on the latest
   deployment → **Redeploy**, so the app picks up the new database
   environment variables.

That's it — open the deployed URL and add a contact. The table is created
automatically on first use.

### Deploying without GitHub

If you'd rather not use a repo, install the [Vercel CLI](https://vercel.com/docs/cli)
and run this from inside the `contact-book` folder:

```bash
npm i -g vercel
vercel
```

Follow the prompts, then still do step 3 above (add + connect a Postgres
database in the project's Storage tab) and run `vercel --prod` again.

## Local development

```bash
npm install
vercel dev
```

`vercel dev` pulls down the same environment variables your deployed project
uses (run `vercel env pull` once first if it doesn't do so automatically), so
your local copy talks to the same database.

## Notes

- The `contacts` table is created lazily on the first API call
  (`CREATE TABLE IF NOT EXISTS`), so there's nothing to run by hand.
- If you ever want a clean slate, delete the database from the Storage tab
  and create a new one — the table will be recreated automatically.
