import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io({
      path: '/',
      transports: ['websocket', 'polling'],
      query: { XTransformPort: '3003' },
    })

    socket.on('connect', () => {
      console.log('[RT] Connected')
      socket!.emit('join-room', 'admin')
    })

    socket.on('disconnect', () => {
      console.log('[RT] Disconnected')
    })
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
