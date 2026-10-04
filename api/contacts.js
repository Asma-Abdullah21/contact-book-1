import { sql } from '@vercel/postgres';

// Makes sure the table exists before we touch it. Cheap no-op after the
// first call since CREATE TABLE IF NOT EXISTS / CREATE EXTENSION are idempotent.
async function ensureSchema() {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export default async function handler(req, res) {
  try {
    await ensureSchema();

    switch (req.method) {
      case 'GET': {
        const { rows } = await sql`
          SELECT id, name, phone FROM contacts ORDER BY created_at ASC
        `;
        return res.status(200).json(rows);
      }

      case 'POST': {
        const { name, phone } = req.body || {};
        if (!name || !phone) {
          return res.status(400).json({ error: 'Name and phone are required.' });
        }
        const { rows } = await sql`
          INSERT INTO contacts (name, phone)
          VALUES (${name}, ${phone})
          RETURNING id, name, phone
        `;
        return res.status(201).json(rows[0]);
      }

      case 'PUT': {
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
        if (rows.length === 0) {
          return res.status(404).json({ error: 'Contact not found.' });
        }
        return res.status(200).json(rows[0]);
      }

      case 'DELETE': {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Missing contact id.' });
        await sql`DELETE FROM contacts WHERE id = ${id}`;
        return res.status(204).end();
      }

      default: {
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed.` });
      }
    }
  } catch (err) {
    console.error('contacts API error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
