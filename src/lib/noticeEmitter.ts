import { EventEmitter } from 'events';

// Singleton emitter used by server routes to push SSE/messages to connected clients
const emitter = (global as any).__notice_emitter__ || new EventEmitter();
if (!(global as any).__notice_emitter__) (global as any).__notice_emitter__ = emitter;

export default emitter;
