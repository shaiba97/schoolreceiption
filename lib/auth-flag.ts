// Dev bypass mirroring the backend AUTH_NO_SESSION flag: when true, the
// portal guard lets every request through (backend still enforces its own
// bypass). Never enable in production.
export const RECEPTIONIST_NO_AUTH_BYPASS = process.env.RECEPTIONIST_NO_AUTH === "true";