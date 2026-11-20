// Runs once when the server starts. In the Node.js server (not the edge runtime, which has no database
// driver) it opens the database connection straight away, so the first café to order doesn't wait for it.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./instrumentation-node');
}
