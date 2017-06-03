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
app.set('view engine', 'pug')

app.use(express.static('./views'));
app.use(cookieParser());

var Datastore = require('nedb');
db = new Datastore({ filename: 'database/users', autoload: true });
activegames = new Datastore({ filename: 'database/activegames', autoload: true });
gamereqs = new Datastore({ filename: 'database/gamereqs', autoload: true });

var users, hash;

app.post('/confirmlogin', function(req, res){
  if(req.body.username!=""&&req.body.username!=null){
    hash = SHA512(req.body.password);
    db.findOne({ username: req.body.username, password: hash }, function (err, docs) {
      if(JSON.stringify(docs)!='null'){
        console.log("success!");
        res.cookie('username', req.body.username, { expires: 0, httpOnly: true });
        res.cookie('password', hash, { expires: 0, httpOnly: true });
        return res.render('index', {username: req.body.username});
      }else{
        res.render('login', {error: 'true', errormessage:'Invalid username or password, please try again'});
      }
    })
  }else{
    res.render('login', {error: 'true', errormessage:'Username cannot be blank.'});
  }
})

app.post('/confirmcreate', function(req, res){
  if(req.body.username!=""&&req.body.username!=null){
    db.findOne({ username: req.body.username }, function (err, docs) {
      if(JSON.stringify(docs)=='null'){
        hash = SHA512(req.body.password);
        users = {username:""+req.body.username, password:""+hash, name:""+req.body.name};
        db.insert(users, function (err, newDoc){
          if(!err){
            res.render('login', {error: 'true', errormessage: 'Please login with your new credentials.'});
            console.log("success");
          }else{
            res.render('createaccount', {error: 'true', errormessage:'Unexplained error, contact webmaster for assistance.'});
            console.log("unexplained create error:   "+err);
          }
        })
      }else{
        res.render('createaccount', {error: 'true', errormessage:'Username already exists. Please try again.'});
        console.log("req username exists");
      }
    })
  }else{
    res.render('createaccount', {error: 'true', errormessage:'Username cannot be blank.'});
    console.log("username is blank");
  }
})

/*
app.get('/logout', function (req, res) {  
  res.cookie('username', "loggedout", { expires: 0, httpOnly: true });
  res.cookie('password', "loggedout", { expires: 0, httpOnly: true });
  return res.render(__dirname+'/aawfiles/login', {error: 'false'});
})
*/
http.listen((process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080), (process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'), function () {
  console.log('Pool Tourney starting on port 8080.');
  console.log('(c) 2017 RolzPro.com and Charlie Wu');
  console.log('Apache 2.0 License, github.com/byteplanes');
})

function getDateTime() {
    var date = new Date();
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return month + "/" + day + "   " + hour + ":" + min ;
}

/* BEGIN FILE REDIRECTS*/
/*
app.get('/', function (req, res) {
  if(req.cookies.username!="loggedout"&&req.cookies.username!=null){fs.exists("./aawdb/users/"+req.cookies.username+".txt", function(exists){if(exists){fs.readFile("./aawdb/users/"+req.cookies.username+".txt", function read(err, data){if(!err){if(req.cookies.password==data){
    return res.render(__dirname+"/aawfiles/aawindex", {username: req.cookies.username, t1: "", b1: "", t2: "", b2: "", t3:"", b3:"", t4:"", b4:"", t5:"", b5:"", t6:"", b6:""});
  }else{return res.render(__dirname+"/aawfiles/login", {error: 'true', errormessage:'Wrong Password. Try Again.'});}}else{return res.render(__dirname+"/aawfiles/login", {error: 'true', errormessage:'Unexplained error, contact webmaster for assistance.'});}})}else{return res.render(__dirname+"/aawfiles/login", {error: 'true', errormessage:'Username does not exist, to create account, see below.'});}})}else{return res.render(__dirname+"/aawfiles/login", {error:'false'});}
})
*/

app.get('/', function (req, res) {
  var userc = req.cookies.username;
  var passc = req.cookies.password;
  if(userc==null||userc==""||userc=="loggedout")
  {
    res.render('login');
  }else{
    db.findOne({ username: userc, password: passc }, function (err, docs) {
      if(JSON.stringify(docs)!='null'){
        console.log("success!");
        res.render('index', {error:'false', username: req.cookies.username});
      }else{
        res.render('login', {error: 'true', errormessage:'Invalid username or password, please try again'});
      }
    })
  }
  io.on('connection', function(socket){
      socket.emit('setuser', userc);
  });
})

app.get('/createaccount', function (req, res) {
  return res.render('createaccount');
})
app.get('/login', function (req, res) {
  return res.render('login');
})
/* END FILE REDIRECTS*/

io.on('connection', function(socket){
  socket.on('connected', function(msg){
    console.log('user connected: ' + msg);
  });

  socket.on('requpdate', function(data){
    console.log(p1+" and "+p2+" have started a new game");
    activegames.find({p1:p1}, function (err, docs){
      console.log(JSON.stringify(docs));
      socket.emit('updategame', p1+"||"+p2);
    });
  });

  socket.on('newgame', function(msg){
    console.log("rolz   "+msg);
    var newgamedata = {user: msg, time: getDateTime(), true: 'true'};
    gamereqs.find({ true: 'true'}, function (err, docs) {
      console.log(JSON.stringify(docs));
      if(JSON.stringify(docs).length>10)
      {
        console.log("pair found yay!");
        var p1 = JSON.stringify(docs).substring(10).substring(0, JSON.stringify(docs).search('"'));
        var p2 = msg;
        console.log("challengers: "+p1+", "+p2);
        gamereqs.remove({ true: 'true' }, { multi: true }, function (err, numRemoved) {
          console.log(numRemoved+" players removed from queue into battle");
        });
        var startgamedata = {p1: p1, p2: p2, p1avatar: "default", p2avatar: "default", p1stats: "1000 TROPHIES", p2stats: "1500 TROPHIES", time: getDateTime(), true: true};
        activegames.insert(startgamedata, function (err, newDoc){
          if(!err){
            console.log(p1+" and "+p2+" have started a new game");
            activegames.find({p1:p1}, function (err, docs){// find one???
              console.log(JSON.stringify(docs));
              //var docsarr = docs.substring(3, docs.length-3).split("":"');
              var curtime = new Date();
              io.emit('startgame', p1+"||"+p2+"||"+"kaori"+"||"+"therock"+"||"+"aim"+"||"+(new Date(curtime.getFullYear,)));
            });
          }
        })
      }else{
        gamereqs.insert(newgamedata, function (err, newDoc){
          if(!err){
            console.log(msg+" is in the game queue");
          }
        })
      }
    })
  });
});
/*io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});*/