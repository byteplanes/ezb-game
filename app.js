//(c) 2017 RolzPro.com and Charlie Wu
//Apache 2.0 License, github.com/byteplanes

var express = require('express')
var app = express()
var fs = require('fs');

var http = require('http').Server(app);

var io = require('socket.io')(http);

app.use(express.static('./views'));

var Datastore = require('nedb');
gamedb = new Datastore({ filename: 'database/gamedb', autoload: true });
gamedb.persistence.setAutocompactionInterval(10000);
var activeusersnum= 0;
var game = setInterval(function(){rungame()}, 50);

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
  socket.on('quit', function(msg){
    gamedb.remove({username:msg}, function(err, numRemoved){
      if(!err&&numRemoved>0){
        console.log(msg+" successfully removed! "+numRemoved);
        activeusersnum--;
      }
    });
  });
  socket.on('newgame', function(msg){
    console.log('new game: ' + msg[1]);
    activeusersnum++;
    gamedb.findOne({ username: msg[1] }, function (err, docs) {
      if(JSON.stringify(docs)=='null'&&msg[1]!=''){
        var newgamedata = {username:msg[1], xpos:50, ypos:50, color:'ff5900', active:true, direction:"N", type:"player"};
        gamedb.insert(newgamedata, function (err, newDoc){
          if(!err){
            var newmissilegamedata = {username:msg[1]+"_MISSILE", xpos:50, ypos:50, color:'67ff4c', active:false, direction:"N", type:"missile"};
            gamedb.insert(newmissilegamedata, function (err, newDoc){
              if(!err){
                gamedb.find({username:msg[1]}, function(err, doc){
                  socket.emit('startgame', doc);
                });
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
    gamedb.findOne({ username: msg[1] }, function (err, docs) {
      if(JSON.stringify(docs)!='null'&&msg[1]!=''){
        if(msg[0]=="UP"||msg[0]=="DOWN"||msg[0]=="LEFT"||msg[0]=="RIGHT"){
          docs['username']=docs['username']+"_MISSILE";
          docs['color']='67ff4c';
          docs['type']="missile";
        }
        var newgamedata = {username:docs["username"], xpos:docs['xpos'], ypos:docs['ypos'], color:docs['color'], active:true, direction:msg[0], type:docs['type']};
          gamedb.update({username: docs["username"]}, newgamedata, {}, function (err, newDoc){
            if(!err){
              //updated
            }
          })
      }else{
        socket.emit('uhoh', 'SOMETHING WENT WRONG WITH YOUR REQUEST YOUR USERNAME IS MESSED UP SRY');
      }
    })
  });

});

function rungame(){
  //console.log((new Date).getTime());
  gamedb.find({active:true}, function(err, alldocs){
    //console.log(alldocs.length);
    for(var i = 0; i < alldocs.length; i++){
      updateall(i, alldocs);
    }
  });
}

function updateall(i, alldocs){
  var xchange = 0;
  var ychange = 0;
  if(alldocs[i]['direction']=="N"||alldocs[i]['direction']=="UP"){
    ychange=1;
  }else if(alldocs[i]['direction']=="E"||alldocs[i]['direction']=="RIGHT"){
    xchange=1;
  }else if(alldocs[i]['direction']=="S"||alldocs[i]['direction']=="DOWN"){
    ychange=-1;
  }else if(alldocs[i]['direction']=="W"||alldocs[i]['direction']=="LEFT"){
    xchange=-1;
  }else{
  }
  if((alldocs[i]['xpos']>=50&&xchange>0)||(alldocs[i]['xpos']<=0&&xchange<0))
  {
    xchange=0;
    if(alldocs[i]['type']=="missile"){
      alldocs[i]['active']=false;
    }
  }
  if((alldocs[i]['ypos']>=50&&ychange>0)||(alldocs[i]['ypos']<=0&&ychange<0))
  {
    ychange=0;
    if(alldocs[i]['type']=="missile"){
      alldocs[i]['active']=false;
    }
  }
  if(alldocs[i]['type']=="missile"){
    gamedb.find({active:true, type:"player"}, function(err, players){
      for(var j = 0; j < players.length; j++){
        checkcollide(alldocs[i], players[j]);
      }
    });
  }
  var newgamedata = {username:alldocs[i]["username"], xpos:alldocs[i]['xpos']+xchange, ypos:alldocs[i]['ypos']+ychange, color:alldocs[i]['color'], active:alldocs[i]['active'], direction:alldocs[i]['direction'], type:alldocs[i]['type']};
  gamedb.update({username: alldocs[i]['username']}, newgamedata, {}, function (err, newDoc){
    if(!err&&i==alldocs.length-1){
      gamedb.find({active:true}, function (err, doc){
        if(!err){
          io.emit('update', doc);
        }
      })
    }
  })
}

function checkcollide(obj1, obj2){
  if(Math.abs(obj1['xpos']-obj2['xpos'])<=4&&Math.abs(obj1['ypos']-obj2['ypos'])<=4&&obj1['username'].substring(0,obj1['username'].length-8)!=obj2['username']){
    io.emit('uhoh', obj1['username'].substring(0,obj1['username'].length-8)+" KILLED "+obj2['username']+"!!!")
  }else{
    //no collision
  }
}