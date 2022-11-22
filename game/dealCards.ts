import { CARDS_FOR_FIVE_PEOPLE, CARDS } from './constants'
import { Card, Game } from './types'
import { getNext } from './utils'

const shuffleInPlace = (deck: Card[]) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
}

export const dealCards = (game: Game) => {
  for (const player of game.players) {
    player.cards.clear()
  }

  const cards = game.players.length === 5 ? CARDS_FOR_FIVE_PEOPLE : CARDS
  const deck = Array.from(cards)

  shuffleInPlace(deck)

  let receivingPlayer = game.dealer

  for (const card of deck) {
    receivingPlayer = getNext(game.players, (p) => p.id === receivingPlayer.id)
    receivingPlayer.cards.add(card)
  }
}
