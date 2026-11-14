import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'node:http';
import { verifyToken, AuthUser } from '../middleware/auth.js';
import { PresenceService } from '../services/presenceService.js';

interface ConnectedClient {
  socket: WebSocket;
  user: AuthUser;
  connectedAt: Date;
  lastPing: Date;
}

export class WebSocketBroker {
  private static instance: WebSocketBroker;
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ConnectedClient[]>();
  private presenceService = new PresenceService();

  public static getInstance(): WebSocketBroker {
    if (!WebSocketBroker.instance) {
      WebSocketBroker.instance = new WebSocketBroker();
    }
    return WebSocketBroker.instance;
  }

  public init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      let clientUser: AuthUser | null = null;

      // Extract token from query param or initial auth frame
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const queryToken = url.searchParams.get('token');

      if (queryToken) {
        const decoded = verifyToken(queryToken);
        if (decoded) {
          clientUser = decoded;
          this.registerClient(clientUser, ws);
        }
      }

      ws.on('message', (data: Buffer | string) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'AUTH' && message.payload?.token) {
            const decoded = verifyToken(message.payload.token);
            if (decoded) {
              clientUser = decoded;
              this.registerClient(clientUser, ws);
              ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', payload: { role: clientUser.role } }));
            } else {
              ws.send(JSON.stringify({ type: 'AUTH_ERROR', error: 'Invalid token' }));
            }
          }

          if (message.type === 'HEARTBEAT' && clientUser) {
            const activity = message.payload?.activity || 'idle';
            const page = message.payload?.page || undefined;
            this.presenceService.updatePresence(clientUser.id, activity, page);

            // Update client ping
            const userSockets = this.clients.get(clientUser.id);
            if (userSockets) {
              const client = userSockets.find(c => c.socket === ws);
              if (client) client.lastPing = new Date();
            }

            // Broadcast presence to admins
            this.broadcastToAdmins({
              type: 'PRESENCE_UPDATE',
              payload: {
                userId: clientUser.id,
                name: clientUser.fullName || 'Student',
                roomNumber: clientUser.roomNumber || 'Room ?',
                status: 'online',
                activity,
                page,
                lastSeen: new Date().toISOString()
              }
            });
          }

          if (message.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG' }));
          }
        } catch (err) {
          console.error('[WebSocket] Message parse error:', err);
        }
      });

      ws.on('close', () => {
        if (clientUser) {
          this.unregisterClient(clientUser.id, ws);
        }
      });

      ws.on('error', (err) => {
        console.error('[WebSocket] Socket error:', err);
        if (clientUser) {
          this.unregisterClient(clientUser.id, ws);
        }
      });
    });

    console.log('[WebSocket] Real-time WebSocket server initialized on /ws');
  }

  private registerClient(user: AuthUser, socket: WebSocket) {
    const existing = this.clients.get(user.id) || [];
    existing.push({
      socket,
      user,
      connectedAt: new Date(),
      lastPing: new Date()
    });
    this.clients.set(user.id, existing);

    this.presenceService.updatePresence(user.id, 'online');

    // Inform admins
    this.broadcastToAdmins({
      type: 'PRESENCE_UPDATE',
      payload: {
        userId: user.id,
        name: user.fullName || 'Student',
        roomNumber: user.roomNumber || 'Room ?',
        status: 'online',
        activity: 'connected',
        lastSeen: new Date().toISOString()
      }
    });
  }

  private unregisterClient(userId: string, socket: WebSocket) {
    const existing = this.clients.get(userId);
    if (!existing) return;

    const filtered = existing.filter(c => c.socket !== socket);
    if (filtered.length === 0) {
      this.clients.delete(userId);
      this.presenceService.setOffline(userId);

      // Inform admins of disconnection
      this.broadcastToAdmins({
        type: 'PRESENCE_UPDATE',
        payload: {
          userId,
          status: 'offline',
          lastSeen: new Date().toISOString()
        }
      });
    } else {
      this.clients.set(userId, filtered);
    }
  }

  public broadcastToAdmins(message: { type: string; payload: any }) {
    const payload = JSON.stringify(message);
    for (const [, clientList] of this.clients.entries()) {
      for (const client of clientList) {
        if (client.user.role === 'ADMIN' && client.socket.readyState === WebSocket.OPEN) {
          client.socket.send(payload);
        }
      }
    }
  }

  public sendToUser(userId: string, message: { type: string; payload: any }) {
    const clientList = this.clients.get(userId);
    if (!clientList) return;

    const payload = JSON.stringify(message);
    for (const client of clientList) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(payload);
      }
    }
  }

  public broadcastAll(message: { type: string; payload: any }) {
    const payload = JSON.stringify(message);
    for (const [, clientList] of this.clients.entries()) {
      for (const client of clientList) {
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.send(payload);
        }
      }
    }
  }
}
