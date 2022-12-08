import { Bid, Card, EventAction, Game, GamePhase, Player, RoundPhase, Suit, Trick } from './types'
import { last } from 'utils/last'

export type BidSnapshot = {
  playerId: string
  numTricks: number
  isAmerikaner: boolean
}

export type EventSnapshot = {
  actorId: 'server' | string
  action: EventAction
  bid?: BidSnapshot
}

export type PlayerSnapshot = {
  id: string
  isInTeam: boolean
  name: string
  score: number
  tricks: number
  folded: boolean
  playedCard?: Card
  bid?: number
}

export type TrickSnapshot = {
  isTeamWin?: boolean
  winnerId?: string
}

export type TeamSnapshot = {
  leaderName: string
  followerName: string
}

export type Snapshot = {
  gameId: string
  playerId: string
  playerSecret: string
  currentPlayerId: string
  isMyTurn: boolean
  myCards: Card[]
  othersCards: Card[]
  bids: BidSnapshot[]
  dealerId: string
  events: EventSnapshot[]
  gamePhase: GamePhase
  name: string
  ownerId: string
  password?: string
  pastTricks: TrickSnapshot[]
  players: PlayerSnapshot[]
  roundPhase: RoundPhase
  canStart: boolean
  startingCard?: Card
  highestBid?: BidSnapshot
  trumpSuit?: Suit
  team?: TeamSnapshot
}

const createBidSnapshot = (bid: Bid): BidSnapshot => {
  return {
    isAmerikaner: bid.isAmerikaner,
    numTricks: bid.numTricks,
    playerId: bid.player.id,
  }
}

const createTrickSnapshot = (trick: Trick): TrickSnapshot => {
  return {
    isTeamWin: trick.winner === 'team',
    winnerId: trick.winner === 'team' ? undefined : trick.winner?.id,
  }
}

const createPlayerSnapshotList = (game: Game): PlayerSnapshot[] => {
  const players = Array.from(game.players)

  return players.map((player) => {
    const { team } = game.round
    const isInTeam = team ? [team.leader.id, team.follower.id].includes(player.id) : false

    return {
      id: player.id,
      isInTeam,
      name: player.name,
      score: player.score,
      folded: game.round.folds.has(player),
      playedCard: last(game.round.tricks)?.playedCards.find((p) => p.player.id === player.id)?.card,
      bid: last(game.round.bids.filter((b) => b.player.id === player.id))?.numTricks,
      tricks:
        game.round.tricks
          .filter((t) => (t.winner === 'team' ? isInTeam : t.winner?.id === player.id))
          .filter((t) => t.collected)
          .reduce((x) => x + 1, 0) || 0,
    }
  })
}

const getHighestBid = (bidSnapshots: BidSnapshot[]): BidSnapshot | undefined => {
  if (!bidSnapshots.length) {
    return
  }

  return bidSnapshots.reduce((acc, bid) => (bid.numTricks > acc.numTricks ? bid : acc))
}

export const createSnapshot = (params: { player: Player; game: Game }): Snapshot => {
  const { player, game } = params

  return {
    gameId: game.id,
    playerId: player.id,
    playerSecret: player.secret,
    startingCard: last(game.round.tricks)?.playedCards[0]?.card,
    currentPlayerId: game.round.currentPlayer.id,
    isMyTurn: game.round.currentPlayer.id === player.id,
    myCards: Array.from(player.cards),
    othersCards: game.players
      .filter((p) => p.id !== player.id)
      .flatMap((player) => Array.from(player.cards)),
    bids: game.round.bids.map(createBidSnapshot),
    dealerId: game.dealer.id,
    events: game.events.map(
      (event): EventSnapshot => ({
        action: event.action,
        actorId: event.actor === 'server' ? 'server' : event.actor.id,
        bid: event.bid ? createBidSnapshot(event.bid) : undefined,
      })
    ),
    gamePhase: game.phase,
    name: game.name,
    ownerId: game.owner.id,
    pastTricks: game.round.tricks.slice(0, -1).map(createTrickSnapshot),
    players: createPlayerSnapshotList(game),
    roundPhase: game.round.phase,
    password: game.password,
    trumpSuit: game.round.bindingCard?.suit,
    highestBid: getHighestBid(game.round.bids.map(createBidSnapshot)),
    canStart:
      game.dealer.id === player.id &&
      ((game.phase === 'new' && game.players.length >= 4) ||
        game.round.phase === 'killed' ||
        game.round.phase === 'over'),
    team: game.round.team
      ? {
          leaderName: game.round.team.leader.name,
          followerName: game.round.team.follower.name,
        }
      : undefined,
  }
}
