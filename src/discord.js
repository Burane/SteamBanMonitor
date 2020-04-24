const steamApi = require('./steam.js')
const Discord = require('discord.js');
const apiKey = require('../apiKey.json')

const client = new Discord.Client();

client.login(apiKey.discord);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (!msg.content.startsWith('!info'))
        return

    let userLink = msg.content.split(" ")[1]


    steamApi.getInfos(userLink).then(summary => {
            console.log(summary)
            const embed = new Discord.MessageEmbed()
                .setColor('#ff0000')
                .setTitle(summary.nickname)
                .setURL(summary.url)
                .addFields({
                    name: 'id64',
                    value: summary.steamID,
                    inline: true
                })
                .setImage(summary.avatar.large)
                .setTimestamp()
            msg.channel.send(embed)
        })
        .catch(err => console.error(err))

});