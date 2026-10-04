// Local dev server — an alternative to `vercel dev` that needs no Vercel CLI.
// It serves the static files and implements the same /api/contacts routes
// as api/contacts.js, talking to the same Postgres database.
require('dotenv').config();
const express = require('express');
const { randomUUID } = require('node:crypto');
const { sql } = require('@vercel/postgres');

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // serves index.html, style.css, script.js

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

app.get('/api/contacts', async (req, res) => {
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT id, name, phone FROM contacts ORDER BY created_at ASC
    `;
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Server error: ${err.message || 'something went wrong.'}` });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    await ensureSchema();
    const { name, phone } = req.body || {};
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required.' });
    }
    const id = randomUUID();
    const { rows } = await sql`
      INSERT INTO contacts (id, name, phone)
      VALUES (${id}, ${name}, ${phone})
      RETURNING id, name, phone
    `;
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Server error: ${err.message || 'something went wrong.'}` });
  }
});

app.put('/api/contacts', async (req, res) => {
  try {
    const { id } = req.query;
    const { name, phone } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing contact id.' });
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required.' });
    }
    const { rows } = await sql`
      UPDATE contacts
      SET name = ${name}, phone = ${phone}
      WHERE id = ${id}
      RETURNING id, name, phone
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Contact not found.' });
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Server error: ${err.message || 'something went wrong.'}` });
  }
});

app.delete('/api/contacts', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing contact id.' });
    await sql`DELETE FROM contacts WHERE id = ${id}`;
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Server error: ${err.message || 'something went wrong.'}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Contact Book running at http://localhost:${PORT}`);
});
