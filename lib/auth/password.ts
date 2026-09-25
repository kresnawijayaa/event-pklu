import { compare, hash } from "bcryptjs";

export const BCRYPT_COST = 12;

export function isPinFormatValid(role: "STAFF" | "ADMIN", pin: string) {
  return role === "STAFF" ? /^\d{4}$/.test(pin) : /^\d{6}$/.test(pin);
}

export function isPinTooWeak(pin: string, eventDate?: string) {
  const commonPins = new Set(["0000", "1111", "1234", "123456"]);
  if (commonPins.has(pin) || /^(\d)\1+$/.test(pin)) return true;

  if (eventDate && /^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    const compactDates = [eventDate.replaceAll("-", "")];
    const [year, month, day] = eventDate.split("-");
    compactDates.push(`${day}${month}${year}`);

    for (const compactDate of compactDates) {
      for (let start = 0; start <= compactDate.length - pin.length; start += 1) {
        if (compactDate.slice(start, start + pin.length) === pin) return true;
      }
    }
  }

  return false;
}

export function hashPin(pin: string, pepper: string) {
  return hash(`${pin}${pepper}`, BCRYPT_COST);
}

export function verifyPin(pin: string, pepper: string, pinHash: string) {
  return compare(`${pin}${pepper}`, pinHash);
}
