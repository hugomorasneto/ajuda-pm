// Disposable SMTP sink: receives only fictional accounts on the test Docker network.
import { createServer as tcpServer } from 'node:net'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { createServer as tlsServer } from 'node:tls'

const messages = []
function receive(socket) {
  socket.setEncoding('utf8')
  socket.write('220 local.test ESMTP\r\n')
  let buffer = ''
  let body = null
  socket.on('data', (chunk) => {
    buffer += chunk.toString()
    let end
    while ((end = buffer.indexOf('\r\n')) !== -1) {
      const line = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      if (body !== null) {
        if (line === '.') {
          messages.push(body.join('\r\n'))
          body = null
          socket.write('250 stored locally\r\n')
        } else body.push(line)
      } else if (/^EHLO|^HELO/i.test(line)) socket.write('250 local.test\r\n')
      else if (/^AUTH PLAIN /i.test(line)) socket.write('235 authenticated locally\r\n')
      else if (/^DATA$/i.test(line)) { body = []; socket.write('354 end with dot\r\n') }
      else if (/^QUIT$/i.test(line)) socket.end('221 bye\r\n')
      else socket.write('250 OK\r\n')
    }
  })
}
tcpServer(receive).listen(1025, '0.0.0.0')
if (process.env.INVITE_TLS === 'true') {
  tlsServer({ key: readFileSync('/certs/key.pem'), cert: readFileSync('/certs/cert.pem') }, receive).listen(1465, '0.0.0.0')
}
createServer(async (request, response) => {
  // Only this isolated fixture proxies real local Auth/PostgREST for the Edge container.
  if (process.env.INVITE_TLS === 'true' && /^\/(auth|rest)\/v1\//.test(request.url)) {
    try {
      const target = request.url.startsWith('/auth/') ? 'http://auth:9999' : 'http://rest:3000'
      const body = []
      for await (const chunk of request) body.push(chunk)
      const headers = { ...request.headers }
      delete headers.host
      delete headers['content-length']
      const upstream = await fetch(target + request.url.replace(/^\/(auth|rest)\/v1/, ''), {
        method: request.method, headers, ...(body.length ? { body: Buffer.concat(body) } : {}),
      })
      response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' })
      response.end(Buffer.from(await upstream.arrayBuffer()))
    } catch { response.writeHead(502); response.end('Local proxy failed') }
    return
  }
  if (/^\/templates\/(confirmation|invite|magic_link|recovery|email_change|reauthentication)\.html$/.test(request.url)) {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(readFileSync('/templates/' + request.url.split('/').at(-1)))
    return
  }
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(request.url === '/health' ? { ok: true } : messages))
}).listen(8025, '0.0.0.0')
