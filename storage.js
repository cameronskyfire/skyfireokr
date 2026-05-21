// storage.js — thin wrapper around localStorage
// Swap this module for an API/DB integration later without touching the rest of the app.

const KEYS = {
  USERS: "compass:users",
  OKRS: "compass:okrs",
  SESSION: "compass:session",
};

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ── Users ──────────────────────────────────────────────────────────────────

export function getUsers() {
  return read(KEYS.USERS) || [];
}

export function saveUser(user) {
  const users = getUsers();
  const existing = users.findIndex((u) => u.email === user.email);
  if (existing >= 0) {
    users[existing] = user;
  } else {
    users.push(user);
  }
  write(KEYS.USERS, users);
}

export function findUser(email, password) {
  return getUsers().find((u) => u.email === email && u.password === password) || null;
}

// ── Session ────────────────────────────────────────────────────────────────

export function getSession() {
  return read(KEYS.SESSION);
}

export function saveSession(user) {
  // Never persist the password in the session
  const { password: _p, ...safe } = user;
  write(KEYS.SESSION, safe);
}

export function clearSession() {
  localStorage.removeItem(KEYS.SESSION);
}

// ── OKRs ───────────────────────────────────────────────────────────────────

export function getOKRs() {
  return read(KEYS.OKRS) || [];
}

export function saveOKRs(okrs) {
  write(KEYS.OKRS, okrs);
}
