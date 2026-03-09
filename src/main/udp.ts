import dgram from 'node:dgram'
import logger from './logger'

export function sendUdpMessage(message: string, ip: string, port: number): void {
  const socket = dgram.createSocket('udp4')
  const buffer = Buffer.from(message, 'utf-8')

  const timeout = setTimeout(() => {
    try { socket.close() } catch { /* ignore */ }
  }, 5000)

  socket.on('error', (err) => {
    logger.error(`UDP socket error: ${err}`)
    clearTimeout(timeout)
    try { socket.close() } catch { /* ignore */ }
  })

  socket.send(buffer, port, ip, (err) => {
    clearTimeout(timeout)
    if (err) {
      logger.error(`UDP send error: ${err}`)
    }
    try { socket.close() } catch { /* ignore */ }
  })
}
