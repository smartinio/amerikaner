import { dealCards } from 'game/dealCards'
import {
  PlayedCard,
  Trick,
  Game,
  Player,
  Round,
  Team,
  GameEvent,
  Bid,
  Card,
  Results,
} from 'game/types'
import { createTrick, getNext, getPlayerNextTo, isTeamPlayer } from 'game/utils'
import { last } from 'utils/last'
import { destroyGameAsOwner } from './store'

/**
 * Methods that mutate the game state are collected here
 * This makes it easier to spot which parts of the code mutate stuff
 * Useful when bug hunting or deciding whether to compute before or after state change
 */
export const mutate = {
  addBid: (params: { game: Game; bid: Bid }) => {
    params.game.round.bids.push(params.bid)
  },

  addEvent: (params: { game: Game; event: GameEvent }) => {
    params.game.events.push({ ...params.event, timestamp: Date.now() })
  },

  addPlayer: (params: { game: Game; player: Player }) => {
    params.game.players.push(params.player)
  },

  addTrick: (params: { game: Game }) => {
    const trick = createTrick({ playedCards: [] })
    params.game.round.tricks.push(trick)
    return trick
  },

  collectLastTrick: (params: { game: Game }) => {
    const lastTrick = last(params.game.round.tricks)
    if (lastTrick) {
      lastTrick.collected = true
      params.game.round.phase = 'tricking'
    }
  },

  finishGame: (params: { game: Game }) => {
    params.game.phase = 'over'
  },

  finishRound: (params: { game: Game }) => {
    const { game } = params
    const { players, round } = game
    const numTricksBidByTeam = last(round.bids)!.numTricks // @todo: Don't force
    const numWonTricksByTeam = getNumWonTricksByTeam({ round })
    const didTeamWin = numWonTricksByTeam >= numTricksBidByTeam
    const pointsForTeam = didTeamWin ? numTricksBidByTeam : -numTricksBidByTeam
    const team = round.team! // @todo: Don't force
    const { leader, follower } = team
    const soloPlayers = players.filter((player) => !isTeamPlayer({ player, round }))

    for (const soloPlayer of soloPlayers) {
      soloPlayer.score += getNumWonTricksByPlayer({ player: soloPlayer, round })
    }

    leader.score += pointsForTeam
    follower.score += pointsForTeam

    round.phase = 'over'
    game.dealer = getPlayerNextTo(game.dealer, game)

    return { didTeamWin, team }
  },

  finishTrick: (params: { game: Game; trick: Trick }) => {
    const { game, trick } = params
    const { round } = game
    const winning = decideWinningPlayedCard({ game, trick })
    const isTeamWinning = isTeamPlayer({ player: winning.player, round })

    trick.winner = isTeamWinning ? 'team' : winning.player
    round.phase = 'collecting'

    return winning.player
  },

  foldBid: (params: { game: Game; player: Player }) => {
    params.game.round.folds.add(params.player)
  },

  playCard: ({ trick, player, card }: PlayedCard & { trick: Trick }) => {
    trick.playedCards.push({ player, card })
    player.cards.delete(card)
  },

  newRound: (params: { game: Game; round: Round }) => {
    params.game.phase = 'round'
    params.game.round = params.round

    const { game } = params
    dealCards(game)
  },

  nextTurn: (params: { game: Game; player: Player }) => {
    params.game.round.currentPlayer = params.player
  },

  removePlayer: (params: { game: Game; player: Player }) => {
    const { game, player } = params

    if (game.players.length === 1) {
      const result = destroyGameAsOwner({ gameId: game.id, ownerId: player.id })

      if (result) {
        return result
      }

      return Results.DESTROYED_GAME
    }

    const nextPlayer = getPlayerNextTo(player, game)

    if (game.dealer === player) {
      game.dealer = nextPlayer
    }

    if (game.owner === player) {
      game.owner = nextPlayer
    }

    if (game.round.currentPlayer === player) {
      game.round.currentPlayer = nextPlayer
    }

    game.players = game.players.filter((p) => p.id !== player.id)
  },

  resetGame: (params: { game: Game }) => {
    params.game.events = []

    for (const player of params.game.players) {
      player.cards.clear()
      player.score = 0
    }
  },

  setBindingCard: (params: { game: Game; bindingCard: Card }) => {
    params.game.round.bindingCard = params.bindingCard
  },

  setRoundPhase: (params: { game: Game; phase: Round['phase'] }) => {
    params.game.round.phase = params.phase
  },

  setRoundTeam: (params: { game: Game; team: Team }) => {
    params.game.round.team = params.team
  },
}

/**
 * Private utils
 */

const decideWinningPlayedCard = (params: { game: Game; trick: Trick }) => {
  const [starter, ...playedCards] = params.trick.playedCards
  const trumpSuit = params.game.round.bindingCard?.suit

  let best = starter

  for (const played of playedCards) {
    const playedSuit = played.card.suit
    const playedValue = played.card.value
    const bestSuit = best.card.suit
    const bestValue = best.card.value
    const isHigherThanBestCard = playedSuit === bestSuit && playedValue > bestValue
    const isTrumpingBestCard = playedSuit !== bestSuit && playedSuit === trumpSuit

    if (isHigherThanBestCard || isTrumpingBestCard) {
      best = played
    }
  }

  return best
}

const getNumWonTricksByPlayer = (params: { player: Player; round: Round }) => {
  return params.round.tricks
    .filter((trick) => trick.winner !== 'team' && trick.winner?.id === params.player.id)
    .reduce((acc) => acc + 1, 0)
}

const getNumWonTricksByTeam = (params: { round: Round }) => {
  return params.round.tricks.filter((trick) => trick.winner === 'team').reduce((acc) => acc + 1, 0)
}
