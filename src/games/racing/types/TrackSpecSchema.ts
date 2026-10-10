import { z } from "zod";

export const VehicleSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  acceleration: z.number().positive(),
  maxSpeed: z.number().positive(),
  steeringRate: z.number().positive(),
  traction: z.number().min(0).max(1),
  driftFactor: z.number().min(0).max(1),
  color: z.string().default("#00e5ff"),
  drawerKey: z.string().optional(),
  sprite: z.string().optional()
});

export type VehicleSpec = z.infer<typeof VehicleSpecSchema>;

export const TrackZoneSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  surface: z.string(),
  gripModifier: z.number().default(1.0),
  speedModifier: z.number().default(1.0)
});

export type TrackZone = z.infer<typeof TrackZoneSchema>;

export const TrackSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  theme: z.string().optional(),
  skin: z.string().optional(),
  width: z.number().positive().default(1600),
  height: z.number().positive().default(1000),
  spawnPoints: z.array(z.object({
    x: z.number(),
    y: z.number(),
    rotation: z.number().default(0)
  })),
  waypoints: z.array(z.object({
    x: z.number(),
    y: z.number(),
    radius: z.number().default(60)
  })),
  walls: z.array(z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  })),
  zones: z.array(TrackZoneSchema).default([]),
  obstacles: z.array(z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    radius: z.number(),
    kind: z.string()
  })).default([])
});

export type TrackSpec = z.infer<typeof TrackSpecSchema>;
