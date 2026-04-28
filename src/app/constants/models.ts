/**
 * Centralized Gemini model identifiers (frontend mirror).
 *
 * Must stay in sync with `worker/src/utils/models.ts`.
 */

export const GEMINI_FLASH = 'gemini-flash-latest';
export const GEMINI_FLASH_LITE = 'gemini-flash-lite-latest';
export const GEMINI_PRO = 'gemini-pro-latest';

/** Default model when no user preference is loaded yet. */
export const DEFAULT_MODEL = GEMINI_FLASH;

export const SUPPORTED_MODELS = [GEMINI_FLASH, GEMINI_FLASH_LITE, GEMINI_PRO] as const;
export type SupportedModel = typeof SUPPORTED_MODELS[number];
