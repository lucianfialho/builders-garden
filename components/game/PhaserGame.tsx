'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene';
import GardenScene from './scenes/GardenScene';

interface Plant {
  id: string;
  positionX: number;
  positionY: number;
  growthStage: number;
  plantTypeId: string;
}

interface GardenData {
  gridSize: number;
  totalGrowthPoints: number;
  plants: Plant[];
}

interface PhaserGameProps {
  gardenData: GardenData;
  onPlant: (x: number, y: number) => Promise<void>;
}

export default function PhaserGame({ gardenData, onPlant }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    // Configuração do Phaser
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 800,
      height: 800,
      backgroundColor: '#f3f4f6',
      scene: [PreloadScene, GardenScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
    };

    // Cria instância do Phaser
    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Passa dados e callbacks via registry
    game.registry.set('gardenData', gardenData);
    game.registry.set('onPlant', onPlant);

    // Cleanup ao desmontar
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [gardenData, onPlant]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg"
    />
  );
}
