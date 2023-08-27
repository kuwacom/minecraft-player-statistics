const axios = require("axios");
const fs = require("fs");
const path = require('path');

// const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

async function getPlayerName(playerUUID, userCache = null) {
    if (userCache) {
        const userName = userCache.find(user => user.uuid == playerUUID)
        if (userName) return userName.name;
    }
    return (await axios.get("https://sessionserver.mojang.com/session/minecraft/profile/" + playerUUID)
        .catch((error) => {
            return error;
        })).data.name;
}

async function getPlayerDatas(statsPath, userCache) {
    let outDatas = {};
    const promises = fs.readdirSync(statsPath).map(async(fileName) => {
        const playerUUID = path.basename(fileName, ".json");
        console.log(playerUUID);
        outDatas[playerUUID] = require(statsPath + "/" + fileName);
        outDatas[playerUUID].name = (await getPlayerName(playerUUID, userCache))
    });
    await Promise.all(promises);
    return outDatas;
}

async function serializePlayerDatas(playerDatas) {
    const playerStats = await Promise.all(Object.keys(playerDatas).map(async(playerUUID) => {
        const stats = playerDatas[playerUUID].stats;
        const player = {}
        player.name = playerDatas[playerUUID].name;

        player.play_time = 0;
        player.mined = 0;
        player.used = 0;
        player.picked_up = 0;
        player.moving = 0; //移動距離
        player.mob_kills = 0;
        player.player_kills = 0;
        player.deaths = 0;
        player.plow = 0; // 耕した回数
        if (stats["minecraft:custom"]["minecraft:play_time"]) player.play_time = stats["minecraft:custom"]["minecraft:play_time"]; //プレイ時間        
        if (stats["minecraft:mined"]) {
            for (key in stats["minecraft:mined"]) { // ブロック壊した回数
                player.mined += stats["minecraft:mined"][key];
            }
        }
        if (stats["minecraft:used"]) {
            for (key in stats["minecraft:used"]) { // アイテム使った回数
                player.used += stats["minecraft:used"][key];
                if (key.indexOf("hoe") != -1) player.plow += stats["minecraft:used"][key];
            }
        }
        if (stats["minecraft:picked_up"]) {
            for (key in stats["minecraft:picked_up"]) { // アイテム拾った回数
                player.picked_up += stats["minecraft:picked_up"][key];
            }
        }
        if (stats["minecraft:custom"]) {
            for (key in stats["minecraft:custom"]) { // 移動距離総合
                if (key.indexOf("_cm") != -1) player.moving += stats["minecraft:custom"][key];
            }
        }
        if (stats["minecraft:custom"]["minecraft:mob_kills"]) player.mob_kills = stats["minecraft:custom"]["minecraft:mob_kills"];
        if (stats["minecraft:custom"]["minecraft:player_kills"]) player.player_kills = stats["minecraft:custom"]["minecraft:player_kills"];
        if (stats["minecraft:custom"]["minecraft:deaths"]) player.deaths = stats["minecraft:custom"]["minecraft:deaths"];
        return player
    }));

    console.log(playerStats);

    return playerStats;
}

async function sortPlayerStats(playerStats) {
    const sortedDatas = {};
    sortedDatas.play_time = Object.values(playerStats).sort((a, b) => b.play_time - a.play_time);
    sortedDatas.mined = Object.values(playerStats).sort((a, b) => b.mined - a.mined);
    sortedDatas.used = Object.values(playerStats).sort((a, b) => b.used - a.used);
    sortedDatas.picked_up = Object.values(playerStats).sort((a, b) => b.picked_up - a.picked_up);
    sortedDatas.moving = Object.values(playerStats).sort((a, b) => b.moving - a.moving);
    sortedDatas.mob_kills = Object.values(playerStats).sort((a, b) => b.mob_kills - a.mob_kills);
    sortedDatas.player_kills = Object.values(playerStats).sort((a, b) => b.player_kills - a.player_kills);
    sortedDatas.deaths = Object.values(playerStats).sort((a, b) => b.deaths - a.deaths);
    sortedDatas.plow = Object.values(playerStats).sort((a, b) => b.plow - a.plow);
    return sortedDatas;
}


async function main() {
    const userCache = require("./usercache.json");
    const playerDatas = await getPlayerDatas("./stats", userCache);
    const playerStats = await serializePlayerDatas(playerDatas);
    const sortedDatas = await sortPlayerStats(playerStats);
    const outJSON = JSON.stringify(sortedDatas, null, 2);
    fs.writeFileSync('./sortedDatas.json', outJSON);

    console.log("## -- プレイ時間 --");
    for (let i = 0; i < 5; i++) {
        const playSec = sortedDatas.play_time[i].play_time / 20;
        const day = Math.floor(playSec / 86400);
        const hou = Math.floor(playSec % 86400 / 3600);
        const min = Math.floor(playSec % 3600 / 60);
        const sec = Math.floor(playSec % 60);
        console.log(`> ${i+1}位`);
        console.log(sortedDatas.play_time[i].name + ` : ${day}日 ${hou}時間 ${min}分 ${sec}秒`);
    }

    console.log("\n## -- 耕した回数 --");
    for (let i = 0; i < 5; i++) {
        console.log(`> ${i+1}位`);
        console.log(sortedDatas.plow[i].name + " : " + sortedDatas.plow[i].plow + "回");
    }

    console.log("\n## -- ブロックを壊した回数 --");
    // console.log(sortedDatas.mined.slice(0, 5));
    for (let i = 0; i < 5; i++) {
        console.log(`> ${i+1}位`);
        console.log(sortedDatas.mined[i].name + " : " + sortedDatas.mined[i].mined + "回");
    }

    console.log("\n## -- アイテムを使った回数 --");
    for (let i = 0; i < 5; i++) {
        console.log(`> ${i+1}位`);
        console.log(sortedDatas.used[i].name + " : " + sortedDatas.used[i].used + "回");
    }

    console.log("\n## -- アイテムを拾った個数 --");
    for (let i = 0; i < 5; i++) {
        console.log(`> ${i+1}位`);
        console.log(sortedDatas.picked_up[i].name + " : " + sortedDatas.picked_up[i].picked_up + "個");
    }

    console.log("\n## -- 移動距離 --");
    for (let i = 0; i < 5; i++) {
        console.log(`> ${i+1}位`);
        console.log(sortedDatas.moving[i].name + " : " + sortedDatas.moving[i].moving / 100000 + "Km");
    }

    console.log("\n## -- モブを倒した回数 --");
    for (let i = 0; i < 5; i++) {
        console.log(`> ${i+1}位`);
        console.log(sortedDatas.mob_kills[i].name + " : " + sortedDatas.mob_kills[i].mob_kills + "回");
    }

    console.log("\n## -- プレイヤーを倒した回数 --");
    for (let i = 0; i < 5; i++) {
        console.log(`> ${i+1}位`);
        console.log(sortedDatas.player_kills[i].name + " : " + sortedDatas.player_kills[i].player_kills + "回");
    }

    console.log("\n## -- 死亡回数 --");
    for (let i = 0; i < 5; i++) {
        console.log(`> ${i+1}位`);
        console.log(sortedDatas.deaths[i].name + " : " + sortedDatas.deaths[i].deaths + "回");
    }
}
main();