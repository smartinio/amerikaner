import { z } from 'zod'
import { MAX_TRICK_COUNT, WINNING_SCORE } from 'game/constants'
import { getGameAsCurrentPlayer } from 'game/store'
import { Errors, isError, Player, Results, Suit } from 'game/types'
import { getNextTricker } from 'game/utils'
import { last } from 'utils/last'
import { mutate } from 'game/mutations'
import { schemas } from 'shared/schemas'
import { publicProcedure } from 'server/trpc'
import { updateClients } from 'game/emitter'

export const playRegularTrick = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      card: schemas.card(),
      playerId: z.string(),
    })
  )
  .mutation(({ input }) => {
    const result = getGameAsCurrentPlayer(input)

    if (isError(result)) {
      return result
    }

    const { game, player } = result
    const { card } = input

    if (game.phase !== 'round') {
      console.error('Cannot trick when game phase is', game.phase)
      return Errors.INVALID_PHASE
    }

    if (game.round.phase !== 'tricking') {
      console.error('Cannot trick when round phase is', game.round.phase)
      return Errors.INVALID_PHASE
    }

    if (!player.cards.has(card)) {
      console.error('Cannot play card not on hand')
      return Errors.FORBIDDEN
    }

    const trick = last(game.round.tricks)

    if (!trick) {
      console.error('Cannot play a regular trick as the first trick of a round')
      return Errors.FORBIDDEN
    }

    const [starter] = trick.playedCards

    if (starter) {
      const followsSuit = card.suit === starter.card.suit
      const canFollowSuit = canPlayerFollowSuit({ player, suit: starter.card.suit })

      if (canFollowSuit && !followsSuit) {
        console.error('Player which can follow suit must do so')
        return Errors.FORBIDDEN
      }
    }

    const outcome = (() => {
      // Because the follower puts their card down immediately during the binding trick
      // We need to exclude them so they don't get assigned currentPlayer
      const isFirstTrick = game.round.tricks.length === 1
      const exclude = isFirstTrick ? game.round.team?.follower : undefined
      let nextTricker = getNextTricker(game, { exclude })

      mutate.playCard({ trick, player, card })
      mutate.addEvent({ game, event: { actor: player, action: 'played_card', card }})

      const trickIsOver = trick.playedCards.length === game.players.length

      if (trickIsOver) {
        const trickWinner = mutate.finishTrick({ game, trick })
        mutate.addEvent({ game, event: { actor: trickWinner, action: 'won_trick' }})
        nextTricker = trickWinner
      }

      mutate.nextTurn({ game, player: nextTricker })

      return Results.PLAYED_TRICK
    })()

    updateClients(game)

    return outcome
  })

const canPlayerFollowSuit = (params: { player: Player; suit: Suit }) => {
  return Array.from(params.player.cards).some((card) => card.suit === params.suit)
}
