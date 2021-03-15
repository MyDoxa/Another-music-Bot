const { Util, MessageEmbed } = require("discord.js");
const ytdl = require("ytdl-core");
const yts = require("yt-search");
const ytdlDiscord = require("ytdl-core-discord");
const YouTube = require("youtube-sr");
const sendError = require("../util/error");
const fs = require("fs");
const scdl = require("soundcloud-downloader").default;

var streamBuffers = require('stream-buffers');
module.exports = {
    info: {
        name: "search",
        description: "Search your favorite songs",
        usage: "[song_name]",
        aliases: ["sc"],
    },

    run: async function (client, message, args) {
        let channel = message.member.voice.channel;
        if (!channel) return sendError("I'm sorry but you need to be in a voice channel to play music!", message.channel);

        const permissions = channel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT")) return sendError("I cannot connect to your voice channel, make sure I have the proper permissions!", message.channel);
        if (!permissions.has("SPEAK")) return sendError("I cannot speak in this voice channel, make sure I have the proper permissions!", message.channel);

        var searchString = args.join(" ");
        if (!searchString) return sendError("You didn't poivide want i want to search", message.channel);

        var serverQueue = message.client.queue.get(message.guild.id);
        try {
            var searched = await YouTube.search(searchString, { limit: 10 });
            if (searched[0] == undefined) return sendError("Looks like i was unable to find the song on YouTube", message.channel);
            let index = 0;
            let embedPlay = new MessageEmbed()
                .setColor('RANDOM')
                .setAuthor(`Results for \"${args.join(" ")}\"`, message.author.displayAvatarURL())
                .setDescription(`${searched.map((video2) => `**\`${++index}\`  |** [\`${video2.title}\`](${video2.url}) - \`${video2.durationFormatted}\``).join("\n")}`)
                .setFooter("Type the number of the song that you want to add. Expires in 20 seconds");
            // eslint-disable-next-line max-depth
            message.channel.send(embedPlay).then((m) =>
                m.delete({
                    timeout: 15000,
                })
            );
            try {
                var response = await message.channel.awaitMessages((message2) => message2.content > 0 && message2.content < 11, {
                    max: 1,
                    time: 20000,
                    errors: ["time"],
                });
            } catch (err) {
                console.error(err);
                return message.channel.send({
                    embed: {
                        color: "RED",
                        description: "Nothing has been selected within 20 seconds, the request has been canceled.",
                    },
                });
            }
            const videoIndex = parseInt(response.first().content);
            var video = await searched[videoIndex - 1];
        } catch (err) {
            console.error(err);
            return message.channel.send({
                embed: {
                    color: "RED",
                    description: "🆘  **|**  I could not obtain any search results",
                },
            });
        }

        response.delete();
        var songInfo = video;

        const song = {
            id: songInfo.id,
            title: Util.escapeMarkdown(songInfo.title),
            views: String(songInfo.views).padStart(10, " "),
            ago: songInfo.uploadedAt,
            duration: songInfo.durationFormatted,
            url: `https://www.youtube.com/watch?v=${songInfo.id}`,
            img: songInfo.thumbnail.url,
            req: message.member,
        };

        if (serverQueue) {
            //Calculate the estimated Time
            let estimatedtime = Number(0);
            for (let i = 0; i < serverQueue.songs.length; i++) {
              let minutes = serverQueue.songs[i].duration.split(":")[0];   
              let seconds = serverQueue.songs[i].duration.split(":")[1];    
              estimatedtime += (Number(minutes)*60+Number(seconds));   
            }
            if (estimatedtime > 60) {
              estimatedtime = Math.round(estimatedtime / 60 * 100) / 100;
              estimatedtime = estimatedtime + " Minutes"
            }
            else if (estimatedtime > 60) {
              estimatedtime = Math.round(estimatedtime / 60 * 100) / 100;
              estimatedtime = estimatedtime + " Hours"
            }
            else {
              estimatedtime = estimatedtime + " Seconds"
            }
            
        if (serverQueue) {
            serverQueue.songs.push(song);
            let thing = new MessageEmbed()
                .setAuthor("Added to queue position "+`${serverQueue.songs.length - 1}`,  "https://c.tenor.com/HJvqN2i4Zs4AAAAj/milk-and-mocha-cute.gif")//https://raw.githubusercontent.com/SudhanPlayz/Discord-MusicBot/master/assets/Music.gif
                .setThumbnail(song.img)
                .setColor('RANDOM')
                .addField("Name", `[${song.title}](${song.url})`, true)
                .addField("Duration", "`"+song.duration+"`", true)
                .addField("Requested by", "<@"+song.req+">", true)
                .addField("Estimated time until playing:", `\`${estimatedtime}\``, true)
                //.setFooter(); (`Views: ${song.views} | ${song.ago}`);
            return message.channel.send(thing);
        }
    }

        const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: channel,
            connection: null,
            songs: [],
            volume: 80,
            playing: true,
            loop: false,
        };
        message.client.queue.set(message.guild.id, queueConstruct);
        queueConstruct.songs.push(song);

        const play = async (song) => {
            const queue = message.client.queue.get(message.guild.id);
            if (!song) {
                sendError(
                    ":notes: The player has stopped and the queue has been cleared.",
                    message.channel
                );
                message.guild.me.voice.channel.leave(); //If you want your bot stay in vc 24/7 remove this line :D
                message.client.queue.delete(message.guild.id);
                return;
            }
            let stream = null;
            let streamType;

            try {
                if (song.url.includes("https://soundcloud.com/")) {
                    try {
                        stream = await scdl.downloadFormat(song.url, scdl.FORMATS.OPUS, client.config.SOUNDCLOUD);
                    } catch (error) {
                        stream = await scdl.downloadFormat(song.url, scdl.FORMATS.MP3, client.config.SOUNDCLOUD);
                        streamType = "unknown";
                    }
                } else if (song.url.includes("https://www.youtube.com/")) {
                    stream = await ytdl(song.url, { quality: "highestaudio", highWaterMark: 1 << 25, type: "opus" });
                    stream.on("error", function (er) {
                        if (er) {
                            if (queue) {
                                queue.songs.shift();
                                play(queue.songs[0]);
                                return sendError(`An unexpected error has occurred.\nPossible type \`${er}\``, message.channel);
                            }
                        }
                    });
                }
            } catch (error) {
                if (queue) {
                    queue.songs.shift();
                    play(queue.songs[0]);
                }

                console.error(error);
                return message.channel.send("err");
            }

            queue.connection.on("disconnect", () => message.client.queue.delete(message.guild.id));
            const dispatcher = queue.connection.play(stream).on("finish", () => {
                const shiffed = queue.songs.shift();
                if (queue.loop === true) {
                    queue.songs.push(shiffed);
                }
                play(queue.songs[0]);
            });

            dispatcher.setVolumeLogarithmic(queue.volume / 100);
            let thing = new MessageEmbed()
                .setAuthor("Now playing ♪", "https://c.tenor.com/HJvqN2i4Zs4AAAAj/milk-and-mocha-cute.gif")//https://raw.githubusercontent.com/SudhanPlayz/Discord-MusicBot/master/assets/Music.gif
                .setThumbnail(song.img)
                .setColor('RANDOM')
                .addField("Name", `[${song.title}](${song.url})`, true)
                .addField("Duration", "`"+song.duration+"`", true)
                .addField("Requested by", "<@"+song.req+">", true)
                //.setFooter(`Views: ${song.views} | ${song.ago}`);
            queue.textChannel.send(thing);
        };

        try {
            const connection = await channel.join();
            queueConstruct.connection = connection;
            channel.guild.voice.setSelfDeaf(true);
            play(queueConstruct.songs[0]);
        } catch (error) {
            console.error(`I could not join the voice channel: ${error}`);
            message.client.queue.delete(message.guild.id);
            await channel.leave();
            return sendError(`I could not join the voice channel: ${error}`, message.channel);
        }
    },
};
