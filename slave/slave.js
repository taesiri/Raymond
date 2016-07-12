var prompt = require('prompt');
var io = require('socket.io-client');
var socketURL = 'http://0.0.0.0:5000';

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

OnConnect = function (data) {
    RegsiterOnCoordinator();
}

OnScheduleJob = function(job) {
    console.log("New JOB: ", job);

    jobQ.push(job);
    
    if(IsIdle == true) {
        
       if(have_all_tokens()){
           console.log("have all tokens");
           RunJob();
       } else {
           RequestResources();   
       }
    }
    
}

OnPrivilegeReceievd = function(privMessage) {
    var token_id = privMessage.token_id;
    
    if(token_data[token_id].request_queue.length == 0) {
        token_data[token_id].holder = slaveId;
    } else {
        if (token_data[token_id].request_queue[0] == slaveId) {
            
            // I'm at top of Q
            token_data[token_id].request_queue.shift();
            token_data[token_id].holder = slaveId;
            
            if(have_all_tokens()){
                RunJob();
            }
            
        } else {
            ForwardPrivilege();
        }
    }
}

OnRequestReceievd = function(requestMessage) {
    console.log("OnRequestReceievd ", requestMessage)
    var token_id = requestMessage.token_id;
    token_data[token_id].request_queue.push(requestMessage.requester); 

    if ( token_data[token_id].holder == slaveId ) { 
        if(IsIdle && token_data[token_id].request_queue.length == 1) {
             ForwardPrivilege(token_id);
        }
    } else {
        RequestPrivilege(token_id);
    }
    console.log(token_data);
}


function RequestResources() {
    console.log("RequestResources");
    for(var r in  jobQ[0].resources ) {

       if(token_data[jobQ[0].resources[r]].request_queue.indexOf(slaveId)<0) {
           token_data[jobQ[0].resources[r]].request_queue.push(slaveId);
       }

       RequestPrivilege(jobQ[0].resources[r]);
   }
}

function RequestPrivilege(token_id) {
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

    if(token_data[token_id].request_queue==0) 
        return;
    
    console.log("ForwardPrivilege " + token_id)

    target_id = token_data[token_id].request_queue.shift();
    st_message = {
        target: target_id,
        token_id: token_id,
        sender: slaveId
    };
    
    slave.emit("SendPrivilege", st_message);
    
    //Update variables
    token_data[token_id].asked = false;
    token_data[token_id].holder = target_id;
    
    if(token_data[token_id].request_queue>0){
        RequestPrivilege(token_id);
    } 
    console.log(token_data);
}

function RunJob() {
    if(jobQ.length <= 0){
        return;
    }
    
    var currentJob = jobQ.shift();
    IsIdle = false;
    var jobtime = currentJob.time;
    var resources = currentJob.resources;

    console.log("Executing CS: " + jobtime);
    
    setTimeout(function(){
        
        console.log("CS Finished!");
        
        console.log(token_data);
        
        IsIdle= true;
        
        console.log("Forward Token to other requesting sites");

        for(var r in resources){
            ForwardPrivilege(resources[r]);
        }
        
        if(jobQ.length>0){
            console.log("check if we can run another job");

            if(have_all_tokens()){
                RunJob();
            } else {
                RequestResources();
            } 
        }
    }, jobtime*1000); 
}


function have_all_tokens() {
    
    if(jobQ.length>0){
        
        console.log(token_data);
        
        var wanted = jobQ[0].resources;
        console.log("want this tokens:");
        console.log(wanted);

        for(var r in wanted) {
            console.log("checking token# ", wanted[r], "holder", token_data[r].holder)
             if(token_data[wanted[r]].holder ==  slaveId ) {
                 
                  if(token_data[wanted[r]].request_queue.length == 0) {
                     // good to go!
                  } else {
                      if(token_data[wanted[r]].request_queue[0] == slaveId  ){
                        // good to go!
                      } else {
                          console.log("we  have token# ", r , " but we cant use it"); 
                          return false;
                      }  
                  }
             } else {
                 console.log("we dont have token# ", r);
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

function initializeSlave(id, n, r, h) {
    
    slaveId = id;
    slave = io.connect(socketURL, options);
    numberOfResources = r;
    
    slave.on('connect', OnConnect);
    slave.on('ScheduleJob', OnScheduleJob);
    slave.on('PrivilegeReceievd', OnPrivilegeReceievd);
    slave.on('RequestReceievd', OnRequestReceievd);
    slave.on('DebugPrint', OnDebugPrint);
    
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


prompt.start();

prompt.get(['id', 'n', 'r', 'h'], function (err, result) {
    if (err) { return onErr(err); }    
    initializeSlave(result.id, result.n, result.r, result.h);  
});

function onErr(err) {
    console.log(err);
    return 1;
}
