import breakfastTable from "./breakfast_table.json";
import billiardTable from "./billiard_table.json";
import spaceDemo from "./space_demo.json";
import garden_Circuit from "./garden_circuit.json";
import deskLabyrinth from "./desk_labyrinth.json";
import spaceSpeedway from "./space_speedway.json";

export const TRACKS: Record<string, unknown> = {
  breakfast_table: breakfastTable,
  billiard_table: billiardTable,
  space_demo: spaceDemo,
  garden_circuit: garden_Circuit,
  desk_labyrinth: deskLabyrinth,
  space_speedway: spaceSpeedway
};

export const DEFAULT_TRACK_ID = "breakfast_table";

export interface TrackOption {
  id: string;
  name: string;
}

export const TRACK_LIST: TrackOption[] = [
  { id: "breakfast_table", name: (breakfastTable as { name?: string }).name ?? "Breakfast Table Dash" },
  { id: "billiard_table", name: (billiardTable as { name?: string }).name ?? "Billiard Table Championship" },
  { id: "space_demo", name: (spaceDemo as { name?: string }).name ?? "Cosmic Nebula Grand Prix" },
  { id: "garden_circuit", name: (garden_Circuit as { name?: string }).name ?? "Garden Circuit" },
  { id: "desk_labyrinth", name: (deskLabyrinth as { name?: string }).name ?? "Desk Labyrinth" },
  { id: "space_speedway", name: (spaceSpeedway as { name?: string }).name ?? "Space Speedway" }
];
