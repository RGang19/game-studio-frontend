// Single source of truth for "who is the current user".
//
// Production: the connected wallet address (set in localStorage by the wallet
// connect flow) IS the user — a different wallet address is a different user.
// Development fallback: a stable per-browser anonymous id.

const WALLET_KEYS = ["kult_wallet", "walletAddress", "wallet_address", "kult_wallet_address"];
const ANON_ID_KEY = "kult_anon_uid";
const ANON_NAME_KEY = "kult_anon_username";

export function getWalletAddress(): string | null {
  for (const key of WALLET_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value && /^0x[a-fA-F0-9]{40}$/.test(value.trim())) {
        // normalized: addresses compare case-insensitively
        return value.trim().toLowerCase();
      }
    } catch {
      // localStorage unavailable (SSR) — fall through
    }
  }
  return null;
}

function getAnonymousId(): string {
  let uid = localStorage.getItem(ANON_ID_KEY);
  if (!uid) {
    uid = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(ANON_ID_KEY, uid);
  }
  return uid;
}

/** The current user id: wallet address when connected, anonymous id otherwise. */
export function getCurrentUserId(): string {
  return getWalletAddress() ?? getAnonymousId();
}

/** Display name: shortened wallet (0x1234…abcd) or the generated anon name. */
export function getCurrentUsername(): string {
  const wallet = getWalletAddress();
  if (wallet) return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;

  let name = localStorage.getItem(ANON_NAME_KEY);
  if (!name) {
    const adjectives = ["Swift", "Neon", "Pixel", "Cosmic", "Turbo", "Hyper", "Retro", "Glitch"];
    const nouns = ["Fox", "Owl", "Hawk", "Wolf", "Cat", "Panda", "Tiger", "Bear"];
    name =
      adjectives[Math.floor(Math.random() * adjectives.length)] +
      nouns[Math.floor(Math.random() * nouns.length)] +
      Math.floor(Math.random() * 999);
    localStorage.setItem(ANON_NAME_KEY, name);
  }
  return name;
}

/** True when `creatorId` belongs to the current user (or is unset/legacy). */
export function ownsGame(creatorId: string | null | undefined): boolean {
  if (!creatorId) return true; // legacy games without attribution
  return creatorId === getCurrentUserId();
}
