import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { RealtimeEvent } from '@nova/shared';
import type { Server, Socket } from 'socket.io';

import { EVENT_BUS_PORT, type EventBusPort } from '../../../common/application/ports';

/**
 * Realtime gateway.
 *
 * Bridges the in-process domain event bus to connected browsers. Clients join a
 * room per account (`user:<id>`) and per profile (`profile:<id>`), so an event
 * only reaches the sessions it concerns.
 */
@Injectable()
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  /**
   * @param eventBus - Domain event bus.
   */
  public constructor(@Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort) {}

  /** Forwards the domain events that clients care about. */
  public onModuleInit(): void {
    this.eventBus.subscribe<{ profileId: string; titleId: string; percent: number }>(
      'playback.progress',
      (payload) => {
        this.emitToProfile(payload.profileId, { type: 'playback.progress', payload });
      },
    );

    this.eventBus.subscribe<{ titleId: string }>('catalog.updated', (payload) => {
      this.server?.emit('event', { type: 'catalog.updated', payload } satisfies RealtimeEvent);
    });

    this.eventBus.subscribe<{ userId: string; status: string }>('subscription.updated', (payload) => {
      this.emitToUser(payload.userId, { type: 'subscription.updated', payload });
    });
  }

  /**
   * @param client - Newly connected socket.
   */
  public handleConnection(client: Socket): void {
    this.logger.debug(`WS kapcsolódás: ${client.id}`);
  }

  /**
   * @param client - Disconnected socket.
   */
  public handleDisconnect(client: Socket): void {
    this.logger.debug(`WS bontás: ${client.id}`);
  }

  /**
   * Subscribes a socket to its account and profile rooms.
   *
   * @param client - Connected socket.
   * @param payload - Account and profile identifiers.
   * @returns Acknowledgement.
   */
  @SubscribeMessage('identify')
  public identify(
    client: Socket,
    payload: { userId?: string; profileId?: string },
  ): { joined: string[] } {
    const rooms: string[] = [];
    if (payload.userId) {
      client.join(`user:${payload.userId}`);
      rooms.push(`user:${payload.userId}`);
    }
    if (payload.profileId) {
      client.join(`profile:${payload.profileId}`);
      rooms.push(`profile:${payload.profileId}`);
    }
    return { joined: rooms };
  }

  /**
   * Emits an event to every session of an account.
   *
   * @param userId - Account identifier.
   * @param event - Event payload.
   */
  public emitToUser(userId: string, event: RealtimeEvent): void {
    this.server?.to(`user:${userId}`).emit('event', event);
  }

  /**
   * Emits an event to every session of a profile.
   *
   * @param profileId - Profile identifier.
   * @param event - Event payload.
   */
  public emitToProfile(profileId: string, event: RealtimeEvent): void {
    this.server?.to(`profile:${profileId}`).emit('event', event);
  }
}
