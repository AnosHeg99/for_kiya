import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Point2D } from './types';
import { SeasonId } from './data/config';
import { ParticlePhysicsCanvas } from './components/ParticlePhysicsCanvas';
import { FloatingSceneLayers } from './components/FloatingSceneLayers';
import { SeasonSelector } from './components/SeasonSelector';
import { AuraCursor } from './components/AuraCursor';
import { CinematicOpening } from './components/CinematicOpening';
import { CgiTransitionPortal } from './components/CgiTransitionPortal';
import { LetterModal } from './components/LetterModal';
import { MemoryGallery } from './components/MemoryGallery';
import { ChocolatePOV } from './components/ChocolatePOV';
import { ReplyLetterModal } from './components/ReplyLetterModal';
import { ArigatouScene } from './components/ArigatouScene';
import { acousticEngine } from './audio/acousticEngine';

// =========================================================
// REQUIREMENT 30: EXPLICIT ARCHITECTURAL SCENE STATE MACHINE
// =========================================================
export const SCENE = {
  INTRO: 'intro',
  SANCTUARY: 'sanctuary',
  LETTER: 'letter',
  MEMORY: 'memory',
  GIFT: 'gift',
  REPLY: 'reply',
  ARIGATOU: 'arigatou',
} as const;

export type SceneType = typeof SCENE[keyof typeof SCENE];

export default function App() {
  const [pointer, setPointer] = useState<Point2D>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  });
  const [normalizedPointer, setNormalizedPointer] = useState<Point2D>({ x: 0, y: 0 });
  const [isPointerActive, setIsPointerActive] = useState<boolean>(false);
  const [season, setSeason] = useState<SeasonId>('semi');
  const [currentScene, setCurrentScene] = useState<SceneType>(SCENE.SANCTUARY);
  const [hasOpenedIntro, setHasOpenedIntro] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const hasInteractedRef = useRef<boolean>(false);

  // Audio Activation on first user gesture
  const triggerAudioOnFirstGesture = useCallback(() => {
    if (!hasInteractedRef.current) {
      hasInteractedRef.current = true;
      acousticEngine.activate();
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      triggerAudioOnFirstGesture();
      setIsPointerActive(true);

      const x = e.clientX;
      const y = e.clientY;
      setPointer({ x, y });

      const normX = (x / window.innerWidth) * 2 - 1;
      const normY = (y / window.innerHeight) * 2 - 1;
      setNormalizedPointer({
        x: Math.max(-1, Math.min(1, normX)),
        y: Math.max(-1, Math.min(1, normY)),
      });
    },
    [triggerAudioOnFirstGesture]
  );

  const handlePointerDown = useCallback(() => {
    triggerAudioOnFirstGesture();
  }, [triggerAudioOnFirstGesture]);

  const handlePointerLeave = useCallback(() => {
    setIsPointerActive(false);
    setNormalizedPointer({ x: 0, y: 0 });
  }, []);

  // Strict World Transition with Guard
  const transitionTo = useCallback(
    (nextScene: SceneType) => {
      if (isTransitioning || nextScene === currentScene) return;

      setIsTransitioning(true);
      acousticEngine.ensureBgmPlaying();
      acousticEngine.playSceneClick(nextScene);
      acousticEngine.playMagicSparkle();

      setTimeout(() => {
        setCurrentScene(nextScene);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 550);
      }, 550);
    },
    [isTransitioning, currentScene]
  );

  // Gyroscope / device orientation for mobile tilting
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      triggerAudioOnFirstGesture();
      if (e.gamma !== null && e.beta !== null) {
        const normX = Math.max(-1, Math.min(1, e.gamma / 35));
        const normY = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
        setNormalizedPointer({ x: normX, y: normY });
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      acousticEngine.destroy();
    };
  }, [triggerAudioOnFirstGesture]);

  return (
    <div
      id="aozora-root-sanctuary"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      className="relative w-screen h-[100dvh] overflow-hidden select-none bg-sky-100 text-sky-950"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Background Multi-Season Particle Physics Canvas */}
      <ParticlePhysicsCanvas
        pointer={pointer}
        isPointerActive={isPointerActive}
        season={season}
        ripplePoint={null}
      />

      {/* Opening Scene (Sanctuary): Japanese Light Novel Cover x Kinetic Visual */}
      <FloatingSceneLayers
        pointer={pointer}
        normalizedPointer={normalizedPointer}
        season={season}
        onOpenLetter={() => transitionTo(SCENE.LETTER)}
        isOpeningLetter={isTransitioning}
      />

      {/* Season Selector: Always accessible across sanctuary, letter, memory, gift */}
      {currentScene !== SCENE.ARIGATOU && (
        <SeasonSelector
          currentSeason={season}
          onSelectSeason={(newSeason) => setSeason(newSeason)}
        />
      )}

      {/* Stage 1: Magical Light Novel Letter */}
      <LetterModal
        isOpen={currentScene === SCENE.LETTER}
        onProceed={() => transitionTo(SCENE.GIFT)}
        pointer={pointer}
        season={season}
        onSeasonChange={(newSeason) => setSeason(newSeason)}
      />

      {/* Stage 2: Memory Archive */}
      {currentScene === SCENE.MEMORY && (
        <MemoryGallery
          isOpen={currentScene === SCENE.MEMORY}
          onOpenChocolate={() => transitionTo(SCENE.GIFT)}
          pointer={pointer}
          season={season}
        />
      )}

      {/* Stage 3: Celestial Gift Pavilion & Sacred Treasures */}
      <ChocolatePOV
        isOpen={currentScene === SCENE.GIFT}
        onReceiveChocolate={() => transitionTo(SCENE.REPLY)}
        pointer={pointer}
        season={season}
      />

      {/* Stage 4: Sacred Parchment Reply Letter */}
      <ReplyLetterModal
        isOpen={currentScene === SCENE.REPLY}
        currentSeason={season}
        onSelectSeason={(newSeason) => setSeason(newSeason)}
        onSendComplete={() => transitionTo(SCENE.ARIGATOU)}
        pointer={pointer}
      />

      {/* Stage 5: Epilogue Sanctum & Sacred Chains Seal (Adapts to last selected season) */}
      <ArigatouScene
        isOpen={currentScene === SCENE.ARIGATOU}
        season={season}
      />

      {/* CGI World Transition Portal */}
      <CgiTransitionPortal isActive={isTransitioning} />

      {/* Grand Initial Cinematic Opening */}
      {!hasOpenedIntro && (
        <CinematicOpening onComplete={() => setHasOpenedIntro(true)} />
      )}

      {/* Dynamic Seasonal Aura Cursor */}
      <AuraCursor
        pointer={pointer}
        isPointerActive={isPointerActive}
        season={season}
      />
    </div>
  );
}
