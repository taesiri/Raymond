
for (var i = 1; i<50; i++) {
  var nodeId = Math.round(getRandom(1,3));
  var jobTime = Math.round(getRandom(1,100)) * 10;
  var resources = 0; // Math.round(getRandom(0,4));

  console.log(i + ":" + nodeId + ":" + jobTime + ":" + resources );
}

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

