import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  REALTIME_SOCKET_NAMESPACE,
  REALTIME_SOCKET_READY_EVENT,
  realtimeBusinessRoom,
} from './realtime.constants';
import { RealtimeBridgeService } from './realtime-bridge.service';
import { RealtimeSocketAuthService } from './realtime-socket-auth.service';

type RealtimeSocketData = {
  businessId?: string;
  userId?: string;
};

@WebSocketGateway({
  namespace: REALTIME_SOCKET_NAMESPACE,
  cors: {
    origin: true,
    credentials: true,
  },
})
@Injectable()
export class ConversationRealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ConversationRealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly bridge: RealtimeBridgeService,
    private readonly socketAuth: RealtimeSocketAuthService,
  ) {}

  afterInit(server: Server): void {
    this.bridge.bindServer(server);
    this.logger.log(`Socket.io gateway ready on namespace ${REALTIME_SOCKET_NAMESPACE}`);
  }

  async handleConnection(client: Socket): Promise<void> {
    const auth = client.handshake.auth as {
      token?: string;
      businessId?: string;
    };

    try {
      const token = typeof auth?.token === 'string' ? auth.token : '';
      const businessId =
        typeof auth?.businessId === 'string' ? auth.businessId : '';

      const user = await this.socketAuth.authenticateHandshake(
        token,
        businessId,
      );

      const socketData = client.data as RealtimeSocketData;
      socketData.businessId = businessId;
      socketData.userId = user.id;

      const room = realtimeBusinessRoom(businessId);
      await client.join(room);
      await this.bridge.acquireBusiness(businessId);

      client.emit(REALTIME_SOCKET_READY_EVENT, {
        businessId,
        at: new Date().toISOString(),
      });

      this.logger.debug(
        `Socket ${client.id} joined ${room} for user ${user.id}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';
      this.logger.warn(`Realtime socket rejected (${client.id}): ${message}`);
      client.emit('realtime.error', { message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const socketData = client.data as RealtimeSocketData;
    const businessId = socketData.businessId;
    if (businessId) {
      this.bridge.releaseBusiness(businessId);
      this.logger.debug(`Socket ${client.id} left business ${businessId}`);
    }
  }
}
