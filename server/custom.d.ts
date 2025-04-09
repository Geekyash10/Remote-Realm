declare module 'peerjs-server' {
    import { Express } from 'express';
    import { Server } from 'http';

    interface PeerServerOptions {
        path?: string;
        port?: number;
        key?: string;
        ssl?: {
            key: string;
            cert: string;
        };
        proxied?: boolean;
        debug?: number;
    }

    export function ExpressPeerServer(server: Server, options?: PeerServerOptions): Express;
}
