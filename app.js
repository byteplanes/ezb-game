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
missiledb = new Datastore({ filename: 'database/missiledb', autoload: true });
gamedb.persistence.setAutocompactionInterval(10000);
missiledb.persistence.setAutocompactionInterval(10000);
//var activeusers = [][];
var activeusersnum= 0;

var users, hash;


var setup = false;

if(setup==false){
  console.log('setting up server options...');
  var time=(new Date).getTime();
  console.log(time);
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
        var newgamedata = {username:msg[1], xpos:50, ypos:50, color:'ff5900', lastx:1, lasty:1, missiles:0};
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
        var ismissile=false;
        var mchange = 0;
        if((msg[0]=="UP"||msg[0]=="LEFT"||msg[0]=="RIGHT"||msg[0]=="DOWN")&&docs[0]['missiles']==0)
        {
          //msg[1]=msg[1]+"MISSLE";
          mchange=1;
          console.log(msg[1]);
          var newmissilegamedata = {username:msg[1], xpos:docs[0]['xpos'], ypos:docs[0]['ypos'], color:'62d642', lastx:1, lasty:1, missiles:-1, direction:msg[0]};
          missiledb.insert(newmissilegamedata, function (err, newDoc){
            if(!err){
              missiledb.find({username:msg[1]}, function (err, mdoc){
                if(!err){
                  var newgamedata = {username:docs[0]["username"], xpos:docs[0]['xpos']+xchange, ypos:docs[0]['ypos']+ychange, color:'62d642', lastx:docs[0]['xpos'], lasty:docs[0]['ypos'], missiles:docs[0]['missiles']+mchange};
                  gamedb.update({username: msg[1]}, newgamedata, {}, function (err, newDoc){
                    if(!err){
                      gamedb.find({username:msg[1]}, function (err, doc){
                        if(!err){
                          doc[0]['username']=doc[0]['username']+"MISSILE";
                          io.emit('update', doc);
                        }
                      })
                    }
                  })
                }else{
                  console.log("darn inner error")
                }
              })
            }else{console.log('oops err')}
          })
        }
        var mxchange=0;
        var mychange=0;
        if((new Date).getTime()-50>time)
        {
          time=(new Date).getTime();
          missiledb.find({username:msg[1]}, function (err, docs){
            if(JSON.stringify(docs).length>5){
              if(!err){
              if(docs[0]['direction']=="UP"){
                mychange=-1;
              }else if(docs[0]['direction']=="LEFT")
              {
                mxchange=-1;
              }else if(docs[0]['direction']=="RIGHT")
              {
                mxchange=1;
              }else if(docs[0]['direction']=="DOWN")
              {            
                mychange=1;
              }
              var newgamedata = {username:docs[0]["username"], xpos:docs[0]['xpos']+mxchange, ypos:docs[0]['ypos']+mychange, color:'62d642', lastx:docs[0]['xpos'], lasty:docs[0]['ypos'], missiles:docs[0]['missiles'], direction:docs[0]['direction']};
              missiledb.update({username: msg[1]}, newgamedata, {}, function (err, newDoc){
                if(!err){
                  missiledb.find({username:msg[1]}, function (err, doc){
                    if(!err){
                      if(doc[0]['xpos']>50||doc[0]['xpos']<0||doc[0]['ypos']>50||doc[0]['ypos']<0)
                      {
                        missiledb.remove({username:doc[0]['username']}, function (err, numRemoved){
                          gamedb.update({username: msg[1]}, { $set: { missiles: 0 } }, {}, function (err, newDoc){
                            if(!err){
                              console.log('cleared missile');
                            }
                          })
                        });
                      }else{
                        doc[0]['username']=doc[0]['username']+"MISSILE";
                        io.emit('update', doc);
                      }
                    }
                  })
                }
              })
            }else{
              console.log("darn inner error")
            }
            }
          })
        }
        //console.log('update requested: ' + msg[1]+"   "+msg[0]);
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
        var newgamedata = {username:docs[0]["username"], xpos:docs[0]['xpos']+xchange, ypos:docs[0]['ypos']+ychange, color:'ff5900', lastx:docs[0]['xpos'], lasty:docs[0]['ypos'], missiles:docs[0]['missiles']+mchange};
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
