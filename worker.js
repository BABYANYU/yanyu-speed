// Original deployment adapter Copyright 2026 烟雨.
// Frontend retains its separate Apache-2.0 and third-party notices.
const baseHeaders = {
  'Cache-Control': 'no-store, no-transform',
  'Timing-Allow-Origin': '*',
  'X-Content-Type-Options': 'nosniff'
};
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
  const origin = request.headers.get('Origin');
  if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site')
   return new Response('Forbidden', {status:403,headers:baseHeaders});
  const methods = {
   '/api/geo': ['GET'], '/api/ping': ['GET','HEAD'],
   '/api/download': ['GET','HEAD'], '/api/upload': ['POST']
  };
  if (methods[path] && !methods[path].includes(request.method))
   return new Response('Method not allowed',{status:405,headers:{...baseHeaders,Allow:methods[path].join(', ')}});
  if (path === '/api/geo' && request.method === 'GET') {
   const cf = request.cf || {};
   return Response.json({
    ip: request.headers.get('CF-Connecting-IP') || '',
    country: cf.country || '', country_code: cf.country || '',
    region: cf.region || '', city: cf.city || '', timezone: cf.timezone || '',
    latitude: cf.latitude ? Number(cf.latitude) : null,
    longitude: cf.longitude ? Number(cf.longitude) : null,
    isp: cf.asOrganization || '', organization: cf.asOrganization || '',
    asn_organization: cf.asOrganization || '', asn: cf.asn || null
   }, {headers:baseHeaders});
  }
  if (path === '/api/ping' && ['GET','HEAD'].includes(request.method))
   return new Response(null,{status:204,headers:baseHeaders});
  if (path === '/api/download' && ['GET','HEAD'].includes(request.method)) {
   const size = 32 * 1024 * 1024;
   const headers = {...baseHeaders,'Content-Type':'application/octet-stream','Content-Length':String(size),'Content-Encoding':'identity'};
   if (request.method === 'HEAD') return new Response(null,{headers});
   const chunk = crypto.getRandomValues(new Uint8Array(65536));
   let remaining = size;
   return new Response(new ReadableStream({
    pull(controller) {
     if (remaining <= 0) { controller.close(); return; }
     const n = Math.min(remaining,chunk.length);
     controller.enqueue(chunk.subarray(0,n)); remaining -= n;
    }
   }),{headers});
  }
  if (path === '/api/upload' && request.method === 'POST') {
   const limit=32*1024*1024;
   const declaredLength=request.headers.get('Content-Length');
   if (declaredLength !== null && !/^\d+$/.test(declaredLength))
    return new Response('Invalid Content-Length',{status:400,headers:baseHeaders});
   if (declaredLength !== null && BigInt(declaredLength) > BigInt(limit))
    return new Response('Too large',{status:413,headers:baseHeaders});
   let received=0;
   if (request.body) {
    const reader=request.body.getReader();
    try {
     while (true) {
      const {done,value}=await reader.read(); if(done) break;
      received+=value.byteLength;
      if(received>limit) {
       try { await reader.cancel(); } catch { /* cleanup cannot change the size verdict */ }
       return new Response('Too large',{status:413,headers:baseHeaders});
      }
     }
    } catch {
     return new Response('Upload interrupted',{status:400,headers:baseHeaders});
    } finally {
     reader.releaseLock();
    }
   }
   return Response.json({received},{headers:baseHeaders});
  }
  return new Response('Not found',{status:404,headers:baseHeaders});
 }
};
