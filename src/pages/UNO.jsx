import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ref, set, get, update, onValue } from 'firebase/database';
import { rtdb } from '../firebase';
import { useAuth } from '../context/AuthContext';

const COLORS = ['red', 'blue', 'green', 'yellow'];
const SPECIALS = ['skip', 'reverse', 'draw2'];
const WILDS = ['wild', 'wild_draw4'];

const createDeck = () => {
  const deck = [];
  COLORS.forEach(color => {
    deck.push({ color, value: '0' });
    for (let i = 1; i <= 9; i++) {
      deck.push({ color, value: i.toString() });
      deck.push({ color, value: i.toString() });
    }
    SPECIALS.forEach(special => {
      deck.push({ color, value: special });
      deck.push({ color, value: special });
    });
  });
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'black', value: 'wild' });
    deck.push({ color: 'black', value: 'wild_draw4' });
  }
  return deck;
};

const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const Card = ({ card, id, isDraggable = true }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: !isDraggable,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const getCardDisplay = () => {
    if (card.value === 'wild') {
      return { text: 'WILD', color: 'wild' };
    }
    if (card.value === 'wild_draw4') {
      return { text: 'WILD +4', color: 'wild_draw4' };
    }
    return { text: card.value, color: card.color };
  };

  const { text, color } = getCardDisplay();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`w-16 h-24 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center text-lg font-bold cursor-pointer ${color === 'red' ? 'text-red-600' : color === 'blue' ? 'text-blue-600' : color === 'green' ? 'text-green-600' : color === 'yellow' ? 'text-yellow-600' : color === 'wild' ? 'text-white bg-linear-to-br from-red-500 via-blue-500 to-green-500 border-black' : color === 'wild_draw4' ? 'text-white bg-black border-black' : 'text-black'}`}
    >
      {text}
    </div>
  );
};

