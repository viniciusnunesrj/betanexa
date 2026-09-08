import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { Trophy, Medal, Crown, Zap, Swords, Shield, Award } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const { allUsers, user } = useAuth();
  const { assets } = useGameState();

  const [metric, setMetric] = useState<'power' | 'victories' | 'level' | 'assets'>('power');

  // Compute stats per user
  const userRankings = allUsers.map((u) => {
    const uAssets = assets.filter((a) => a.ownerId === u.id);
    const totalPower = uAssets.reduce((acc, curr) => acc + ('power' in curr ? curr.power : 0), 0);
    const winRate = u.victories + u.defeats > 0 ? Math.round((u.victories / (u.victories + u.defeats)) * 100) : 0;

    return {
      ...u,
      totalPower,
      assetCount: uAssets.length,
      winRate,
    };
  });

  // Sort by chosen metric
  userRankings.sort((a, b) => {
    if (metric === 'power') return b.totalPower - a.totalPower;
    if (metric === 'victories') return b.victories - a.victories;
    if (metric === 'level') return b.level - a.level;
    return b.assetCount - a.assetCount;
  });

  const top1 = userRankings[0];
  const top2 = userRankings[1];
  const top3 = userRankings[2];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider">
            <Trophy className="w-4 h-4" /> Classificação da Temporada 1
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-1">
            Ranking Global de Pilotos
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Os melhores combatentes e colecionadores do ecossistema NEXA em tempo real.
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0d0d15] border border-white/10">
          <button
            onClick={() => setMetric('power')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              metric === 'power'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Poder
          </button>
          <button
            onClick={() => setMetric('victories')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              metric === 'victories'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Vitórias
          </button>
          <button
            onClick={() => setMetric('level')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              metric === 'level'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Nível
          </button>
          <button
            onClick={() => setMetric('assets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              metric === 'assets'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Coleção
          </button>
        </div>
      </div>

      {/* Podium for Top 3 */}
      {top1 && top2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-8 pb-4">
          {/* Rank 2 (Silver) */}
          <div className="order-2 sm:order-1 p-6 rounded-2xl bg-[#0a0a14] border border-slate-400/30 text-center flex flex-col items-center relative overflow-hidden shadow-xl">
            <div className="absolute top-2 right-2 text-slate-400 font-brand font-black text-2xl">
              #2
            </div>
            <div className="relative mb-3">
              <img
                src={top2.avatar}
                alt={top2.username}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.3)]"
              />
              <Medal className="w-6 h-6 text-slate-300 absolute -bottom-2 -right-2 drop-shadow" />
            </div>
            <h4 className="font-heading font-bold text-white text-base truncate w-full">
              {top2.username}
            </h4>
            <span className="text-[11px] font-mono text-slate-400">Nv. {top2.level} • {top2.title}</span>
            <div className="mt-3 font-heading font-black text-slate-300 text-lg">
              {metric === 'power' && `${top2.totalPower.toLocaleString()} PWR`}
              {metric === 'victories' && `${top2.victories} Vitórias`}
              {metric === 'level' && `Nível ${top2.level}`}
              {metric === 'assets' && `${top2.assetCount} Ativos`}
            </div>
          </div>

          {/* Rank 1 (Gold - Center & Elevated) */}
          <div className="order-1 sm:order-2 p-8 rounded-3xl bg-gradient-to-b from-[#1c1809] to-[#0d0d18] border-2 border-amber-400 text-center flex flex-col items-center relative overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.25)] sm:-translate-y-4">
            <div className="absolute top-2 right-3 text-amber-400 font-brand font-black text-3xl">
              #1
            </div>
            <Crown className="w-8 h-8 text-amber-400 mb-1 animate-bounce" />
            <div className="relative mb-3">
              <img
                src={top1.avatar}
                alt={top1.username}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]"
              />
            </div>
            <h3 className="font-heading font-black text-white text-lg truncate w-full">
              {top1.username}
            </h3>
            <span className="text-xs font-mono text-amber-300 font-semibold">
              Nv. {top1.level} • {top1.title}
            </span>
            <div className="mt-4 font-heading font-black text-amber-400 text-2xl">
              {metric === 'power' && `${top1.totalPower.toLocaleString()} PWR`}
              {metric === 'victories' && `${top1.victories} Vitórias`}
              {metric === 'level' && `Nível ${top1.level}`}
              {metric === 'assets' && `${top1.assetCount} Ativos`}
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          {top3 && (
            <div className="order-3 p-6 rounded-2xl bg-[#0a0a14] border border-amber-800/40 text-center flex flex-col items-center relative overflow-hidden shadow-xl">
              <div className="absolute top-2 right-2 text-amber-600 font-brand font-black text-2xl">
                #3
              </div>
              <div className="relative mb-3">
                <img
                  src={top3.avatar}
                  alt={top3.username}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.3)]"
                />
                <Award className="w-6 h-6 text-amber-600 absolute -bottom-2 -right-2 drop-shadow" />
              </div>
              <h4 className="font-heading font-bold text-white text-base truncate w-full">
                {top3.username}
              </h4>
              <span className="text-[11px] font-mono text-slate-400">Nv. {top3.level} • {top3.title}</span>
              <div className="mt-3 font-heading font-black text-amber-600 text-lg">
                {metric === 'power' && `${top3.totalPower.toLocaleString()} PWR`}
                {metric === 'victories' && `${top3.victories} Vitórias`}
                {metric === 'level' && `Nível ${top3.level}`}
                {metric === 'assets' && `${top3.assetCount} Ativos`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rankings Table */}
      <div className="rounded-2xl bg-[#0b0b12] border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-heading font-bold text-white text-sm">
            Tabela de Classificação Geral
          </span>
          <span className="text-xs font-mono text-slate-400">
            Atualizado a cada ciclo de arena
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/5 text-slate-400 uppercase text-[10px] border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Posição</th>
                <th className="py-3 px-4">Piloto</th>
                <th className="py-3 px-4">Nível</th>
                <th className="py-3 px-4">Poder Total</th>
                <th className="py-3 px-4">Arena W/L</th>
                <th className="py-3 px-4">Acervo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {userRankings.map((rankedUser, index) => {
                const isCurrent = rankedUser.id === user.id;

                return (
                  <tr
                    key={rankedUser.id}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-cyan-950/40 text-cyan-200 font-bold'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-brand font-black text-sm">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rankedUser.avatar}
                          alt={rankedUser.username}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div>
                          <span className="font-heading font-bold text-white block">
                            {rankedUser.username} {isCurrent && '(Você)'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {rankedUser.title}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-cyan-400 font-bold">
                      Nv. {rankedUser.level}
                    </td>
                    <td className="py-3.5 px-4 text-amber-400 font-bold">
                      {rankedUser.totalPower.toLocaleString()} PWR
                    </td>
                    <td className="py-3.5 px-4">
                      <span>{rankedUser.victories}V / {rankedUser.defeats}D</span>
                      <span className="text-slate-500 ml-1.5 text-[10px]">({rankedUser.winRate}%)</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {rankedUser.assetCount} ativos
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
