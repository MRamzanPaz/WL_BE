import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { log } from 'console';
import { Server } from 'http';
import { Socket } from 'socket.io';

@WebSocketGateway({cors: true})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  

  @WebSocketServer() wss: Server;

  private connectedClients: Map<string, Socket> = new Map();
  private paymentTokensWithClients: Map<string, Socket> = new Map();
  private pendingMessage: Map<String, Array<any>> = new Map();

  afterInit(server: Server) {
    console.log('Socket Initialized');
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`Client Disconnected: ${client.id}`);

  }

  handleConnection(client: Socket, ...args: any[]) {
    this.connectedClients.set(client.id, client);
    console.log(`Client Connected: ${client.id}`);
  }

  boardCastMsg(token: string, payload: any){
    console.log("Socket payload ==> ",payload);
    console.log(this.wss.emit(token, payload));
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(client: Socket, payload: string): Promise<void> {
    // const newMessage = await this.messagesService.createMessage(payload);
    this.wss.emit('receiveMessage', "newMessage");
  }

  
  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any) {
    client.emit("receiveMessage", "handshake accepted!")
  }
  
  @SubscribeMessage('setPaymentToken')
  async handleSetPaymentToken(client: Socket, payload: string){
    if (this.paymentTokensWithClients.get(payload)) {
      this.paymentTokensWithClients.delete(payload);
    }
    this.paymentTokensWithClients.set(payload, client);
    console.log('receiveMessage', 'token-updated', payload);
    client.emit('receiveMessage', 'token-updated')
    const keyOldMessages = this.pendingMessage.get(payload);
    if (keyOldMessages) {
      for(const message of keyOldMessages){
        if (message.topic == 'transaction-updates') {
          await this.sendTransactionUpdates(payload, message.data)
        }
  
        if (message.topic == 'order-completed') {
          await this.sendOrderCompleteNotification(payload, message.data)
        }
      }
      this.pendingMessage.delete(payload);
    }

  }

  async sendTransactionUpdates(key: string, payload:any){
    console.log("send client", payload);
    const client = this.paymentTokensWithClients.get(key);
    // console.log();
    // console.log("is client connected? ", client.connected);
    if (client?.connected) {
      console.log("sended", client.connected);
      client.emit('transaction-updates', payload);
    }else{
      this.paymentTokensWithClients.delete(key);
      let pendingMessages = this.pendingMessage.get(key);
      if (pendingMessages) {
        const newMessage = [...pendingMessages, { topic: 'transaction-updates', data: payload  }];
        this.pendingMessage.delete(key);
        this.pendingMessage.set(key, newMessage)
      }else{
        this.pendingMessage.set(key, [{ topic: 'transaction-updates', data: payload  }])
      }
    }

  }

  async sendOrderCompleteNotification(key: string, payload:any){
    console.log("send client", payload);
    const client = this.paymentTokensWithClients.get(key);
    if (client?.connected) {
      console.log("sended");
      client.emit('order-completed', payload);
    }else{
      this.paymentTokensWithClients.delete(key);
      let pendingMessages = this.pendingMessage.get(key);
      if (pendingMessages) {
        const newMessage = [...pendingMessages, { topic: 'order-completed', data: payload  }];
        this.pendingMessage.delete(key);
        this.pendingMessage.set(key, newMessage)
      }else{
        this.pendingMessage.set(key, [{ topic: 'order-completed', data: payload  }])
      }
    }
  }
  // @SubscribeMessage('get-order')
  // handleOrderMessage( client: Socket, payload: any ){

  // }

}
