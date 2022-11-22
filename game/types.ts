export type Suit = 'spades' | 'clubs' | 'hearts' | 'diamonds'
export type Value = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export type Player = {
  readonly id: string
  readonly cards: Set<Card>
  name: string
  score: number
}

export type Card = {
  readonly id: `${Suit}:${Value}`
  readonly suit: Suit
  readonly value: Value
}

export type PlayedCard = {
  readonly player: Player
  readonly card: Card
}

export type Trick = {
  readonly playedCards: PlayedCard[]
  winner?: 'team' | Player
  collected: boolean
}

export type Bid = {
  readonly player: Player
  readonly numTricks: number
  readonly isAmerikaner: boolean
}

export type Team = {
  leader: Player
  follower: Player
}

export type RoundPhase = 'bidding' | 'tricking' | 'collecting' | 'killed' | 'over'

export type Round = {
  readonly bids: Bid[]
  readonly folds: Set<Player>
  readonly tricks: Trick[]
  phase: RoundPhase
  currentPlayer: Player
  bindingCard?: Card
  team?: Team
}

export type EventAction =
  | 'joined_team'
  | 'folded_bid'
  | 'placed_bid'
  | 'left_game'
  | 'kicked_player'
  | 'played_card'
  | 'played_start_and_binding_cards'
  | 'killed_round'
  | 'restarted_round'
  | 'started_round'
  | 'lost_round'
  | 'won_bid'
  | 'won_trick'
  | 'collected_trick'
  | 'won_round'
  | 'won_game'

export type GameEvent = {
  actor: Player | 'server'
  action: EventAction
  card?: Card
  bid?: Bid
  team?: Team
  startingCard?: Card
  bindingCard?: Card
  player?: Player
  timestamp?: number
}

export type GamePhase = 'new' | 'round' | 'over'

export type Game = {
  readonly id: string
  events: GameEvent[]
  players: Player[]
  phase: GamePhase
  name: string
  owner: Player
  dealer: Player
  round: Round
  password?: string
}

export enum Errors {
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_PHASE = 'INVALID_PHASE',
  PLAYER_ALREADY_JOINED = 'PLAYER_ALREADY_JOINED',
  NAME_ALREADY_TAKEN = 'NAME_ALREADY_TAKEN',
  TOO_FEW_PLAYERS = 'TOO_FEW_PLAYERS',
  TOO_MANY_PLAYERS = 'TOO_MANY_PLAYERS',
  BID_TOO_LOW = 'BID_TOO_LOW',
  UNEXPECTED = 'UNEXPECTED',
}

export enum Results {
  CREATED_GAME = 'CREATED_GAME',
  JOINED_GAME = 'JOINED_GAME',
  PLAYED_TRICK = 'PLAYED_TRICK',
  COLLECTED_TRICK = 'COLLECTED_TRICK',
  STARTED_ROUND = 'STARTED_ROUND',
  PLACED_BID = 'PLACED_BID',
  FOLDED_BID = 'FOLDED_BID',
  ROUND_OVER = 'ROUND_OVER',
  GAME_OVER = 'GAME_OVER',
  LEFT_GAME = 'LEFT_GAME',
  KICKED_PLAYER = 'KICKED_PLAYER',
  DESTROYED_GAME = 'DESTROYED_GAME'
}

const errors = new Set(Object.values(Errors))
const results = new Set(Object.values(Results))

export const isError = <T extends Errors, S>(data: T | S): data is T => {
  return errors.has(data as Errors)
}

export const isSuccess = <T extends Results, S>(data: T | S): data is T => {
  return results.has(data as Results)
}

export type ActionContract = {
  action: string
  params: Record<string, any>
}

export type Action<T extends ActionContract> = (params: T['params']) => any
