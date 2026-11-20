import 'server-only';
// Input cleaning for everything people type into the site or the admin panel.
// React already escapes text when it is shown (no HTML is ever rendered from user input);
// this removes invisible/control characters, normalises Unicode and caps the length.

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤﻿]/g;

/** One-line text: trimmed, spaces collapsed, no control characters, at most `max` characters. */
export function cleanLine(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.normalize('NFC').replace(CONTROL, '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
}

/** Multi-line text: like cleanLine but keeps line breaks (at most 2 in a row). */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.normalize('NFC').replace(/\r\n?/g, '\n').replace(CONTROL, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

export const isPhone = (s: string) => /^\+?[\d\s()-]{7,20}$/.test(s) && (s.match(/\d/g) ?? []).length >= 7;
export const isEmail = (s: string) => s.length <= 160 && /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}$/i.test(s);
export const isUsername = (s: string) => /^[a-z0-9._-]{3,32}$/.test(s);

/** Digits only, for WhatsApp numbers (country code included, e.g. 201001234567). */
export const digits = (s: string) => s.replace(/\D/g, '');

export function toNumber(v: unknown, { min, max, step = 0.01 }: { min: number; max: number; step?: number }): number | null {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n / step) * step;
}
