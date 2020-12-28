# gameserver-watcher

## cloud spcific build steps
**MUST delete the following line from app.js before pushing to cloudno.de:** `Object.defineProperty(exports, "__esModule", { value: true });`  

Server is running Node.JS v8.4.0 and the dev env should be aswell to make sure all works the same.  
The node_modules folder or part of the node modules folder can be included in the VCS to override specific packages. The dependencies are installed globally on cloudno.de instances but local copy has priority when loading a module. 

## env vars
```
TELEGRAM_BOT_TOKEN=1308519611:AAXXX
TELEGRAM_CHAT_ID=321987000
WATCHED_USERS=buddy89,peter,coolguy2000
MAX_PLAYERS_ON_SERVER=2
DBG=1
```
