import { z } from 'zod'
import { getGameAsCurrentPlayer } from 'game/store'
import { Errors, isError, Results } from 'game/types'
import { getNextTricker } from 'game/utils'
import { mutate } from 'game/mutations'
import { publicProcedure } from 'server/trpc'
import { schemas } from 'shared/schemas'
import { updateClients } from 'game/emitter'

export const playBindingTrick = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      startingCard: schemas.card(),
      bindingCard: schemas.card(),
      playerId: z.string(),
    })
  )
  .mutation(({ input }) => {
    const result = getGameAsCurrentPlayer(input)

    if (isError(result)) {
      return result
    }

    const { game, player } = result
    const { startingCard, bindingCard } = input

    if (game.phase !== 'round') {
      console.error('Cannot trick when game phase is', game.phase)
      return Errors.INVALID_PHASE
    }

    if (game.round.phase !== 'tricking') {
      console.error('Cannot trick when round phase is', game.round.phase)
      return Errors.INVALID_PHASE
    }

    if (game.round.team) {
      console.error('Binding trick has already been played')
      return Errors.FORBIDDEN
    }

    if (!player.cards.has(startingCard)) {
      console.error('Cannot play card not on hand:', { startingCard, hand: player.cards })
      return Errors.FORBIDDEN
    }

    if (startingCard.suit !== bindingCard.suit) {
      console.error('Binding card must be same suit as starting card', {
        startingCard,
        bindingCard,
      })
      return Errors.FORBIDDEN
    }

    const playerWithBindingCard = game.players
      .filter((p) => p.id !== player.id)
      .find((p) => p.cards.has(bindingCard))

    if (!playerWithBindingCard) {
      console.error('No player has the binding card')
      return Errors.FORBIDDEN
    }

    const outcome = (() => {
      const nextTricker = getNextTricker(game, { exclude: playerWithBindingCard })

      const team = {
        leader: player,
        follower: playerWithBindingCard,
      }

      const trick = mutate.addTrick({ game })
      mutate.setRoundTeam({ game, team })
      mutate.setBindingCard({ game, bindingCard })
      mutate.nextTurn({ game, player: nextTricker })
      mutate.playCard({ trick, player: team.leader, card: startingCard })
      mutate.playCard({ trick, player: team.follower, card: bindingCard })
      mutate.addEvent({
        game,
        event: {
          actor: player,
          action: 'played_start_and_binding_cards',
          startingCard,
          bindingCard,
        },
      })
      mutate.addEvent({ game, event: { actor: player, action: 'joined_team', team } })

      return Results.PLAYED_TRICK
    })()

    updateClients(game)

    return outcome
  })
