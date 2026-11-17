// Disposable SMTP sink: receives only fictional accounts on the test Docker network.
import { createServer as tcpServer } from 'node:net'
import { createServer } from 'node:http'

const messages = []
tcpServer((socket) => {
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
      else if (/^DATA$/i.test(line)) { body = []; socket.write('354 end with dot\r\n') }
      else if (/^QUIT$/i.test(line)) socket.end('221 bye\r\n')
      else socket.write('250 OK\r\n')
    }
  })
}).listen(1025, '0.0.0.0')
createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(request.url === '/health' ? { ok: true } : messages))
}).listen(8025, '0.0.0.0')
