import breakfastTable from "./breakfast_table.json";
import billiardTable from "./billiard_table.json";
import spaceDemo from "./space_demo.json";

export const TRACKS: Record<string, unknown> = {
  breakfast_table: breakfastTable,
  billiard_table: billiardTable,
  space_demo: spaceDemo
};

export const DEFAULT_TRACK_ID = "breakfast_table";

export interface TrackOption {
  id: string;
  name: string;
}

export const TRACK_LIST: TrackOption[] = [
  { id: "breakfast_table", name: (breakfastTable as { name?: string }).name ?? "Breakfast Table Dash" },
  { id: "billiard_table", name: (billiardTable as { name?: string }).name ?? "Billiard Table Championship" },
  { id: "space_demo", name: (spaceDemo as { name?: string }).name ?? "Cosmic Nebula Grand Prix" }
];
