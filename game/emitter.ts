import { EventEmitter } from 'events'
import { createSnapshot, Snapshot } from 'game/snapshot'
import { Game, Player } from './types'

const ee = new EventEmitter()

export type SocketEvent = Snapshot | 'KICKED'

export const emitter = {
  notify: (playerId: string, snapshot: SocketEvent) => {
    ee.emit(playerId, snapshot)
  },
  subscribe: (playerId: string, handler: (snapshot: SocketEvent) => void) => {
    ee.on(playerId, handler)
    return () => ee.off('snapshot', handler)
  },
}

export const updateClients = (game: Game) => {
  for (const player of game.players) {
    const snapshot = createSnapshot({ player, game })
    emitter.notify(player.id, snapshot)
  }
}

export const notifyKickedPlayer = (player: Player) => {
  emitter.notify(player.id, 'KICKED')
}
