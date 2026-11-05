import {Scene} from "phaser";
import {SCENE_KEYS} from "../../constants/SceneKeys.ts";
import {WORLD_ASSET_KEYS} from "../../constants/AssetsKeys.ts";
import {Player} from "../../world/character/Player.ts";
import {Coordinate, NpcMovementPattern, TiledObjectProperty} from "../../types/types.ts";
import {TILE_SIZE, TILED_COLLISION_LAYER_ALPHA} from "../../config.ts";
import {Controls} from "../../utils/controls.ts";
import {DIRECTION, DIRECTION_KEYS} from "../../constants/playerInput.ts";
import TilemapLayer = Phaser.Tilemaps.TilemapLayer;
import {DATA_MANAGER_STORE_KEYS, dataManager} from "../../utils/dataManager.ts";
import ObjectLayer = Phaser.Tilemaps.ObjectLayer;
import {getTargetPositionFromGameObjectPositionAndDirection} from "../../utils/gridUtils.ts";
import {CUSTOM_TILED_TYPES, phrases, TILED_NPC_PROPERTY} from "../../constants/appConstants.ts";
import {DialogUi} from "../../world/DialogUi.ts";
import {NPC} from "../../world/character/npc.ts";
import Tilemap = Phaser.Tilemaps.Tilemap;
import {exhaustiveGuard} from "../../utils/guard.ts";


export class WorldScene extends Scene {

    #player: Player;
    #controls: Controls;
    #encounterLayer: TilemapLayer | null;
    #wildMonsterEncountered: boolean;
    #signLayer: ObjectLayer | null;
    #dialogUi: DialogUi;
    #npcs: NPC[];
    #npcPlayerIsInteractingWith: NPC | undefined;

    constructor ()
    {
        super(SCENE_KEYS.WORLD_SCENE);
    }

    init() {
        this.#wildMonsterEncountered = false;
        this.#npcPlayerIsInteractingWith = undefined;
    }

