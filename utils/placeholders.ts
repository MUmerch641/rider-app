// Bundled image placeholders. Use these instead of hardcoding external
// stock-photo URLs (iStock / Bing / etc.) — those are a licensing risk and
// break when the remote URL changes.
export const AVATAR_PLACEHOLDER = require("@/assets/images/placeholders/avatar-placeholder.png");
export const STORE_PLACEHOLDER = require("@/assets/images/placeholders/store-placeholder.png");

/** Image source for a person avatar; falls back to the bundled placeholder. */
export function avatarSource(url?: string | null) {
  return url ? { uri: url } : AVATAR_PLACEHOLDER;
}

/** Image source for a store/destination logo; falls back to the bundled placeholder. */
export function storeSource(url?: string | null) {
  return url ? { uri: url } : STORE_PLACEHOLDER;
}
