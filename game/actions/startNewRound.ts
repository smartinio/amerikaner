import { z } from 'zod'
import { MIN_PLAYER_COUNT } from 'game/constants'
import { mutate } from 'game/mutations'
import { getGameAsDealer } from 'game/store'
import { Errors, Game, isError, Player, Results } from 'game/types'
import { createRound, getNext, getPlayerNextTo } from 'game/utils'
import { publicProcedure } from 'server/trpc'
import { updateClients } from 'game/emitter'

export const startNewRound = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      dealerSecret: z.string(),
    })
  )
  .mutation(({ input }) => {
    const result = getGameAsDealer(input)

    if (isError(result)) {
      return result
    }

    const { game, dealer } = result

    if (game.players.length < MIN_PLAYER_COUNT) {
      return Errors.TOO_FEW_PLAYERS
    }

    if (game.round.phase !== 'over' && game.round.phase !== 'killed' && game.phase !== 'new') {
      return Errors.INVALID_PHASE
    }

    const outcome = (() => {
      const isReset = game.phase === 'over'

      if (isReset) {
        mutate.resetGame({ game })
      }

      const isRestart = game.round.phase === 'killed'

      const newRound = createRound({
        phase: 'bidding',
        currentPlayer: getPlayerNextTo(dealer, game),
      })

      mutate.newRound({ game, round: newRound })
      mutate.addEvent({
        game,
        event: { actor: dealer, action: isRestart ? 'restarted_round' : 'started_round' },
      })

      return Results.STARTED_ROUND
    })()

    updateClients(game)

    return outcome
  })
