/**
 * Base class for domain entities.
 *
 * Entities are compared by identity, never by attribute values, and they own
 * the invariants of their aggregate. Persistence concerns (columns, joins,
 * transactions) stay outside of this layer.
 *
 * @typeParam TProps - Shape of the entity's internal state.
 */
export abstract class Entity<TProps extends { id: string }> {
  protected readonly props: TProps;

  /**
   * @param props - Fully validated internal state of the entity.
   */
  protected constructor(props: TProps) {
    this.props = props;
  }

  /** Stable identity of the entity. */
  public get id(): string {
    return this.props.id;
  }

  /**
   * Identity comparison.
   *
   * @param other - Entity to compare against.
   * @returns True when both entities describe the same aggregate instance.
   */
  public equals(other?: Entity<TProps>): boolean {
    return other instanceof Entity && other.id === this.id;
  }

  /**
   * Returns a shallow, frozen snapshot of the entity state.
   *
   * Infrastructure mappers use this instead of reaching into `props`, which
   * keeps the mutation surface inside the entity.
   *
   * @returns Read-only copy of the internal state.
   */
  public snapshot(): Readonly<TProps> {
    return Object.freeze({ ...this.props });
  }
}
