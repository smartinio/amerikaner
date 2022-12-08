import { z } from 'zod'
import { MAX_TRICK_COUNT, WINNING_SCORE } from 'game/constants'
import { getGameAsCurrentPlayer } from 'game/store'
import { Errors, isError, Player, Results, Suit } from 'game/types'
import { getNextTricker } from 'game/utils'
import { last } from 'utils/last'
import { mutate } from 'game/mutations'
import { publicProcedure } from 'server/trpc'
import { updateClients } from 'game/emitter'

export const collectTrick = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      playerSecret: z.string(),
    })
  )
  .mutation(({ input }) => {
    const result = getGameAsCurrentPlayer(input)

    if (isError(result)) {
      return result
    }

    const { game, player } = result

    if (game.phase !== 'round') {
      console.error('Cannot collect when game phase is', game.phase)
      return Errors.INVALID_PHASE
    }

    if (game.round.phase !== 'collecting') {
      console.error('Cannot collect when round phase is', game.round.phase)
      return Errors.INVALID_PHASE
    }

    const trick = last(game.round.tricks)

    if (!trick || !trick.winner) {
      console.error('Cannot collect before a trick has been won')
      return Errors.FORBIDDEN
    }

    const teamPlayers = [game.round.team?.leader, game.round.team?.follower]

    if (trick.winner === 'team' && !teamPlayers.includes(player)) {
      console.error('Only the team can collect')
      return Errors.FORBIDDEN
    }

    if (trick.winner !== 'team' && trick.winner !== player) {
      console.error('Only the winner can collect')
      return Errors.FORBIDDEN
    }

    const outcome = (() => {
      mutate.collectLastTrick({ game })
      mutate.addEvent({ game, event: { actor: player, action: 'collected_trick' }})

      const roundIsOver = game.round.tricks.length === MAX_TRICK_COUNT

      mutate.addTrick({ game })

      if (roundIsOver) {
        const { didTeamWin, team } = mutate.finishRound({ game })

        if (didTeamWin) {
          mutate.addEvent({ game, event: { actor: team.leader, action: 'won_round', team }})
        } else {
          mutate.addEvent({ game, event: { actor: team.leader, action: 'lost_round', team }})
        }

        const gameWinner = game.players.find((player) => player.score >= WINNING_SCORE)
        const gameIsOver = gameWinner !== undefined

        if (gameIsOver) {
          mutate.finishGame({ game })
          mutate.addEvent({ game, event: { actor: gameWinner, action: 'won_game' } })
          return Results.GAME_OVER
        }

        return Results.ROUND_OVER
      }

      return Results.COLLECTED_TRICK
    })()

    updateClients(game)

    return outcome
  })
