'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. Carregar nome antigo se já estiver salvo e buscar o ranking do MySQL
  useEffect(() => {
    const savedName = localStorage.getItem('pacman_player_name');
    if (savedName) {
      setPlayerName(savedName);
    }

    fetchRanking();
  }, []);

  // Busca os dados da rota API que criamos no Next.js
  const fetchRanking = async () => {
    try {
      const res = await fetch('/api/scores');
      const data = await res.json();
      if (data.success) {
        setRanking(data.data);
      }
    } catch (err) {
      console.error('Erro ao carregar o ranking:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Iniciar o jogo salvando o nome do jogador
  const handleStartGame = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    localStorage.setItem('pacman_player_name', playerName.trim());
    router.push('/game');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
      {/* Título Estilizado */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-black text-yellow-400 tracking-wider drop-shadow-[0_5px_5px_rgba(234,179,8,0.4)]">
          PAC-MAN
        </h1>
        <p className="text-slate-400 text-sm mt-2">NEXT.JS & MYSQL EDITION</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Card de Novo Jogo */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Novo Jogo</h2>
          <form onSubmit={handleStartGame} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">
                Digite seu Nome / Nickname:
              </label>
              <input
                type="text"
                required
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ex: PacMaster"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:border-yellow-400 text-white placeholder-slate-600"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold py-3 rounded-lg transition-colors shadow-lg shadow-yellow-500/20 text-lg"
            >
              JOGAR AGORA
            </button>
          </form>
        </div>

        {/* Card do Ranking (MySQL) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center justify-between">
            <span>🏆 Leaderboard</span>
            <span className="text-xs text-slate-400 font-normal">Top 10</span>
          </h2>

          {loading ? (
            <p className="text-slate-500 text-center py-8">Carregando pontuações...</p>
          ) : ranking.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nenhuma pontuação registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-2">#</th>
                    <th className="py-2">Jogador</th>
                    <th className="py-2 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-sm">
                  {ranking.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-slate-500">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </td>
                      <td className="py-2.5 font-medium text-slate-200">{item.player_name}</td>
                      <td className="py-2.5 text-right font-bold text-yellow-400">{item.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}