/**
 * DEFERRED — not part of V1.
 *
 * V1 reuses ECS entities (Transform + Sprite + SpriteAnimator + TTL)
 * and existing systems. A dedicated instance manager / pool would
 * duplicate lifecycle ownership and is only justified after measuring
 * entity creation cost under Asteroids fire rate.
 *
 * Keep this file as a placeholder so imports do not break if referenced;
 * do not use in production paths until a measured need exists.
 */

export const PIXELFX_INSTANCE_MANAGER_DEFERRED = true as const;
