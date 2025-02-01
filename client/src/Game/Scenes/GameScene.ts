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

// Import map JSON
import mapSmall from '/Assets/mapSmall.json?url';

export class GameScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;

  constructor() {
    super("GameScene");
  }

  preload() {
    // Load the tilemap JSON
    console.log("Starting preload...");
    console.log("mapSmall URL:", mapSmall);
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
  }

  create() {
    this.createMap();
  }

  createMap() {
    // Create tilemap from JSON
    this.map = this.make.tilemap({ key: "mapSmall" });
    
    // Debug: Log the entire map object
    console.log("Map object:", this.map);
    console.log("Map layers:", this.map.layers);

    // Add tilesets from JSON
    const basementTileset = this.map.addTilesetImage("Basement", "basement");
    const modernOfficeTileset = this.map.addTilesetImage("Modern_Office_Black_Shadow", "modern-office");
    const genericTileset = this.map.addTilesetImage("Generic", "generic");
    const chairTileset = this.map.addTilesetImage("chair", "chair");
    const wallsTileset = this.map.addTilesetImage("Room_Builder_Walls", "room-walls");
    const officeTileset = this.map.addTilesetImage("Room_Builder_Office", "room-office");
    const floorsTileset = this.map.addTilesetImage("Room_Builder_Floors", "room-floors");
    const classroomTileset = this.map.addTilesetImage("Classroom_and_library", "classroom-library");

    // Debug: Log each tileset as it's created
    console.log("Tilesets:", {
        basementTileset,
        modernOfficeTileset,
        genericTileset,
        chairTileset,
        wallsTileset,
        officeTileset,
        floorsTileset,
        classroomTileset
    });

    // Add all tilesets to an array
    const tilesets = [
        basementTileset, modernOfficeTileset, genericTileset, chairTileset,
        wallsTileset, officeTileset, floorsTileset, classroomTileset
    ].filter(ts => ts !== null);

    console.log("Filtered tilesets:", tilesets);

    // Debug: Log the raw layer data from the map
    console.log("Raw map data:", this.map.layers);

    const layerNames = this.map.layers.map(layer => layer.name);
    console.log("Layer names:", layerNames);

    // Create each layer
    layerNames.forEach(layerName => {
        console.log(`Creating layer: ${layerName}`);
        const layer = this.map.createLayer(layerName, tilesets, 0, 0);
        console.log(`Created layer result:`, layer);
        
        if (!layer) {
            console.error(`Layer ${layerName} not found in tilemap!`);
            return;
        }
        
        layer.setCollisionByProperty({ collides: true });
    });
}
}
