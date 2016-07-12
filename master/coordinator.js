var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var Promise = require('promise');

var sites = [];
var clients = [];
var lastState = [];

var tmp_table = [];
var tmp_gsm = [];
var tmp_rsm = [];
var tmp_browserClient;

var globalLog = "";

app.use(express.static('public'));

app.get('/', function(req, res){
      res.sendFile(__dirname  +'/index.html');
});


OnConnection = function(socket){
    doLog('Client Connected!');
    clients.push(socket);

    socket.on('BrowserClient',function(msg){
        onBrowser(msg, socket)
    });
    
    socket.on('ScheduleJob',function(msg){
        onScheduleJob(msg, socket)
    })
    
    socket.on('SendPrivilege', onSendPrivilege);
    socket.on('RequestPrivilege', onRequestPrivilege);
    
    socket.on('disconnect', function() {
        clients.splice(clients.indexOf(socket), 1);
    });

    socket.on('RegisterSite', function(siteName){
        for(var i=0; i<sites.length ; i++){
            if(sites[i].id == siteName){
                doLog("Client id already exist, updating the Socket!");
                sites[i].socket = socket;
                return;
            }
        }
        
        var item = {};
        item.id = siteName;
        item.socket = socket;
        
        sites.push (item);
    });
}

onBrowser = function(data, browserClient){
    
    switch(data){
        case "GetTotalNumberOfClients":
            browserClient.emit("UpdateNumberOfClients", sites.length);
            break;
        case "GetGlobalLog":
            browserClient.emit("GlobalLog", globalLog);
            break;
        default:
            break;       
    }
}


onScheduleJob = function(data, browserClient){
    doLog('onScheduleJob ' + data);
    for(var i=0, n=sites.length; i<n;i++){
        if(sites[i].id == data.client){
            
            doLog('jobSceduled!');
            sites[i].socket.emit('ScheduleJob', data);
            
            return;
        }
    }
}


onRequestPrivilege = function(requestMessage) {
    doLog('Token Requested from: ' + requestMessage.source + "  , target :" + requestMessage.target);
    
    for(var i=0, n=sites.length; i<n;i++){
        if(sites[i].id == requestMessage.holder){
            
            doLog('Forwarding Request Privilege message to : ', requestMessage.holder);
            sites[i].socket.emit('RequestReceievd', requestMessage);
            
            return;
        }
    }
}

onSendPrivilege = function(tokenData) {
    doLog('PrivilegeReceived from' + tokenData.source + "  , target :" + tokenData.target);
    
    for(var i=0, n=sites.length; i<n;i++){
        if(sites[i].id == tokenData.target){
            
            doLog('Forwarding Token to :', tokenData.target);
            sites[i].socket.emit('PrivilegeReceievd', tokenData);
            
            return;
        }
    }
}


function doLog(message) {
    console.log(message);
    globalLog += message + '\n';
}

io.on('connection', OnConnection);

http.listen(5000, function(){
  doLog('listening on *:5000');
});
