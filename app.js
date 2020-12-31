"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const gamedig_1 = require("gamedig");
const padStart = require('string.prototype.padstart');
const Slimbot = require('slimbot');
const slimbot = new Slimbot(process.env.TELEGRAM_BOT_TOKEN);
// Look a for a player and alert when available on an ARMA 3 server
// CONFIG
const servers = [
    {
        name: 'WL EU #03',
        host: '85.190.155.163',
        port: 2302
    },
    {
        name: 'WL EU #01',
        host: '85.190.155.53',
        port: 2302
    }
];
const watchedUsers = process.env.WATCHED_USERS ? process.env.WATCHED_USERS.split(',') : [];
const MAX_PLAYERS = process.env.MAX_PLAYERS_ON_SERVER || 3;
// //CONFIG
const DEBUG = Boolean(process.env.DBG) || true;
const lastOnline = [];
const activeAlerts = [];
function searchServersAndAlert(infos) {
    const alertOff = [];
    const clearAlertsFor = (serverName) => {
        let c = 0;
        for (let i = 0; i < activeAlerts.length; i++) {
            if (activeAlerts[i] === serverName) {
                activeAlerts.splice(i, 1);
                c++;
            }
        }
        if (c > 0) {
            alertOff.push(serverName);
        }
    };
    const foundUsers = [];
    for (const s of infos) {
        const foundUsersCount = foundUsers.length;
        if (s.info.players.length > MAX_PLAYERS || s.info.players.length === 0) {
            clearAlertsFor(s.server.name);
        }
        for (const p of s.info.players) {
            if (p.name) {
                const presentWatchedUsers = watchedUsers.filter(name => {
                    return name.normalize().toLowerCase() === p.name.normalize().toLowerCase();
                });
                if (presentWatchedUsers.length > 0) {
                    foundUsers.push({
                        users: presentWatchedUsers,
                        server: s
                    });
                }
            }
        }
        // No wached user is on this server atm.
        if (foundUsersCount === foundUsers.length) {
            clearAlertsFor(s.server.name);
        }
    }
    if (alertOff.length > 0) {
        const alertOffServerInfos = alertOff.map(serverName => {
            const s = infos.find(si => {
                return (si.server.name === serverName);
            });
            if (s && s.server) {
                const watchedUsersOnServer = [];
                for (const p of s.info.players) {
                    const presentWatchedUsers = watchedUsers.filter(name => {
                        if (!p.name)
                            return false;
                        return name.normalize().toLowerCase() === p.name.normalize().toLowerCase();
                    });
                    watchedUsersOnServer.push(...presentWatchedUsers);
                }
                const watchedUsersOnServerList = watchedUsersOnServer.length > 0 ? '[' + watchedUsersOnServer.join(', ') + '] ' : '';
                return s.server.name + ' (' + s.info.players.length + '/' + s.info.maxplayers + ') ' + watchedUsersOnServerList;
            }
            else {
                return serverName;
            }
        });
        if (DEBUG)
            console.log('alertOffServerInfos', alertOffServerInfos); // DEBUG
        sendAlert(`No more watched users or more then ${MAX_PLAYERS} players on:  \n ${alertOffServerInfos.join('\n ')}\n\n`);
    }
    const msg = [];
    for (const res of foundUsers) {
        const newUsers = res.users.filter(u => {
            return lastOnline.indexOf(u) === -1 ? true : false;
        });
        if (DEBUG && newUsers.length)
            console.log('newUsers', newUsers); // DEBUG
        if (res.server.info.players.length <= MAX_PLAYERS && (newUsers.length > 0 || activeAlerts.indexOf(res.server.server.name) === -1)) {
            msg.push(res.users.join(', ') + ' currently on ' + res.server.server.name + ' (' + res.server.info.players.length + '/' + res.server.info.maxplayers + ') ', '\n');
            activeAlerts.push(res.server.server.name);
        }
    }
    if (DEBUG && activeAlerts.length)
        console.log('activeAlerts', activeAlerts); // DEBUG
    lastOnline.splice(0, lastOnline.length);
    for (const res of foundUsers) {
        lastOnline.push(...res.users);
    }
    if (DEBUG && lastOnline.length)
        console.log('lastOnline', lastOnline); // DEBUG
    if (msg.length) {
        sendAlert(msg.join('\n'));
    }
}
function checkServers() {
    return __awaiter(this, void 0, void 0, function* () {
        console.time('checkServers');
        const infos = [];
        for (const s of servers) {
            try {
                const res = yield gamedig_1.query({
                    type: 'arma3',
                    host: s.host,
                    port: s.port
                });
                infos.push({ server: s, info: res });
            }
            catch (e) {
                console.error(e);
            }
        }
        console.timeEnd('checkServers');
        return infos;
    });
}
function toHMMSS(seconds) {
    const sec_num = parseInt(seconds, 10);
    let hours = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let secs = sec_num - (hours * 3600) - (minutes * 60);
    //if (hours   < 10) {hours   = `0${hours}`;}
    if (hours == 0) {
        hours = '';
    }
    else {
        hours = `${hours}:`;
    }
    if (minutes < 10) {
        minutes = `0${minutes}`;
    }
    if (secs < 10) {
        secs = `0${secs}`;
    }
    return [hours, minutes, ':', secs].join('');
}
function printServers(infos) {
    if (process.env.node_version !== '8.4') { // Skip this in the cloud
        process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");
    }
    console.clear();
    for (const i of infos) {
        const textBuff = [i.info.name.normalize() + ' [ping: ' + i.info.ping + 'ms]'];
        textBuff.push(`${'Name'.padEnd(48, ' ')}${padStart('Score', 5, ' ')}${padStart('Time', 10, ' ')}`);
        for (const p of i.info.players) {
            if (p.name) {
                const presentWatchedUsers = watchedUsers.filter(name => {
                    return name.normalize().toLowerCase() === p.name.normalize().toLowerCase();
                });
                const padding = presentWatchedUsers.length > 0 ? '.' : ' ';
                textBuff.push(`${p.name.normalize().padEnd(48, padding)}${padStart(p.score, 5, padding)}${padStart(toHMMSS(p.time), 10, padding)}`);
            }
        }
        console.log(textBuff.join('\n') + '\n');
    }
}
function sendAlert(msg) {
    return slimbot.sendMessage(process.env.TELEGRAM_CHAT_ID, msg);
}
// MAIN
let globalTimer = setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log('\n' + '='.repeat(63));
    const infos = yield checkServers();
    if (DEBUG)
        printServers(infos); // DEBUG
    searchServersAndAlert(infos);
}), 1000 * 60 * 1);
