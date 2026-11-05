import {TILE_SIZE} from "../config.ts";
import {DIRECTION} from "../constants/playerInput.ts";
import {GlobalState} from "../types/types.ts";

const initialState = {
    player: {
        position: {
            x: 6 * TILE_SIZE,
            y: 22 * TILE_SIZE,
        },
        direction: DIRECTION.DOWN,
    }
}

export const DATA_MANAGER_STORE_KEYS = Object.freeze({
    PLAYER_POSITION: 'PLAYER_POSITION',
    PLAYER_DIRECTION: 'PLAYER_DIRECTION',
});

class DataManager extends Phaser.Events.EventEmitter {
    #store: Phaser.Data.DataManager;

    constructor() {
        super();
        this.#store = new Phaser.Data.DataManager(this);
        this.#updateDataManager(initialState);
    }

    get store() {
        return this.#store;
    }

    #updateDataManager(data: GlobalState) {

        this.#store.set({
            [DATA_MANAGER_STORE_KEYS.PLAYER_POSITION]: data.player.position,
            [DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION]: data.player.direction,
        });
    }
}

export const dataManager = new DataManager();