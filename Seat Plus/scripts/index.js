import { world, system, BlockTypes } from '@minecraft/server'
import { ActionFormData, ModalFormData } from '@minecraft/server-ui'

/*
    if you see this please don't steal the code. If you want really to use it, just give me credits, thank you!
    and If I see my code somewhere else I need to copyright it (only if you didn't asked for permission).
*/


if (!world.getDynamicProperty("sit")) {
    world.setDynamicProperty("sit", JSON.stringify({
        slab: true,
        stairs: true,
        wood: true,
        customBlocks: []
    }));
}

let Sit = JSON.parse(world.getDynamicProperty("sit") || '{}');

if (!Array.isArray(Sit.customBlocks)) {
    Sit.customBlocks = [];
}

function saveSettings() {
    world.setDynamicProperty("sit", JSON.stringify(Sit));
}

system.afterEvents.scriptEventReceive.subscribe((data) => {
    let { sourceEntity: player, id, message } = data;
    if (id != "ct:sit" && message != "settings_menu") return;
    menu(player)
});
function menu(player) {
    let form = new ActionFormData();
    form.title("Settings");

    Sit.customBlocks.forEach((customBlock) => {
        form.button(`Toggle/Edit ${customBlock.id}: ${customBlock.enabled ? "On" : "Off"}`);
    });

    form.button(`Toggle Slab: ${Sit.slab ? "On" : "Off"}`, `textures/ui/${Sit.slab ? "toggle_on" : "toggle_off"}`)
        .button(`Toggle Stairs: ${Sit.stairs ? "On" : "Off"}`, `textures/ui/${Sit.stairs ? "toggle_on" : "toggle_off"}`)
        .button(`Toggle Wood: ${Sit.wood ? "On" : "Off"}`, `textures/ui/${Sit.wood ? "toggle_on" : "toggle_off"}`)
        .button(`Add Custom Sit`);

    form.show(player).then((res) => {
        let { canceled, selection } = res;
        if (canceled) return;

        if (selection < Sit.customBlocks.length) {
            showEditCustomBlockMenu(player, selection);
        } else if (selection === Sit.customBlocks.length) {
            Sit.slab = !Sit.slab;
            saveSettings();
            menu(player)
        } else if (selection === Sit.customBlocks.length + 1) {
            Sit.stairs = !Sit.stairs;
            saveSettings();
            menu(player)
        } else if (selection === Sit.customBlocks.length + 2) {
            Sit.wood = !Sit.wood;
            saveSettings();
            menu(player)
        } else if (selection === Sit.customBlocks.length + 3) {
            let f = new ModalFormData();
            f.textField("Enter a block ID", "minecraft:grass_block or grass_block")
            f.textField("Height", "1, 1.5, 1.564");
            f.show(player).then((result) => {
                let { canceled, formValues } = result;
                if (canceled) return;

                let blockId = formValues[0];
                if (!BlockTypes.get(blockId)) {
                    player.sendMessage(`§b${blockId}§c does not exist!`);
                    return;
                }
                if (isNaN(formValues[1])) {
                    player.sendMessage("§cPlease enter a valid number for height.");
                    return;
                }
                let height = formValues[1]
                Sit.customBlocks.push({ id: blockId?.replace(/^.*:/, ""), height: height, enabled: true });
                saveSettings();
            });
        }
    });
}


function showEditCustomBlockMenu(player, blockIndex) {
    let customBlock = Sit.customBlocks[blockIndex];
    let form = new ActionFormData();
    form.title(`Edit ${customBlock.id}`)
        .button(`Toggle Enabled: ${customBlock.enabled ? "On" : "Off"}`, `textures/ui/${customBlock.enabled ? "toggle_on" : "toggle_off"}`)
        .button("Change Height", `textures/ui/refresh`)
        .button("Delete Block", `textures/ui/trash_default`);

    form.show(player).then((res) => {
        let { canceled, selection } = res;
        if (canceled) return;

        if (selection === 0) {
            customBlock.enabled = !customBlock.enabled;
            saveSettings();
        } else if (selection === 1) {
            let f = new ModalFormData();
            f.textField("Height", "1, 1.5, 1.564", `${customBlock.height ?? 0}`);
            f.show(player).then((result) => {
                let { canceled, formValues } = result;
                if (canceled) return;
                if (isNaN(formValues[0])) {
                    player.sendMessage("§cPlease enter a valid number for height.");
                    return;
                }
                customBlock.height = formValues[0]
                saveSettings();
            });
        } else if (selection === 2) {
            Sit.customBlocks.splice(blockIndex, 1);
            saveSettings();
            menu(player)
        }
    });
}

