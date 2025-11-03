// Consts
const title = "TicTacTriangle";
const author = "greenturtle537";
const REVISION = "$Revision: 0.1 $".split(' ')[1];
const tear_line = "\r\n--- " + js.exec_file + " " + REVISION + "\r\n";
const ini_section = "tictactriangle"; // ini file section
const tictactriangle_title = js.exec_dir + "tictactriangle.ans";
const tictactriangle_title_xbin = js.exec_dir + "tictactriangle.xbin";

var debug = true; //Debug flag

var options = load({}, "modopts.js", ini_section);

// TicTacTriangle options

var screenWidth = 80;
var screenHeight = 24;

BACKGROUND_TILE = "\xb0"; // Light shade block character

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
	turn = 0; // 0 = player 1, 1 = player 2

	renderBoard(gameboard);

	running = true;

	while (running) {

		// Get input
		var mk = mouse_getkey(K_NONE, 100, true);
		var key = mk.key;

		//renderBoard(gameboard);
		moveMarker(playerX, playerY, playerX, playerY, gameboard); // To ensure highlighting after render draw. TODO: Remove

		if (debug) {
			console.gotoxy(1, 1);
			console.print("PX: " + playerX + " PY: " + playerY + " Key: " + key + "   "+ "Sub OK: " + checkSubboardLocation(gameboard, playerX+1, playerY+1)+"   ");
		}

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
					case 'w':
						moveMarker(playerX, playerY, playerX, playerY - 1, gameboard);
						playerY--;
						break;
					case 'a':
						moveMarker(playerX, playerY, playerX - 1, playerY, gameboard);
						playerX--;
						break;
					case 's':
						moveMarker(playerX, playerY, playerX, playerY + 1, gameboard);
						playerY++;
						break;
					case 'd':
						moveMarker(playerX, playerY, playerX + 1, playerY, gameboard);
						playerX++;
						break;
					case 'e':
						if (validateMove(gameboard, {row: playerY, col: playerX})) {
							playMove(gameboard, {row: playerY, col: playerX}, 
								(turn === 0) ? "x" : "o"
							);
							turn = (turn === 0) ? 1 : 0; // Switch turns
							renderBoard(gameboard);
						}
					case 'r':
						// Highlight new subboard location
						if (checkSubboardLocation(gameboard, playerX+1, playerY+1)) {
							highlightSubboard(gameboard, playerX + 1, playerY + 1);
							//newSubboard(gameboard, playerX + 1, playerY + 1);
						}
						break;
						
					// End of switch-case
				}
			}
		}
	}
	console.pause();
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

function playMove(currentBoard, playerMove, playerChar) {
	subBoard = findCurrentSubboard(currentBoard);
	subBoard.sub[playerMove.row][playerMove.col] = playerChar;
}

function fullSubboard(subBoard) {
	// Check if all spaces in the subboard are occupied
	for (var row = 0; row < 3; row++) {
		for (var col = 0; col < 3; col++) {
			if (subBoard.sub[row][col] === "0") {
				return false; // Found an empty space
			}
		}
	}
	return true; // All spaces are occupied
}

function checkSubboardLocation(currentBoard, x, y) {
	/* Check if a subboard can be created at the specified coordinates.
	*  A subboard can be created if no existing subboard occupies that space
	   and it is adjacent to an existing subboard.
	*/
	// Check if subboard overlaps at (x, y)
	for (var i = 0; i < currentBoard.length; i++) {
		var board = currentBoard[i];
		if (board.x == x && board.y == y) {
			return false; // Overlaps existing subboard
		}
	}
	// Check adjacency to existing subboards
	for (var i = 0; i < currentBoard.length; i++) {
		var board = currentBoard[i];
		if (Math.abs(board.x - x) <= 3 && Math.abs(board.y - y) <= 3) {
			return true; // Adjacent to existing subboard
		}
	}
	return false; // Not adjacent to any existing subboard
}

function highlightSubboard(currentBoard, x, y) {
	// Highlight the subboard at the specified coordinates
	var screenPos = virtualToScreenPos(x, y);
	var c = console.ansi(BG_CYAN);
	for (var row = 0; row < 3; row++) {
		for (var col = 0; col < 3; col++) {
			console.gotoxy(screenPos.x + col, screenPos.y + row);
			console.print(c + " ");
		}
	}
}

function newSubboard(currentBoard, x, y) {
	// Create a new subboard at the specified coordinates
	var newBoard = {
		sub: [
			["0", "0", "0"],
			["0", "0", "0"],
			["0", "0", "0"]
		],
		x: x,
		y: y
	};
	currentBoard.push(newBoard);
}

function moveMarker(x, y, newx, newy, gameboard) {
	curChar = getCharAtPos(x, y, gameboard);
	newChar = getCharAtPos(newx, newy, gameboard);
	c = console.ansi(ANSI_NORMAL);
	curPos = virtualToScreenPos(x, y);
	console.gotoxy(curPos.x, curPos.y);
	console.print(c + charConvert(curChar));
	c = console.ansi(BG_RED);
	newPos = virtualToScreenPos(newx, newy);
	console.gotoxy(newPos.x, newPos.y);
	console.print(c + charConvert(newChar));
}

function charConvert(char) {
	if (char === "0") {
		return " ";
	} else if (char === "B") {
		return BACKGROUND_TILE;
	} else {
		return char;
	}
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
	return "B";
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
	//color = console.ansi(BLACK|BG_LIGHTGRAY); // Enums
	//console.print(color);
	for (var y = 0; y < screenHeight; y++) {
		for (var x = 0; x < screenWidth; x++) {
			console.gotoxy(x, y);
			console.print(BACKGROUND_TILE);
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