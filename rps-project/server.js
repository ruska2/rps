//INIT

let express = require("express");
let app =  express();
let bodyParser = require('body-parser');
let handlers = require('./serverfiles/PostHandlers');
const http = require('http');
const serverApp = express();
const server = http.createServer(serverApp);
const io = require('socket.io')(server, { wsEngine: 'ws' });

let loggedUsers = [];
let games = [];


app.listen(3001,() =>  console.log("Running on localhost:3001"));
app.use(bodyParser.json());

//SESSIONnpm install express-session
let session = require('express-session');
app.set('trust proxy', 1); // trust first proxy
app.use(session({
    secret: 'random_string_goes_here',
    resave: true,
    saveUninitialized: true,
}));


//POST HANDLING
app.post('/login', (req,res) => {
    return handlers.handleLogin(req,res);
});

app.post('/register', (req,res) => {
    return handlers.handleRegister(req,res);
});


app.post('/getlogged', (req,res) => {
    let name = req.session.username;
    let i = getUserIndex(name);
    if(i !== null){
        leaveGame(name);
    }
    return handlers.handleGetLogged(req,res);
});

app.post('/remlogged', (req,res) => {
    const data = req.body;
    const name = data.username;
    let i = getUserIndex(name);
    if(i !== null){
        leaveGame(name);
    }
    return handlers.handleLogout(req,res);
});

app.post('/getstatistics',(req,res) => {
    /*const name = req.body.userData.username;
    leaveGame(name);*/
    return handlers.handleGetStatistics(req,res);
});

app.post('/deleteuserteam', (req,res) =>{
   return handlers.handleDeleteUserTeam(req);
});

app.post('/getteamexists',(req,res) => {
   return handlers.handleGetTeamExists(req,res);
});

app.post('/addteam',(req,res) => {
    return handlers.handleAddTeam(req,res);
});

app.post('/getteams', (req,res) =>{
    return handlers.handleGetTeams(res);
});

app.post('/addusertoteam', (req,res) => {
   return handlers.handleAddUserToTeam(req,res);
});

app.post('/getlogs', (req,res) => {
    return handlers.handleGetLogs(req,res);
});

app.post('/deleteuser', (req,res) =>{
   return handlers.handleDeleteUser(req,res);
});

app.post('/deleteteam', (req,res) =>{
    return handlers.handleDeleteTeam(req,res);
});


server.listen(4000, () => console.log(`Listening on port 4000`));

function leaveGame(name){
    console.log('user disconnected:' + name);
    console.log(loggedUsers);
    let ingame = getUserInGame(name);
    if(ingame != null){
        console.log("leavefromgame");
        loggedUsers[getUserIndex(name)][1].emit('lose', "You lost! -50 points");
        let game = getUserInGame(name);
        console.log(game.user1 , game.user2);
        if(game.user1 === name){
            loggedUsers[getUserIndex(game.user2)][1].emit('win', "You win! +50 points");
            loggedUsers.splice(getUserIndex(game.user2),1);
            games.splice(getGameIndex(name),1);
        }else if(game.user2 === name){
            loggedUsers[getUserIndex(game.user1)][1].emit('win', "You win! +50 points");
            loggedUsers.splice(getUserIndex(game.user1),1);
            games.splice(getGameIndex(name),1);
        }
        loggedUsers.splice(getUserIndex(name),1);
    }else{
        loggedUsers.splice(getUserIndex(name),1);
    }

}

io.on('connection', socket => {
    console.log('User connected');

    socket.on('logout', (name) => {
        leaveGame(name);
    });

    socket.on('login', name =>{
        console.log("findgame:" + name);
        loggedUsers.push([name,socket]);
        if(loggedUsers.length % 2 === 0){
            let user2 = name;
            let user1 = loggedUsers[loggedUsers.length-2][0];
            console.log("initgame:"+user1.toString()+" vs " + user2.toString());
            let init = generateNewGame(user1,user2);
            loggedUsers[getUserIndex(user1)][1].emit('init',init);
            loggedUsers[getUserIndex(user2)][1].emit('init',init);
            games.push(init);
        }
        //console.log(loggedUsers);
    });

    socket.on('move', move =>{
        console.log(move);
        //CHANGE GAME MAP AND INIT
        //DECIDER FUNCION
        //SEND BACK INIT
        let user = move[0];
        let oldpos = move[1];
        let newpos = move[2];
        let game;
        let user1;
        let user2;
        for(let i = 0; i < games.length; i++){
            if(games[i].user1 === user){
                user1 = user;
                user2 = games[i].user2;
                game = games[i];
            }
            if(games[i].user2 === user){
                user1 = games[i].user1;
                user2 = user;
                game = games[i];
            }
        }

        let split = oldpos.split(' ');
        let oldi = parseInt(split[1]);
        let oldj = parseInt(split[2]);

        let split2 = newpos.split(' ');
        let newi = parseInt(split2[1]);
        let newj = parseInt(split2[2]);

        if(user1 === user){
            console.log("user1", user1);
            let newg = moveUser(user,game,oldi,oldj,newi,newj);
            game = newg;
            game.move = user2;
            games[0] = game;
            if(winChecker(game)) return;
            getUserSocket(user1).emit('init', games[0]);
            getUserSocket(user2).emit('init', games[0]);

        }
        else if(user2 === user){
            console.log("user2", user2);
            let newg = moveUser(user,game,oldi,oldj,newi,newj);
            game = newg;
            game.move = user1;
            games[0] = game;
            if(winChecker(game)) return;
            getUserSocket(user1).emit('init', games[0]);
            getUserSocket(user2).emit('init', games[0]);
        }
        console.log(game);
    });

});


