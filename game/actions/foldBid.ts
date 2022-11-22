import { z } from 'zod'
import { mutate } from 'game/mutations'
import { getGameAsCurrentPlayer } from 'game/store'
import { Errors, isError, Results } from 'game/types'
import { getNextBidder } from 'game/utils'
import { publicProcedure } from 'server/trpc'
import { updateClients } from 'game/emitter'
import { last } from 'utils/last'

export const foldBid = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      playerId: z.string(),
    })
  )
  .mutation(({ input }) => {
    const { gameId, playerId } = input
    const result = getGameAsCurrentPlayer({ playerId, gameId })

    if (isError(result)) {
      return result
    }

    const { game, player } = result

    if (game.phase !== 'round') {
      return Errors.INVALID_PHASE
    }

    if (game.round.phase !== 'bidding') {
      return Errors.INVALID_PHASE
    }

    const outcome = (() => {
      const nextBidder = getNextBidder(game)

      mutate.foldBid({ game, player })
      mutate.nextTurn({ game, player: nextBidder })
      mutate.addEvent({ game, event: { actor: player, action: 'folded_bid' } })

      const everyoneFolded = game.round.folds.size === game.players.length
      const everyoneFoldedButOne = game.round.folds.size === game.players.length - 1
      const winningBid = last(game.round.bids)

      if (everyoneFoldedButOne && winningBid) {
        mutate.addEvent({
          game,
          event: { actor: winningBid.player, action: 'won_bid', bid: winningBid },
        })
        mutate.setRoundPhase({ game, phase: 'tricking' })
      } else if (everyoneFolded) {
        mutate.addEvent({ game, event: { actor: 'server', action: 'killed_round' } })
        mutate.setRoundPhase({ game, phase: 'killed' })
      }

      return Results.FOLDED_BID
    })()

    updateClients(game)

    return outcome
  })