    create(){

        const x = 6 * TILE_SIZE;
        const y = 22 * TILE_SIZE;

        this.cameras.main.setBounds(0, 0, 1280, 2176);
        this.cameras.main.setZoom(0.8);
        this.cameras.main.centerOn(x, y);

       const map = this.make.tilemap({key: WORLD_ASSET_KEYS.WORLD_MAIN_LEVEL});
       const collisionTiles = map.addTilesetImage('collision', WORLD_ASSET_KEYS.WORLD_COLLISION);
        if( !collisionTiles ) {
            console.error(`[${WorldScene.name}:create] encountered error while creating collision tiles`);
            return;
        }
        const encounterTiles = map.addTilesetImage('encounter', WORLD_ASSET_KEYS.WORLD_ENCOUNTER_ZONE);
        if( !encounterTiles ) {
            console.error(`[${WorldScene.name}:create] encountered error while creating encounter tiles`);
            return;
        }

       const collisionLayer = map.createLayer('Collision', collisionTiles, 0, 0);
       if( !collisionLayer ) {
           console.error(`[${WorldScene.name}:create] encountered error while creating collision layer`);
           return;
       }
        this.#encounterLayer = map.createLayer('Encounter', encounterTiles, 0, 0);
        if( !this.#encounterLayer ) {
            console.error(`[${WorldScene.name}:create] encountered error while creating collision layer`);
            return;
        }

       collisionLayer.setAlpha(TILED_COLLISION_LAYER_ALPHA).setDepth(2);
        this.#encounterLayer.setAlpha(TILED_COLLISION_LAYER_ALPHA).setDepth(2);

        //create interactive layer
        this.#signLayer = map.getObjectLayer('Sign');
        if( !this.#encounterLayer ) {
            console.error(`[${WorldScene.name}:create] encountered error while creating sign layer`);
            return;
        }


        this.add.image(0, 0, WORLD_ASSET_KEYS.WORLD_BACKGROUND, 0).setOrigin(0);

        //create NPCs
        this.#createNPCs(map);

        // create player
        this.#player = new Player({
            scene: this,
            position: dataManager.store.get(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION),
            direction: dataManager.store.get(DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION),
            collisionLayer: collisionLayer,
            spriteGridMovementFinishedCallback: () => {
                this.#handlePlayerMovementUpdate();
            },
            otherCharactersToCheckForCollisionWith: this.#npcs,
        });

        this.cameras.main.startFollow(this.#player.sprite);

        // update our collisions with npcs
        this.#npcs.forEach(npc => {
            npc.addCharacterToCheckForCollisionsWith(this.#player);
        });

        this.add.image(0, 0, WORLD_ASSET_KEYS.WORLD_FOREGROUND, 0).setOrigin(0);

        this.#controls = new Controls(this);

        // create dialog ui
        this.#dialogUi = new DialogUi(this, 1280);

        this.cameras.main.fadeIn(1000, 0, 0, 0);
    }

    update(time: DOMHighResTimeStamp) {
        if (this.#wildMonsterEncountered) {
            this.#player.update(time);
            return;
        }
       const selectedDirection = this.#controls.getDirectionKeyPressed();
       if (selectedDirection !== DIRECTION.NONE) {
          this.#player.moveCharacter(selectedDirection);
       }

       // hide dialog ui if player is moving
        if (this.#player.isMoving){
            this.#dialogUi.hideDialogModal();
        }

       // handle player interaction
        if (this.#controls.wasOkayKeyPressed() && !this.#player._isMoving){
            this.#handlePlayerInteraction();
        }

       this.#player.update(time);
        this.#npcs.forEach((npc) => {
            npc.update(time);
        })
    }

    #handlePlayerInteraction() {

        if(this.#dialogUi.textAnimationPlaying){
            return;
        }

        if (this.#dialogUi.isVisible && !this.#dialogUi.moreMessagesToShow) {
            this.#dialogUi.hideDialogModal();
            if(this.#npcPlayerIsInteractingWith){
                this.#npcPlayerIsInteractingWith.isTalkingToPlayer = false;
                this.#npcPlayerIsInteractingWith = undefined;
            }
            return;
        }
        if (this.#dialogUi.isVisible && this.#dialogUi.moreMessagesToShow) {
            this.#dialogUi.showNextMessage();
            return;
        }


        const { x, y } = this.#player.sprite;
        const targetPosition = getTargetPositionFromGameObjectPositionAndDirection({x,y}, this.#player.direction);

        const nearbySign = this.#signLayer?.objects.find(object => {
            if(!object.x || !object.y) {
                return;
            }

            return object.x === targetPosition.x && object.y - TILE_SIZE === targetPosition.y;
        })

        if(nearbySign) {
            const props: TiledObjectProperty[] = nearbySign.properties;
            const msg: string = props.find(prop => prop.name === 'message')?.value;

            const usePlaceHolderText = this.#player.direction !== DIRECTION.UP;
            let textToShow = phrases.CANNOT_READ_SIGN_TEXT;
            if (!usePlaceHolderText) {
                textToShow = msg || phrases.SAMPLE_TEXT;
            }
            this.#dialogUi.showDialogModal([textToShow]);
            return;
        }

        const nearbyNpc = this.#npcs.find(npc => {
            return npc.sprite.x === targetPosition.x && npc.sprite.y === targetPosition.y;
        });

        if (nearbyNpc) {
            nearbyNpc.facePlayer(this.#player.direction);
            nearbyNpc.isTalkingToPlayer = true;
            this.#npcPlayerIsInteractingWith = nearbyNpc;
            this.#dialogUi.showDialogModal(nearbyNpc.messages);
        }
    }

    #handlePlayerMovementUpdate() {
        dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION, {
            x: this.#player.sprite.x,
            y: this.#player.sprite.y,
        });
        dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION, this.#player.direction);

        if (!this.#encounterLayer) {
            return;
        }

        const isInEncounterZone = this.#encounterLayer.getTileAtWorldXY(this.#player.sprite.x, this.#player.sprite.y, true).index !== -1;
        if (!isInEncounterZone) {
            return;
        }

        this.#wildMonsterEncountered = Math.random() < 0.2;
        if (this.#wildMonsterEncountered) {
            this.cameras.main.fadeOut(2000);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start(SCENE_KEYS.BATTLE_SCENE);
            });
        }
    }

    #createNPCs(map: Tilemap) {

        this.#npcs = [];
        const npclayers =   map.getObjectLayerNames().filter(layerName => layerName.includes('NPC'));
        npclayers.forEach(layerName => {
            const layer = map.getObjectLayer(layerName);
            const npcObject = layer?.objects.find(object => {
                return object.type === CUSTOM_TILED_TYPES.NPC;
            });

            if (!npcObject || npcObject.x === undefined || npcObject.y === undefined) {
                return;
            }

            const pathObjects = layer?.objects.filter(object => {
                return object.type === CUSTOM_TILED_TYPES.NPC_PATH;
            });

            const npcPath = {
                0: {x: npcObject.x, y: npcObject.y - TILE_SIZE},
            };
            pathObjects?.forEach(path => {
                if( path.x === undefined || path.y === undefined ) {
                    return;
                }
                npcPath[parseInt(path.name, 10)] = {x: path.x, y: path.y - TILE_SIZE};
            });

            console.log(npcPath);

            const props: TiledObjectProperty[] = npcObject.properties;
            const npcFrame: string = props.find(prop => prop.name === TILED_NPC_PROPERTY.FRAME)?.value || '0';
            const npcMessagesString: string = props.find(prop => prop.name === TILED_NPC_PROPERTY.MESSAGES)?.value || '';
            const npcMessages = npcMessagesString.split('::');
            const npcMovement: NpcMovementPattern = props.find(prop => prop.name === TILED_NPC_PROPERTY.MOVEMENT_PATTERN)?.value || 'IDLE';

            const npc = new NPC({
                scene: this,
                position: {x: npcObject.x, y: npcObject.y - TILE_SIZE},
                direction: DIRECTION.DOWN,
                frame: parseInt(npcFrame, 10),
                messages: npcMessages,
                npcPath,
                movementPattern: npcMovement,
            });
            this.#npcs.push(npc);
        });
    }


}