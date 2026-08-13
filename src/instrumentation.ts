export async function register() {
  // Only validate at real server startup — never on the edge runtime or during the build.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { validateEnv } = await import('@/lib/env');
  validateEnv();
}
