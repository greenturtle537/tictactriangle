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

	renderBackground();

	var playerX = 0;
	var playerY = 0;

	running = true;

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
					case 'w' || 'a' || 's' || 'd':
						// Handle cursor movement
						if (key === 'w') {
							moveMarker(playerX, playerY, playerX, playerY--, gameboard);
							playerY--;
						} else if (key === 'a') {
							moveMarker(playerX, playerY, playerX--, playerY, gameboard);
							playerX--;
						} else if (key === 's') {
							moveMarker(playerX, playerY, playerX, playerY++, gameboard);
							playerY++;
						} else if (key === 'd') {
							moveMarker(playerX, playerY, playerX++, playerY, gameboard);
							playerX++;
						}
						break;
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

function moveMarker(x, y, newx, newy, gameboard) {
	curChar = getCharAtPos(x, y, gameboard);
	newChar = getCharAtPos(newx, newy, gameboard);
	c = console.ansi(ANSI_NORMAL);
	curPos = virtualToScreenPos(x, y);
	console.gotoxy(curPos.x, curPos.y);
	console.print(c + ((curChar === "0") ? " " : curChar));
	c = console.ansi(BG_RED);
	newPos = virtualToScreenPos(newx, newy);
	console.gotoxy(newPos.x, newPos.y);
	console.print(c + ((newChar === "0") ? " " : newChar));
}

function findCurrentSubboard(currentBoard) {
	// The current subboard is the last item on the gameboard array
	var currentSubboard = currentBoard[currentBoard.length - 1];
	return currentSubboard;
}

function virtualToScreenPos(virtualX, virtualY) {
	// Translate virtual board position to physical screen position
	// Board dimensions: 3x3 per subboard
	var centerX = Math.floor(screenWidth / 2);
	var centerY = Math.floor(screenHeight / 2);
	
	return {
		x: centerX + parseInt(virtualX),
		y: centerY + parseInt(virtualY)
	};
}

function getCharAtPos(virtualX, virtualY, currentBoard) {
	// Get the character at a virtual position by checking all subboards
	// Iterate from highest to lowest index (top to bottom of stack)
	for (var i = currentBoard.length - 1; i >= 0; i--) {
		var board = currentBoard[i];
		var boardX = parseInt(board.x);
		var boardY = parseInt(board.y);
		
		// Check if the virtual position falls within this board's 3x3 region
		var relativeX = virtualX - boardX;
		var relativeY = virtualY - boardY;
		
		// If position is within this board's bounds
		if (relativeX >= 0 && relativeX < 3 && relativeY >= 0 && relativeY < 3) {
			return board.sub[relativeY][relativeX];
		}
	}
	
	// Position not found in any board. This means it is currently unused.
	return 0;
}

function renderBoard(currentBoard) {
	// Render the current board to the console
	// Print from lowest index to highest
	for (var i = 0; i < currentBoard.length; i++) {
		var board = currentBoard[i];
		
		// Translate board coordinates to screen position
		var screenPos = virtualToScreenPos(board.x, board.y);
		
		// Render the 3x3 subboard
		for (var row = 0; row < 3; row++) {
			for (var col = 0; col < 3; col++) {
				// Position cursor at the appropriate location
				console.gotoxy(screenPos.x + col, screenPos.y + row);
				c = console.ansi(ANSI_NORMAL);
				// Print the cell value
				if (board.sub[row][col] === "0") {
					console.print(c + " ");
				} else {
					console.print(c + board.sub[row][col]);
				}
			}
		}
	}
}

function renderBackground() {
	console.clear();
	backgroundTile = "\xb2";
	color = console.ansi(BLACK|BG_LIGHTGRAY); // Enums
	console.print(color);
	for (var y = 0; y < screenHeight; y++) {
		for (var x = 0; x < screenWidth; x++) {
			console.gotoxy(x, y);
			console.print(backgroundTile);
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
			if (options === null) {
				alert("Error saving exception-message to: mail");
			} else {
				alert("Error saving exception-message to: " + options);
			}
		}
		msgbase.close();
	}
}