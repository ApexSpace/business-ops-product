import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

export class RealtimeIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RealtimeIoAdapter.name);

  constructor(
    app: INestApplicationContext,
    private readonly corsOrigin: string,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): ReturnType<IoAdapter['createIOServer']> {
    const origins =
      this.corsOrigin === '*'
        ? true
        : this.corsOrigin.split(',').map((value) => value.trim());

    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: origins,
        credentials: true,
      },
    });

    this.logger.log('Socket.io server created with realtime CORS settings');
    return server;
  }
}
