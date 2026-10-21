import mongoose from 'mongoose';

/** Liveness + database readiness. 200 when the API and MongoDB are up, 503 otherwise (used by Render / uptime monitors). */
export function health(req, res) {
  const dbUp = mongoose.connection.readyState === 1;
  res.set('Cache-Control', 'no-store');
  res.status(dbUp ? 200 : 503).json({
    ok: dbUp,
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
}
