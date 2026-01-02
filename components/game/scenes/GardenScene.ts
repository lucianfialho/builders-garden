import Phaser from 'phaser';

interface Plant {
  id: string;
  positionX: number;
  positionY: number;
  growthStage: number;
  plantTypeId: string;
}

interface GardenData {
  gridSize: number;
  plants: Plant[];
}

export default class GardenScene extends Phaser.Scene {
  private gridSize: number = 10;
  private tileSize: number = 64;
  private grid: Phaser.GameObjects.Rectangle[][] = [];
  private plantSprites: Map<string, Phaser.GameObjects.Graphics> = new Map();

  constructor() {
    super({ key: 'GardenScene' });
  }

  create() {
    // Pega dados do jardim passados via registry (do React)
    const gardenData = this.registry.get('gardenData') as GardenData;

    if (gardenData) {
      this.gridSize = gardenData.gridSize;
    }

    // Cria o grid
    this.createGrid();

    // Renderiza plantas existentes
    if (gardenData?.plants) {
      gardenData.plants.forEach(plant => {
        this.renderPlant(plant);
      });
    }

    // Setup de cliques
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer);
    });
  }

  private createGrid() {
    const offsetX = 50;
    const offsetY = 50;

    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];

      for (let x = 0; x < this.gridSize; x++) {
        // Cria tile (grama)
        const tile = this.add.rectangle(
          offsetX + x * this.tileSize,
          offsetY + y * this.tileSize,
          this.tileSize - 2,
          this.tileSize - 2,
          0x22c55e, // Verde (grama)
          1
        );

        tile.setOrigin(0, 0);
        tile.setInteractive();
        tile.setData('gridX', x);
        tile.setData('gridY', y);

        // Hover effect
        tile.on('pointerover', () => {
          tile.setFillStyle(0x16a34a); // Verde mais escuro
        });

        tile.on('pointerout', () => {
          tile.setFillStyle(0x22c55e); // Verde normal
        });

        this.grid[y][x] = tile;
      }
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer) {
    // Busca qual tile foi clicado
    const clickedTile = this.input.hitTestPointer(pointer)[0];

    if (!clickedTile || !clickedTile.getData) {
      return;
    }

    const gridX = clickedTile.getData('gridX');
    const gridY = clickedTile.getData('gridY');

    if (gridX === undefined || gridY === undefined) {
      return;
    }

    // Verifica se já tem planta nessa posição
    const hasPlant = Array.from(this.plantSprites.values()).some(sprite => {
      return sprite.getData('gridX') === gridX && sprite.getData('gridY') === gridY;
    });

    if (hasPlant) {
      console.log(`Já existe planta em (${gridX}, ${gridY})`);
      return;
    }

    // Chama callback do React para plantar
    const onPlant = this.registry.get('onPlant') as (x: number, y: number) => void;

    if (onPlant) {
      onPlant(gridX, gridY);
    }
  }

  private renderPlant(plant: Plant) {
    const offsetX = 50;
    const offsetY = 50;

    const x = offsetX + plant.positionX * this.tileSize + this.tileSize / 2;
    const y = offsetY + plant.positionY * this.tileSize + this.tileSize / 2;

    // Cores por estágio de crescimento (placeholder até ter sprites)
    const stageColors = [
      0x8b4513, // Estágio 0 (seed) - marrom
      0x9ca3af, // Estágio 1 (sprout) - cinza
      0x6ee7b7, // Estágio 2 (young) - verde claro
      0x10b981, // Estágio 3 (mature) - verde
      0x059669, // Estágio 4 (full grown) - verde escuro
    ];

    const color = stageColors[plant.growthStage] || stageColors[0];

    // Desenha planta como círculo colorido (placeholder)
    const plantSprite = this.add.graphics();
    plantSprite.fillStyle(color, 1);
    plantSprite.fillCircle(0, 0, 20 + plant.growthStage * 5); // Cresce de tamanho
    plantSprite.setPosition(x, y);
    plantSprite.setData('gridX', plant.positionX);
    plantSprite.setData('gridY', plant.positionY);
    plantSprite.setData('plantId', plant.id);

    this.plantSprites.set(plant.id, plantSprite);
  }

  // Método público para adicionar planta (chamado do React após API)
  public addPlant(plant: Plant) {
    this.renderPlant(plant);
  }

  // Método público para atualizar planta (quando crescer)
  public updatePlant(plantId: string, newStage: number) {
    const sprite = this.plantSprites.get(plantId);

    if (sprite) {
      // Remove sprite antigo
      sprite.destroy();
      this.plantSprites.delete(plantId);

      // Busca dados da planta
      const gardenData = this.registry.get('gardenData') as GardenData;
      const plant = gardenData?.plants.find(p => p.id === plantId);

      if (plant) {
        plant.growthStage = newStage;
        this.renderPlant(plant);
      }
    }
  }
}
