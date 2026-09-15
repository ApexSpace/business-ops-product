import {
  isRealtimeWebSocketEnabled,
  resolveRealtimeConfig,
} from './realtime.config';

describe('realtime.config', () => {
  it('defaults websocket to disabled', () => {
    expect(
      resolveRealtimeConfig({
        CORS_ORIGIN: 'http://localhost:3001',
      }),
    ).toEqual({
      websocketEnabled: false,
      corsOrigin: 'http://localhost:3001',
    });
  });

  it('enables websocket when REALTIME_WEBSOCKET_ENABLED=true', () => {
    expect(
      isRealtimeWebSocketEnabled({
        REALTIME_WEBSOCKET_ENABLED: 'true',
      }),
    ).toBe(true);
  });

  it('prefers REALTIME_CORS_ORIGIN over CORS_ORIGIN', () => {
    expect(
      resolveRealtimeConfig({
        REALTIME_CORS_ORIGIN: 'https://app.example.com',
        CORS_ORIGIN: '*',
      }).corsOrigin,
    ).toBe('https://app.example.com');
  });
});
