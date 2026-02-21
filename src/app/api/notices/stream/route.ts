import noticeEmitter from '@/lib/noticeEmitter';

const encoder = new TextEncoder();

export async function GET(req: Request) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const sendEvent = (event: string, data: any) => {
    try {
      writer.write(encoder.encode(`event: ${event}\n`));
      writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (e) {}
  };

  const onCreated = (notice: any) => sendEvent('notice_created', notice);
  const onDeleted = (payload: any) => sendEvent('notice_deleted', payload);
  const onUpdated = (payload: any) => sendEvent('notice_updated', payload);

  noticeEmitter.on('notice_created', onCreated);
  noticeEmitter.on('notice_deleted', onDeleted);
  noticeEmitter.on('notice_updated', onUpdated);

  // keep-alive comment every 15s
  const keepAlive = setInterval(() => {
    try { writer.write(encoder.encode(': keepalive\n\n')); } catch (e) {}
  }, 15000);

  const cleanup = () => {
    clearInterval(keepAlive);
    try {
      noticeEmitter.off('notice_created', onCreated);
      noticeEmitter.off('notice_deleted', onDeleted);
      noticeEmitter.off('notice_updated', onUpdated);
    } catch (e) {}
    try { writer.close(); } catch (e) {}
  };

  // If client disconnects, close
  try {
    req.signal.addEventListener('abort', cleanup);
  } catch (e) {}

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
