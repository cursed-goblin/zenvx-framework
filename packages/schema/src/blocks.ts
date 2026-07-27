/**
 * The block catalog lives in ./catalog, split by category so it can keep
 * growing. This file stays as the stable import path for the rest of the
 * codebase (validate.ts, compile.ts, index.ts, the Studio and the forge).
 */
export { BLOCKS, blockById, CATEGORY_LABELS, wallpapers } from "./catalog/index"
export type { BlockDef } from "./catalog/index"
