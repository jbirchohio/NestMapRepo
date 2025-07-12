import { Server } from 'http.js';
import { WebSocket } from 'ws.js';
import { AddressInfo } from 'net.js';
import express from 'express';
import jwt from 'jsonwebtoken.js';
import { CollaborationWebSocketServer } from '../../websocket.js';

describe('CollaborationWebSocketServer', () => {
  let server: Server;
  let collaborationWS: CollaborationWebSocketServer;
  let port: number;
  let baseUrl: string;
  
  // Helper function to create a valid JWT token for testing
  const createToken = (userId: number, organizationId: number) => {
    return jwt.sign(
      { user_id: userId, organization_id: organizationId },
      process.env.SESSION_SECRET || 'dev-secret',
      { expiresIn: '1h' }
    );
  };
  
  // Helper function to create a WebSocket client
  const createClient = (userId: number, organizationId: number): Promise<WebSocket> => {
    const token = createToken(userId, organizationId);
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${baseUrl}/ws/collaboration?token=${token}`);
      
      ws.on('open', () => {
        resolve(ws);
      });
      
      ws.on('error', (err) => {
        reject(err);
      });
    });
  };
  
  beforeAll(() => {
    // Create a test server
    const app = express();
    server = app.listen(0); // Use port 0 to get a random available port
    port = (server.address() as AddressInfo).port;
    baseUrl = `ws://localhost:${port}`;
    
    // Initialize WebSocket server
    collaborationWS = new CollaborationWebSocketServer(server);
  });
  
  afterAll((done) => {
    server.close(done);
  });
  
  // Test case: Connection authentication
  test('should authenticate connection with valid token', async () => {
    const userId = 1;
    const organizationId = 100;
    
    // Create a client with a valid token
    const client = await createClient(userId, organizationId);
    
    // Wait for the welcome message
    const message = await new Promise<any>((resolve) => {
      client.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
    
    // Verify the welcome message
    expect(message).toEqual({
      type: 'connected',
      userId: userId,
      organizationId: organizationId
    });
    
    client.close();
  });
  
  // Test case: Connection with invalid token
  test('should reject connection with invalid token', async () => {
    // Create an invalid token
    const invalidToken = 'invalid-token.js';
    
    // Expect the connection to be rejected
    await expect(
      new Promise((_, reject) => {
        const ws = new WebSocket(`${baseUrl}/ws/collaboration?token=${invalidToken}`);
        
        ws.on('error', (err) => {
          reject(err);
        });
        
        ws.on('close', (code, reason) => {
          reject(new Error(`Connection closed with code ${code}: ${reason}`));
        });
      })
    ).rejects.toThrow();
  });
  
  // Test case: Joining a trip
  test('should handle joining a trip', async () => {
    const userId1 = 1;
    const userId2 = 2;
    const organizationId = 100;
    const tripId = 200;
    
    // Create two clients
    const client1 = await createClient(userId1, organizationId);
    const client2 = await createClient(userId2, organizationId);
    
    // Wait for both clients to connect
    await Promise.all([
      new Promise<void>((resolve) => {
        client1.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'connected') {
            resolve();
          }
        });
      }),
      new Promise<void>((resolve) => {
        client2.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'connected') {
            resolve();
          }
        });
      })
    ]);
    
    // Client 1 joins the trip
    client1.send(JSON.stringify({
      type: 'join_trip',
      trip_id: tripId
    }));
    
    // Client 2 joins the trip
    client2.send(JSON.stringify({
      type: 'join_trip',
      trip_id: tripId
    }));
    
    // Client 2 should receive a notification that client 1 joined
    const joinMessage = await new Promise<any>((resolve) => {
      const messageHandler = (data: any) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'user_joined' && message.userId === userId1) {
          client2.off('message', messageHandler);
          resolve(message);
        }
      };
      client2.on('message', messageHandler);
    });
    
    // Verify the join message
    expect(joinMessage).toEqual({
      type: 'user_joined',
      userId: userId1,
      organizationId: organizationId
    });
    
    // Verify active users for the trip
    expect(collaborationWS.getActiveTripUsers(tripId).sort()).toEqual([userId1, userId2].sort());
    
    client1.close();
    client2.close();
  });
  
  // Test case: Trip updates
  test('should broadcast trip updates to all clients in the trip', async () => {
    const userId1 = 1;
    const userId2 = 2;
    const organizationId = 100;
    const tripId = 300;
    const updateData = { title: 'Updated Trip Title' };
    
    // Create two clients
    const client1 = await createClient(userId1, organizationId);
    const client2 = await createClient(userId2, organizationId);
    
    // Wait for both clients to connect
    await Promise.all([
      new Promise<void>((resolve) => {
        client1.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'connected') {
            resolve();
          }
        });
      }),
      new Promise<void>((resolve) => {
        client2.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'connected') {
            resolve();
          }
        });
      })
    ]);
    
    // Both clients join the trip
    client1.send(JSON.stringify({
      type: 'join_trip',
      trip_id: tripId
    }));
    
    client2.send(JSON.stringify({
      type: 'join_trip',
      trip_id: tripId
    }));
    
    // Wait for join notifications to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Client 1 sends a trip update
    client1.send(JSON.stringify({
      type: 'trip_update',
      trip_id: tripId,
      data: updateData
    }));
    
    // Client 2 should receive the update
    const updateMessage = await new Promise<any>((resolve) => {
      const messageHandler = (data: any) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'trip_updated') {
          client2.off('message', messageHandler);
          resolve(message);
        }
      };
      client2.on('message', messageHandler);
    });
    
    // Verify the update message
    expect(updateMessage).toEqual({
      type: 'trip_updated',
      userId: userId1,
      data: updateData
    });
    
    client1.close();
    client2.close();
  });
  
  // Test case: Organization isolation
  test('should respect organization boundaries', async () => {
    const userId1 = 1;
    const userId2 = 2;
    const organizationId1 = 100;
    const organizationId2 = 200;
    const tripId = 400;
    const updateData = { title: 'Confidential Trip Title' };
    
    // Create two clients from different organizations
    const client1 = await createClient(userId1, organizationId1);
    const client2 = await createClient(userId2, organizationId2);
    
    // Wait for both clients to connect
    await Promise.all([
      new Promise<void>((resolve) => {
        client1.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'connected') {
            resolve();
          }
        });
      }),
      new Promise<void>((resolve) => {
        client2.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'connected') {
            resolve();
          }
        });
      })
    ]);
    
    // Both clients join the trip (this is possible since trip_id validation happens at API level)
    client1.send(JSON.stringify({
      type: 'join_trip',
      trip_id: tripId
    }));
    
    client2.send(JSON.stringify({
      type: 'join_trip',
      trip_id: tripId
    }));
    
    // Wait for join notifications to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Set up a message collector for client2
    const client2Messages: any[] = [];
    client2.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type !== 'connected') {
        client2Messages.push(message);
      }
    });
    
    // Client 1 sends a trip update
    client1.send(JSON.stringify({
      type: 'trip_update',
      trip_id: tripId,
      data: updateData
    }));
    
    // Wait some time to ensure messages would have been delivered if not filtered
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Client 2 should not receive updates from client 1 (different organization)
    expect(client2Messages.filter(m => m.type === 'trip_updated' && m.userId === userId1)).toHaveLength(0);
    
    client1.close();
    client2.close();
  });
});
