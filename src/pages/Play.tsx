import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { Character, GameItem, PlayerBox, BoxRewardSummary } from '../types';
import { RARITY_CONFIG } from '../config/designTokens';
import { BOX_DEFINITIONS } from '../config/boxRates';
import { RarityBadge } from '../components/common/RarityBadge';
import { BoxOpeningModal } from '../components/boxes/BoxOpeningModal';
import { soundService } from '../services/soundService';
import confetti from 'canvas-confetti';
import {
  Swords,
  Shield,
  Zap,
  Sparkles,
  Trophy,
  ArrowRight,
  Flame,
  CheckCircle2,
  RotateCcw,
  Package,
  PackageOpen,
} from 'lucide-react';

interface PlayProps {
  onNavigate: (page: string) => void;
}

export const Play: React.FC<PlayProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { assets, executeBattle, equipCharacter, openBox } = useGameState();

  // User characters
  const characters = assets.filter(
    (a) => a.ownerId === user.id && a.type === 'Character'
  ) as Character[];

  const [selectedCharId, setSelectedCharId] = useState<string>(
    characters.find((c) => c.isEquipped)?.id || characters[0]?.id || ''
  );

  const selectedChar = characters.find((c) => c.id === selectedCharId) || characters[0];

  // Battle state
  const [inBattle, setInBattle] = useState(false);
  const [battleTurn, setBattleTurn] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [enemyHp, setEnemyHp] = useState<number>(100);
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  const [battleResult, setBattleResult] = useState<{
    victory: boolean;
    xpGained: number;
    nexGained: number;
    nxaGained: number;
    droppedItem: GameItem | null;
    droppedBox?: PlayerBox | null;
  } | null>(null);
  const [activeOpeningSummary, setActiveOpeningSummary] = useState<BoxRewardSummary | null>(null);

  // Bot opponent
  const [enemyData, setEnemyData] = useState({
    name: 'Androide Sentinela X-9',
    power: 1400,
    class: 'Guardião',
    avatar: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80',
  });

  const arenas = [
    { id: 'arena-1', name: 'Distrito Neon 07', difficulty: 'Normal', mult: '1.0x' },
    { id: 'arena-2', name: 'Reator de Antimatéria', difficulty: 'Desafiador', mult: '1.4x' },
    { id: 'arena-3', name: 'Cidadela Quântica', difficulty: 'Extremo', mult: '2.0x' },
  ];
  const [selectedArena, setSelectedArena] = useState(arenas[0].id);

  const startCombat = () => {
    if (!selectedChar) return;

    setInBattle(true);
    setBattleResult(null);
    setCombatLogs(['Iniciando protocolo de combate na arena...']);
    setPlayerHp(100);
    setEnemyHp(100);
    setBattleTurn(1);

    // Dynamic enemy power
    const enemyPwr = Math.floor(selectedChar.power * (0.85 + Math.random() * 0.35));
    setEnemyData({
      name: ['Autômato de Plasma', 'Sentinela X-9', 'Ciborgue Renegado', 'Titã de Sucata'][
        Math.floor(Math.random() * 4)
      ],
      power: enemyPwr,
      class: 'Guerreiro',
      avatar: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=400&auto=format&fit=crop&q=80',
    });

    soundService.playLaser();

    // Simulated turns
    setTimeout(() => {
      setBattleTurn(2);
      soundService.playLaser();
      setEnemyHp((prev) => Math.max(25, prev - 45));
      setCombatLogs((prev) => [
        ...prev,
        `${selectedChar.name} disparou uma rajada devastadora causando 450 de dano!`,
      ]);
    }, 900);

    setTimeout(() => {
      setBattleTurn(3);
      soundService.playLaser();
      setPlayerHp((prev) => Math.max(30, prev - 35));
      setCombatLogs((prev) => [
        ...prev,
        `O adversário contra-atacou com raio de pulso iônico! Escudos em 65%.`,
      ]);
    }, 1800);

    setTimeout(() => {
      // Finish battle
      const rewards = executeBattle(selectedChar.id);
      setBattleTurn(4);
      setInBattle(false);
      setBattleResult(rewards);

      if (rewards.victory) {
        setEnemyHp(0);
        setCombatLogs((prev) => [
          ...prev,
          `Golpe Crítico fulminante! ${selectedChar.name} venceu o duelo cibernético!`,
        ]);
        soundService.playVictory();
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22d3ee', '#a855f7', '#f59e0b', '#10b981'],
          });
        } catch {
          // Ignore
        }
      } else {
        setPlayerHp(0);
        setCombatLogs((prev) => [
          ...prev,
          `Defesa sobrecarregada! Vitória do adversário. Recompensas de consolação atribuídas.`,
        ]);
      }
    }, 2800);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
            <Swords className="w-4 h-4" /> Módulo de Batalha & Looting
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-1">
            Arena de Batalha
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Jogue para derrotar adversários cibernéticos e receba tokens NXA, moedas NEX e baús de relíquias.
          </p>
        </div>

        {/* Selected Arena Picker */}
        <div className="flex items-center gap-2 bg-[#0d0d15] border border-white/10 p-1.5 rounded-xl">
          {arenas.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedArena(a.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                selectedArena === a.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Battle Stage */}
      <div className="relative rounded-3xl bg-[#0a0a12] border border-white/10 overflow-hidden shadow-2xl p-6 sm:p-10">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-black pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Fighter 1: Player's Character */}
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                Seu Combatente
              </span>
              {selectedChar && <RarityBadge rarity={selectedChar.rarity} size="sm" />}
            </div>

            {selectedChar ? (
              <>
                <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.3)] mb-4 bg-slate-950">
                  <img
                    src={selectedChar.image}
                    alt={selectedChar.name}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      inBattle ? 'scale-110 animate-pulse' : ''
                    }`}
                  />
                  {inBattle && (
                    <div className="absolute inset-0 bg-cyan-500/20 mix-blend-overlay animate-ping" />
                  )}
                </div>

                <h3 className="font-heading text-xl font-bold text-white">
                  {selectedChar.name}
                </h3>
                <span className="text-xs font-mono text-slate-400 mt-0.5">
                  Classe: {selectedChar.class} • Nível {selectedChar.level}
                </span>

                {/* HP Bar */}
                <div className="w-full mt-4">
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-400">Integridade dos Escudos</span>
                    <span className="text-cyan-400 font-bold">{playerHp}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${playerHp}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs font-mono text-slate-300">
                  <span className="flex items-center gap-1 text-cyan-400 font-bold">
                    <Zap className="w-3.5 h-3.5" /> {selectedChar.power} PWR
                  </span>
                  <span>Força: {selectedChar.stats.strength}</span>
                  <span>Defesa: {selectedChar.stats.defense}</span>
                </div>
              </>
            ) : (
              <div className="py-12 text-slate-500 font-mono text-xs">
                Nenhum personagem disponível.
              </div>
            )}
          </div>

          {/* VS Badge in Center on Mobile / Indicator */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex-col items-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-slate-950 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.5)] flex items-center justify-center font-brand font-black text-xl text-cyan-300">
              VS
            </div>
          </div>

          {/* Fighter 2: Opponent Bot */}
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-rose-400 font-bold uppercase">
                Adversário da Arena
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded">
                IA DE COMBATE
              </span>
            </div>

            <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)] mb-4 bg-slate-950">
              <img
                src={enemyData.avatar}
                alt={enemyData.name}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  inBattle ? 'scale-110 animate-pulse' : ''
                }`}
              />
            </div>

            <h3 className="font-heading text-xl font-bold text-white">
              {enemyData.name}
            </h3>
            <span className="text-xs font-mono text-slate-400 mt-0.5">
              Classe: {enemyData.class} • Unidade de Teste
            </span>

            {/* Enemy HP Bar */}
            <div className="w-full mt-4">
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">Escudos Adversários</span>
                <span className="text-rose-400 font-bold">{enemyHp}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${enemyHp}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <Zap className="w-3.5 h-3.5" /> {enemyData.power} PWR
              </span>
              <span>Dificuldade: Média</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Battle Log */}
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col items-center">
          {/* Logs */}
          <div className="w-full max-w-xl bg-slate-950/80 border border-white/10 rounded-2xl p-4 min-h-[90px] flex flex-col justify-center text-center mb-6">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
              Registro Tático do Combate:
            </span>
            <p className="font-mono text-xs text-cyan-300 font-medium animate-in fade-in">
              {combatLogs[combatLogs.length - 1]}
            </p>
          </div>

          {/* Launch Button */}
          <button
            onClick={startCombat}
            disabled={inBattle || !selectedChar}
            className={`px-10 py-4 rounded-2xl font-heading font-black text-lg uppercase tracking-wider transition-all flex items-center gap-3 ${
              inBattle
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.45)] hover:scale-105'
            }`}
          >
            <Swords className="w-6 h-6" />
            <span>{inBattle ? 'Engajando em Batalha...' : 'Iniciar Batalha na Arena'}</span>
          </button>
        </div>
      </div>

      {/* Switch Character Arsenal Picker */}
      <div className="rounded-2xl bg-[#0b0b12] border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-bold text-white">
            Selecionar Personagem para a Batalha
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {characters.length} combatente(s) disponíveis
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {characters.map((char) => {
            const isSelected = char.id === selectedCharId;
            return (
              <div
                key={char.id}
                onClick={() => {
                  setSelectedCharId(char.id);
                  soundService.playClick();
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-400 text-white'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <img
                  src={char.image}
                  alt={char.name}
                  className="w-12 h-12 rounded-lg object-cover bg-slate-950"
                />
                <div className="min-w-0">
                  <h5 className="font-heading font-bold text-xs text-white truncate">
                    {char.name}
                  </h5>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <RarityBadge rarity={char.rarity} size="sm" showDot={false} />
                    <span className="text-[10px] font-mono text-cyan-400">{char.power} PWR</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Battle Rewards & Loot Reveal Modal */}
      {battleResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[#0e0e1a] border border-cyan-500/50 p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            {/* Header Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              {battleResult.victory ? (
                <Trophy className="w-8 h-8 text-cyan-400 animate-bounce" />
              ) : (
                <Shield className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <h2 className="font-heading text-3xl font-black text-white">
              {battleResult.victory ? 'Vitória Esmagadora!' : 'Batalha Encerrada'}
            </h2>
            <p className="text-xs font-mono text-slate-300 mt-1">
              {battleResult.victory
                ? 'Você dominou a arena e coletou espólios cibernéticos!'
                : 'Você sobreviveu com honra. Recursos de consolação atribuídos.'}
            </p>

            {/* Currency Gains */}
            <div className="grid grid-cols-3 gap-2 my-6 p-4 rounded-2xl bg-slate-950/80 border border-white/10 font-mono">
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block">XP GANHO</span>
                <span className="font-bold text-sm text-cyan-300">+{battleResult.xpGained}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block">MOEDAS NEX</span>
                <span className="font-bold text-sm text-amber-400">+{battleResult.nexGained}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block">TOKENS NXA</span>
                <span className="font-bold text-sm text-cyan-400">+{battleResult.nxaGained}</span>
              </div>
            </div>

            {/* Dropped Item Card */}
            {battleResult.droppedItem && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-b from-white/10 to-transparent border border-cyan-500/40 text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-bold uppercase mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Novo Drop de Ativo Conquistado!
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src={battleResult.droppedItem.image}
                    alt={battleResult.droppedItem.name}
                    className="w-14 h-14 rounded-xl object-cover border border-white/20 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading font-bold text-sm text-white truncate">
                      {battleResult.droppedItem.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <RarityBadge rarity={battleResult.droppedItem.rarity} size="sm" />
                      <span className="text-[10px] font-mono text-cyan-300">
                        {battleResult.droppedItem.power} PWR
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dropped Box Card (Requirement 13) */}
            {battleResult.droppedBox && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-cyan-500/15 to-transparent border border-amber-400/50 text-left space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300 font-bold uppercase">
                  <span>🎁 Você recebeu uma {battleResult.droppedBox.name}!</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-400/40 shrink-0">
                    <img
                      src={BOX_DEFINITIONS[battleResult.droppedBox.boxType]?.image}
                      alt={battleResult.droppedBox.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading font-bold text-sm text-white truncate">
                      {battleResult.droppedBox.name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-300 mt-0.5">
                      {BOX_DEFINITIONS[battleResult.droppedBox.boxType]?.guarantees}
                    </p>
                  </div>
                </div>

                {/* Box Action Options */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      const b = battleResult.droppedBox!;
                      setBattleResult(null);
                      try {
                        const summary = openBox(b.id);
                        setActiveOpeningSummary(summary);
                      } catch {
                        // Handled in context toast
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(251,191,36,0.3)] flex items-center justify-center gap-1.5"
                  >
                    <PackageOpen className="w-3.5 h-3.5" />
                    <span>ABRIR AGORA</span>
                  </button>
                  <button
                    onClick={() => {
                      setBattleResult(null);
                      onNavigate('inventory');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-heading font-bold text-xs uppercase tracking-wider transition-colors text-center"
                  >
                    <span>GUARDAR NO INVENTÁRIO</span>
                  </button>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => setBattleResult(null)}
                className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                Coletar e Continuar
              </button>
              <button
                onClick={() => {
                  setBattleResult(null);
                  onNavigate('inventory');
                }}
                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 transition-colors"
              >
                Ver no Inventário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opening Modal */}
      {activeOpeningSummary && (
        <BoxOpeningModal
          summary={activeOpeningSummary}
          onClose={() => setActiveOpeningSummary(null)}
        />
      )}
    </div>
  );
};
