Template.listRows.rows = function() {
  return [1,2,3];
};

Template.gameslist.gameslist = function() {
  var g = Games.findOne({},{gid:1})
  return g && g.gid;
};

var player = function() {
  return Players.findOne(Session.get('player_id'));
};

var row = 0;
Template.listCells.cells = function(){
  // render cells when player has game id
  var me = player();
  console.log('gid cells '+ (me && me.gid))
  return me && me.gid && Cells.find({gid: me.gid,row: row++});
};

Template.cell.events({
  'click .movement.available' : function(e){
    cell = $(e.target);
    cell.removeClass("available");
    turn = Turns.findOne();
    console.log(turn)
    console.log('this is gameId '+this.gid)
    Cells.update(this._id, {gid:this.gid, row: this.row, column: this.column, move: turn.turn });
    changeTurn(turn);
    winner = findWinner();
    gameHasWinner(winner);
  }
});

Template.gameslist.events({
  'click .pllist' : function(e){
    cell = $(e.target);
    gid=cell.html().trim()
    
    // curId= Session.get('currentGameId')
    var pl = player()
    console.log()
    Meteor.call('start_new_game',pl._id, pl.gid, gid);
  }
});


Template.lobby.events({
  'click #startnew' : function(e){
    cell = $(e.target);
    console.log('Start new Selected')
    // create new game id
    // and draw new board according new game id
    var gameId= Random.id();

    curId= Session.get('currentGameId')
    var pl = Session.get('player_id')
    console.log('events ' + pl)
    Meteor.call('start_new_game',pl,curId, gameId);
    Session.set('currentGameId',gameId)
    $('#gotolobby').show();
    $('div#btns').hide();
    $('.pllist').hide();
    
    
  },
  'click #joingame' : function(e){
    cell = $(e.target);
    console.log('Join Existing Selected')
    // show list of games present
    // on selected id, load up the board
    $('div#btns').hide();
    $('.pllist').show();
    $('#gotolobby').show();
  },
  'click #gotolobby' : function(e){
    cell = $(e.target);
    console.log('Go to lobby')
      $('div#btns').show();
      $('#gotolobby').hide();
      $('.pllist').hide();
    // show list of games present
    // on selected id, load up the board
  
  }
});

var changeTurn = function(turn){
  if (turn.turn == "x") {
    Turns.update(turn._id, { turn: 'o' } );
  } else {
    Turns.update(turn._id, { turn: 'x' } );
  }
};

var winCombinations = [
  [ [0,0], [0,1], [0,2] ],
  [ [1,0], [1,1], [1,2] ],
  [ [2,0], [2,1], [2,2] ],
  [ [0,0], [1,0], [2,0] ],
  [ [0,1], [1,1], [2,1] ],
  [ [0,2], [1,2], [2,2] ],
  [ [0,0], [1,1], [2,2] ],
  [ [0,2], [1,1], [2,0] ]
];


var findWinner = function() {
  var winner = [];

  $.each(winCombinations, function(index, combination){
    cell1 = Cells.findOne({ row: combination[0][0], column: combination[0][1] })
    cell2 = Cells.findOne({ row: combination[1][0], column: combination[1][1] })
    cell3 = Cells.findOne({ row: combination[2][0], column: combination[2][1] })

    if (!!cell1.move &&
          !!cell2.move &&
          !!cell3.move &&
          (cell1.move === cell2.move) &&
          (cell2.move === cell3.move) &&
          (cell3.move === cell1.move)) {
      winner = [cell1, cell2, cell3];
    }
  });

  return winner;
};


var gameHasWinner = function(winner){
  if (winner.length > 0) {
    $(".available").removeClass("available");
    $.each(winner, function(index, cell){
      Cells.update(cell._id, { gid:cell.gid, row: cell.row, column: cell.column, move: cell.move, winner: true })
    });
  };
}





// ----- lobby part -----
var player = function () {
  return Players.findOne(Session.get('player_id'));
};

var game = function () {
  var me = player();
  return me && me.game_id && Games.findOne(me.game_id);
};



Template.lobby.show = function () {
  // only show lobby if we're not in a game
  return !game();
};

Template.lobby.waiting = function () {
  var players = Players.find({_id: {$ne: Session.get('player_id')},
                              waiting: true,
                              game_id: {$exists: false}});

  return players;
};

Template.lobby.count = function () {
  var players = Players.find({_id: {$ne: Session.get('player_id')},
                              name: {$ne: ''},
                              game_id: {$exists: false}});

  return players.count();
};



Template.lobby.disabled = function () {
  var me = player();
  if (me && me.name)
    return '';
  return 'disabled="disabled"';
};



Template.lobby.events({
  'keyup input#myname': function (evt) {
    var name = $('#lobby input#myname').val().trim();
    Players.update(Session.get('player_id'), {$set: {name: name, waiting:true}});
  },
  'click button.startgame': function () {
    Meteor.call('start_new_game');
  }
});



//////
////// Initialization
//////

Meteor.startup(function () {
  // Allocate a new player id.
  //
  // XXX this does not handle hot reload. In the reload case,
  // Session.get('player_id') will return a real id. We should check for
  // a pre-existing player, and if it exists, make sure the server still
  // knows about us.
  var player_id = Players.insert({name: '', idle: false});
  Session.set('player_id', player_id);
  console.log(Session.get('player_id'))

  // subscribe to all the players, the game i'm in, and all
  // the words in that game.
  Deps.autorun(function () {
    Meteor.subscribe('players');

    if (Session.get('player_id')) {
      var me = player();
      if (me && me.game_id) {
        Meteor.subscribe('games', me.game_id);
        Meteor.subscribe('words', me.game_id, Session.get('player_id'));
      }
    }
  });

  // send keepalives so the server can tell when we go away.
  //
  // XXX this is not a great idiom. meteor server does not yet have a
  // way to expose connection status to user code. Once it does, this
  // code can go away.
  Meteor.setInterval(function() {
    if (Meteor.status().connected)
      Meteor.call('keepalive', Session.get('player_id'));
  }, 20*1000);
});





