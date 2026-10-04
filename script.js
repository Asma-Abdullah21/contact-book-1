const API_URL = '/api/contacts';

const form = document.getElementById('contact-form');
const idField = document.getElementById('contact-id');
const nameField = document.getElementById('name');
const phoneField = document.getElementById('phone');
const nameError = document.getElementById('name-error');
const phoneError = document.getElementById('phone-error');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const listEl = document.getElementById('contact-list');
const emptyState = document.getElementById('empty-state');
const loadingState = document.getElementById('loading-state');
const countEl = document.getElementById('contact-count');
const errorBanner = document.getElementById('error-banner');

let contacts = [];

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
  errorBanner.textContent = '';
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore parse errors on empty/non-JSON bodies */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function loadContacts() {
  loadingState.hidden = false;
  emptyState.hidden = true;
  try {
    contacts = await api(API_URL);
    clearError();
  } catch (err) {
    console.error('Could not load contacts:', err);
    showError('Could not load contacts. Check your database connection and reload.');
    contacts = [];
  } finally {
    loadingState.hidden = true;
    render();
  }
}

function render() {
  listEl.innerHTML = '';
  emptyState.hidden = contacts.length !== 0;
  countEl.textContent = contacts.length;

  contacts.forEach((contact) => {
    const li = document.createElement('li');
    li.className = 'contact-card';
    li.dataset.id = contact.id;

    li.innerHTML = `
      <div class="contact-card__info">
        <p class="contact-card__name"></p>
        <p class="contact-card__phone"></p>
      </div>
      <div class="contact-card__actions">
        <button type="button" class="icon-btn edit-btn" aria-label="Edit ${escapeAttr(contact.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
        <button type="button" class="icon-btn icon-btn--danger delete-btn" aria-label="Delete ${escapeAttr(contact.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    `;

    li.querySelector('.contact-card__name').textContent = contact.name;
    li.querySelector('.contact-card__phone').textContent = contact.phone;

    li.querySelector('.edit-btn').addEventListener('click', () => startEdit(contact.id));
    li.querySelector('.delete-btn').addEventListener('click', () => deleteContact(contact.id));

    listEl.appendChild(li);
  });
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

function resetForm() {
  form.reset();
  idField.value = '';
  submitBtn.textContent = 'Add contact';
  submitBtn.disabled = false;
  cancelBtn.hidden = true;
  nameError.textContent = '';
  phoneError.textContent = '';
}

function startEdit(id) {
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return;

  idField.value = contact.id;
  nameField.value = contact.name;
  phoneField.value = contact.phone;
  submitBtn.textContent = 'Save changes';
  cancelBtn.hidden = false;
  nameField.focus();
}

async function deleteContact(id) {
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return;
  if (!confirm(`Delete ${contact.name}?`)) return;

  try {
    await api(`${API_URL}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    clearError();
    if (idField.value === id) resetForm();
    await loadContacts();
  } catch (err) {
    console.error('Could not delete contact:', err);
    showError('Could not delete that contact. Please try again.');
  }
}

function validate() {
  let valid = true;
  nameError.textContent = '';
  phoneError.textContent = '';

  const name = nameField.value.trim();
  const phone = phoneField.value.trim();

  if (!name) {
    nameError.textContent = 'Enter a name.';
    valid = false;
  }

  if (!phone) {
    phoneError.textContent = 'Enter a phone number.';
    valid = false;
  } else if (!/^[0-9+\-\s()]{5,}$/.test(phone)) {
    phoneError.textContent = 'Use only digits, spaces, +, -, and ().';
    valid = false;
  }

  return valid;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const name = nameField.value.trim();
  const phone = phoneField.value.trim();
  const editingId = idField.value;

  submitBtn.disabled = true;

  try {
    if (editingId) {
      await api(`${API_URL}?id=${encodeURIComponent(editingId)}`, {
        method: 'PUT',
        body: JSON.stringify({ name, phone }),
      });
    } else {
      await api(API_URL, {
        method: 'POST',
        body: JSON.stringify({ name, phone }),
      });
    }
    clearError();
    resetForm();
    await loadContacts();
  } catch (err) {
    console.error('Could not save contact:', err);
    showError('Could not save that contact. Please try again.');
    submitBtn.disabled = false;
  }
});

cancelBtn.addEventListener('click', resetForm);

// ---------------------------------------------------------------------
// Command bar: type commands instead of using the form.
//   add <name>, <phone>
//   edit <name>, <new phone>
//   delete <name>
// ---------------------------------------------------------------------

const commandBar = document.querySelector('.command-bar');
const commandToggle = document.getElementById('command-toggle');
const commandBody = document.getElementById('command-body');
const commandLog = document.getElementById('command-log');
const commandForm = document.getElementById('command-form');
const commandInput = document.getElementById('command-input');

commandToggle.addEventListener('click', () => {
  const collapsed = commandBar.classList.toggle('command-bar--collapsed');
  commandToggle.setAttribute('aria-expanded', String(!collapsed));
});

function logCommand(commandText, resultText, isError = false) {
  const li = document.createElement('li');
  li.className = `command-log__entry${isError ? ' command-log__entry--error' : ''}`;
  li.innerHTML = `
    <p class="command-log__cmd"></p>
    <p class="command-log__result"></p>
  `;
  li.querySelector('.command-log__cmd').textContent = commandText;
  li.querySelector('.command-log__result').textContent = resultText;
  commandLog.appendChild(li);
  commandLog.scrollTop = commandLog.scrollHeight;
}

function findContactByName(name) {
  const needle = name.trim().toLowerCase();
  const exact = contacts.filter((c) => c.name.toLowerCase() === needle);
  if (exact.length === 1) return { match: exact[0] };
  if (exact.length > 1) return { ambiguous: exact };

  const partial = contacts.filter((c) => c.name.toLowerCase().includes(needle));
  if (partial.length === 1) return { match: partial[0] };
  if (partial.length > 1) return { ambiguous: partial };
  return { match: null };
}

async function runAddCommand(name, phone) {
  if (!name || !phone) {
    return 'Usage: add <name>, <phone>  — e.g. add Jordan Lee, +92 300 1234567';
  }
  if (!/^[0-9+\-\s()]{5,}$/.test(phone)) {
    return 'That phone number has characters other than digits, spaces, +, -, and ().';
  }
  await api(API_URL, { method: 'POST', body: JSON.stringify({ name, phone }) });
  await loadContacts();
  return `Added ${name}.`;
}

async function runEditCommand(name, newPhone) {
  if (!name || !newPhone) {
    return 'Usage: edit <name>, <new phone>  — e.g. edit Jordan Lee, +92 300 7654321';
  }
  if (!/^[0-9+\-\s()]{5,}$/.test(newPhone)) {
    return 'That phone number has characters other than digits, spaces, +, -, and ().';
  }
  const { match, ambiguous } = findContactByName(name);
  if (ambiguous) {
    return `"${name}" matches ${ambiguous.length} contacts (${ambiguous.map((c) => c.name).join(', ')}). Be more specific.`;
  }
  if (!match) return `No contact found matching "${name}".`;

  await api(`${API_URL}?id=${encodeURIComponent(match.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name: match.name, phone: newPhone }),
  });
  await loadContacts();
  return `Updated ${match.name}'s phone number.`;
}

async function runDeleteCommand(name) {
  if (!name) return 'Usage: delete <name>  — e.g. delete Jordan Lee';

  const { match, ambiguous } = findContactByName(name);
  if (ambiguous) {
    return `"${name}" matches ${ambiguous.length} contacts (${ambiguous.map((c) => c.name).join(', ')}). Be more specific.`;
  }
  if (!match) return `No contact found matching "${name}".`;

  await api(`${API_URL}?id=${encodeURIComponent(match.id)}`, { method: 'DELETE' });
  if (idField.value === match.id) resetForm();
  await loadContacts();
  return `Deleted ${match.name}.`;
}

async function handleCommand(raw) {
  const text = raw.trim();
  if (!text) return;

  let addMatch = text.match(/^add\s+(.+?)\s*,\s*(.+)$/i);
  let editMatch = text.match(/^(?:edit|update)\s+(.+?)\s*,\s*(.+)$/i);
  let deleteMatch = text.match(/^(?:delete|remove)\s+(.+)$/i);

  try {
    let resultText;
    if (addMatch) {
      resultText = await runAddCommand(addMatch[1].trim(), addMatch[2].trim());
    } else if (editMatch) {
      resultText = await runEditCommand(editMatch[1].trim(), editMatch[2].trim());
    } else if (deleteMatch) {
      resultText = await runDeleteCommand(deleteMatch[1].trim());
    } else {
      logCommand(
        text,
        'Not recognized. Try: add <name>, <phone>  ·  edit <name>, <new phone>  ·  delete <name>',
        true
      );
      return;
    }
    logCommand(text, resultText);
  } catch (err) {
    console.error('Command failed:', err);
    logCommand(text, err.message || 'Something went wrong running that command.', true);
  }
}

commandForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = commandInput.value;
  if (!text.trim()) return;
  commandInput.value = '';
  commandInput.disabled = true;
  await handleCommand(text);
  commandInput.disabled = false;
  commandInput.focus();
});

logCommand(
  'help',
  'Commands: add <name>, <phone>  ·  edit <name>, <new phone>  ·  delete <name>'
);

loadContacts();
