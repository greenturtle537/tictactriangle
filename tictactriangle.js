// Consts
const title = "TicTacTriangle";
const author = "greenturtle537";
const REVISION = "$Revision: 0.1 $".split(' ')[1];
const tear_line = "\r\n--- " + js.exec_file + " " + REVISION + "\r\n";
const ini_section = "tictactriangle"; // ini file section
const tictactriangle_title = js.exec_dir + "tictactriangle.ans";
const tictactriangle_title_xbin = js.exec_dir + "tictactriangle.xbin";

var debug = false; //Debug flag

var options = load({}, "modopts.js", ini_section);

// TicTacTriangle options

var screenWidth = 80;
var screenHeight = 24;

// TicTacTriangle global variables
var MessageWindow = load({}, "MessageWindow.js");
var NodeTalk = load({}, "NodeTalk.js");


load("utils.js");

var nodeTalk = new NodeTalk();

var Graphic = load({}, "graphic.js");
var sauce_lib = load({}, "sauce_lib.js");

require("sbbsdefs.js", "K_NONE");
require("mouse_getkey.js", "mouse_getkey");

function show_image(filename, fx, delay) {
	var dir = directory(filename);
	filename = dir[random(dir.length)];

	if (delay === undefined) {
	    delay = 0;
    }

	var graphic = new Graphic();
	graphic.load(filename);
	if (fx && graphic.revision >= 1.82)
		graphic.drawfx('center', 'center');
	else
		graphic.draw('center', 'center');
	sleep(delay);
}

function logo() {
	console.clear();
	show_image(tictactriangle_title, false, 0);
	console.pause();
	console.clear();
}

function gameLoop() {
    // Main game loop
    /*

    Gameboard objects:
    0 = unused space
    x = player 1
    o = player 2
	t = triangle space

	Subboard: 
	A subboard is a 3x3 region of the board that is played before moving to the next.
	Subboards can border the main gameboard in any orientation.
    */
    gameboard = [{
		sub: [
			["0", "0", "0"],
			["0", "0", "0"],
			["0", "0", "0"]
		],
		x: "0",
		y: "0"
	}];

	while (running) {

		// Get input
		var mk = mouse_getkey(K_NONE, 100, true);
		var key = mk.key;

		renderBoard(gameboard);

		if (mk) {	
			if (typeof mk === 'object' && mk.mouse) {
				// Handle mouse input
				if (mk.mouse.action === 1) { // Left click
					// Placeholder
				}
			} else {
				switch (key) {
					case 'q':
						running = false;
						break;
					// Additional key handling here
				}
			}
		}
	}
	pause();
}

function validateMove(currentBoard, playerMove) {
	subBoard = findCurrentSubboard(currentBoard);
	// Validate the move within the context of the current subboard
	if (subBoard.sub[playerMove.row][playerMove.col] !== "0") {
		// Invalid move because space is occupied.
		return false;
	}
	return true;
}

function findCurrentSubboard(currentBoard) {
	// The current subboard is the last item on the gameboard array
	var currentSubboard = currentBoard[currentBoard.length - 1];
	return currentSubboard;
}

function renderBoard(currentBoard) {
	// Render the current board to the console
	// Print from lowest index to highest
	for (var i = 0; i < currentBoard.length; i++) {
		var board = currentBoard[i];
		
		// Translate board coordinates to center of console
		var centerX = Math.floor(screenWidth / 2);
		var centerY = Math.floor(screenHeight / 2);
		
		// Calculate starting position for this board
		var startX = centerX + parseInt(board.x);
		var startY = centerY + parseInt(board.y);
		
		// Render the 3x3 subboard
		for (var row = 0; row < 3; row++) {
			for (var col = 0; col < 3; col++) {
				// Position cursor at the appropriate location
				console.gotoxy(startX + col, startY + row);
				// Print the cell value
				console.print(board.sub[row][col]);
			}
		}
	}
}

try {
	console.print("Press any key to play TicTacTriangle...");
	console.pause();
	logo();
    console.pause();
	gameLoop();
	exit(0);
} catch (e) {
	var msg = file_getname(e.fileName) +
		" line " + e.lineNumber +
		": " + e.message;
	if (js.global.console) {
		console.crlf();
	}
	alert(msg);
	if (user.alias != author) {
		var msgbase = new MsgBase('mail');
		var hdr = {
			to: author,
			from: user.alias || system.operator,
			subject: title
		};
		msg += tear_line;
		if (!msgbase.save_msg(hdr, msg)) {
			if (options.sub === null) {
				alert("Error saving exception-message to: mail");
			} else {
				alert("Error saving exception-message to: " + options.sub);
			}
		}
		msgbase.close();
	}
}