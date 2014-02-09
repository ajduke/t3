
Meteor.methods({
  start_new_game: function (pl,currentId,newGameId) {
    
    resetCells(currentId,newGameId);
    resetTurn(currentId,newGameId);
    Players.update({_id : pl},{$set:{gid:newGameId}})
  }
});



var resetCells = function(currentId,newGameId){
  console.log('resetCells currentId '+currentId)
  console.log('resetCells newGameId '+newGameId)
  Cells.remove({gid:currentId});
  startCells(newGameId);
};

var resetTurn = function(currentId,newGameId){
  console.log('resetTurn currentId '+currentId)
  console.log('resetTurn newGameId '+newGameId)
  Turns.remove({gid:currentId});
  Turns.upsert({gid:newGameId,turn: 'x'},{gid:newGameId,turn: 'x'});
}


var startCells = function(gameId){
  console.log('startup cell gameId: '+gameId)
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
      Cells.upsert({gid:gameId, row: i, column: j},{gid:gameId, row: i, column: j, move: '' })
    }
  }
};




Meteor.setInterval(function () {
  var now = (new Date()).getTime();
  var idle_threshold = now - 70*1000; // 70 sec
  var remove_threshold = now - 60*60*1000; // 1hr

  Players.update({last_keepalive: {$lt: idle_threshold}},
                 {$set: {idle: true}});


}, 30*1000);

// generate a new random selection of letters.
new_board = function () {
  var board = [];
  var i;

  // pick random letter from each die
  for (i = 0; i < 16; i += 1) {
    board[i] = Random.choice(DICE[i]);
  }

  // knuth shuffle
  for (i = 15; i > 0; i -= 1) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = board[i];
    board[i] = board[j];
    board[j] = tmp;
  }

  return board;
};