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
      let guestId = 'guest_' + Math.random().toString(36).substring(2, 9);

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

      if (!clientUser) {
        // Register initial connection as Guest session
        const guestUser: AuthUser = {
          id: guestId,
          email: 'guest@visitor',
          role: 'CUSTOMER',
          fullName: 'Guest Visitor',
          roomNumber: 'Browsing App (Unauthenticated)'
        };
        this.registerClient(guestUser, ws);
      }

      ws.on('message', (data: Buffer | string) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'AUTH' && message.payload?.token) {
            const decoded = verifyToken(message.payload.token);
            if (decoded) {
              // Transition from guest session to authenticated student session
              if (!clientUser && guestId) {
                this.unregisterClient(guestId, ws, true); // true = silent transition
              }
              clientUser = decoded;
              this.registerClient(clientUser, ws);
              ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', payload: { role: clientUser.role } }));
            } else {
              ws.send(JSON.stringify({ type: 'AUTH_ERROR', error: 'Invalid token' }));
            }
          }

          if (message.type === 'HEARTBEAT') {
            const activity = message.payload?.activity || 'browsing_menu';
            const page = message.payload?.page || undefined;
            const currentId = clientUser ? clientUser.id : guestId;
            const isGuest = !clientUser;
            const name = clientUser ? (clientUser.fullName || (clientUser.role === 'ADMIN' ? 'RoomBites Admin' : 'Student')) : 'Guest Visitor';
            const roomNumber = clientUser ? (clientUser.roomNumber || (clientUser.role === 'ADMIN' ? 'Admin Room 101' : 'Room ?')) : 'Browsing App (Unauthenticated)';
            const nowIso = new Date().toISOString();

            this.presenceService.updatePresence(currentId, activity, page);

            // Update client ping
            const userSockets = this.clients.get(currentId);
            if (userSockets) {
              const client = userSockets.find(c => c.socket === ws);
              if (client) client.lastPing = new Date();
            }

            // Broadcast presence to admins
            this.broadcastToAdmins({
              type: 'PRESENCE_UPDATE',
              payload: {
                userId: currentId,
                name,
                roomNumber,
                status: 'online',
                isOnline: true,
                isGuest,
                activity,
                page,
                lastSeen: nowIso,
                lastHeartbeat: nowIso
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
        const idToUnregister = clientUser ? clientUser.id : guestId;
        this.unregisterClient(idToUnregister, ws);
      });

      ws.on('error', (err) => {
        console.error('[WebSocket] Socket error:', err);
        const idToUnregister = clientUser ? clientUser.id : guestId;
        this.unregisterClient(idToUnregister, ws);
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

    const isGuest = user.id.startsWith('guest_');
    this.presenceService.updatePresence(user.id, isGuest ? 'browsing_menu' : 'online');

    const nowIso = new Date().toISOString();
    // Inform admins
    this.broadcastToAdmins({
      type: 'PRESENCE_UPDATE',
      payload: {
        userId: user.id,
        name: user.fullName || (user.role === 'ADMIN' ? 'RoomBites Admin' : isGuest ? 'Guest Visitor' : 'Student'),
        roomNumber: user.roomNumber || (user.role === 'ADMIN' ? 'Admin Room 101' : isGuest ? 'Browsing App (Unauthenticated)' : 'Room ?'),
        status: 'online',
        isOnline: true,
        isGuest,
        activity: isGuest ? 'browsing_menu' : 'connected',
        lastSeen: nowIso,
        lastHeartbeat: nowIso
      }
    });
  }

  private unregisterClient(userId: string, socket: WebSocket, silentTransition = false) {
    const existing = this.clients.get(userId);
    if (!existing) return;

    const filtered = existing.filter(c => c.socket !== socket);
    if (filtered.length === 0) {
      this.clients.delete(userId);
      this.presenceService.setOffline(userId);

      if (!silentTransition) {
        // Inform admins of disconnection
        this.broadcastToAdmins({
          type: 'PRESENCE_UPDATE',
          payload: {
            userId,
            status: 'offline',
            isOnline: false,
            lastSeen: new Date().toISOString(),
            lastHeartbeat: new Date().toISOString()
          }
        });
      }
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
