import { router } from 'server/trpc'

import { createNewGame } from 'game/actions/createNewGame'
import { foldBid } from 'game/actions/foldBid'
import { joinGame } from 'game/actions/joinGame'
import { leaveGame } from 'game/actions/leaveGame'
import { kickPlayer } from 'game/actions/kickPlayer'
import { placeBid } from 'game/actions/placeBid'
import { playBindingTrick } from 'game/actions/playBindingTrick'
import { playRegularTrick } from 'game/actions/playRegularTrick'
import { collectTrick } from 'game/actions/collectTrick'
import { startNewRound } from 'game/actions/startNewRound'
import { snapshotQuery, snapshotSubscription } from 'game/actions/snapshot'
import { keepAlive } from 'game/actions/keepAlive'

export const appRouter = router({
  createNewGame,
  foldBid,
  joinGame,
  leaveGame,
  kickPlayer,
  placeBid,
  playBindingTrick,
  playRegularTrick,
  collectTrick,
  startNewRound,
  snapshotQuery,
  snapshotSubscription,
  keepAlive,
})

// export type definition of API
export type AppRouter = typeof appRouter
