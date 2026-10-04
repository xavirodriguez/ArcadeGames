import { TrackSpecSchema, VehicleSpecSchema } from "../types/TrackSpecSchema";
import breakfastTable from "../config/tracks/breakfast_table.json";
import billiardTable from "../config/tracks/billiard_table.json";

describe("TrackSpecSchema & VehicleSpecSchema", () => {
  it("validates breakfast_table track spec", () => {
    const parsed = TrackSpecSchema.parse(breakfastTable);
    expect(parsed.id).toBe("breakfast_table");
    expect(parsed.waypoints.length).toBeGreaterThan(0);
    expect(parsed.walls.length).toBeGreaterThan(0);
  });

  it("validates billiard_table track spec", () => {
    const parsed = TrackSpecSchema.parse(billiardTable);
    expect(parsed.id).toBe("billiard_table");
    expect(parsed.theme).toBe("billiard");
  });

  it("validates vehicle specifications", () => {
    const sportsCar = VehicleSpecSchema.parse({
      id: "sports_car",
      name: "Super Sports",
      acceleration: 380,
      maxSpeed: 450,
      steeringRate: 3.5,
      traction: 0.85,
      driftFactor: 0.35,
      color: "#ff0055"
    });
    expect(sportsCar.id).toBe("sports_car");
  });
});
