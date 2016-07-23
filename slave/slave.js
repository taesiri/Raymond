var prompt = require('prompt');
var io = require('socket.io-client');
var socketURL = 'http://0.0.0.0:5001';

var chalk = require('chalk');

var options = {
  transports: ['websocket'],
  'force new connection': true,
  reconnect: true
};

var token_data = [];
var jobQ = [];
var slaveId;
var totalSites;
var numberOfResources=1;
var IsIdle = true;
var Checking = false;

var process_requesting =false;
var process_privreseived = false;

OnConnect = function (data) {
    RegsiterOnCoordinator();
}

OnScheduleJob = function(jobs) {
    console.log("New Jobs: ", jobs);
    
    for(var i=0; i< jobs.length; i++){
        jobQ.push(jobs[i]);
    }
    
    if(IsIdle == true) {
       
       Checking = true;
       if(have_all_tokens()){
           console.log("have all tokens");
           RunJob();
       } else {
           Checking = false;
           RequestResources();   
       }
    }
    
}

OnPrivilegeReceievd = function(privMessage) {
    process_privreseived = true;
    console.log("OnPrivilegeReceievd ", privMessage)
    
    if(process_requesting) 
        console.log("OnPrivilegeReceievd/OnRequestReceievd Conflict!");

    
    var token_id = privMessage.token_id;
    token_data[token_id].holder = slaveId;
    
    //console.log(token_data[token_id]);
    
    token_data[token_id].asked  = false;
    
     if (token_data[token_id].request_queue[0] == slaveId) {
            
            // I'm at top of Q
            //token_data[token_id].holder = slaveId;
            
            Checking = true;
            if(have_all_tokens()){
                token_data[token_id].request_queue.shift();
                RunJob();
            }else {
                Checking = false;   
            }
            
            
        } else {
            ForwardPrivilege(token_id);
        }
    
        
    process_privreseived = false;
}

OnRequestReceievd = function(requestMessage) {
    process_requesting=true;
    console.log("OnRequestReceievd ", requestMessage);
    
    if(process_privreseived) 
        console.log("OnRequestReceievd/OnPrivilegeReceievd Conflict!");
    
    var token_id = requestMessage.token_id;
    
    
    if( token_data[token_id].request_queue.indexOf(requestMessage.requester)!=-1){
        console.log("---->>>>>> Something bad happened! 2");
   
        return;
    }

    token_data[token_id].request_queue.push(requestMessage.requester); 

    if ( token_data[token_id].holder == slaveId ) { 
        
        if(Checking) {
            
            console.log("---->>>>>> Something bad happened!");
        }
        else {
            if(IsIdle && token_data[token_id].request_queue.length == 1) {
                console.log("STRANGE FORWARD!");
                ForwardPrivilege(token_id);
            }
        }
        
    } else {
        RequestPrivilege(token_id);
    }
    process_requesting=false;
}


function RequestResources() {
    console.log("Requesting Resources");
    for(var r in  jobQ[0].resources ) {

       if(token_data[jobQ[0].resources[r]].request_queue.indexOf(slaveId)<0) {
           token_data[jobQ[0].resources[r]].request_queue.push(slaveId);
       }

       RequestPrivilege(jobQ[0].resources[r]);
   }
}

function RequestPrivilege(token_id) {
    console.log("Requesting Privilege", token_id);

    if(token_data[token_id].asked) {
        //Do not Send another request    
        return;
    }
    
    token_data[token_id].asked  = true;
    
    request_message = {
        holder: token_data[token_id].holder,
        token_id: token_id,
        requester: slaveId
    };
    slave.emit("RequestPrivilege", request_message);
}

function ForwardPrivilege(token_id) {

    if(token_data[token_id].holder!=slaveId){
        return;
    }
    
    console.log("trying to Forward the Privilege", token_id);
    
    if(token_data[token_id].request_queue.length==0) {
       console.log("request queue of token# ", token_id, " is empty!");
       return;
    }
        
    target_id = token_data[token_id].request_queue.shift();
    st_message = {
        target: target_id,
        token_id: token_id,
        sender: slaveId
    };
    
    if(target_id==slaveId)
        console.log("PANIC, target_id==slaveId");
    
    console.log("Forwarding Privilege ", token_id, " to ", target_id);

    slave.emit("SendPrivilege", st_message);
    
    //Update variables
    token_data[token_id].asked = false;
    token_data[token_id].holder = target_id;
    
    if(token_data[token_id].request_queue.length>0){
        console.log("reRequesting token");
        RequestPrivilege(token_id);
    }
    
}