function winChecker(game){
    if(game.user1points.length === 0){
        getUserSocket(game.user1).emit('lose', 'You lost! -50 points');
        getUserSocket(game.user2).emit('win', 'You win! +50 points');
        handlers.addGame(game.user2,game.user1);
        handlers.updateAddUserScore(game.user2);
        handlers.updateSubUserScore(game.user1);
        return true;
    }
    if(game.user2points.length === 0){
        getUserSocket(game.user2).emit('lose', 'You lost! -50 points');
        getUserSocket(game.user1).emit('win', 'You win! +50 points');
        handlers.addGame(game.user1,game.user2);
        handlers.updateAddUserScore(game.user1);
        handlers.updateSubUserScore(game.user2);
        return true;
    }

    return false;
}
function moveUser(user,game,oldi,oldj,newi,newj){
    let gamemap;
    let othermap;
    if(user === game.user1){
        gamemap = game.user1points;
        othermap = game.user2points;
    }else{
        gamemap = game.user2points;
        othermap = game.user1points;
    }
    for(let i = 0; i < gamemap.length; i++){
        if(gamemap[i][0] === oldi && gamemap[i][1] === oldj){
            for(let j = 0; j < othermap.length; j++){
                if(othermap[j][0] === newi && othermap[j][1] === newj){
                    let dc = decider(gamemap[i][2],othermap[j][2]);
                    if(dc === gamemap[i][2]){
                        othermap.splice(j,1);
                        gamemap[i][0] = newi;
                        gamemap[i][1] = newj;
                        gamemap[i][3] = 1;
                        if(othermap === game.user1points){
                            game.user1points = othermap;
                            game.user2points = gamemap;
                        }
                        return game;
                    }else{
                        gamemap.splice(i,1);
                        othermap[j][3] = 1;
                        if(othermap !== game.user1points){
                            game.user1points = gamemap;
                            game.user2points = othermap;
                        }
                        return game;
                    }
                }
            }
            gamemap[i][0] = newi;
            gamemap[i][1] = newj;
            return game;
        }
    }
    return game;
}

function generateNewGame(user1,user2) {
    let move = {};
    let user1positions = [];
    let user2positions = [];
    for(let i = 0; i < 2; i++){
        for(let j = 0; j < 5; j++){
            user1positions.push([i,j,Math.floor((Math.random() * 3) + 0),0])
        }
    }


    for(let i = 5; i < 7; i++){
        for(let j = 0; j < 5; j++){
            user2positions.push([i,j,Math.floor((Math.random() * 3) + 0),0])
        }
    }

    move.user1points = user1positions;
    move.user2points = user2positions;
    move.move = user1;
    move.user1 = user1;
    move.user2 = user2;


    return move;
}

function decider(u1,u2){
    let rnd = Math.floor((Math.random() * 2) + 0);
    if(u1 === u2){
        if(rnd === 0){
            return  u1;
        }
        return u2;
    }

    if(u1 === 1 && u2 === 2){
        return 2;
    }
    if(u1 === 2 && u2 === 1){
        return 2;
    }
    if(u1 === 0 && u2 === 2){
        return 0;
    }
    if(u1 === 2 && u2 === 0){
        return 0;
    }if(u1 === 1 && u2 === 0){
        return 1;
    }
    if(u1 === 0 && u2 === 1){
        return 1;
    }
}

function getUserIndex(name){
    for(let i = 0; i < loggedUsers.length; i++){
        if(loggedUsers[i][0] === name){
            return i;
        }
    }
    return null;
}

function getUserSocket(name){
    for(let i = 0; i < loggedUsers.length; i++){
        if(loggedUsers[i][0] === name){
            return loggedUsers[i][1];
        }
    }
    return null;
}

function getUserInGame(name){
    for(let i = 0; i < games.length; i++){
        if(games[i].user1 === name){
            return games[i];
        }
        if(games[i].user2 === name){
            return games[i];
        }
    }
    return null;
}

function getGameIndex(name){
    for(let i = 0; i < games.length; i++){
        if(games[i].user1 === name){
            return i;
        }
        if(games[i].user2 === name){
            return i;
        }
    }
    return null;
}
