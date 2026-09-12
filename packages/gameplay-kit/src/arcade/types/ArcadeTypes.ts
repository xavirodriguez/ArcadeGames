import { Component } from "@tiny-aster/core";

/** @public */
export interface LootTableComponent extends Component {
    type: "LootTable";
    tableId: string;
    drops?: Array<{ type: string; chance: number; config?: Record<string, unknown> }>;
}

/** @public */
export interface PowerUpComponent extends Component {
    type: "PowerUp";
    powerUpType: string;
}
