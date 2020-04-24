const apiKey = require('../apiKey.json')

const SteamAPI = require('steamapi');
const steam = new SteamAPI(apiKey.steam);


exports.getInfos = async (userLink) => {
    let id = await steam.resolve(userLink)
    let summary = await steam.getUserSummary(id)
    return summary
}