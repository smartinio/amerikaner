import { Card, Game, Player, Round, Suit, Trick } from './types'

export const getNext = <T>(list: T[], predicate: (item: T) => boolean) => {
  const currentIndex = list.findIndex(predicate)
  const nextIndex = (currentIndex + 1) % list.length

  return list[nextIndex]
}

export const getPlayerNextTo = (current: Player, game: Game) => {
  return getNext(game.players, (p) => p.id === current.id)
}

export const getNextTricker = (game: Game, options?: { exclude?: Player }): Player => {
  const { currentPlayer } = game.round
  const { players } = game

  const eligiblePlayers = players.filter((player) => player.id !== options?.exclude?.id)

  return getNext(eligiblePlayers, (player) => player.id === currentPlayer.id)
}

export const getNextBidder = (game: Game): Player => {
  const { players } = game
  const { currentPlayer, folds } = game.round
  const eligiblePlayers = players.filter((player) => !folds.has(player))

  return getNext(eligiblePlayers, (player) => player.id === currentPlayer.id)
}

export const createRound = ({
  currentPlayer,
  ...overrides
}: { currentPlayer: Player } & Partial<Round>): Round => {
  return {
    currentPlayer,
    phase: 'bidding',
    folds: new Set<Player>(),
    bids: [],
    tricks: [],
    ...overrides,
  }
}

export const createTrick = ({ ...overrides }: Partial<Trick>): Trick => {
  return {
    playedCards: [],
    collected: false,
    ...overrides,
  }
}

export const createPlayer = ({
  id,
  name,
  ...overrides
}: { id: string; name: string } & Partial<Player>): Player => {
  return {
    id,
    name,
    cards: new Set(),
    score: 0,
    ...overrides,
  }
}

export const isTeamPlayer = (params: { player: Player; round: Round }) => {
  return (
    params.player.id === params.round.team?.leader.id ||
    params.player.id === params.round.team?.follower.id
  )
}

export const groupBySuit = (cards: Card[]) => {
  return cards.reduce((acc, card) => {
    acc[card.suit] = acc[card.suit] || []
    acc[card.suit].push(card)
    return acc
  }, {} as Record<Suit, Card[]>)
}
