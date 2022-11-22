import { AppRouter, appRouter } from 'server/routers/_app'
import { inferProcedureInput } from '@trpc/server'
import { games } from 'game/store'
import { Game, isError, Player, Results } from 'game/types'
import { CARDS } from 'game/constants'
import { mockPlayer1Cards, mockPlayer2Cards, mockPlayer3Cards, mockPlayer4Cards } from './fixtures'
import { dealCards } from 'game/dealCards'
import { groupBySuit } from 'game/utils'
import { last } from 'utils/last'
import { mockRandom } from 'jest-mock-random'

const mockDealCards = dealCards as jest.Mock
jest.mock('game/dealCards')

describe('app: happy flow', () => {
  const caller = appRouter.createCaller({})
  let gameId = ''
  let ownerId = ''
  let game: Game

  let player1: Player
  let player2: Player
  let player3: Player
  let player4: Player

  beforeAll(() => {
    mockDealCards.mockImplementation((game: Game) => {
      Object.values(mockPlayer1Cards).forEach((c) => game.players[0].cards.add(c))
      Object.values(mockPlayer2Cards).forEach((c) => game.players[1].cards.add(c))
      Object.values(mockPlayer3Cards).forEach((c) => game.players[2].cards.add(c))
      Object.values(mockPlayer4Cards).forEach((c) => game.players[3].cards.add(c))
    })
  })

  describe('New game', () => {
    test('Player 1 can create a game', async () => {
      const input: inferProcedureInput<AppRouter['createNewGame']> = {
        gameName: 'Game name',
        playerName: 'Player 1',
        password: 'SomePassword',
      }

      const result = await caller.createNewGame(input)

      expect(result).toEqual({
        playerId: expect.any(String),
        gameId: expect.any(String),
      })

      game = games.get(result.gameId)!

      expect(game.players).toHaveLength(1)

      gameId = result.gameId
      ownerId = result.playerId
    })

    test.each([2, 3, 4])('Player %s can join the game', async (n) => {
      const input: inferProcedureInput<AppRouter['joinGame']> = {
        playerName: 'Player ' + n,
        password: 'SomePassword',
        gameId,
      }

      const result = await caller.joinGame(input)

      expect(result).toEqual({
        playerId: expect.any(String),
        gameId: expect.any(String),
      })

      expect(game.players).toHaveLength(n)
    })

    test('Player 1 can start the game', async () => {
      const input: inferProcedureInput<AppRouter['startNewRound']> = {
        dealerId: ownerId,
        gameId,
      }

      const result = await caller.startNewRound(input)

      expect(result).toEqual(Results.STARTED_ROUND)
      expect(game.phase).toEqual('round')
      expect(game.round.phase).toEqual('bidding')
      expect(game.round.currentPlayer.name).toEqual('Player 2')

      for (const player of game.players) {
        expect(player.cards.size).toEqual(13)
      }

      player1 = game.players[0]
      player2 = game.players[1]
      player3 = game.players[2]
      player4 = game.players[3]
    })
  })

  describe('Bidding', () => {
    test('Player 2 can place a bid (6)', async () => {
      const input: inferProcedureInput<AppRouter['placeBid']> = {
        isAmerikaner: false,
        numTricks: 6,
        playerId: player2.id,
        gameId,
      }

      const result = await caller.placeBid(input)

      expect(result).toEqual(Results.PLACED_BID)
      expect(game.phase).toEqual('round')
      expect(game.round.phase).toEqual('bidding')
      expect(game.round.currentPlayer.name).toEqual('Player 3')
    })

    test('Player 3 can fold', async () => {
      const input: inferProcedureInput<AppRouter['foldBid']> = {
        playerId: player3.id,
        gameId,
      }

      const result = await caller.foldBid(input)

      expect(result).toEqual(Results.FOLDED_BID)
      expect(game.phase).toEqual('round')
      expect(game.round.phase).toEqual('bidding')
      expect(game.round.currentPlayer.name).toEqual('Player 4')
    })

    test('Player 4 can place a higher bid (8)', async () => {
      const input: inferProcedureInput<AppRouter['placeBid']> = {
        isAmerikaner: false,
        numTricks: 8,
        playerId: player4.id,
        gameId,
      }

      const result = await caller.placeBid(input)

      expect(result).toEqual(Results.PLACED_BID)
      expect(game.phase).toEqual('round')
      expect(game.round.phase).toEqual('bidding')
      expect(game.round.currentPlayer.name).toEqual('Player 1')
    })

    test('Player 1 can fold', async () => {
      const input: inferProcedureInput<AppRouter['foldBid']> = {
        playerId: player1.id,
        gameId,
      }

      const result = await caller.foldBid(input)

      expect(result).toEqual(Results.FOLDED_BID)
      expect(game.phase).toEqual('round')
      expect(game.round.phase).toEqual('bidding')
      expect(game.round.currentPlayer.name).toEqual('Player 2')
    })

    test('Player 2 can raise their bid (9)', async () => {
      const input: inferProcedureInput<AppRouter['placeBid']> = {
        isAmerikaner: false,
        numTricks: 9,
        playerId: player2.id,
        gameId,
      }

      const result = await caller.placeBid(input)

      expect(result).toEqual(Results.PLACED_BID)
      expect(game.phase).toEqual('round')
      expect(game.round.phase).toEqual('bidding')
      expect(game.round.currentPlayer.name).toEqual('Player 4')
    })

    test('Player 4 can raise their bid (10)', async () => {
      const input: inferProcedureInput<AppRouter['placeBid']> = {
        isAmerikaner: false,
        numTricks: 10,
        playerId: player4.id,
        gameId,
      }

      const result = await caller.placeBid(input)

      expect(result).toEqual(Results.PLACED_BID)
      expect(game.phase).toEqual('round')
      expect(game.round.phase).toEqual('bidding')
      expect(game.round.currentPlayer.name).toEqual('Player 2')
    })

    test('Player 2 can fold, making Player 4 bid winner', async () => {
      const input: inferProcedureInput<AppRouter['foldBid']> = {
        playerId: player2.id,
        gameId,
      }

      const result = await caller.foldBid(input)

      expect(result).toEqual(Results.FOLDED_BID)
      expect(game.phase).toEqual('round')
      expect(game.round.phase).toEqual('tricking')
      expect(game.round.currentPlayer.name).toEqual('Player 4')
    })
  })

  describe('First round', () => {
    describe('Binding trick', () => {
      test('Player 4 can play the binding trick (automatically playing for Player 2 as well)', async () => {
        const input: inferProcedureInput<AppRouter['playBindingTrick']> = {
          startingCard: { id: mockPlayer4Cards['clubs:2'].id },
          bindingCard: { id: mockPlayer2Cards['clubs:14'].id },
          playerId: player4.id,
          gameId,
        }

        const result = await caller.playBindingTrick(input)

        expect(result).toEqual(Results.PLAYED_TRICK)
        expect(game.phase).toEqual('round')
        expect(game.round.phase).toEqual('tricking')
        expect(game.round.team?.leader).toEqual(player4)
        expect(game.round.team?.follower.name).toEqual('Player 2')
        expect(game.round.currentPlayer.name).toEqual('Player 1')
      })

      test('Player 1 can play next', async () => {
        const input: inferProcedureInput<AppRouter['playRegularTrick']> = {
          card: { id: mockPlayer1Cards['clubs:3'].id },
          playerId: player1.id,
          gameId,
        }

        const result = await caller.playRegularTrick(input)

        expect(result).toEqual(Results.PLAYED_TRICK)
        expect(game.phase).toEqual('round')
        expect(game.round.phase).toEqual('tricking')
        expect(game.round.currentPlayer.name).toEqual('Player 3')
      })

      test('Player 3 can play next', async () => {
        const input: inferProcedureInput<AppRouter['playRegularTrick']> = {
          card: { id: mockPlayer3Cards['clubs:10'].id },
          playerId: player3.id,
          gameId,
        }

        const result = await caller.playRegularTrick(input)

        expect(result).toEqual(Results.PLAYED_TRICK)
        expect(game.phase).toEqual('round')
        expect(game.round.phase).toEqual('collecting')
        expect(game.round.currentPlayer.name).toEqual('Player 2')
      })

      test('Player 2 can collect the trick and starts the next trick', async () => {
        const input: inferProcedureInput<AppRouter['collectTrick']> = {
          playerId: player2.id,
          gameId,
        }

        const result = await caller.collectTrick(input)

        expect(result).toEqual(Results.COLLECTED_TRICK)
        expect(game.phase).toEqual('round')
        expect(game.round.phase).toEqual('tricking')
        expect(game.round.currentPlayer.name).toEqual('Player 2')
      })

      test('Team won the binding trick', async () => {
        expect(game.round.tricks).toEqual([
          expect.objectContaining({ winner: 'team', playedCards: expect.any(Array) }),
          expect.objectContaining({ playedCards: expect.any(Array) }),
        ])
      })
    })

    describe('Remaining tricks (simulation)', () => {
      test('Plays until the end', async () => {
        for (let i = 0; i < 52 - 4; i++) {
          const { currentPlayer } = game.round
          const [start] = last(game.round.tricks)!.playedCards
          const hand = Array.from(currentPlayer.cards)

          const [bestCardInSuit] = hand
            .filter((c) => c.suit === start?.card.suit)
            .sort((a, b) => b.value - a.value)

          const [worstCardInHand] = hand
            .sort((a) => (a.suit === game.round.bindingCard?.suit ? -1 : 1))
            .sort((a, b) => a.value - b.value)

          const cardToPlay = bestCardInSuit ?? worstCardInHand

          const input: inferProcedureInput<AppRouter['playRegularTrick']> = {
            card: { id: cardToPlay.id },
            playerId: currentPlayer.id,
            gameId,
          }

          const result = await caller.playRegularTrick(input)

          if (isError(result)) {
            console.error(result)
            throw new Error('Failed to play until round end')
          }

          if (game.round.phase === 'collecting') {
            const result = await caller.collectTrick({
              playerId: game.round.currentPlayer.id,
              gameId,
            })

            if (isError(result)) {
              console.error(result)
              throw new Error('Failed to play until round end')
            }
          }
        }

        expect(game.round.phase).toBe('over')
        expect(player2.score).toBe(-10)
        expect(player4.score).toBe(-10)
      })
    })
  })

  describe('Remaining rounds (simulation)', () => {
    beforeAll(() => {
      jest.unmock('game/dealCards')
      mockRandom([0.4, 0.3, 0.5, 0.6, 0.2, 0.1, 0.9, 0.8, 0.7])
    })

    it('Plays until the end', async () => {
      while (game.phase !== 'over') {
        const { dealer } = game

        const input: inferProcedureInput<AppRouter['startNewRound']> = {
          dealerId: dealer.id,
          gameId,
        }

        const result = await caller.startNewRound(input)

        expect(result).toEqual(Results.STARTED_ROUND)

        while (game.round.phase === 'bidding') {
          const player = game.round.currentPlayer

          const [trumpCards] = Object.values(groupBySuit(Array.from(player.cards))).sort(
            (a, b) => b.length - a.length
          )

          const lastBid = last(game.round.bids)
          const lastBidAmount = lastBid?.numTricks || 4

          if (
            trumpCards.length < 5 ||
            lastBidAmount > trumpCards.length - 1 ||
            lastBidAmount > 11
          ) {
            await caller.foldBid({
              playerId: player.id,
              gameId,
            })
          } else {
            await caller.placeBid({
              playerId: player.id,
              gameId,
              numTricks: lastBidAmount + 1,
              isAmerikaner: false,
            })
          }
        }

        while (['tricking', 'collecting'].includes(game.round.phase)) {
          const { currentPlayer } = game.round
          const hand = Array.from(currentPlayer.cards)

          if (!game.round.bindingCard) {
            const [trumpCards] = Object.values(groupBySuit(hand)).sort(
              (a, b) => b.length - a.length
            )
            const [worstTrumpCard] = trumpCards.sort((a, b) => a.value - b.value)
            const othersCards = CARDS.filter((card) => !currentPlayer.cards.has(card))
            const othersInSuit = othersCards.filter((card) => card.suit === worstTrumpCard.suit)
            const [bestOtherTrumpCard] = othersInSuit.sort((a, b) => b.value - a.value)

            const input: inferProcedureInput<AppRouter['playBindingTrick']> = {
              startingCard: { id: worstTrumpCard.id },
              bindingCard: { id: bestOtherTrumpCard.id },
              playerId: currentPlayer.id,
              gameId,
            }

            const result = await caller.playBindingTrick(input)

            if (isError(result)) {
              console.error(result)
              throw new Error('Failed to play until round end (binding trick)')
            }
          } else {
            const [start] = last(game.round.tricks)!.playedCards

            const [bestCardInSuit] = hand
              .filter((c) => c.suit === start?.card.suit)
              .sort((a, b) => b.value - a.value)

            const [worstCardInHand] = hand.sort((a, b) => a.value - b.value)

            const cardToPlay = bestCardInSuit ?? worstCardInHand

            const input: inferProcedureInput<AppRouter['playRegularTrick']> = {
              card: { id: cardToPlay.id },
              playerId: currentPlayer.id,
              gameId,
            }

            const result = await caller.playRegularTrick(input)

            if (isError(result)) {
              console.error(result)
              throw new Error('Failed to play until round end (regular trick)')
            }
          }

          if (game.round.phase === 'collecting') {
            const result = await caller.collectTrick({
              playerId: game.round.currentPlayer.id,
              gameId,
            })

            if (isError(result)) {
              console.error(result)
              throw new Error('Failed to play until round end')
            }
          }
        }
      }

      const winners = game.players.filter(player => player.score >= 52)
      expect(winners).toHaveLength(1)
    })
  })
})
