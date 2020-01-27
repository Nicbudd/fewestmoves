/*
 * twisty_demo.js
 * 
 * Demonstration and testing harness for WSOH.
 * 
 * TOOD
 * - Fix document.getElementById(...) calls.
        // TODO I can imagine that some users of twisty.js would want to be able to have a Heise-style
        // inspection, where you are only allowed to do inspection moves during inspection, rather than
        // just starting the timer when they do a turn. This will require somehow being able to cancel/prevent a move?
        // TODO clicking on canvas doesn't seem to focus window in firefox
        // TODO clicking and dragging is weird when the mouse leaves the window
        // TODO keydown doesn't repeat on firefox
 * 
 */

"use strict";

var cache = window.applicationCache;
function updateReadyCache() {
  window.applicationCache.swapCache();
  location.reload(true); // For now
}

var startTime = null;
var stopTime = null;
function startTimer() {
  startTime = new Date().getTime();
  stopTime = null;
  refreshTimer();
  startRefreshTimerLoop();
}
function isTiming() {
  return startTime != null && stopTime == null;
}
function stopTimer() {
  assert(startTime);
  stopTime = new Date().getTime();
  refreshTimer();
  stopRefreshTimerLoop();
}

function resetTimer() {
  startTime = null;
  stopTime = null;
  refreshTimer();
  stopRefreshTimerLoop();
}

function refreshTimer() {
  var timer = $("#timer");
  timer.removeClass("reset running stopped");
  if(isTiming()) {
    timer.addClass("running");
    timer.text(prettyTime(new Date().getTime()));
  } else if(startTime == null) {
    assert(stopTime == null);
    timer.addClass("reset");
    timer.text("[Timer]");
  } else if(stopTime != null) {
    assert(startTime);
    timer.addClass("stopped");
    timer.text(prettyTime(stopTime));
  }
}

var pendingTimerRefresh = null;
function startRefreshTimerLoop() {
  if(pendingTimerRefresh == null) {
    pendingTimerRefresh = requestAnimFrame(refreshTimerLoop, $('#timer')[0]);
  }
}
function stopRefreshTimerLoop() {
  if(pendingTimerRefresh != null) {
    cancelRequestAnimFrame(pendingTimerRefresh);
    pendingTimerRefresh = null;
  }
}
function refreshTimerLoop() {
  refreshTimer();
  if(pendingTimerRefresh != null) {
    pendingTimerRefresh = requestAnimFrame(refreshTimerLoop, $('#timer')[0]);
  }
}

function pad(n, minLength) {
  var str = '' + n;
  while (str.length < minLength) {
    str = '0' + str;
  }
  return str;
}

function prettyTime(endTime) {
  var cumulative = endTime - startTime;
  var str = "";
  str += Math.floor(cumulative/1000/60);
  str += ":";
  str += pad(Math.floor(cumulative/1000 % 60), 2);
  str += ".";
  str += pad(Math.floor((cumulative % 1000) / 10), 2);
  return str;
}


var CubeState = {
  solved: 0,
  scrambling: 1,
  scrambled: 2,
  solving: 3,
};
var cubeState = null;

var twistyScene;

