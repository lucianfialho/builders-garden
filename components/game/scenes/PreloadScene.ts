import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Por enquanto, vamos criar graphics simples como placeholders
    // Mais tarde, você pode adicionar sprites de pixel art do Freepik aqui

    // Exemplo de como carregar sprites (quando tiver os assets):
    // this.load.image('grass_tile', '/assets/sprites/tiles/grass.png');
    // this.load.image('dirt_tile', '/assets/sprites/tiles/dirt.png');
    // this.load.image('plant_stage_0', '/assets/sprites/plants/seed.png');

    // Loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Carregando...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x10b981, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  create() {
    // Inicia a GardenScene
    this.scene.start('GardenScene');
  }
}