world.beforeEvents.playerInteractWithBlock.subscribe((data) => {
    let { block, player, isFirstEvent } = data;
    if (isFirstEvent) {
        if (block.typeId.endsWith("double_slab")) return;
        if (block.dimension.getEntities({ location: block.center(), minDistance: 0, maxDistance: 0.5, type: "minecraft:player" }).length !== 0) return;
        if (player.isSneaking) return;
        if (block.permutation.getState("minecraft:vertical_half") === "top") return;

        if (Sit.slab && block.typeId.endsWith("slab")) {
            system.run(() => {
                if (block.dimension.getBlock({ x: block.center().x, y: block.location.y + 1, z: block.center().z }).typeId === "minecraft:air") {
                    let entity = player.dimension.spawnEntity("ct:sit", { x: block.center().x, y: block.location.y + 0.25, z: block.center().z });
                    entity.getComponent("rideable").addRider(player);
                }
            });
        }
        if (Sit.stairs && block.typeId.endsWith("stairs")) {
            system.run(() => {
                let { x, z, rot } = state(block);
                if (block.permutation.getState("upside_down_bit") != undefined)  if (block.permutation.getState("upside_down_bit") !== false) return;
                if (block.dimension.getBlock({ x: block.center().x, y: block.location.y + 1, z: block.center().z }).typeId === "minecraft:air") {
                    let entity = player.dimension.spawnEntity("ct:sit", { x: block.center().x + x, y: block.location.y + 0.25, z: block.center().z + z });
                    entity.setRotation({ x: 0, y: rot });
                    entity.getComponent("rideable").addRider(player);
                }
            });
        }
        if (Sit.wood && (block.typeId.endsWith("log") || block.typeId.endsWith("wood"))) {
            system.run(() => {
                if (block.permutation.getState("pillar_axis") === "y") return;
                if (block.dimension.getBlock({ x: block.center().x, y: block.location.y + 1, z: block.center().z }).typeId === "minecraft:air") {
                    let entity = player.dimension.spawnEntity("ct:sit", { x: block.center().x, y: block.location.y + 0.8, z: block.center().z });
                    entity.setRotation({ x: 0, y: 180 });
                    entity.getComponent("rideable").addRider(player);
                }
            });
        }
        Sit.customBlocks.forEach(customBlock => {
            if (customBlock.enabled && block.typeId?.replace(/^.*:/, "") === customBlock.id) {
                system.run(() => {
                    if (block.dimension.getBlock({ x: block.center().x, y: block.location.y + 1, z: block.center().z }).typeId === "minecraft:air") {
                        let entity = player.dimension.spawnEntity("ct:sit", { x: block.center().x, y: block.location.y + parseFloat(customBlock.height), z: block.center().z });
                        entity.getComponent("rideable").addRider(player);
                    }
                });
            }
        });
        
    }
});


/**
 * Berechnet den Drehungszustand für Treppen
 * @param {mc.Block} block 
 */
function state(block) {
    let x = 0;
    let z = 0;
    let rot = 0;
    switch (block.permutation.getState("weirdo_direction")) {
        case 0:
            x += -0.2;
            rot += 90;
            break;
        case 1:
            x += 0.2;
            rot += 270;
            break;
        case 2:
            z += -0.2;
            rot += 180;
            break;
        case 3:
            z += 0.2;
            rot += 0;
            break;
        default:
            x += 0;
            z += 0;
            rot += 0;
            break;
    }
    return { x, z, rot };
}

system.runInterval(() => {
    for (let en of world.getDimension("overworld").getEntities({ type: "ct:sit" })) {
        if (!en.getComponent("rideable").getRiders()[0]) {
            en.remove();
            break;
        }
        if (en.getVelocity().x !== 0 || en.getVelocity().z !== 0 || en.getVelocity().y !== 0) {
            en.remove();
        }
    }
});