$(document).ready(function() {

  log("Document ready.");

  var currentCubeSize = 3;
  
  reloadCube(); 

  $("#hint_stickers").bind("change", reloadCube);
  $('input[name="stage"]').bind("change", reloadCube);
  $('input[name="renderer"]').click(reloadCube);
  
	/*$("#change").click(function(){
		twistyScene.clearMoveList();
		twistyScene.setIndex(-1);
	});	
	*/

  $("#play").click(twistyScene.play.start);
  $("#previous").click(twistyScene.play.back);
  $("#pause").click(twistyScene.play.pause);
  $("#rewind").click(twistyScene.play.reset);
  $("#next").click(twistyScene.play.forward);
  $("#fast_forward").click(twistyScene.play.skip);
  $("#speed").bind("change", function() {
    var speed = $('#speed')[0].valueAsNumber
    twistyScene.setSpeed(speed);
  });

	function invert(inputArray){
		
		//invert modifiers for each notation
		for (var i = 0; i < inputArray.length; i++){
			inputArray[i] = inputArray[i].split("")
			if (inputArray[i][0] == "("){
				inputArray[i][0] = ")"
			} else if (inputArray[i][0] == ")"){
				inputArray[i][0] = "("
			} else {
				if (inputArray[i][1] == "'"){
					delete inputArray[i][1]
				} else if (inputArray[i][1] === undefined){
					inputArray[i][1] = "'"
				}
			}
			inputArray[i] = inputArray[i].join("")
		}
		
		//reverse
		inputArray.reverse()
		
		return inputArray
	}
	
	function textMovesToArray(inputText){
		
		var inputArray = inputText.split("");
		
		//remove comments
		while (inputArray.indexOf("/") != -1){
			
			var lineBreak = inputArray.indexOf("\n")
			if (lineBreak == -1){
				lineBreak = inputArray.length
			}

			inputArray.splice(inputArray.indexOf("/"), lineBreak - inputArray.indexOf("/") + 1)
		}


		//combine move modifiers with moves and remove spaces
		for (var i = 0; i < inputArray.length; i++){
			switch (inputArray[i]){
				case "'":
				case "2":
					inputArray[i-1] += inputArray[i];
					inputArray.splice(i, 1)
					i--
					break;
					
				case " ":
					inputArray.splice(i, 1)
					i--
					break;
			}
		}
		
		
		
		return inputArray
	}

	function fmcParse(){
		var scrambUnparsed = $("#scrambInput").val();
		var moveUnparsed = $("#moveInput").val();
		
		var moveArray = textMovesToArray(moveUnparsed);
		console.log(moveArray)
		
		var skeleton = genSkeleton(moveArray).join(" ");
		$("#skeleton").val(skeleton);
		
		invert(moveArray);
		
	}
	
	function genSkeleton(inputArray){
		
		console.log(inputArray)
		
		var inverse = []
	
		while (inputArray.indexOf("(") != -1){
			
			var lineBreak = inputArray.indexOf(")")
			if (lineBreak == -1){
				lineBreak = inputArray.length
			}
			
			var newInvert = inputArray.splice(inputArray.indexOf("(") + 1, lineBreak - inputArray.indexOf("(") - 1)
			inverse = inverse.concat(newInvert)
			inputArray.splice(inputArray.indexOf("("), 2)
		}
		
		inputArray = inputArray.concat(invert(inverse));
		
		
		for (var i = 0; i < inputArray.length; i++){
			if (inputArray[i] == "\n"){
				inputArray.splice(i, 1)
				i--
			}
		}
		
		return inputArray;
		
	}
	
	function redoCube(){
		twistyScene.clearMoveList();
		
		var init = alg.cube.stringToAlg($("#scrambInput").val());
		var algo = alg.cube.stringToAlg($("#moveInput").val());
		var type = "gen"
		//var type = $("#solve").is(':checked') ? "solve" : "gen";
		
		init = alg.cube.algToMoves(init);
		algo = alg.cube.algToMoves(algo);
		
		twistyScene.setupAnimation(
			algo,
			{
				init: init,
				type: type
			}
		);
		
		setTimeout(function(){
			twistyScene.play.reset();
			twistyScene.play.skip();
		}, 300);
		
	}
	
	
	$("#moveInput").bind("keyup keydown change", function(){	
	
		redoCube();
		fmcParse();

		
	});
	
	$("#invertSelection").click(function(){
		var selection = window.getSelection();
		var selectionString = selection.toString();
		var selectionStart = $("#moveInput")[0].selectionStart;
		var selectionEnd = $("#moveInput")[0].selectionEnd;
		
		var selectionArray = textMovesToArray(selectionString);
		var invertedArray = invert(selectionArray);
		var invertedText = invertedArray.join(" ");

		
		var textareaArray = $("#moveInput").val().split("")
		

		textareaArray.splice(selectionStart, selectionEnd - selectionStart);

		
		textareaArray.splice(selectionStart, 0, invertedText);
		$("#moveInput").val(textareaArray.join(""))
		
		twistyScene.play.reset();
		twistyScene.play.skip();
		
		redoCube();
		
	});
		


  /*$("#parsed_alg1").bind("click", function() {
    var algo = alg.cube.stringToAlg($("#parse_alg").val());
    var moves = alg.cube.algToMoves(algo);
    twistyScene.queueMoves(moves);
    twistyScene.play.start();
  });

  $("#parsed_alg2").bind("click", function() {
    var init = alg.cube.stringToAlg($("#init").val());
    var algo = alg.cube.stringToAlg($("#parse_alg").val());
    var type = $("#solve").is(':checked') ? "solve" : "gen";

    init = alg.cube.algToMoves(init);
    algo = alg.cube.algToMoves(algo);

    twistyScene.setupAnimation(
      algo,
      {
        init: init,
        type: type
      }
    );

    var moveList = twistyScene.getMoveList();f
    var pl = $("#playback_alg");
    pl.empty();

    function f(str, i) {
      var el = $("<span>", {text: str});
      var f = (function(idx) {twistyScene.setIndex(idx);}).bind(this, i);
      el.click(f);
      pl.append(el);
    }

    f("Click:", -1);
    for (var i = 0; i < moveList.length; i += 1) {
      var moveString = alg.cube.algToString([moveList[i]]);
      f(moveString, i);
    }
  });
  */

  twistyScene.setCameraPosition(0);


  // From alg.garron.us
  function escapeAlg(algstr){return algstr.replace(/\n/g, '%0A').replace(/-/g, '%2D').replace(/\'/g, '-').replace(/ /g, '_');}

  function reloadCube() {
    log("Reloading Cube");

    var renderer = THREE[$('input[name="renderer"]:checked').val() + "Renderer"]; //TODO: Unsafe
    var stage = $('input[name="stage"]:checked').val();
	var statsOption = $('input[name="stats"]:checked').val();
    var speed = $('#speed')[0].valueAsNumber;

    twistyScene = new twisty.scene({
      renderer: renderer,
      allowDragging: true,
      "speed": speed,
      stats: true
    });
    $("#twistyContainer").empty();
    $("#twistyContainer").append($(twistyScene.getDomElement()));


    twistyScene.initializePuzzle({
      "type": "cube",
      "dimension": 3,
      "stage": stage,
      "doubleSided": true,
      "cubies": true,
      "hintStickers": $("#hint_stickers").is(':checked'),
      "stickerBorder": false
    });
    $("#cubeDimension").blur(); 
    twistyScene.resize();
    cubeState = CubeState.solved;
    resetTimer();

    twistyScene.addListener("moveStart", function(move) {
      if(cubeState == CubeState.scrambling) {
        // We don't want to start the timer if we're scrambling the cube.
      } else if(cubeState == CubeState.scrambled) {
        if(twistyScene.debug.model.twisty.isInspectionLegalMove(move)) {
          return;
        }
        startTimer();
        cubeState = CubeState.solving;
      }
    });

    twistyScene.addListener("moveAdvance", function(move) {
      if(cubeState == CubeState.solving && twistyScene.debug.model.twisty.isSolved()) {
        cubeState = CubeState.solved;
        stopTimer();
      }
    });
	
	var statsBox = $("#twistyContainer").children().first().children().last()
	statsBox.hide();
	
	$("#stats").bind("change", function(){
	  statsBox.toggle();
	});
  }

  $(window).resize(twistyScene.resize);

  // TODO add visual indicator of cube focus --jfly
  // clear up canvasFocused stuff...
  //$("#twistyContainer").addClass("canvasFocused");
  //$("#twistyContainer").removeClass("canvasFocused");

});



/*
 * Convenience Logging
 */

var logCounter = 0;

function log(obj) {
  if(typeof(console) !== "undefined" && console.log) {
    //console.log(obj);
  }
  var previousHTML = $("#debug").html();
  previousHTML = (logCounter++) + ". " + obj + "<hr/>" + previousHTML;
  $("#debug").html(previousHTML);
}

function err(obj) {
  if(typeof(console) !== "undefined" && console.error) {
    console.error(obj);
  }
  var previousHTML = $("#debug").html();
  previousHTML = "<div class='err'>" + (logCounter++) + ". " + obj + "</div><hr/>" + previousHTML;
  $("#debug").html(previousHTML);
}

