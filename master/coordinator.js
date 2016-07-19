var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var Promise = require('promise');

var chalk = require('chalk');

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

    socket.on('State', OnSiteStateReceived);
    
    socket.on('JobFinished', onJobFinished);
    
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
        case "RequestForState":
            GatherSitesState();
            tmp_browserClient = browserClient;
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
    //console.log(requestMessage);
    console.log('Token Requested from: ' + requestMessage.requester + "  , target: " + requestMessage.holder);
    
    for(var i=0, n=sites.length; i<n;i++){
        if(sites[i].id == requestMessage.holder){
            
            console.log('Forwarding Request Privilege message to : ', requestMessage.holder);
            sites[i].socket.emit('RequestReceievd', requestMessage);
            
            return;
        }
    }
}

onSendPrivilege = function(tokenData) {
    //console.log(tokenData);
    console.log('PrivilegeReceived from ' + tokenData.sender + "  , target: " + tokenData.target);
    
    for(var i=0, n=sites.length; i<n;i++){
        if(sites[i].id == tokenData.target){
            
            console.log('Forwarding Token to :', tokenData.target);
            sites[i].socket.emit('PrivilegeReceievd', tokenData);
            
            return;
        }
    }
}



OnSiteStateReceived = function(data) {
    var found=-1;
    
    for(var i=0; i<tmp_rsm.length ; i++){
        if(tmp_rsm[i] == data['id']){
            found=i;
        }
    }
    
    if(found==-1){
        console.log("Something went wrong!");        
        return;
    }

    tmp_rsm.splice(found,1);
    tmp_gsm.push(data);
    
//    var item = [];
//    item.push(data['id']);
//    
//    var row = data['matrix'];
//    
//    //console.log("row ", row);
//    
//    for(var i =1 ;i<row.length; i++){
//        item.push(row[i]);
//    }
//    
//    tmp_table.push(item);
//    
//    tmp_gsm.push(data);
//    
    //tmp_browserClient.emit('GlobalStateMatrixPartial', tmp_table);
    
    if(tmp_rsm.length == 0 ) {
        //Completed!
        tmp_browserClient.emit('GlobalStateComplete', tmp_gsm);
        tmp_gsm = [];
    }
    
    //console.log("item " ,item);
}

onJobFinished = function(data) {
    console.log(chalk.red('Job ', data.job , ' Finished at site ', data.id ));
};


function GatherSitesState(){
    tmp_rsm = [];
    tmp_table = [];
    tmp_gsm = [];
    
    for(var i=0; i<sites.length; i++) {
        sites[i].socket.emit("GetState","-1");
        tmp_rsm.push(i+1);
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
