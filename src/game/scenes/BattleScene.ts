import { Scene } from 'phaser';
import {SCENE_KEYS} from "../../constants/SceneKeys.ts";
import {
    BATTLE_ASSET_KEYS,
    BATTLE_BACKGROUND_ASSET_KEYS, HEALTH_BAR_ASSET_KEYS, MONSTER_ASSET_KEYS,
} from "../../constants/AssetsKeys.ts";
import {BattleMenu} from "../../battle/ui/menu/BattleMenu.ts";
import {DIRECTION_KEYS, DIRECTION} from "../../constants/playerInput.ts";
import {Controls} from "../../utils/controls.ts";



export class BattleScene extends Scene
{
   #battleMenu: BattleMenu;
   #controls: Controls;

    constructor ()
    {
        super(SCENE_KEYS.BATTLE_SCENE);
    }


    create ()
    {
        // create main background
        const background = this.add.image(0, 0, BATTLE_BACKGROUND_ASSET_KEYS.FOREST).setOrigin(0);

        // render out the player and enemy monsters
        this.add.image(768, 144, MONSTER_ASSET_KEYS.CARNODUSK, 0);
        this.add.image(256, 316, MONSTER_ASSET_KEYS.IGUANIGNITE, 0).setFlipX(true);

        // render out the player health bar
        const playMonsterName = this.add.text(
            30,
            20,
            MONSTER_ASSET_KEYS.IGUANIGNITE,
            {
                color: "#7e3d3f",
                fontSize: "32px",
            }
        );
        this.add.container(
            556,
            318,
            [
                this.add.image(0, 0, BATTLE_ASSET_KEYS.HEALTH_BAR_BACKGROUND).setOrigin(0),
                playMonsterName,
                this.#createHealthBar(34, 34),
                this.add.text(
                    playMonsterName.width + 35,
                    23,
                    'L5',
                    {
                        color: "#ed474b",
                        fontSize: "28px",
                    }
                ),
                this.add.text(
                    20,
                    55,
                    'HP',
                    {
                        color: "#ff6505",
                        fontSize: "24px",
                        fontStyle: "italic",
                    }
                ),
                this.add.text(
                    443,
                    80,
                    '25/25',
                    {
                        color: "#7e3d3f",
                        fontSize: "16px",
                    }
                ).setOrigin(1, 0),
            ]
        );

        // render out the enemy health bar
        const enemyMonsterName = this.add.text(
            30,
            20,
            MONSTER_ASSET_KEYS.IGUANIGNITE,
            {
                color: "#7e3d3f",
                fontSize: "32px",
            }
        );
        this.add.container(
            0,
            0,
            [
                this.add.image(0, 0, BATTLE_ASSET_KEYS.HEALTH_BAR_BACKGROUND).setOrigin(0).setScale(1, 0.8),
                enemyMonsterName,
                this.#createHealthBar(34, 34),
                this.add.text(
                    enemyMonsterName.width + 35,
                    23,
                    'L5',
                    {
                        color: "#ed474b",
                        fontSize: "28px",
                    }
                ),
                this.add.text(
                    20,
                    55,
                    'HP',
                    {
                        color: "#ff6505",
                        fontSize: "24px",
                        fontStyle: "italic",
                    }
                ),
            ]
        );

        // render out main-info and sub-info panes
        this.#battleMenu = new BattleMenu(this, background.height);
        this.#controls = new Controls(this);

        this.#battleMenu.showBattleMenu();

    }

    update(){

        const selectedDirection = this.#controls.getDirectionKeyJustPressed();

        if (this.#controls.wasOkayKeyPressed()) {
            this.#battleMenu.handlePlayerInput("OK");
            return;
        }
        if (this.#controls.wasBackKeyPressed()) {
            this.#battleMenu.handlePlayerInput("CANCEL");
            this.scene.start(SCENE_KEYS.WORLD_SCENE);
            return;
        }

        if (selectedDirection !== DIRECTION.NONE){
            this.#battleMenu.handlePlayerInput(selectedDirection);
        }
    }

    #createHealthBar(x: number, y: number){
        const scaleY = 0.7;
        const leftCap = this.add.image(x, y, HEALTH_BAR_ASSET_KEYS.LEFT_CAP).setOrigin(0, 0.5)
            .setScale(1, scaleY)
        ;
        const middle = this.add.image(
            leftCap.x + leftCap.width, y, HEALTH_BAR_ASSET_KEYS.MIDDLE).setOrigin(0, 0.5)
            .setScale(1, scaleY);
        middle.displayWidth = 360;
        const rightCap = this.add.image(
            middle.x + middle.displayWidth,
            y,
            HEALTH_BAR_ASSET_KEYS.RIGHT_CAP
        ).setOrigin(0, 0.5)
            .setScale(1, scaleY);
        return this.add.container(
            x,
            y,
            [
                leftCap,
                middle,
                rightCap,
            ]
        );
    }
}
