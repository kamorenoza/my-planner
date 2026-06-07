// Re-export shim. The localStorage persistence logic now lives in the
// database layer (src/database/localStore.js). This file is kept so existing
// imports from '../utils/storage' continue to work.
export * from "../database/localStore";
