import { IoAdapter } from "@nestjs/platform-socket.io";
import * as http from 'http'
import * as https from 'https'
import { Server } from "socket.io";

export class ExtendedSocketIoAdapterHttp extends IoAdapter {
    protected ioServer: Server;
  
    constructor(protected server: http.Server) {
        super();
  
        const options = {
            cors: {
                origin: true,
                methods: ["GET", "POST"],
                credentials: true,
            }
        }
  
        this.ioServer = new Server(server, options);
    }
    createIOServer (port: number, options?: any) {
        return this.ioServer
    }
}

export class ExtendedSocketIoAdapterHttps extends IoAdapter {
    protected ioServer: Server;
  
    constructor(protected server: https.Server) {
        super();
  
        const options = {
            cors: {
                origin: true,
                methods: ["GET", "POST", "PUT"],
                credentials: true,
            }
        }
  
        this.ioServer = new Server(server, options);
    }
    createIOServer (port: number, options?: any) {
        return this.ioServer
    }
}