const apiKey = require('../apiKey.json')

const SteamAPI = require('steamapi');
const steam = new SteamAPI(apiKey.steam);

async function getId64(userLink) {
    let id = await steam.resolve(userLink)
    return id
}

async function getInfos(id64) {
    let summary = await steam.getUserSummary(id64)
    summary.bans = await getBans(id64)
    return summary
}

async function getBans(id64) {
    let ban = await steam.getUserBans(id64)
    return ban
}

async function isBan(id64) {
    let ret = false;
    let ban = await steam.getUserBans(id64)
    if (ban.vacBanned)
        ret = true
    if (ban.gameBans >= 1)
        ret = true
    return ret
}

exports.isBan = isBan
exports.getId64 = getId64
exports.getInfos = getInfos
exports.getBan = getBans