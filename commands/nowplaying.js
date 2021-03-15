const { MessageEmbed } = require("discord.js");
const sendError = require("../util/error")

module.exports = {
  info: {
    name: "nowplaying",
    description: "Shows the song playing",
    usage: "",
    aliases: ["np"],
  },

  run: async function (client, message, args) {
    const serverQueue = message.client.queue.get(message.guild.id);
    if (!serverQueue) return sendError("There is nothing playing in this server.", message.channel);
    let song = serverQueue.songs[0]
    let thing = new MessageEmbed()
      .setAuthor("Now Playing ♪", "https://c.tenor.com/HJvqN2i4Zs4AAAAj/milk-and-mocha-cute.gif")//https://raw.githubusercontent.com/SudhanPlayz/Discord-MusicBot/master/assets/Music.gif
      .setThumbnail(song.img)
      .setColor('RANDOM')
      .addField("Name", `[${song.title}](${song.url})`, true)
      .addField("Duration", "`"+song.duration+"`", true)
      .addField("Requested by", "<@"+song.req+">", true)
      //.setFooter(`Views: ${song.views} | ${song.ago}`)
    return message.channel.send(thing)
  },
};
