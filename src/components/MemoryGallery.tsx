import React, { useState, useEffect } from 'react';
import { APP_CONFIG, SeasonId, SEASONS_CONFIG } from '../data/config';
import { acousticEngine } from '../audio/acousticEngine';
import { HoshinekoCompanion } from './HoshinekoCompanion';
import { Point2D } from '../types';

interface MemoryGalleryProps {
  isOpen: boolean;
  onOpenChocolate: () => void;
  pointer: Point2D;
  season: SeasonId;
}

interface ReactionBurst {
  type: 'accept' | 'decline';
  emoji: string;
  reactionText: string;
  particles: { id: number; emoji: string; x: number; y: number; scale: number; vx: number; vy: number }[];
}

export const MemoryGallery: React.FC<MemoryGalleryProps> = ({
  isOpen,
  onOpenChocolate,
  pointer,
  season,
}) => {
  const [queueIndex, setQueueIndex] = useState(0);
  const [cardState, setCardState] = useState<'entering' | 'settled' | 'animating-reaction'>('entering');
  const [activeReaction, setActiveReaction] = useState<ReactionBurst | null>(null);
  const [completedQueue, setCompletedQueue] = useState(false);
  const [isOpeningAltar, setIsOpeningAltar] = useState(false);

  const totalCards = APP_CONFIG.memoryCards.length;
  const currentCard = APP_CONFIG.memoryCards[queueIndex];
  const currentSeason = SEASONS_CONFIG[season];

  // Auto-settle card after whoosh entrance
  useEffect(() => {
    if (!isOpen || completedQueue) return;
    setCardState('entering');
    acousticEngine.playWhoosh();

    const timer = setTimeout(() => {
      setCardState('settled');
    }, 550);

    return () => clearTimeout(timer);
  }, [queueIndex, isOpen, completedQueue]);

  if (!isOpen) return null;

  // Handle "Iya" (Accept) Choice
  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cardState !== 'settled' || activeReaction) return;

    setCardState('animating-reaction');
    acousticEngine.playTactileClick();
    acousticEngine.playMagicSparkle();
    acousticEngine.playKawaiiPop(1.2);
    acousticEngine.playCatMeow(1.2);

    const baseEmoji = currentCard.acceptEmoji || '💖';
    const particles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: [baseEmoji, '✨', '🌸', '🥰', '⭐'][i % 5],
      x: (Math.random() - 0.5) * 220,
      y: (Math.random() - 0.5) * 180,
      scale: 0.8 + Math.random() * 1.2,
      vx: (Math.random() - 0.5) * 4,
      vy: -2 - Math.random() * 4,
    }));

    setActiveReaction({
      type: 'accept',
      emoji: baseEmoji,
      reactionText: currentCard.acceptReactionText || 'Terima Kasih Banyak! Nyaa~ 🌸',
      particles,
    });

    setTimeout(() => {
      setActiveReaction(null);
      if (queueIndex + 1 < totalCards) {
        setQueueIndex((prev) => prev + 1);
      } else {
        setCompletedQueue(true);
        acousticEngine.playChime(1.8, 9);
      }
    }, 1400);
  };

  // Handle "Tidak" (Decline) Choice
  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cardState !== 'settled' || activeReaction) return;

    setCardState('animating-reaction');
    acousticEngine.playTactileClick();
    acousticEngine.playKawaiiPop(0.85);

    const baseEmoji = currentCard.declineEmoji || '🥺';
    const particles = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      emoji: [baseEmoji, '💧', '🍃', '💨'][i % 4],
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 160,
      scale: 0.8 + Math.random() * 1.0,
      vx: (Math.random() - 0.5) * 3,
      vy: -1 - Math.random() * 3,
    }));

    setActiveReaction({
      type: 'decline',
      emoji: baseEmoji,
      reactionText: currentCard.declineReactionText || 'Ehh? Jangan sedih yaa... 😿',
      particles,
    });

    setTimeout(() => {
      setActiveReaction(null);
      if (queueIndex + 1 < totalCards) {
        setQueueIndex((prev) => prev + 1);
      } else {
        setCompletedQueue(true);
        acousticEngine.playChime(1.8, 9);
      }
    }, 1400);
  };

  // Center Altar Click: ONLY center emblem triggers transition
  const handleCenterEmblemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpeningAltar) return;

    setIsOpeningAltar(true);
    acousticEngine.playTactileClick();
    acousticEngine.playChime(1.8, 9);
    acousticEngine.playMagicSparkle();

    setTimeout(() => {
      onOpenChocolate();
    }, 750);
  };

  return (
    <div
      id="memory-gallery-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-sky-950/60 backdrop-blur-2xl transition-all duration-700 select-none pointer-events-auto overflow-hidden"
    >
      {/* Dynamic Seasonal Ambient Wash */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-1000"
        style={{
          background: `radial-gradient(ellipse at 50% 45%, ${currentSeason.cardGlow} 0%, rgba(12, 74, 110, 0.45) 50%, rgba(8, 47, 73, 0.85) 100%)`,
        }}
      />

      {/* ========================================================= */}
      {/* STAGE A: ACTIVE MEMORY CARD QUEUE */}
      {/* Clean, no "memory card 1/4" text, elegant interactive choice prompt */}
      {/* ========================================================= */}
      {!completedQueue && currentCard && (
        <div className="relative flex flex-col md:flex-row items-center justify-center gap-6 max-w-4xl w-full z-20">
          {/* Main Memory Card Container */}
          <div
            id={`memory-card-${currentCard.id}`}
            className={`relative w-full max-w-[340px] sm:max-w-[400px] rounded-[30px] overflow-hidden border-2 border-white/90 bg-gradient-to-b from-white/95 via-sky-50/95 to-sky-100/95 shadow-[0_25px_65px_rgba(14,165,233,0.35)] backdrop-blur-xl flex flex-col transition-all duration-500 ${
              cardState === 'entering'
                ? 'opacity-0 scale-90 translate-y-8 filter blur-sm'
                : cardState === 'animating-reaction'
                ? 'scale-102 filter blur-[0.5px]'
                : 'opacity-100 scale-100 translate-y-0 filter blur-0'
            }`}
          >
            {/* Card Top Decorative Bar */}
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-sky-100/80 bg-white/70">
              <span className="font-syncopate text-[9px] font-bold tracking-[0.2em] text-sky-800">
                {currentCard.badge}
              </span>
              <span className="font-jp text-[10px] text-sky-700 font-bold">
                {currentCard.japanese}
              </span>
            </div>

            {/* Visual Media Placeholder (Image / GIF / Animation) */}
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-sky-100/60 group">
              <img
                src={currentCard.mediaUrl}
                alt={currentCard.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sky-950/60 via-transparent to-transparent pointer-events-none" />

              {/* Title Overlay */}
              <div className="absolute bottom-2.5 inset-x-4 text-white">
                <h3 className="font-cinzel text-sm sm:text-base font-bold drop-shadow-md">
                  {currentCard.title}
                </h3>
                <span className="font-jp text-[10px] text-sky-100/90 font-medium block">
                  {currentCard.subtitle}
                </span>
              </div>
            </div>

            {/* Memory Quote Body */}
            <div className="p-4 sm:p-5 flex flex-col gap-3">
              <p className="text-xs sm:text-[12.5px] leading-relaxed text-sky-950/85 italic border-l-2 border-sky-400 pl-3">
                "{currentCard.quote}"
              </p>

              {/* Umpan Balik: "Apa Kamu Terima?" */}
              <div className="mt-2 pt-3 border-t border-sky-100/90 flex flex-col items-center gap-2.5">
                <span className="font-cinzel text-xs font-bold text-sky-900 tracking-wide flex items-center gap-1.5">
                  <span className="text-amber-500">✦</span>
                  <span>{currentCard.inquiry || 'Apa kamu terima?'}</span>
                  <span className="text-amber-500">✦</span>
                </span>

                {/* The Two Intuitive Choices: "Iya" and "Tidak" */}
                <div className="flex items-center gap-4 w-full justify-center">
                  {/* "Iya" Button */}
                  <button
                    type="button"
                    id={`accept-card-${currentCard.id}`}
                    onClick={handleAccept}
                    disabled={cardState === 'animating-reaction'}
                    className="relative px-6 py-2 rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 text-white font-cinzel font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(56,189,248,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white"
                  >
                    <span>Iya ✦</span>
                  </button>

                  {/* "Tidak" Button */}
                  <button
                    type="button"
                    id={`decline-card-${currentCard.id}`}
                    onClick={handleDecline}
                    disabled={cardState === 'animating-reaction'}
                    className="px-5 py-2 rounded-full bg-white/80 hover:bg-sky-50 text-sky-800 font-cinzel font-semibold text-xs tracking-wider border border-sky-200 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Tidak ↷</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Hoshineko Companion with Mini-Game Controls */}
          <div className="flex flex-col items-center">
            <HoshinekoCompanion
              pointer={pointer}
              season={season}
              sceneName="memory-companion"
              size="md"
              showMiniGameControls={true}
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EXTRAORDINARY FULLSCREEN EMOJI ANIMATION BURST */}
      {/* ========================================================= */}
      {activeReaction && (
        <div className="fixed inset-0 z-60 pointer-events-none flex flex-col items-center justify-center animate-fade-in">
          {/* Central Pulsating Emoji with Radiant Aura */}
          <div className="relative flex flex-col items-center animate-bounce">
            <div className="text-7xl sm:text-9xl filter drop-shadow-[0_0_35px_rgba(244,114,182,0.9)] animate-pulse">
              {activeReaction.emoji}
            </div>

            {/* Playful Reaction Bubble */}
            <div className="mt-4 px-5 py-2 rounded-full bg-white/95 text-sky-950 font-jp font-bold text-sm sm:text-base shadow-[0_12px_35px_rgba(14,165,233,0.45)] border border-sky-200 animate-magic-pulse">
              {activeReaction.reactionText}
            </div>
          </div>

          {/* Radiating Scatter Emojis */}
          {activeReaction.particles.map((p) => (
            <span
              key={p.id}
              className="absolute text-3xl sm:text-4xl pointer-events-none animate-ping"
              style={{
                transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})`,
                animationDuration: '1.2s',
              }}
            >
              {p.emoji}
            </span>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* STAGE B: GRAND CELESTIAL ALTAR (BUKA KADO) */}
      {/* Real-time rotating magic seal, NO ADS, ONLY center emblem clickable */}
      {/* ========================================================= */}
      {completedQueue && (
        <div
          id="celestial-gift-altar"
          className="relative z-20 flex flex-col items-center justify-center max-w-md w-full animate-ww-content"
        >
          {/* Top Japanese Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white shadow-2xs mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-syncopate text-[9.5px] font-bold text-sky-900 tracking-[0.25em]">
                SANCTUARY UNVEILED
              </span>
            </div>
            <h2 className="font-jp text-2xl sm:text-3xl font-black text-white tracking-widest drop-shadow-md">
              天上の宝物庫
            </h2>
            <span className="font-cinzel text-xs font-semibold text-sky-200 tracking-wider mt-1 block">
              CELESTIAL GIFT SANCTUARY
            </span>
          </div>

          {/* REAL-TIME ROTATING SACRED MAGIC SEAL ARRAY */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            {/* Outer Rotating Runic Circle */}
            <div
              className="absolute inset-0 rounded-full border border-dashed border-amber-300/60 animate-spin pointer-events-none"
              style={{ animationDuration: '28s' }}
            />
            {/* Counter-Rotating Inner Astral Ring */}
            <div
              className="absolute inset-4 rounded-full border-2 border-white/60 animate-spin pointer-events-none"
              style={{ animationDuration: '18s', animationDirection: 'reverse' }}
            />
            {/* Golden Star Glyph Lines */}
            <div className="absolute inset-8 rounded-full border border-sky-300/40 pointer-events-none animate-pulse" />

            {/* ONLY CENTER EMBLEM IS CLICKABLE */}
            <button
              type="button"
              id="center-buka-kado-emblem"
              onClick={handleCenterEmblemClick}
              className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500 shadow-[0_0_45px_rgba(251,191,36,0.9)] border-2 border-white group outline-none ${
                isOpeningAltar
                  ? 'scale-125 rotate-180 filter blur-[1px]'
                  : 'hover:scale-110 active:scale-95'
              }`}
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, #fef08a 0%, #f59e0b 45%, #b45309 100%)',
              }}
            >
              <div className="absolute inset-[-6px] rounded-full border border-dashed border-amber-200 animate-spin pointer-events-none" style={{ animationDuration: '8s' }} />

              {/* Radiant Celestial Treasure Crest */}
              <div className="flex flex-col items-center justify-center text-white filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">
                  ✦
                </span>
                <span className="font-cinzel text-[8.5px] font-black tracking-widest mt-0.5">
                  BUKA
                </span>
              </div>
            </button>
          </div>

          {/* Living Hoshineko below Altar */}
          <div className="mt-4 flex flex-col items-center">
            <HoshinekoCompanion
              pointer={pointer}
              season={season}
              sceneName="altar-companion"
              size="sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};
