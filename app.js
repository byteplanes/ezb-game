//(c) 2017 RolzPro.com and Charlie Wu
//Apache 2.0 License, github.com/byteplanes

var express = require('express')
var app = express()
var bodyParser = require('body-parser');
var fs = require('fs');
var cookieParser = require('cookie-parser')
var SHA512 = require("crypto-js/sha512");

var http = require('http').Server(app);

var io = require('socket.io')(http);

app.use(bodyParser.urlencoded({ extended: true })); 
//app.set('view engine', 'pug')

app.use(express.static('./views'));
app.use(cookieParser());

var Datastore = require('nedb');
gamedb = new Datastore({ filename: 'database/gamedb', autoload: true });

//var activeusers = [][];
var activeusersnum= 0;

var users, hash;


var setup = false;

if(setup==false){
  console.log('setting up server options...');
  var starttime=
  setup=true;
}



http.listen((process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080), (process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'), function () {
  console.log('ez!BANG! minigame starting on port 8080.');
  console.log('(c) 2017 Charlie Wu');
  console.log('Apache 2.0 License, github.com/byteplanes');
})

app.get('/', function (req, res) {
  res.render('index');
})

io.on('connection', function(socket){
  socket.on('clientconnect', function(msg){
    console.log('user connected: ' + msg);
    socket.emit('clientinfo', activeusersnum);
  });
  socket.on('newgame', function(msg){
    console.log('new game: ' + msg[1]);
    activeusersnum++;
    
    gamedb.findOne({ username: msg[1] }, function (err, docs) {
      if(JSON.stringify(docs)=='null'&&msg[1]!=''){
        var newgamedata = {username:msg[1], xpos:50, ypos:50, color:'ff5900', lastx:1, lasty:1};
        gamedb.insert(newgamedata, function (err, newDoc){
          if(!err){
            gamedb.find({username:msg[1]}, function (err, doc){
              if(!err){
                socket.emit('startgame', doc);
                console.log(doc[0]['username'])
              }
            })
          }
        })
      }else{
        socket.emit('uhoh', 'Please choose another username, this one is in use.');
      }
    })
  });
  socket.on('requpdate', function(msg){
    gamedb.find({ username: msg[1] }, function (err, docs) {
      if(JSON.stringify(docs)!='null'&&msg[1]!=''){
        var xchange=0;
        var ychange=0;
        console.log('update requested: ' + msg[1]+"   "+msg[0]);
        if(msg[0]=="N"){
          ychange=1;
        }else if(msg[0]=="E"){
          xchange=1;
        }else if(msg[0]=="S"){
          ychange=-1;
        }else if(msg[0]=="W"){
          xchange=-1;
        }else{
        }
        if((docs[0]['xpos']>=49&&xchange>0)||(docs[0]['xpos']<=1&&xchange<0))
        {
          xchange=0;
        }
        if((docs[0]['ypos']>=49&&ychange>0)||(docs[0]['ypos']<=1&&ychange<0))
        {
          ychange=0;
        }
        var newgamedata = {username:docs[0]["username"], xpos:docs[0]['xpos']+xchange, ypos:docs[0]['ypos']+ychange, color:'ff5900', lastx:docs[0]['xpos'], lasty:docs[0]['ypos']};
        gamedb.update({username: msg[1]}, newgamedata, {}, function (err, newDoc){
          if(!err){
            gamedb.find({username:msg[1]}, function (err, doc){
              if(!err){
                io.emit('update', doc);
              }
            })
          }
        })
      }else{
        socket.emit('uhoh', 'SOMETHING WENT WRONG WITH YOUR REQUEST YOUR USERNAME IS MESSED UP SRY');
      }
    })
  });

});
