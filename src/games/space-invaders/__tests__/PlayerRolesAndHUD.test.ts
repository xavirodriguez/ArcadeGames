import { World } from "@tiny-aster/core";
import { PlayerRoleComponent } from "../types/SpaceInvadersTypes";

describe("PlayerRolesAndHUD", () => {
  it("should create and query PlayerRoleComponent correctly", () => {
    const world = new World<any>();
    const playerEntity = world.createEntity();

    world.addComponent(playerEntity, {
      type: "PlayerRole",
      role: "Pioneer",
      abilityCooldownRemaining: 0,
      abilityActive: true,
    } as PlayerRoleComponent);

    const queried = world.getComponent(playerEntity, "PlayerRole") as PlayerRoleComponent;
    expect(queried).toBeDefined();
    expect(queried.role).toBe("Pioneer");
    expect(queried.abilityActive).toBe(true);
  });
});
