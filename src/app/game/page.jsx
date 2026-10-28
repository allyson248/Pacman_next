'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BASE_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,0,0,0,1,0,0,0,1,0,0,0,3,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,1,1,0,1,2,2,2,2,2,1,0,1,1,1],
  [1,0,0,0,1,2,2,2,2,2,1,0,0,0,1],
  [1,1,1,0,1,1,1,2,1,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,3,0,1,0,0,0,0,0,0,0,1,0,3,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const TILE_SIZE = 32;
const SPEED = 2;

export default function GamePage() {
  const canvasRef = useRef(null);
  const router = useRouter();

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isPowered, setIsPowered] = useState(false);
  const [fruitMessage, setFruitMessage] = useState('');

  const isResettingRef = useRef(false);

  const pacmanRef = useRef({ 
    x: 1 * TILE_SIZE, 
    y: 7 * TILE_SIZE, 
    dirX: 0, 
    dirY: 0, 
    nextDirX: 0, 
    nextDirY: 0 
  });

  const ghostsRef = useRef([
    { name: 'Blinky', x: 7 * TILE_SIZE, y: 5 * TILE_SIZE, startX: 7 * TILE_SIZE, startY: 5 * TILE_SIZE, color: '#ef4444', dirX: 0, dirY: -SPEED, isEaten: false, waitTimer: 0 },
    { name: 'Pinky',  x: 7 * TILE_SIZE, y: 5 * TILE_SIZE, startX: 7 * TILE_SIZE, startY: 5 * TILE_SIZE, color: '#ec4899', dirX: SPEED, dirY: 0, isEaten: false, waitTimer: 0 },
    { name: 'Inky',   x: 7 * TILE_SIZE, y: 5 * TILE_SIZE, startX: 7 * TILE_SIZE, startY: 5 * TILE_SIZE, color: '#38bdf8', dirX: -SPEED, dirY: 0, isEaten: false, waitTimer: 0 },
    { name: 'Clyde',  x: 7 * TILE_SIZE, y: 5 * TILE_SIZE, startX: 7 * TILE_SIZE, startY: 5 * TILE_SIZE, color: '#f97316', dirX: 0, dirY: SPEED, isEaten: false, waitTimer: 0 },
  ]);

  // CORRIGIDO: Fruta posicionada exatamente em (7, 1), num corredor preto perfeitamente livre
  const fruitRef = useRef({ active: false, type: null, x: 7 * TILE_SIZE, y: 1 * TILE_SIZE, timer: null });
  const mapRef = useRef(JSON.parse(JSON.stringify(BASE_MAP)));
  const totalDotsRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const powerTimerRef = useRef(null);
  const frameCountRef = useRef(0);

  const countDots = (matrix) => {
    let count = 0;
    matrix.forEach(row => {
      row.forEach(tile => {
        if (tile === 0 || tile === 3) count++;
      });
    });
    return count;
  };

  useEffect(() => {
    totalDotsRef.current = countDots(mapRef.current);
  }, []);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const playSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'chomp') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'map_reset') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'fruit') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'power') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'eat_ghost') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'death') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {}
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver) return;
      const p = pacmanRef.current;
      if (e.key === 'ArrowUp') { p.nextDirX = 0; p.nextDirY = -SPEED; }
      if (e.key === 'ArrowDown') { p.nextDirX = 0; p.nextDirY = SPEED; }
      if (e.key === 'ArrowLeft') { p.nextDirX = -SPEED; p.nextDirY = 0; }
      if (e.key === 'ArrowRight') { p.nextDirX = SPEED; p.nextDirY = 0; }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  const saveScoreToDB = async (finalScore) => {
    const playerName = localStorage.getItem('pacman_player_name') || 'Anónimo';
    setSaving(true);
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, score: finalScore, level: 1 }),
      });
      const data = await res.json();
      if (data.success) setSavedSuccess(true);
    } catch (err) {
      console.error('Erro ao salvar placar:', err);
    } finally {
      setSaving(false);
    }
  };

  const checkWallCollision = (x, y) => {
    const map = mapRef.current;
    const margin = 4;
    const corners = [
      { x: x + margin, y: y + margin },
      { x: x + TILE_SIZE - margin, y: y + margin },
      { x: x + margin, y: y + TILE_SIZE - margin },
      { x: x + TILE_SIZE - margin, y: y + TILE_SIZE - margin },
    ];

    for (let corner of corners) {
      const tileCol = Math.floor(corner.x / TILE_SIZE);
      const tileRow = Math.floor(corner.y / TILE_SIZE);
      if (map[tileRow] && map[tileRow][tileCol] === 1) {
        return true;
      }
    }
    return false;
  };

  const spawnFruit = (type) => {
    if (fruitRef.current.active) return;
    fruitRef.current.active = true;
    fruitRef.current.type = type;

    if (fruitRef.current.timer) clearTimeout(fruitRef.current.timer);
    fruitRef.current.timer = setTimeout(() => {
      fruitRef.current.active = false;
    }, 9000);
  };

  const resetMap = () => {
    if (isResettingRef.current) return;
    isResettingRef.current = true;

    playSound('map_reset');
    mapRef.current = JSON.parse(JSON.stringify(BASE_MAP));
    totalDotsRef.current = countDots(mapRef.current);

    pacmanRef.current.x = 1 * TILE_SIZE;
    pacmanRef.current.y = 7 * TILE_SIZE;
    pacmanRef.current.dirX = 0;
    pacmanRef.current.dirY = 0;
    pacmanRef.current.nextDirX = 0;
    pacmanRef.current.nextDirY = 0;

    ghostsRef.current.forEach(g => {
      g.x = g.startX;
      g.y = g.startY;
      g.isEaten = false;
      g.waitTimer = 0;
    });

    setFruitMessage('✨ MAPA RECARREGADO!');
    setTimeout(() => {
      setFruitMessage('');
      isResettingRef.current = false;
    }, 2000);
  };

  useEffect(() => {
    if (gameOver) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const gameLoop = () => {
      frameCountRef.current++;
      const p = pacmanRef.current;
      const ghosts = ghostsRef.current;
      const map = mapRef.current;
      const fruit = fruitRef.current;

      if (p.nextDirX !== 0 || p.nextDirY !== 0) {
        const isTurningVertical = p.nextDirY !== 0 && p.dirX !== 0;
        const isTurningHorizontal = p.nextDirX !== 0 && p.dirY !== 0;
        const isReversing = (p.nextDirX === -p.dirX && p.nextDirX !== 0) || (p.nextDirY === -p.dirY && p.nextDirY !== 0);

        if (isReversing) {
          p.dirX = p.nextDirX;
          p.dirY = p.nextDirY;
        } else if (isTurningVertical) {
          const closestX = Math.round(p.x / TILE_SIZE) * TILE_SIZE;
          if (Math.abs(p.x - closestX) < 10 && !checkWallCollision(closestX, p.y + p.nextDirY)) {
            p.x = closestX;
            p.dirX = 0;
            p.dirY = p.nextDirY;
          }
        } else if (isTurningHorizontal) {
          const closestY = Math.round(p.y / TILE_SIZE) * TILE_SIZE;
          if (Math.abs(p.y - closestY) < 10 && !checkWallCollision(p.x + p.nextDirX, closestY)) {
            p.y = closestY;
            p.dirX = p.nextDirX;
            p.dirY = 0;
          }
        } else if (p.dirX === 0 && p.dirY === 0) {
          if (!checkWallCollision(p.x + p.nextDirX, p.y + p.nextDirY)) {
            p.dirX = p.nextDirX;
            p.dirY = p.nextDirY;
          }
        }
      }

      const targetX = p.x + p.dirX;
      const targetY = p.y + p.dirY;
      if (!checkWallCollision(targetX, targetY)) {
        p.x = targetX;
        p.y = targetY;
      } else {
        p.dirX = 0;
        p.dirY = 0;
      }

      const centerX = p.x + TILE_SIZE / 2;
      const centerY = p.y + TILE_SIZE / 2;
      const currentGridCol = Math.floor(centerX / TILE_SIZE);
      const currentGridRow = Math.floor(centerY / TILE_SIZE);

      if (map[currentGridRow] && (map[currentGridRow][currentGridCol] === 0 || map[currentGridRow][currentGridCol] === 3)) {
        const isPowerPellet = map[currentGridRow][currentGridCol] === 3;
        map[currentGridRow][currentGridCol] = 2;

        if (isPowerPellet) {
          playSound('power');
          setIsPowered(true);
          if (powerTimerRef.current) clearTimeout(powerTimerRef.current);
          powerTimerRef.current = setTimeout(() => {
            setIsPowered(false);
          }, 7000);
        } else {
          playSound('chomp');
        }

        let currentDotsCount = 0;
        map.forEach(row => row.forEach(tile => { if (tile === 0 || tile === 3) currentDotsCount++; }));
        const dotsEaten = totalDotsRef.current - currentDotsCount;

        if (dotsEaten === Math.floor(totalDotsRef.current * 0.3)) {
          spawnFruit('cherry');
        } else if (dotsEaten === Math.floor(totalDotsRef.current * 0.7)) {
          spawnFruit('strawberry');
        }

        setScore((s) => {
          const pointsToAdd = isPowerPellet ? 50 : 10;
          const newScore = s + pointsToAdd;
          
          if (currentDotsCount === 0 && !isResettingRef.current) {
            resetMap();
          }
          return newScore;
        });
      }

      if (fruit.active) {
        const fruitDistX = Math.abs((p.x + TILE_SIZE / 2) - (fruit.x + TILE_SIZE / 2));
        const fruitDistY = Math.abs((p.y + TILE_SIZE / 2) - (fruit.y + TILE_SIZE / 2));
        if (fruitDistX < 16 && fruitDistY < 16) {
          playSound('fruit');
          const bonusPoints = fruit.type === 'cherry' ? 100 : 300;
          setScore(s => s + bonusPoints);
          setFruitMessage(`🍒 BÔNUS +${bonusPoints}!`);
          setTimeout(() => setFruitMessage(''), 2500);
          fruit.active = false;
        }
      }

      ghosts.forEach((ghost) => {
        if (ghost.waitTimer > 0) {
          ghost.waitTimer--;
        } else if (ghost.isEaten) {
          const targetX = ghost.startX;
          const targetY = ghost.startY;
          const eyeSpd = 4;

          if (ghost.x < targetX) ghost.x += eyeSpd;
          else if (ghost.x > targetX) ghost.x -= eyeSpd;

          if (ghost.y < targetY) ghost.y += eyeSpd;
          else if (ghost.y > targetY) ghost.y -= eyeSpd;

          if (Math.abs(ghost.x - targetX) < eyeSpd && Math.abs(ghost.y - targetY) < eyeSpd) {
            ghost.x = targetX;
            ghost.y = targetY;
            ghost.isEaten = false;
            ghost.waitTimer = 80;
          }
        } else {
          const nextGhostX = ghost.x + ghost.dirX;
          const nextGhostY = ghost.y + ghost.dirY;

          if (checkWallCollision(nextGhostX, nextGhostY) || (ghost.x % TILE_SIZE === 0 && ghost.y % TILE_SIZE === 0 && Math.random() < 0.25)) {
            const possibleDirs = [
              { x: SPEED, y: 0 },
              { x: -SPEED, y: 0 },
              { x: 0, y: SPEED },
              { x: 0, y: -SPEED },
            ].filter(d => !checkWallCollision(ghost.x + d.x, ghost.y + d.y));

            if (possibleDirs.length > 0) {
              const chosen = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
              ghost.dirX = chosen.x;
              ghost.dirY = chosen.y;
            }
          }

          ghost.x += ghost.dirX;
          ghost.y += ghost.dirY;

          const distX = (p.x + TILE_SIZE / 2) - (ghost.x + TILE_SIZE / 2);
          const distY = (p.y + TILE_SIZE / 2) - (ghost.y + TILE_SIZE / 2);
          const distance = Math.sqrt(distX * distX + distY * distY);

          if (distance < 16) {
            if (isPowered) {
              playSound('eat_ghost');
              ghost.isEaten = true;
              setScore(s => s + 200);
            } else {
              playSound('death');
              livesRef.current -= 1;
              setLives(livesRef.current);

              if (livesRef.current <= 0) {
                setGameOver(true);
                saveScoreToDB(scoreRef.current);
              } else {
                p.x = 1 * TILE_SIZE;
                p.y = 7 * TILE_SIZE;
                p.dirX = 0;
                p.dirY = 0;
                p.nextDirX = 0;
                p.nextDirY = 0;
                ghosts.forEach(g => {
                  g.x = g.startX;
                  g.y = g.startY;
                  g.isEaten = false;
                  g.waitTimer = 0;
                });
              }
            }
          }
        }
      });

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
          if (map[r][c] === 1) {
            ctx.fillStyle = '#1d1ded';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          } else if (map[r][c] === 0) {
            ctx.fillStyle = '#ffb8ae';
            ctx.beginPath();
            ctx.arc(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, 4, 0, Math.PI * 2);
            ctx.fill();
          } else if (map[r][c] === 3) {
            if (Math.floor(frameCountRef.current / 15) % 2 === 0) {
              ctx.fillStyle = '#ffb8ae';
              ctx.beginPath();
              ctx.arc(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, 8, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      if (fruit.active) {
        const fX = fruit.x + TILE_SIZE / 2;
        const fY = fruit.y + TILE_SIZE / 2;
        
        ctx.fillStyle = fruit.type === 'cherry' ? '#dc2626' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(fX - 3, fY + 2, 5, 0, Math.PI * 2);
        ctx.arc(fX + 4, fY + 4, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fX - 3, fY + 2);
        ctx.lineTo(fX, fY - 6);
        ctx.lineTo(fX + 4, fY + 4);
        ctx.stroke();
      }

      const pacX = p.x + TILE_SIZE / 2;
      const pacY = p.y + TILE_SIZE / 2;
      const radius = TILE_SIZE / 2 - 4;

      let rotation = 0;
      if (p.dirX > 0) rotation = 0;
      if (p.dirX < 0) rotation = Math.PI;
      if (p.dirY > 0) rotation = Math.PI / 2;
      if (p.dirY < 0) rotation = (3 * Math.PI) / 2;

      ctx.save();
      ctx.translate(pacX, pacY);
      ctx.rotate(rotation);
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      const mouthOpen = Math.floor(frameCountRef.current / 8) % 2 === 0;
      if (mouthOpen && (p.dirX !== 0 || p.dirY !== 0)) {
        ctx.arc(0, 0, radius, 0.2 * Math.PI, 1.8 * Math.PI);
      } else {
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
      }
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.restore();

      ghosts.forEach((ghost) => {
        const gX = ghost.x + TILE_SIZE / 2;
        const gY = ghost.y + TILE_SIZE / 2;

        if (ghost.isEaten || ghost.waitTimer > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(gX - 4, gY - 2, 3.5, 0, Math.PI * 2);
          ctx.arc(gX + 4, gY - 2, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#2121ff';
          ctx.beginPath();
          ctx.arc(gX - 4, gY - 2, 1.8, 0, Math.PI * 2);
          ctx.arc(gX + 4, gY - 2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const ghostColor = isPowered ? '#2121ff' : ghost.color;

          ctx.fillStyle = ghostColor;
          ctx.beginPath();
          ctx.arc(gX, gY - 2, radius, Math.PI, 0, false);
          ctx.lineTo(gX + radius, gY + radius);
          ctx.lineTo(gX - radius, gY + radius);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(gX - 4, gY - 4, 3, 0, Math.PI * 2);
          ctx.arc(gX + 4, gY - 4, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = isPowered ? '#ffb8ae' : '#000000';
          ctx.beginPath();
          ctx.arc(gX - 4 + (ghost.dirX !== 0 ? Math.sign(ghost.dirX) : 0), gY - 4 + (ghost.dirY !== 0 ? Math.sign(ghost.dirY) : 0), 1.5, 0, Math.PI * 2);
          ctx.arc(gX + 4 + (ghost.dirX !== 0 ? Math.sign(ghost.dirX) : 0), gY - 4 + (ghost.dirY !== 0 ? Math.sign(ghost.dirY) : 0), 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (powerTimerRef.current) clearTimeout(powerTimerRef.current);
      if (fruitRef.current.timer) clearTimeout(fruitRef.current.timer);
    };
  }, [gameOver, isPowered]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white relative">
      <div className="flex justify-between w-[480px] mb-4 items-center">
        <Link href="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium transition-colors">
          ← Voltar ao Menu
        </Link>
        <div className="flex items-center gap-6">
          <span className="text-red-500 font-bold text-sm">❤️ Vidas: {'❤️ '.repeat(lives)}</span>
          <h1 className="text-xl font-bold text-yellow-400">Score: {score}</h1>
        </div>
      </div>

      {fruitMessage && (
        <div className="mb-2 text-green-400 font-bold animate-bounce text-sm">
          {fruitMessage}
        </div>
      )}

      <canvas 
        ref={canvasRef} 
        width={15 * TILE_SIZE} 
        height={11 * TILE_SIZE} 
        className="border-4 border-blue-600 bg-black shadow-2xl rounded-lg"
      />
      
      <p className="mt-4 text-sm text-slate-400">Use as setas para guiar o Pac-Man. A cereja aparece agora num corredor perfeitamente livre!</p>

      {gameOver && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-3xl font-black text-yellow-400 mb-2">FIM DE JOGO!</h2>
            <p className="text-slate-300 mb-6">Pontuação final: <strong className="text-yellow-400 text-xl">{score}</strong></p>

            <div className="mb-6 text-sm text-slate-400">
              {saving && <p className="text-blue-400 animate-pulse">A guardar pontuação no MySQL...</p>}
              {savedSuccess && <p className="text-green-400 font-semibold">✔ Placar salvo no ranking!</p>}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold py-3 rounded-lg transition-colors"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-3 rounded-lg transition-colors"
              >
                Voltar ao Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}