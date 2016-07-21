const Console = require('console').Console;
const fs = require('fs');


var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var chalk = require('chalk');

var sites = [];
var clients = [];
var lastState = [];

var tmp_table = [];
var tmp_gsm = [];
var tmp_rsm = [];
var tmp_browserClient;

var jobScheduleTime = [];
var jobFinishTime = [];

var onRequestPrivilegeCounter=0;
var onSendPrivilegeCounter=0;

app.use(express.static('public'));

app.get('/', function(req, res){
      res.sendFile(__dirname  +'/index.html');
});



const output = fs.createWriteStream('./stdout.log');
const errorOutput = fs.createWriteStream('./stderr.log');
// custom simple logger
const myConsole = new Console(output, errorOutput);
//
//const out = getStreamSomehow();
//const err = getStreamSomehow();
//const myConsole = new console.Console(out, err);


OnConnection = function(socket){
    myConsole.log('Client Connected!');
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
                myConsole.log("Client id already exist, updating the Socket!");
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
        case "GetStatistics":
            CalculateStatistics(browserClient);
            break;
        case "RequestForState":
            GatherSitesState();
            tmp_browserClient = browserClient;
            break;
        case "GetGlobalLog":
            
            fs.readFile('./stdout.log', (err, data) => {
              if (err) throw err;
              browserClient.emit("GlobalLog", String.fromCharCode.apply(null, new Uint16Array(data)));
            });
            
            break;
        default:
            break;       
    }
}

onScheduleJob = function(data, browserClient){
    myConsole.log('onScheduleJob ',  data);
    for(var i=0, n=sites.length; i<n;i++){
        if(sites[i].id == data.client){
            
            var mtime = (new Date());
            
            jobScheduleTime.push({'jobId': data.id, 'nodeId': data.client, 'startTime' : mtime.getTime(), 'duration' : data.time});
            sites[i].socket.emit('ScheduleJob', data);
            
            return;
        }
    }
}

onRequestPrivilege = function(requestMessage) {
    onRequestPrivilegeCounter++;
    myConsole.log('Token Requested from: ' + requestMessage.requester + "  , target: " + requestMessage.holder);
    
    for(var i=0, n=sites.length; i<n;i++){
        if(sites[i].id == requestMessage.holder){
            
            myConsole.log('Forwarding Request Privilege message to : ', requestMessage.holder);
            sites[i].socket.emit('RequestReceievd', requestMessage);
            
            return;
        }
    }
}

onSendPrivilege = function(tokenData) {
    onSendPrivilegeCounter++;
    myConsole.log('PrivilegeReceived from ' + tokenData.sender + "  , target: " + tokenData.target);
    
    for(var i=0, n=sites.length; i<n;i++){
        if(sites[i].id == tokenData.target){
            
            myConsole.log('Forwarding Token to :', tokenData.target);
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
        myConsole.log("Something went wrong!");        
        return;
    }

    tmp_rsm.splice(found,1);
    tmp_gsm.push(data);
    
    if(tmp_rsm.length == 0 ) {
        //Completed!
        tmp_browserClient.emit('GlobalStateComplete', tmp_gsm);
        tmp_gsm = [];
    }
}

onJobFinished = function(data) {
    myConsole.log(data);
    jobFinishTime.push({'jobId': data.job, 'nodeId': data.id, 'resources': data.resources, 'startTime' : data.startTime, 'finishTime' : data.finishTime});
    myConsole.log(chalk.red('Job ', data.job , ', startTime ' , data.startTime, ', finishTime ' , data.finishTime ));
    myConsole.log(chalk.yellow(jobFinishTime.length, " jobs finished!"));
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


function CalculateStatistics(browserClient) {
    myConsole.log(chalk.green("#RequestPrivilege Messages ", onRequestPrivilegeCounter));
    myConsole.log(chalk.green("#SendPrivilege Messages ", onSendPrivilegeCounter));
    
    
    var TimeArray = [];
    
    jobFinishTime.forEach(function(element, index, array) {
       
        element.resources.forEach(function(elm,idx,arr) {
            
            if(! TimeArray[elm]) {
                 TimeArray[elm] = [];
            }
            
            TimeArray[elm].push({'time': element.startTime, 'event': 'start'});
            TimeArray[elm].push({'time': element.finishTime, 'event': 'finish'});
            
        });
        
    });
    
    TimeArray.forEach( function(element, index) {
       
        TimeArray[index] = TimeArray[index].sort(function (a ,b) {
            return a.time - b.time;
        });
        
    });
    
    myConsole.log(TimeArray);

    delayBetweenCSEnteranceTime = [];
    
    TimeArray.forEach( function(element, index) {
       
        var deltaTimes = [];
        var deltaSum = 0;
        
        
        for(var i=1; i<TimeArray[index].length; i+=2) {
        
            if(TimeArray[index][i].event != 'finish' || TimeArray[index][i-1].event != 'start') {
                myConsole.log("PANIC");
                myConsole.log(i-1, ",  ", TimeArray[index][i-1].event);
                myConsole.log(i, ", ", TimeArray[index][i].event);

                return;
            }


            deltaSum += TimeArray[index][i].time-TimeArray[index][i-1].time;
            deltaTimes.push(TimeArray[index][i].time-TimeArray[index][i-1].time);
        }
        
        delayBetweenCSEnteranceTime[index] = deltaTimes;
    });

   
    
    var statResult = {'RequestPrivilegeMessages': onRequestPrivilegeCounter, 'SendPrivilegeMessages': onSendPrivilegeCounter , 'DetailedSynchTimes' : JSON.stringify(delayBetweenCSEnteranceTime) , 'jobDone' : jobFinishTime.length };
    
    browserClient.emit('UpdateStatistics', JSON.stringify(statResult) );  

}

//
//
//function CalculateStatistics(browserClient) {
//    myConsole.log(chalk.green("#RequestPrivilege Messages ", onRequestPrivilegeCounter));
//    myConsole.log(chalk.green("#SendPrivilege Messages ", onSendPrivilegeCounter));
//    
//    
//    // for one shared resource ONLY!
//    
//    var TimeArray = [];
//    
//    jobFinishTime.forEach(function(element, index, array) {
//       
//        TimeArray.push({'time': element.startTime, 'event': 'start'});
//        TimeArray.push({'time': element.finishTime, 'event': 'finish'});
//
//    });
//    
//    TimeArray = TimeArray.sort(function (a ,b) {
//        return a.time - b.time;
//    });
//    
//    
//    myConsole.log(TimeArray);
//
//    
//    var deltaTimes = [];
//    var deltaSum = 0;
//    
//    for(var i=1; i<TimeArray.length; i+=2) {
//        
//        if(TimeArray[i].event != 'finish' || TimeArray[i-1].event != 'start') {
//            myConsole.log(chalk.red("PANIC"));
//            
//            return;
//        }
//        
//        
//        deltaSum += TimeArray[i].time-TimeArray[i-1].time;
//        deltaTimes.push(TimeArray[i].time-TimeArray[i-1].time);
//    }
//    
//    myConsole.log(deltaTimes);
//    myConsole.log(deltaSum/3);
//    var statResult = {'RequestPrivilegeMessages': onRequestPrivilegeCounter, 'SendPrivilegeMessages': onSendPrivilegeCounter , 'AverageSynchTime' : deltaSum/sites.length };
//    
//    browserClient.emit('UpdateStatistics', JSON.stringify(statResult) );  
//
//}

io.on('connection', OnConnection);

http.listen(5000, function(){
  myConsole.log('listening on *:5000');
});
