export interface RealtimeConfig {
  websocketEnabled: boolean;
  corsOrigin: string;
}

export function resolveRealtimeConfig(env: NodeJS.ProcessEnv): RealtimeConfig {
  return {
    websocketEnabled:
      (env.REALTIME_WEBSOCKET_ENABLED ?? 'false').toLowerCase() === 'true',
    corsOrigin:
      env.REALTIME_CORS_ORIGIN?.trim() ||
      env.CORS_ORIGIN?.trim() ||
      '*',
  };
}

export function isRealtimeWebSocketEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveRealtimeConfig(env).websocketEnabled;
}
