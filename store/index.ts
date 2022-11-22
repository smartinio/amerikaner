import { Errors, Results } from 'game/types'
import { Snapshot } from 'shared/types'
import { persist } from 'zustand/middleware'
import create from 'zustand'

export const useSnapshot = create(() => ({
  snapshot: undefined as Snapshot | undefined,
}))

export const setSnapshot = (snapshot: Snapshot) => useSnapshot.setState({ snapshot })

export const useResults = create(() => ({
  error: undefined as Errors | undefined,
  result: undefined as Results | undefined,
}))

export const setError = (error?: Errors) => useResults.setState({ error })

export const setResult = (result?: Results) => useResults.setState({ result })

// Save this separately to allow disconnects / refreshes
interface PlayerGame {
  gameId: string
  playerId: string
}

export const usePlayerGame = create<PlayerGame, [['zustand/persist', PlayerGame]]>(
  persist(() => ({ gameId: '', playerId: '' }), {
    name: 'player-game-storage',
  })
)

export const clearPlayerGame = () => {
  usePlayerGame.setState(() => ({ gameId: '', playerId: '' }))
}

export const setPlayerId = ({ playerId }: { playerId: string }) => {
  usePlayerGame.setState((state) => ({ ...state, playerId }))
}

export const setGameId = ({ gameId }: { gameId: string }) => {
  usePlayerGame.setState((state) => ({ ...state, gameId }))
}

export const setPlayerGame = (params: { playerId?: string; gameId?: string }) => {
  usePlayerGame.setState(params)
}