function RunJob() {
    
    if(jobQ.length <= 0){
        return;
    }
    
    IsIdle = false;
    Checking = false;
    
    var currentJob = jobQ.shift();
    
    var jobtime = currentJob.time;
    var resources = currentJob.resources;
    var startTime = (new Date()).getTime();
    
    
    console.log("Executing Job#: " , currentJob.id);
    
    setTimeout(function(){
        
        console.log("Job#: " ,  currentJob.id , "Finished!");
        
        slave.emit('JobFinished', {'id' : slaveId, 'job' : currentJob.id ,'resources' : currentJob.resources ,'startTime': startTime, 'finishTime' : (new Date()).getTime()});
    

        console.log("Forward Token to other requesting sites");

        for(var r =0; r<numberOfResources; r++){
            ForwardPrivilege(r);
        }
        
        IsIdle= true;
        
        if(jobQ.length>0){
            console.log("check if we can run another job");
            Checking = true;
            if(have_all_tokens()){
                RunJob();
            } else {
                Checking = false;
                RequestResources();
            } 
        }
    }, jobtime); 
}


function have_all_tokens() {
    
    if(jobQ.length>0){
        
        console.log(token_data);
        
        var wanted = jobQ[0].resources;
        console.log("want this tokens:");
        console.log(wanted);

        for(var r in wanted) {
            console.log("checking token# ", wanted[r], "holder", token_data[wanted[r]].holder)
             if(token_data[wanted[r]].holder ==  slaveId ) {
                 
                  if(token_data[wanted[r]].request_queue.length == 0) {
                     // good to go!
                  } else {
                      if(token_data[wanted[r]].request_queue[0] == slaveId  ){
                        // good to go!
                      } else {
                          console.log("we  have token# ", wanted[r] , " but we cant use it"); 
                          return false;
                      }  
                  }
             } else {
                 console.log("we dont have token# ", wanted[r]);
                 return false;
             }
        }
        return true;
    }
    return false;
}

OnDebugPrint = function() {
    console.log(token_data);
}


OnStateRequested = function() {
    slave.emit('State', {'id' : slaveId, "tokenData": token_data, "resources" : numberOfResources});
}

function initializeSlave(id, n, r, h) {
    
    slaveId = id;
    slave = io.connect(socketURL, options);
    numberOfResources = r;
    
    slave.on('connect', OnConnect);
    slave.on('ScheduleJob', OnScheduleJob);
    slave.on('PrivilegeReceievd', OnPrivilegeReceievd);
    slave.on('RequestReceievd', OnRequestReceievd);
    slave.on('DebugPrint', OnDebugPrint);
    slave.on('GetState', OnStateRequested);

    for(var r = 0; r < numberOfResources; r++){
         token_data.push( {
            holder : h,
            request_queue : [],
            asked : false
         });
    }
    
    totalSites = n;
   
    console.log(token_data);
}


function RegsiterOnCoordinator() {
    slave.emit('RegisterSite', slaveId);
}


if(process.argv.length != 4 + 1 + 2) {
    console.log(process.argv.length );
    console.log(chalk.red("ERROR, check your input"));
    console.log(chalk.red("Correct input: coordinatorAddress, id, n, r, holder"));
} else {
    socketURL = process.argv[2];
    initializeSlave(process.argv[3], process.argv[4], process.argv[5], process.argv[6]); 
}

//
//prompt.start();
//
//prompt.get(['id', 'n', 'r', 'h'], function (err, result) {
//    if (err) { return onErr(err); }    
//    initializeSlave(result.id, result.n, result.r, result.h);  
//});
//
//function onErr(err) {
//    console.log(err);
//    return 1;
//}
