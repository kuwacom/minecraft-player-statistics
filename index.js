const axios = require("axios");
const fs = require("fs");
const path = require('path');

// const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

async function getPlayerName(playerUUID) {
    return (await axios.get("https://sessionserver.mojang.com/session/minecraft/profile/"+playerUUID)
    .catch((error) => {
        return error;
    })).data.name;
}

async function getPlayerDatas(statsPath) {
    let outDatas = {};
    const promises = fs.readdirSync(statsPath).map(async (fileName) => {
        const playerUUID = path.basename(fileName, ".json");
        console.log(playerUUID);
        outDatas[playerUUID] = require(statsPath + "/" + fileName);
        outDatas[playerUUID].name = (await getPlayerName(playerUUID))
    });
    await Promise.all(promises);
    return outDatas;
}

async function serializePlayerDatas(playerDatas) {
    let playerStats = {};
    let promises = Object.keys(playerDatas).map(async (playerUUID) => {
        const stats = playerDatas[playerUUID].stats;
        playerStats[playerUUID] = {};
        playerStats[playerUUID].name = playerDatas[playerUUID].name;
        
        playerStats[playerUUID].play_time = 0;
        playerStats[playerUUID].mined = 0;
        playerStats[playerUUID].used = 0;
        playerStats[playerUUID].picked_up = 0;
        playerStats[playerUUID].moving = 0; //移動距離
        playerStats[playerUUID].mob_kills = 0;
        playerStats[playerUUID].deaths = 0;

        if (stats["minecraft:custom"]["minecraft:play_time"]) playerStats[playerUUID].play_time = stats["minecraft:custom"]["minecraft:play_time"]; //プレイ時間        
        if (stats["minecraft:mined"]) for (key in stats["minecraft:mined"]) { // ブロック壊した回数
            playerStats[playerUUID].mined += stats["minecraft:mined"][key];
        }
        if (stats["minecraft:used"]) for (key in stats["minecraft:used"]) { // アイテム使った回数
            playerStats[playerUUID].used += stats["minecraft:used"][key];
        }
        if (stats["minecraft:picked_up"]) for (key in stats["minecraft:picked_up"]) { // アイテム拾った回数
            playerStats[playerUUID].picked_up += stats["minecraft:picked_up"][key];
        }
        if (stats["minecraft:custom"]) for (key in stats["minecraft:custom"]) { // 移動距離総合
            if (key.indexOf("_cm") != -1) playerStats[playerUUID].moving += stats["minecraft:custom"][key];
        }
        if (stats["minecraft:custom"]["minecraft:mob_kills"]) playerStats[playerUUID].mob_kills = stats["minecraft:custom"]["minecraft:mob_kills"];
        if (stats["minecraft:custom"]["minecraft:deaths"]) playerStats[playerUUID].deaths = stats["minecraft:custom"]["minecraft:deaths"];
    });
    await Promise.all(promises);
    return playerStats;
}

async function sortPlayerStats(playerStats) {
    let sortedDatas = {};
    sortedDatas.play_time = Object.values(playerStats).sort((a, b) => b.play_time - a.play_time);
    sortedDatas.mined = Object.values(playerStats).sort((a, b) => b.mined - a.mined);
    sortedDatas.used = Object.values(playerStats).sort((a, b) => b.used - a.used);
    sortedDatas.picked_up = Object.values(playerStats).sort((a, b) => b.picked_up - a.picked_up);
    sortedDatas.moving = Object.values(playerStats).sort((a, b) => b.moving - a.moving);
    sortedDatas.mob_kills = Object.values(playerStats).sort((a, b) => b.mob_kills - a.mob_kills);
    sortedDatas.deaths = Object.values(playerStats).sort((a, b) => b.deaths - a.deaths);
    return sortedDatas;
}


async function main() {
    const playerDatas = await getPlayerDatas("./stats");
    let playerStats = await serializePlayerDatas(playerDatas);
    const sortedDatas = await sortPlayerStats(playerStats);
    const outJSON = JSON.stringify(sortedDatas, null, 2);
    fs.writeFileSync('./sortedDatas.json', outJSON);

    console.log("-------- プレイ時間");
    for (let i = 0; i < 5; i++) {
        const playSec = sortedDatas.play_time[i].play_time/20;
        const day = Math.floor(playSec / 86400);
        const hou = Math.floor(playSec % 86400 / 3600);
        const min = Math.floor(playSec % 3600 / 60);
        const sec = Math.floor(playSec % 60);
        console.log(`${i+1}位`);
        console.log("> " + sortedDatas.play_time[i].name + ` : ${day}日 ${hou}時間 ${min}分 ${sec}秒`);
    }

    console.log("-------- ブロックを壊した回数");
    // console.log(sortedDatas.mined.slice(0, 5));
    for (let i = 0; i < 5; i++) {
        console.log(`${i+1}位`);
        console.log("> " + sortedDatas.mined[i].name + " : " + sortedDatas.mined[i].mined+"回");
    }

    console.log("-------- アイテムを使った回数");
    for (let i = 0; i < 5; i++) {
        console.log(`${i+1}位`);
        console.log("> " + sortedDatas.used[i].name + " : " + sortedDatas.used[i].used+"回");
    }

    console.log("-------- アイテムを拾った個数");
    for (let i = 0; i < 5; i++) {
        console.log(`${i+1}位`);
        console.log("> " + sortedDatas.picked_up[i].name + " : " + sortedDatas.picked_up[i].picked_up+"個");
    }

    console.log("-------- 移動距離");
    for (let i = 0; i < 5; i++) {
        console.log(`${i+1}位`);
        console.log("> " + sortedDatas.moving[i].name + " : " + sortedDatas.moving[i].moving / 100000 +"Km");
    }

    console.log("-------- モブを倒した回数");
    for (let i = 0; i < 5; i++) {
        console.log(`${i+1}位`);
        console.log("> " + sortedDatas.mob_kills[i].name + " : " + sortedDatas.mob_kills[i].mob_kills+"回");
    }

    console.log("-------- 死亡回数");
    for (let i = 0; i < 5; i++) {
        console.log(`${i+1}位`);
        console.log("> " + sortedDatas.deaths[i].name + " : " + sortedDatas.deaths[i].deaths+"回");
    }
}
main();