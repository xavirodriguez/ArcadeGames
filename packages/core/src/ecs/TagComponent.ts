import { Component } from "./Component";

/**
 * Component providing string tag classification for query filtering and group identification.
 *
 * @remarks
 * Attaches set of labels/tags to an entity to allow systems to perform fast categorical queries.
 *
 * @example
 * ```ts
 * const tagComponent: TagComponent = {
 *   type: "Tag",
 *   tags: ["player", "controllable", "hazard"]
 * };
 * world.addComponent(entity, tagComponent);
 * ```
 *
 * @public
 */
export interface TagComponent extends Component {
  /** Discriminator type tag identifying this component as a Tag component. */
  type: "Tag";
  /** List of active string tags associated with this entity. */
  tags: string[];
}