const DiscardPile = ({ topCard, onDrop }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'discard',
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-20 h-28 bg-gray-200 border-2 border-dashed rounded-lg flex items-center justify-center ${isOver ? 'border-blue-500' : 'border-gray-400'}`}
      onDrop={onDrop}
    >
      {topCard ? <Card card={topCard} id="top" isDraggable={false} /> : <span className="text-gray-500">Discard</span>}
    </div>
  );
};

const UNO = () => {
  const { user } = useAuth();
  const [gameId, setGameId] = useState(null);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(true);
  const [joinGameId, setJoinGameId] = useState('');
  const [fullPlayers, setFullPlayers] = useState([]);
  const [playerNames, setPlayerNames] = useState([]);
  const [wildChosen, setWildChosen] = useState(false);
  const [showCreateOptionsModal, setShowCreateOptionsModal] = useState(false);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [createdGameId, setCreatedGameId] = useState('');

  const [deck, setDeck] = useState([]);
  const [discard, setDiscard] = useState([]);
  const [players, setPlayers] = useState([[], [], [], []]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [currentColor, setCurrentColor] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [numPlayers, setNumPlayers] = useState(4);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [showColorModal, setShowColorModal] = useState(false);
  const [pendingWild, setPendingWild] = useState(null);
  const [unoCalled, setUnoCalled] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [turnTimeLeft, setTurnTimeLeft] = useState(10);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const createGame = async (withBots = true) => {
    if (!user) return;
    const newGameId = Math.random().toString(36).substr(2, 9);
    const gameRef = ref(rtdb, 'unoGames/' + newGameId);
    const players = [{ uid: user.uid, name: user.displayName || user.email, hand: [] }];
    if (withBots) {
      players.push({ uid: 'bot1', name: 'Bot 1', hand: [] });
      players.push({ uid: 'bot2', name: 'Bot 2', hand: [] });
      players.push({ uid: 'bot3', name: 'Bot 3', hand: [] });
    }
    const initialGameState = {
      deck: shuffle(createDeck()),
      discard: [],
      players: players,
      currentPlayer: 0,
      direction: 1,
      currentColor: null,
      gameOver: false,
      winner: null,
      numPlayers: players.length,
      timeLimit: 10,
      timeLeft: 10 * 60,
      unoCalled: new Array(players.length).fill(false),
      turnTimeLeft: 10,
      host: user.uid,
      createdAt: new Date().toISOString(),
    };
    // Deal cards
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < players.length; j++) {
        initialGameState.players[j].hand.push(initialGameState.deck.pop());
      }
    }
    initialGameState.discard = [initialGameState.deck.pop()];
    initialGameState.currentColor = initialGameState.discard[0].color;
    await set(gameRef, initialGameState);
    setGameId(newGameId);
    setPlayerIndex(0);
    setShowCreateOptionsModal(false);
    if (withBots) {
      setShowMultiplayerModal(false);
    } else {
      setCreatedGameId(newGameId);
      setShowShareLinkModal(true);
    }
  };

  const joinGame = async () => {
    if (!user || !joinGameId) return;
    const gameRef = ref(rtdb, 'unoGames/' + joinGameId);
    const gameSnap = await get(gameRef);
    if (gameSnap.exists()) {
      const gameData = gameSnap.val();
      if (gameData.players.length < 4) {
        const newPlayers = [...gameData.players, { uid: user.uid, name: user.displayName || user.email, hand: [] }];
        // Deal cards to new player
        for (let i = 0; i < 7; i++) {
          newPlayers[newPlayers.length - 1].hand.push(gameData.deck.pop());
        }
        await update(gameRef, { players: newPlayers, deck: gameData.deck, numPlayers: newPlayers.length });
        setGameId(joinGameId);
        setPlayerIndex(newPlayers.length - 1);
        setShowMultiplayerModal(false);
      } else {
        alert('Game is full');
      }
    } else {
      alert('Game not found');
    }
  };

  useEffect(() => {
    if (!gameId) return;
    const gameRef = ref(rtdb, 'unoGames/' + gameId);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setDeck(data.deck);
        setDiscard(data.discard);
        setPlayers(data.players.map(p => p.hand));
        setCurrentPlayer(data.currentPlayer);
        setCurrentColor(data.currentColor);
        setGameOver(data.gameOver);
        setWinner(data.winner);
        setNumPlayers(data.numPlayers);
        setTimeLeft(data.timeLeft);
        setUnoCalled(data.unoCalled);
        setFullPlayers(data.players);
        setPlayerNames(data.players.map(p => p.name));
      }
    });
    return unsubscribe;
  }, [gameId]);

  const isValidPlay = useCallback((card, topCard) => {
    if (card.color === 'black') return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  }, [currentColor]);

  const playCard = useCallback(async (playerIndex, cardIndex) => {
    if (!players[playerIndex] || !players[playerIndex][cardIndex]) return;
    const card = players[playerIndex][cardIndex];
    const topCard = discard[discard.length - 1];
    if (!isValidPlay(card, topCard)) return;

    const gameRef = ref(rtdb, 'unoGames/' + gameId);
    const gameSnap = await get(gameRef);
    if (!gameSnap.exists()) return;
    const gameData = gameSnap.val();

    const newPlayers = gameData.players.map(p => ({ ...p, hand: [...p.hand] }));
    const playedCard = newPlayers[playerIndex].hand.splice(cardIndex, 1)[0];
    const newDiscard = [...gameData.discard, playedCard];
    let newDeck = [...gameData.deck];
    let newDirection = gameData.direction;
    let newCurrentPlayer = gameData.currentPlayer;

    if (playedCard.color !== 'black') {
      // Update currentColor in Realtime Database
      await update(gameRef, { currentColor: playedCard.color });
    } else {
      // Wild card
      if (fullPlayers[playerIndex]?.uid === user.uid) {
        if (!wildChosen) {
          setPendingWild({ playerIndex, cardIndex });
          setShowColorModal(true);
          return;
        } else {
          setWildChosen(false);
        }
      } else {
        const colors = ['red', 'blue', 'green', 'yellow'];
        await update(gameRef, { currentColor: colors[Math.floor(Math.random() * 4)] });
      }
    }

    // Handle special cards
    if (playedCard.value === 'skip') {
      newCurrentPlayer = ((gameData.currentPlayer + gameData.direction * 2) % gameData.numPlayers + gameData.numPlayers) % gameData.numPlayers;
    } else if (playedCard.value === 'reverse') {
      newDirection = -gameData.direction;
      newCurrentPlayer = ((gameData.currentPlayer + newDirection) % gameData.numPlayers + gameData.numPlayers) % gameData.numPlayers;
    } else if (playedCard.value === 'draw2') {
      const nextPlayer = ((gameData.currentPlayer + gameData.direction) % gameData.numPlayers + gameData.numPlayers) % gameData.numPlayers;
      for (let i = 0; i < 2; i++) {
        if (newDeck.length === 0) {
          if (newDiscard.length > 1) {
            newDeck = shuffle(newDiscard.slice(0, -1));
            newDiscard.splice(0, newDiscard.length - 1, newDiscard[newDiscard.length - 1]);
          }
        }
        if (newDeck.length > 0) {
          newPlayers[nextPlayer].hand.push(newDeck.pop());
        }
      }
      newCurrentPlayer = ((gameData.currentPlayer + gameData.direction * 2) % gameData.numPlayers + gameData.numPlayers) % gameData.numPlayers;
    } else if (playedCard.value === 'wild_draw4') {
      const nextPlayer = ((gameData.currentPlayer + gameData.direction) % gameData.numPlayers + gameData.numPlayers) % gameData.numPlayers;
      for (let i = 0; i < 4; i++) {
        if (newDeck.length === 0) {
          if (newDiscard.length > 1) {
            newDeck = shuffle(newDiscard.slice(0, -1));
            newDiscard.splice(0, newDiscard.length - 1, newDiscard[newDiscard.length - 1]);
          }
        }
        if (newDeck.length > 0) {
          newPlayers[nextPlayer].hand.push(newDeck.pop());
        }
      }
      newCurrentPlayer = ((gameData.currentPlayer + gameData.direction * 2) % gameData.numPlayers + gameData.numPlayers) % gameData.numPlayers;
    } else {
      newCurrentPlayer = ((gameData.currentPlayer + gameData.direction) % gameData.numPlayers + gameData.numPlayers) % gameData.numPlayers;
    }

    const newUnoCalled = [...gameData.unoCalled];
    if (newPlayers[playerIndex].hand.length === 1) {
      newUnoCalled[playerIndex] = true;
    }

    let updateData = {
      players: newPlayers,
      discard: newDiscard,
      deck: newDeck,
      direction: newDirection,
      currentPlayer: newCurrentPlayer,
      unoCalled: newUnoCalled,
    };

    if (newPlayers[playerIndex].hand.length === 0) {
      updateData.gameOver = true;
      updateData.winner = newPlayers[playerIndex].name;
    } else {
      updateData.currentPlayer = newCurrentPlayer;
    }

    await update(gameRef, updateData);
  }, [players, discard, isValidPlay, gameId, fullPlayers, user.uid, wildChosen]);

  const drawCard = useCallback(async (playerIndex) => {
    const gameRef = ref(rtdb, 'unoGames/' + gameId);
    const gameSnap = await get(gameRef);
    if (!gameSnap.exists()) return;
    const gameData = gameSnap.val();

    let newDeck = [...gameData.deck];
    let newDiscard = [...gameData.discard];
    if (newDeck.length === 0) {
      if (newDiscard.length <= 1) {
        setErrorMessage('Cannot draw: no cards left');
        return;
      }
      newDeck = shuffle(newDiscard.slice(0, -1));
      newDiscard = [newDiscard[newDiscard.length - 1]];
    }
    const newPlayers = gameData.players.map(p => ({ ...p, hand: [...p.hand] }));
    newPlayers[playerIndex].hand.push(newDeck.pop());
    const newCurrentPlayer = ((gameData.currentPlayer + gameData.direction) % gameData.numPlayers + gameData.numPlayers) % gameData.numPlayers;
    await update(gameRef, {
      players: newPlayers,
      deck: newDeck,
      discard: newDiscard,
      currentPlayer: newCurrentPlayer,
    });
    setErrorMessage('');
  }, [gameId]);

  const handleDragStart = (event) => {
    setDraggedCard(event.active.id);
  };

  const chooseColor = (color) => {
    setCurrentColor(color);
    setShowColorModal(false);
    setWildChosen(true);
    if (pendingWild) {
      playCard(pendingWild.playerIndex, pendingWild.cardIndex);
      setPendingWild(null);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setDraggedCard(null);
    if (over && over.id === 'discard' && currentPlayer === playerIndex) {
      const cardIndex = parseInt(active.id.split('-')[1]);
      const card = players[playerIndex][cardIndex];
      const topCard = discard[discard.length - 1];
      if (!isValidPlay(card, topCard)) {
        setErrorMessage('Invalid play: card does not match color or value');
        return;
      }
      playCard(playerIndex, cardIndex);
    }
  };

  // Bot turns
  useEffect(() => {
    if (currentPlayer !== playerIndex && !gameOver && fullPlayers[currentPlayer]?.uid.startsWith('bot')) {
      const timer = setTimeout(() => {
        try {
          const botHand = players[currentPlayer];
          const topCard = discard[discard.length - 1];
          let played = false;
          const validIndices = [];
          for (let i = 0; i < botHand.length; i++) {
            if (isValidPlay(botHand[i], topCard)) {
              validIndices.push(i);
            }
          }
          if (validIndices.length > 0) {
            const randomIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
            playCard(currentPlayer, randomIndex);
            played = true;
          }
          if (!played) {
            drawCard(currentPlayer);
          }
        } catch (error) {
          console.error('Bot error:', error);
          // On error, force draw and move to next
          drawCard(currentPlayer);
        }
      }, 2500); // 2.5 second delay for bots to "think"
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, playerIndex, players, discard, gameOver, isValidPlay, playCard, drawCard, fullPlayers]);

  useEffect(() => {
    if (turnTimeLeft > 0 && !gameOver && currentPlayer === playerIndex) {
      const timer = setTimeout(() => setTurnTimeLeft(turnTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (turnTimeLeft === 0 && !gameOver && currentPlayer === playerIndex) {
      // Time up for human turn, auto draw and move to next player
      drawCard(playerIndex);
    }
  }, [turnTimeLeft, gameOver, currentPlayer, playerIndex, drawCard]);

  // Reset turn timer when currentPlayer changes to human
  useEffect(() => {
    if (currentPlayer === playerIndex) {
      setTurnTimeLeft(10);
    }
  }, [currentPlayer, playerIndex]);

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !gameOver) {
      // Time up, end game, winner is player with least cards
      let minCards = Infinity;
      let winners = [];
      players.forEach((hand, i) => {
        if (hand.length < minCards) {
          minCards = hand.length;
          winners = [i];
        } else if (hand.length === minCards) {
          winners.push(i);
        }
      });
      const winnerIndex = winners[Math.floor(Math.random() * winners.length)];
      setGameOver(true);
      setWinner(winnerIndex === 0 ? 'Human' : `Bot ${winnerIndex}`);
    }
  }, [timeLeft, gameOver, players]);

  if (showMultiplayerModal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">UNO Game</h2>
          <div className="mb-4">
            <button
              onClick={() => { setShowMultiplayerModal(false); setShowCreateOptionsModal(true); }}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
            >
              Create Game
            </button>
          </div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Enter Game ID"
              value={joinGameId}
              onChange={(e) => setJoinGameId(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 w-full mb-2"
            />
            <button
              onClick={joinGame}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCreateOptionsModal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Create UNO Game</h2>
          <div className="mb-4">
            <button
              onClick={() => createGame(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4 block mb-2"
            >
              Play with Bots
            </button>
            <button
              onClick={() => createGame(false)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Create Multiplayer Room
            </button>
          </div>
          <button
            onClick={() => { setShowCreateOptionsModal(false); setShowMultiplayerModal(true); }}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (showShareLinkModal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Share Game Link</h2>
          <p className="mb-4">Share this Game ID with friends to let them join:</p>
          <div className="bg-gray-200 p-2 rounded mb-4 font-mono">{createdGameId}</div>
          <button
            onClick={() => navigator.clipboard.writeText(createdGameId)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
          >
            Copy ID
          </button>
          <button
            onClick={() => { setShowShareLinkModal(false); setShowMultiplayerModal(true); }}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!gameId || playerIndex === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Loading Game...</h2>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-4xl font-bold mb-4">Game Over!</h1>
        <p className="text-xl">{winner} wins!</p>
        <button onClick={() => { setGameId(null); setShowMultiplayerModal(true); }} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Exit Game</button>
      </div>
    );
  }

  if (showColorModal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Choose a Color</h2>
          <div className="flex space-x-4">
            <button onClick={() => chooseColor('red')} className="w-16 h-16 bg-red-500 rounded"></button>
            <button onClick={() => chooseColor('blue')} className="w-16 h-16 bg-blue-500 rounded"></button>
            <button onClick={() => chooseColor('green')} className="w-16 h-16 bg-green-500 rounded"></button>
            <button onClick={() => chooseColor('yellow')} className="w-16 h-16 bg-yellow-500 rounded"></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col items-center p-4">
        <h1 className="text-2xl font-bold mb-4">UNO Game</h1>
        <div className="mb-2 text-sm">Game ID: {gameId}</div>
        <button onClick={() => { setGameId(null); setShowMultiplayerModal(true); }} className="mb-2 px-4 py-2 bg-red-500 text-white rounded">Exit Game</button>
        <div className="mb-4 text-lg">Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} | Turn Time: {turnTimeLeft}</div>
        {errorMessage && <div className="mb-4 text-red-500">{errorMessage}</div>}
        <div className="relative w-full max-w-4xl h-96">
          {/* Bot 1 (right) */}
          {numPlayers >= 2 && (
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 flex flex-col items-center">
              <div className="text-sm mb-2 transform rotate-90">{currentPlayer === 1 ? <span className="font-bold text-red-500">CU </span> : ''}{playerNames[1]} ({players[1]?.length || 0} cards)</div>
              <div className="flex flex-col space-y-1">
                {players[1]?.map((_, i) => (
                  <div key={i} className="w-8 h-12 bg-blue-500 rounded"></div>
                ))}
              </div>
            </div>
          )}
          {/* Bot 2 (top) */}
          {numPlayers >= 3 && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
              <div className="text-sm mb-2">{currentPlayer === 2 ? <span className="font-bold text-red-500">CU </span> : ''}{playerNames[2]} ({players[2]?.length || 0} cards)</div>
              <div className="flex space-x-1">
                {players[2]?.map((_, i) => (
                  <div key={i} className="w-8 h-12 bg-green-500 rounded"></div>
                ))}
              </div>
            </div>
          )}
          {/* Bot 3 (left) */}
          {numPlayers >= 4 && (
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 flex flex-col items-center">
              <div className="text-sm mb-2 transform -rotate-90">{currentPlayer === 3 ? <span className="font-bold text-red-500">CU </span> : ''}{playerNames[3]} ({players[3]?.length || 0} cards)</div>
              <div className="flex flex-col space-y-1">
                {players[3]?.map((_, i) => (
                  <div key={i} className="w-8 h-12 bg-yellow-500 rounded"></div>
                ))}
              </div>
            </div>
          )}
          {/* Center */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-8">
            <div className="flex flex-col items-center">
              <div className="text-sm mb-2">Deck ({deck.length})</div>
              <div className="w-20 h-28 bg-gray-300 rounded-lg flex items-center justify-center cursor-pointer" onClick={() => {
                if (currentPlayer === playerIndex) {
                  const hasValid = players[playerIndex].some(card => isValidPlay(card, discard[discard.length - 1]));
                  if (hasValid) {
                    setErrorMessage('You have a valid play, cannot draw');
                    return;
                  }
                  drawCard(playerIndex);
                }
              }}>
                <span className="text-gray-600">Draw</span>
              </div>
            </div>
            <DiscardPile topCard={discard[discard.length - 1]} />
          </div>
          {/* Human (bottom) */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
            <div className="text-sm mb-2">{currentPlayer === playerIndex ? <span className="font-bold text-red-500">CU </span> : ''}{playerNames[playerIndex] || 'Player'} ({players[playerIndex]?.length || 0} cards)</div>
            <div className="flex space-x-1">
              {(players[playerIndex] || []).map((card, i) => (
                <Card key={`human-${i}`} card={card} id={`human-${i}`} />
              ))}
            </div>
            {(players[playerIndex]?.length === 1) && !unoCalled[playerIndex] && (
              <button onClick={() => setUnoCalled([...unoCalled, unoCalled[playerIndex] = true])} className="mt-2 px-4 py-2 bg-green-500 text-white rounded">
                Call UNO
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 text-center">
          <p>Current Player: {playerNames[currentPlayer] || 'Player'}</p>
          <p>Current Color: {currentColor}</p>
        </div>
      </div>
      <DragOverlay>
        {draggedCard && playerIndex !== null && players[playerIndex] ? <Card card={players[playerIndex][parseInt(draggedCard.split('-')[1])]} id={draggedCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default UNO;