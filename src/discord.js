const steamApi = require('./steam.js')
const discord = require('discord.js')
const apiKey = require('../apiKey.json')
const fs = require('fs')
const dataSql = fs.readFileSync("./sql.sql").toString()
const Database = require('better-sqlite3');

const db = new Database('SteamBanMonitor.db', {
    verbose: console.log
});

db.exec(dataSql)

const discordClient = new discord.Client()
discordClient.login(apiKey.discord);



discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`)
    banCheck()
    setInterval(banCheck, 600000)
});

discordClient.on('message', msg => {
    switch (msg.content.split(" ")[0]) {
        case '!infos':
            infos(msg);
            break;
        case '!watchadd':
            watchadd(msg);
            break;
        case '!watchrm':
            watchrm(msg);
            break;
        case '!watchls':
            watchls(msg);
            break;
        case '!banls':
            banls(msg);
            break;
        case '!help':
            help(msg)
            break;
    }

});


function infos(msg) {
    let userLink = msg.content.split(" ")[1]
    sendInfoLink(msg, userLink)
}

function sendInfoLink(msg, userLink) {
    steamApi.getId64(userLink).then(id64 => {
            steamApi.getInfos(id64).then(summary => {
                console.log(summary)
                msg.channel.send(createEmbed(summary))
            })
        })
        .catch(err => {
            console.error(err)
            msg.channel.send(err.toString())
        })
}

function sendInfoId(msg, id64) {
    steamApi.getInfos(id64).then(summary => {
            //  console.log(summary)
            msg.channel.send(createEmbed(summary))
        })
        .catch(err => {
            console.error(err)
            msg.channel.send(err.toString())
        })
}

function createEmbed(summary) {
    return new discord.MessageEmbed()
        .setColor('#ff0000')
        .setTitle(summary.nickname)
        .setURL(summary.url)
        .addFields({
            name: 'Id64',
            value: summary.steamID,
            inline: true
        }, {
            name: 'VAC BAN',
            value: summary.bans.vacBanned,
            inline: true

        }, {
            name: 'GAME BAN',
            value: summary.bans.gameBans >= 1 ? true : false,
            inline: true

        }, {
            name: 'Days since last ban:',
            value: summary.bans.daysSinceLastBan,
            inline: true

        }, {
            name: 'Community ban',
            value: summary.bans.communityBanned,
            inline: true

        }, {
            name: 'Economy ban:',
            value: summary.bans.economyBan,
            inline: true
        })
        .setImage(summary.avatar.large)
        .setTimestamp()
}

function watchadd(msg) {
    let userLink = msg.content.split(" ")[1]
    if (!userLink) return
    steamApi.getId64(userLink).then(id => {
            steamApi.isBan(id).then(isBan => {
                db.prepare('insert or ignore into STEAM_BAN_MONITOR(ID_64, DATE_START_MONITORING, BANNED) values(?, ?, ?)').run(id, Date.now(), isBan ? '1' : '0')
                msg.react('🟢')
            })
        })
        .catch(err => {
            console.error(err)
            msg.react('🔴')
            msg.channel.send(err.toString())
        })
}

function watchrm(msg) {
    let userLink = msg.content.split(" ")[1]
    if (!userLink) return
    steamApi.getId64(userLink).then(id => {
            db.prepare('delete from STEAM_BAN_MONITOR where ID_64 = ?').run(id)
            msg.react('🟢')
        })
        .catch(err => {
            console.error(err)
            msg.react('🔴')
            msg.channel.send(err.toString())
        })
}

function watchls(msg) {
    let ids = db.prepare('select ID_64 from STEAM_BAN_MONITOR').all()
    console.log(ids)
    ids.forEach(id => {
        sendInfoId(msg, id.ID_64)
    })
}

function banls(msg) {
    let ids = db.prepare('select ID_64 from STEAM_BAN_MONITOR where BANNED = 1').all()
    console.log(ids)
    if (ids.length == 0)
        msg.channel.send('Aucun joueurs bannis :(')
    ids.forEach(id => {
        sendInfoId(msg, id.ID_64)
    })
}

function lookForBans() {
    let ids = db.prepare('select ID_64 from STEAM_BAN_MONITOR where BANNED = 0').all()
    ids.forEach(id => {
        steamApi.isBan(id.ID_64).then(isBan => {
                db.prepare('update STEAM_BAN_MONITOR set BANNED = ?, BANNED_DATE = ? where ID_64 = ?').run(isBan ? '1' : '0', isBan ? Date.now() : null, id.ID_64)
            })
            .catch(err => console.error(err))
    })
}

function banAlert() {
    let ids = db.prepare('select ID_64, BANNED_DATE from STEAM_BAN_MONITOR where BANNED = 1 and BANNED_DATE - ? <= 600000').all(Date.now())
    ids.forEach(id => {
        // 607903859934756892 channelId de generale  323894435203121172 matpute id
        let guild = discordClient.guilds.cache.get('323894435203121172')
        let chan = guild.channels.cache.get('607903859934756892')
        chan.send('🚨   ***UN BANNISSEMENT***   🚨')
        steamApi.getInfos(id.ID_64).then(summary => {
                chan.send(createEmbed(summary))
                chan.send('🚨   ***FIN ALERTE***   🚨')
            })
            .catch(err => {
                console.error(err)
                chan.send(err.toString())
            })

    })
}

function help(msg) {
    let str = '**!infos** *<profile link>* envoie des infos sur le profil \n'
    str += '**!watchadd** *<profile link>* ajoute un profile que le bot va surveiller\n'
    str += '**!watchrm** *<profile link>* retire un profile que le bot va surveiller\n'
    str += '**!watchls**  affiche la liste des profiles en cours de surveillance\n'
    str += '**!banls** affiche la liste des profiles bannis\n'
    str += '*projet disponnible sur https://github.com/Burane/SteamBanMonitor*'
    msg.channel.send(str)
}

function banCheck() {
    lookForBans()
    banAlert()
}