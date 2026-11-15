import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'node:http';
import { verifyToken, AuthUser } from '../middleware/auth.js';
import { PresenceService } from '../services/presenceService.js';
import { CustomerPresence } from '../types/index.js';

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
      let registeredId: string | null = null;

      // Extract token or device identifier
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const queryToken = url.searchParams.get('token');

      if (queryToken) {
        const decoded = verifyToken(queryToken);
        if (decoded) {
          clientUser = decoded;
          registeredId = clientUser.id;
          this.registerClient(clientUser, ws);
        }
      }

      if (!clientUser) {
        // Derive stable guest id from remote IP or query parameter
        const queryDevice = url.searchParams.get('deviceId');
        const remoteIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'guest').replace(/[^a-zA-Z0-9]/g, '').slice(-8);
        registeredId = queryDevice ? `dev_${queryDevice.slice(0, 8)}` : `guest_${remoteIp}`;

        const guestUser: AuthUser = {
          id: registeredId,
          email: 'guest@visitor',
          role: 'CUSTOMER',
          fullName: 'Guest Visitor',
          roomNumber: 'Browsing App (Unauthenticated)'
        };
        this.registerClient(guestUser, ws);
      }

      // If an admin just connected, immediately send them the current active presence roster
      if (clientUser && clientUser.role === 'ADMIN') {
        ws.send(JSON.stringify({
          type: 'PRESENCE_ROSTER',
          payload: { roster: this.getActiveRoster() }
        }));
      }

      ws.on('message', (data: Buffer | string) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'AUTH' && message.payload?.token) {
            const decoded = verifyToken(message.payload.token);
            if (decoded) {
              // Cleanly transition from previous temporary ID to real authenticated user
              if (registeredId && registeredId !== decoded.id) {
                this.unregisterClient(registeredId, ws);
              }
              clientUser = decoded;
              registeredId = clientUser.id;
              this.registerClient(clientUser, ws);
              ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', payload: { role: clientUser.role } }));

              // If admin, send full active roster immediately
              if (clientUser.role === 'ADMIN') {
                ws.send(JSON.stringify({
                  type: 'PRESENCE_ROSTER',
                  payload: { roster: this.getActiveRoster() }
                }));
              }
            } else {
              ws.send(JSON.stringify({ type: 'AUTH_ERROR', error: 'Invalid token' }));
            }
          }

          if (message.type === 'HEARTBEAT') {
            const activity = message.payload?.activity || 'browsing_menu';
            const page = message.payload?.page || undefined;
            const targetId = registeredId || (clientUser ? clientUser.id : 'unknown');

            this.presenceService.updatePresence(targetId, activity, page);

            // Update client ping
            const userSockets = this.clients.get(targetId);
            if (userSockets) {
              const client = userSockets.find(c => c.socket === ws);
              if (client) client.lastPing = new Date();
            }

            // Broadcast current roster snapshot
            this.broadcastPresenceRoster();
          }

          if (message.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG' }));
          }
        } catch (err) {
          console.error('[WebSocket] Message parse error:', err);
        }
      });

      ws.on('close', () => {
        if (registeredId) {
          this.unregisterClient(registeredId, ws);
        }
      });

      ws.on('error', (err) => {
        console.error('[WebSocket] Socket error:', err);
        if (registeredId) {
          this.unregisterClient(registeredId, ws);
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

    const isGuest = user.id.startsWith('guest_') || user.id.startsWith('dev_');
    this.presenceService.updatePresence(user.id, isGuest ? 'browsing_menu' : 'online');

    // Broadcast authoritative updated roster to admins
    this.broadcastPresenceRoster();
  }

  private unregisterClient(userId: string, socket: WebSocket) {
    const existing = this.clients.get(userId);
    if (!existing) return;

    const filtered = existing.filter(c => c.socket !== socket);
    if (filtered.length === 0) {
      this.clients.delete(userId);
      this.presenceService.setOffline(userId);
    } else {
      this.clients.set(userId, filtered);
    }

    // Broadcast authoritative updated roster to admins
    this.broadcastPresenceRoster();
  }

  public getActiveRoster(): CustomerPresence[] {
    const roster: CustomerPresence[] = [];
    const seenUserIds = new Set<string>();

    for (const [userId, clientList] of this.clients.entries()) {
      const activeSockets = clientList.filter(c => c.socket.readyState === WebSocket.OPEN);
      if (activeSockets.length === 0) continue;

      if (seenUserIds.has(userId)) continue;
      seenUserIds.add(userId);

      const client = activeSockets[0];
      const isGuest = userId.startsWith('guest_') || userId.startsWith('dev_');

      roster.push({
        userId,
        name: isGuest ? 'Guest Visitor' : (client.user.fullName || (client.user.role === 'ADMIN' ? 'RoomBites Admin' : 'Student')),
        roomNumber: isGuest ? 'Browsing App (Unauthenticated)' : (client.user.roomNumber || (client.user.role === 'ADMIN' ? 'Admin Room 101' : 'Room ?')),
        isOnline: true,
        isGuest,
        activity: isGuest ? 'browsing_menu' : 'online',
        lastHeartbeat: client.lastPing ? client.lastPing.toISOString() : new Date().toISOString()
      });
    }

    return roster;
  }

  public broadcastPresenceRoster() {
    const roster = this.getActiveRoster();
    this.broadcastToAdmins({
      type: 'PRESENCE_ROSTER',
      payload: { roster }
    });
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
