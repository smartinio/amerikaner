import { z } from 'zod'
import { mutate } from 'game/mutations'
import { getGameAsCurrentPlayer } from 'game/store'
import { Errors, isError, Results } from 'game/types'
import { getNextBidder } from 'game/utils'
import { publicProcedure } from 'server/trpc'
import { updateClients } from 'game/emitter'

export const placeBid = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      playerId: z.string(),
      numTricks: z.number(),
      isAmerikaner: z.boolean(),
    })
  )
  .mutation(({ input }) => {
    const { gameId, playerId, numTricks, isAmerikaner } = input
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

    if (!isAmerikaner && game.round.bids.some((bid) => bid.numTricks >= numTricks)) {
      return Errors.BID_TOO_LOW
    }

    const outcome = (() => {
      const bid = { player, numTricks, isAmerikaner }
      const nextBidder = getNextBidder(game)
      const wonBid = nextBidder.id === player.id

      mutate.addBid({ game, bid })

      if (wonBid) {
        mutate.setRoundPhase({ game, phase: 'tricking' })
        mutate.addEvent({ game, event: { actor: player, action: 'won_bid', bid } })
      } else {
        mutate.nextTurn({ game, player: nextBidder })
        mutate.addEvent({ game, event: { actor: player, action: 'placed_bid', bid } })
      }

      return Results.PLACED_BID
    })()

    updateClients(game)

    return outcome
  })
