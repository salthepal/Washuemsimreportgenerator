/**
 * Centralized Gemini model identifiers.
 *
 * All call sites — both worker and frontend — should reference these constants
 * instead of hardcoding model strings. The frontend has a parallel file at
 * `src/app/constants/models.ts` that must stay in sync.
 *
 * The `*-latest` aliases resolve to the newest stable Gemini model in each
 * family and are passed through to the Gemini API as-is (see
 * `resolveModelId` in `gemini-cache.ts`).
 */

export const GEMINI_FLASH = 'gemini-flash-latest';
export const GEMINI_FLASH_LITE = 'gemini-flash-lite-latest';
export const GEMINI_PRO = 'gemini-pro-latest';

/** Default model when no user preference is stored. */
export const DEFAULT_MODEL = GEMINI_FLASH;

/**
 * Model used for fixed-purpose lightweight tasks (LST extraction, /ask RAG,
 * semantic search summarization). These are not user-selectable.
 */
export const LIGHTWEIGHT_TASK_MODEL = GEMINI_FLASH_LITE;

export const SUPPORTED_MODELS = [GEMINI_FLASH, GEMINI_FLASH_LITE, GEMINI_PRO] as const;
export type SupportedModel = typeof SUPPORTED_MODELS[number];
