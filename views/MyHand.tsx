import { Box, Button, Flex, HStack, SlideFade, useDisclosure } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { Card, Errors } from 'shared/types'
import { useSnapshot } from 'store'
import { dataHandler } from 'utils/data'
import { sortBySuitAndValue } from 'utils/sort'
import { trpc } from 'utils/trpc'
import { ChoosePartnerModal } from 'views/ChoosePartnerModal'
import { PlayingCard } from 'views/PlayingCard'

export const MyHand = () => {
  const { snapshot } = useSnapshot()
  const [selectedCard, setSelectedCard] = useState<Card>()
  const [minHeight, setMinHeight] = useState(0)
  const [shouldFadeIn, setShouldFadeIn] = useState(false)
  const [maxHeight, setMaxHeight] = useState<number>()
  const ref = useRef<HTMLDivElement>(null)
  const modal = useDisclosure()

  const mutationOptions = { onSuccess: dataHandler(() => {}, handleError) }
  const playBindingTrickMutation = trpc.playBindingTrick.useMutation(mutationOptions)
  const playRegularTrickMutation = trpc.playRegularTrick.useMutation(mutationOptions)

  useEffect(() => {
    switch (snapshot?.roundPhase) {
      case 'bidding':
      case 'killed':
      case 'over':
        setSelectedCard(undefined)
    }
  }, [snapshot?.roundPhase])

  useEffect(() => {
    const clientHeight = ref.current?.clientHeight || 0
    if (clientHeight !== minHeight && snapshot?.roundPhase === 'bidding') {
      setMinHeight(clientHeight)
    }
  })

  useEffect(() => {
    let timeout = setTimeout(() => {
      if (snapshot?.roundPhase === 'bidding') {
        setMaxHeight(minHeight)
      }
      setShouldFadeIn(true)
    }, 1000)

    return () => clearTimeout(timeout)
  }, [minHeight, snapshot?.roundPhase])

  if (!snapshot) {
    return null
  }

  const { gameId, playerSecret } = snapshot

  const getCardStyle = (cardId: string) => {
    const transition = 'all 0.2s ease'
    const userSelect = 'none'

    if (selectedCard?.id !== cardId) {
      return {
        transition,
        userSelect,
      } as const
    }

    return {
      transition,
      userSelect,
      boxShadow: '0px 5px 15px rgba(0,0,0,0.2)',
      transform: 'translateY(-60px)',
    } as const
  }

  const getButtonStyle = (cardId: string) => {
    const transition = 'all 0.2s ease'

    if (selectedCard?.id !== cardId) {
      return {
        transition,
        opacity: 0,
      } as const
    }

    return {
      transition,
      opacity: snapshot?.isMyTurn ? 1 : 0.3,
      boxShadow: '0px 5px 15px rgba(0,0,0,0.2)',
      transform: 'translateY(-60px)',
    } as const
  }

  const handleCardClick = (card: Card) => {
    if (selectedCard?.id === card.id) {
      setSelectedCard(undefined)
    } else {
      setSelectedCard(card)
    }
  }

  const playBindingTrick = (bindingCard: Card) => {
    const startingCard = selectedCard

    if (bindingCard && startingCard) {
      playBindingTrickMutation.mutate({ gameId, playerSecret, bindingCard, startingCard })
    }
  }

  const playRegularTrick = () => {
    if (selectedCard) {
      playRegularTrickMutation.mutate({ gameId, playerSecret, card: selectedCard })
    }
  }

  const handlePlayPress = () => {
    if (!snapshot.trumpSuit) {
      modal.onOpen()
    } else {
      playRegularTrick()
    }
  }

  const { isMyTurn, myCards, roundPhase } = snapshot
  const sortedCards = sortBySuitAndValue(myCards)
  const canPlay = isMyTurn && roundPhase === 'tricking'

  return (
    <Box minHeight={minHeight} maxHeight={maxHeight}>
      <Box position="fixed" bottom={0} left={0} right={0} ref={ref}>
        <SlideFade in={shouldFadeIn} offsetY="120px">
          <Box paddingX="5" marginBottom="-14">
            <HStack spacing="-20" opacity={canPlay ? 1 : 0.3}>
              {sortedCards.map((card) => (
                <Flex key={card.id} direction="column" alignItems="center">
                  <Box paddingBottom="5">
                    <Button
                      style={getButtonStyle(card.id)}
                      onClick={handlePlayPress}
                      variant="solid"
                      colorScheme="green"
                      borderRadius="3xl"
                      disabled={!canPlay}
                      zIndex={card.id === selectedCard?.id ? undefined : -999}
                    >
                      Play
                    </Button>
                  </Box>
                  <Box maxHeight={200}>
                    <PlayingCard
                      style={getCardStyle(card.id)}
                      onClick={() => handleCardClick(card)}
                      card={card}
                    />
                  </Box>
                </Flex>
              ))}
            </HStack>
          </Box>
        </SlideFade>
      </Box>

      <ChoosePartnerModal
        selectedCard={selectedCard}
        onClose={modal.onClose}
        onChoose={playBindingTrick}
        isOpen={modal.isOpen}
      />
    </Box>
  )
}

const handleError = (error?: Errors) => {
  switch (error) {
    case Errors.BID_TOO_LOW: {
      alert('Your bid is too low!')
      break
    }
    case Errors.INVALID_PHASE:
    case Errors.FORBIDDEN: {
      alert('You are not allowed to do that right now')
      break
    }
    case Errors.TOO_FEW_PLAYERS: {
      alert('You need to be at least 4 players to play')
      break
    }
  }
}
