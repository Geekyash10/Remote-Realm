import Phaser from "phaser";

// Import tile images
import Basement from "/Assets/Basement.png";
import ModernOffice from "/Assets/Modern_Office_Black_Shadow.png";
import Generic from "/Assets/Generic.png";
import Chair from "/Assets/chair.png";
import RoomBuilderWalls from "/Assets/Room_Builder_Walls.png";
import RoomBuilderOffice from "/Assets/Room_Builder_Office.png";
import RoomBuilderFloors from "/Assets/Room_Builder_Floors.png";
import ClassroomLibrary from "/Assets/Classroom_and_library.png";
import player_photo from '/Assets/character/adam.png'
import player_json from '/Assets/character/adam.json?url'

// Import map JSON
import mapSmall from '/Assets/mapSmall.json?url';

export class GameScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;
   private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private player!: Phaser.Physics.Arcade.Sprite
    private playerDirection!: string

  constructor() {
    super("GameScene");
  }

  preload() {
    // Load the tilemap JSON
    this.load.tilemapTiledJSON("mapSmall", mapSmall);

    // Load tileset images
    this.load.image("basement", Basement);
    this.load.image("modern-office", ModernOffice);
    this.load.image("generic", Generic);
    this.load.image("chair", Chair);
    this.load.image("room-walls", RoomBuilderWalls);
    this.load.image("room-office", RoomBuilderOffice);
    this.load.image("room-floors", RoomBuilderFloors);
    this.load.image("classroom-library", ClassroomLibrary);
    this.load.atlas('player',player_photo,player_json)
    // add cursor command
    this.cursors = this.input.keyboard!.createCursorKeys()
  }

  create() {
    this.createMap();
  }

  createMap() {
    // Create tilemap from JSON
    this.map = this.make.tilemap({ key: "mapSmall" });


    // Add tilesets from JSON
    const basementTileset = this.map.addTilesetImage("Basement", "basement");
    const modernOfficeTileset = this.map.addTilesetImage("Modern_Office_Black_Shadow", "modern-office");
    const genericTileset = this.map.addTilesetImage("Generic", "generic");
    const chairTileset = this.map.addTilesetImage("chair", "chair");
    const wallsTileset = this.map.addTilesetImage("Room_Builder_Walls", "room-walls");
    const officeTileset = this.map.addTilesetImage("Room_Builder_Office", "room-office");
    const floorsTileset = this.map.addTilesetImage("Room_Builder_Floors", "room-floors");
    const classroomTileset = this.map.addTilesetImage("Classroom_and_library", "classroom-library");

    // Add all tilesets to an array
    console.log(this.map)
    // const tilesets = [
    //   basementTileset, modernOfficeTileset, genericTileset, chairTileset,
    //   wallsTileset, officeTileset, floorsTileset, classroomTileset
    // ].filter(ts => ts !== null); // Ensure no null values

    // console.log(tilesets);

    const layerNames = this.map.layers.map(layer => layer.name);
    console.log(layerNames);

    const ground = [wallsTileset, officeTileset, floorsTileset].filter(ts => ts !== null)
    const obj = [basementTileset, modernOfficeTileset, genericTileset, chairTileset, classroomTileset].filter(ts => ts !== null)
    const groundLayer1 = this.map.createLayer('Floor', ground)
    const groundLayer2 = this.map.createLayer('walls', ground)
    const groundLayer3 = this.map.createLayer('walls2', ground)
    this.map.createLayer('chairs', obj)
    this.map.createLayer('tables', obj)
    // console.log(groundLayer)

    console.log(groundLayer1);
    console.log(groundLayer2);
    console.log(groundLayer3);

    if (groundLayer1) groundLayer1.setCollisionByProperty({ collides: true })
    if (groundLayer2) groundLayer2.setCollisionByProperty({ collides: true })
    if (groundLayer3) groundLayer3.setCollisionByProperty({ collides: true })
    // console.log(groundLayer)
    console.log(groundLayer1);
    console.log(groundLayer2);
    console.log(groundLayer3);
    const debugGraphics = this.add.graphics().setAlpha(0.7)
    if (groundLayer1) {
      groundLayer1.renderDebug(debugGraphics, {
        tileColor: null,
        collidingTileColor: new Phaser.Display.Color(243, 234, 48, 255),
        faceColor: new Phaser.Display.Color(40, 39, 37, 255),
      })
    }
    if(groundLayer2)
    {
    groundLayer2.renderDebug(debugGraphics, {
      tileColor: null,
      collidingTileColor: new Phaser.Display.Color(243, 234, 48, 255),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    })
}
    if(groundLayer3)
    {
    groundLayer3.renderDebug(debugGraphics, {
      tileColor: null,
      collidingTileColor: new Phaser.Display.Color(243, 234, 48, 255),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    })
}

    // Create each layer
    // layerNames.forEach(layerName => {
    //     console.log(layerName);
    //     const layer = this.map.createLayer(layerName, tilesets, 0, 0);
    //     console.log(layer);
    //     if (!layer) {
    //         console.error(Layer ${layerName} not found in tilemap!);
    //         return;
    //     }
        
    //     // Set collision for this layer if needed
    //     layer.setCollisionByProperty({ collides: true });
    //      const debugGraphics = this.add.graphics().setAlpha(0.7)
    //         layer.renderDebug(debugGraphics, {
    //           tileColor: null,
    //           collidingTileColor: new Phaser.Display.Color(243, 234, 48, 255),
    //           faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    //         })
    // });
    

    this.player = this.physics.add.sprite(
        this.sys.canvas.width * 0.35,
        this.sys.canvas.height * 1,
        'player',
        'Adam_idle_anim_19.png'
      )
      this.playerDirection = 'down'
  
      const animsFrameRate = 15
  
      this.anims.create({
        key: 'player_idle_right',
        frames: this.anims.generateFrameNames('player', {
          start: 1,
          end: 6,
          prefix: 'Adam_idle_anim_',
          suffix: '.png',
        }),
        repeat: -1,
        frameRate: animsFrameRate * 0.6,
      })
  
      this.anims.create({
        key: 'player_idle_up',
        frames: this.anims.generateFrameNames('player', {
          start: 7,
          end: 12,
          prefix: 'Adam_idle_anim_',
          suffix: '.png',
        }),
        repeat: -1,
        frameRate: animsFrameRate * 0.6,
      })
  
      this.anims.create({
        key: 'player_idle_left',
        frames: this.anims.generateFrameNames('player', {
          start: 13,
          end: 18,
          prefix: 'Adam_idle_anim_',
          suffix: '.png',
        }),
        repeat: -1,
        frameRate: animsFrameRate * 0.6,
      })
  
      this.anims.create({
        key: 'player_idle_down',
        frames: this.anims.generateFrameNames('player', {
          start: 19,
          end: 24,
          prefix: 'Adam_idle_anim_',
          suffix: '.png',
        }),
        repeat: -1,
        frameRate: animsFrameRate * 0.6,
      })
  
      this.anims.create({
        key: 'player_run_right',
        frames: this.anims.generateFrameNames('player', {
          start: 1,
          end: 6,
          prefix: 'Adam_run_',
          suffix: '.png',
        }),
        repeat: -1,
        frameRate: animsFrameRate,
      })
  
      this.anims.create({
        key: 'player_run_up',
        frames: this.anims.generateFrameNames('player', {
          start: 7,
          end: 12,
          prefix: 'Adam_run_',
          suffix: '.png',
        }),
        repeat: -1,
        frameRate: animsFrameRate,
      })
  
      this.anims.create({
        key: 'player_run_left',
        frames: this.anims.generateFrameNames('player', {
          start: 13,
          end: 18,
          prefix: 'Adam_run_',
          suffix: '.png',
        }),
        repeat: -1,
        frameRate: animsFrameRate,
      })
  
      this.anims.create({
        key: 'player_run_down',
        frames: this.anims.generateFrameNames('player', {
          start: 19,
          end: 24,
          prefix: 'Adam_run_',
          suffix: '.png',
        }),
        repeat: -1,
        frameRate: animsFrameRate,
      })
  
      this.cameras.main.zoom = 1.5
      this.cameras.main.startFollow(this.player)
    }
  
    update(_t: number, _dt: number) {
      if (!this.cursors || !this.player) {
        return
      }
      const speed = 200
      if (this.cursors.left?.isDown) {
        this.player.play('player_run_left', true)
        this.player.setVelocity(-speed, 0)
        this.playerDirection = 'left'
      } else if (this.cursors.right?.isDown) {
        this.player.play('player_run_right', true)
        this.player.setVelocity(speed, 0)
        this.playerDirection = 'right'
      } else if (this.cursors.up?.isDown) {
        this.player.play('player_run_up', true)
        this.player.setVelocity(0, -speed)
        this.playerDirection = 'up'
      } else if (this.cursors.down?.isDown) {
        this.player.play('player_run_down', true)
        this.player.setVelocity(0, speed)
        this.playerDirection = 'down'
      } else {
        this.player.setVelocity(0, 0)
        this.player.play(`player_idle_${this.playerDirection}`, true)
      }
    }
   
  
}