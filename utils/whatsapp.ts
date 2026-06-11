import { Linking } from "react-native";

/**
 * WhatsApp deep-link helper (mirrored in the Users app — keep in sync).
 *
 * WhatsApp cannot deep-link a voice CALL, so every "call" or "message" action
 * between customer and rider opens the chat instead; callers that want a
 * "call" simply open the chat without prefilled text and the user taps the
 * in-chat call button.
 */

/**
 * Normalize a phone number to bare international digits for WhatsApp links
 * (E.164 without the "+", spaces, or dashes). Iraq-aware:
 *  - "+9647701234567"   → "9647701234567" (existing + prefix kept as-is)
 *  - "009647701234567"  → "9647701234567" (00 international prefix)
 *  - "07701234567"      → "9647701234567" (Iraqi local format)
 *  - "7701234567"       → "9647701234567" (local mobile missing the 0)
 *  - "964 770 123-4567" → "9647701234567"
 * Returns null when no digits remain.
 */
export function toWhatsAppDigits(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (hasPlus) return digits; // already international — keep it
  if (digits.startsWith("00")) return digits.slice(2); // 00-style international
  if (digits.startsWith("0")) return `964${digits.slice(1)}`; // Iraqi local 07xx…
  if (digits.startsWith("964")) return digits; // already country-coded
  if (digits.startsWith("7")) return `964${digits}`; // local mobile without the 0
  return digits;
}

/**
 * Open a WhatsApp chat with `phone`, optionally prefilled with `text`.
 *
 * Tries the native `whatsapp://` scheme first and falls back to the
 * `https://wa.me/` universal link. Deliberately NO Linking.canOpenURL here:
 * on iOS it requires an LSApplicationQueriesSchemes allowlist entry in
 * Info.plist, while openURL alone does not — we just try and catch.
 *
 * Returns false when BOTH attempts fail (WhatsApp not available); the caller
 * shows the app's standard error dialog with localized strings.
 */
export async function openWhatsAppChat(
  phone: string,
  text?: string,
): Promise<boolean> {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return false;
  const encoded = text ? encodeURIComponent(text) : "";
  const appUrl = `whatsapp://send?phone=${digits}${encoded ? `&text=${encoded}` : ""}`;
  const webUrl = `https://wa.me/${digits}${encoded ? `?text=${encoded}` : ""}`;
  try {
    await Linking.openURL(appUrl);
    return true;
  } catch {
    try {
      await Linking.openURL(webUrl);
      return true;
    } catch {
      return false;
    }
  }
}
