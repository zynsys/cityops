export async function register() {
  // Only validate at real server startup — never on the edge runtime or during the build.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  // Initialise Azure Monitor before any other imports so all telemetry is captured.
  if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    const { useAzureMonitor } = await import('@azure/monitor-opentelemetry');
    const { registerInstrumentations } = await import('@opentelemetry/instrumentation');
    const { PrismaInstrumentation } = await import('@prisma/instrumentation');
    useAzureMonitor();
    registerInstrumentations({ instrumentations: [new PrismaInstrumentation()] });
  }

  const { validateEnv } = await import('@/lib/env');
  validateEnv();
}
