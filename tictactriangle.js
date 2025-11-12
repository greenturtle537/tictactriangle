// Consts
const title = "TicTacTriangle";
const author = "greenturtle537";
const REVISION = "$Revision: 0.1 $".split(' ')[1];
const tear_line = "\r\n--- " + js.exec_file + " " + REVISION + "\r\n";
const ini_section = "tictactriangle"; // ini file section
const tictactriangle_title = js.exec_dir + "tictactriangle.ans";
const tictactriangle_title_xbin = js.exec_dir + "tictactriangle.xbin";

var options = load({}, "modopts.js", ini_section);

// Imports

var MessageWindow = load({}, "MessageWindow.js");
var NodeTalk = load({}, "NodeTalk.js");

load("utils.js");

var nodeTalk = new NodeTalk();

var Graphic = load({}, "graphic.js");
var sauce_lib = load({}, "sauce_lib.js");

require("sbbsdefs.js", "K_NONE");
require("mouse_getkey.js", "mouse_getkey");


// TicTacTriangle options

var screenWidth = 80;
var screenHeight = 24;

var colorPairs = [
	{ fc: LIGHTGRAY, bc: BG_BLACK },
	{ fc: BLUE, bc: BG_BROWN },
	{ fc: RED, bc: BG_CYAN }, 
	{ fc: GREEN, bc: BG_MAGENTA }, // This and below should go unused
	{ fc: CYAN, bc: BG_RED },
	{ fc: MAGENTA, bc: BG_GREEN },
	{ fc: YELLOW, bc: BG_BLUE },
	{ fc: BLACK, bc: BG_LIGHTGRAY } // Known rendering issue
]

BACKGROUND_TILE = "\xb0"; // Light shade block character

var debug = true; //Debug flag

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
		x: 0,
		y: 0,
		bc: BG_LIGHTGRAY,
		fc: BLACK,
		scores: [0, 0], // Points scored by each player on this board [X, O]
		triangleScores: [0, 0], // Times each player scored triangles (max 1 each)
		active: true, // Is this board still being played?
		scoredCells: [
			[[false, false], [false, false], [false, false]],
			[[false, false], [false, false], [false, false]],
			[[false, false], [false, false], [false, false]]
		] // Track which cells have been scored by each player [row][col][player]
	}];
	
	var totalScores = [0, 0]; // Total scores across all boards [X, O]

	renderBackground();

	var playerX = 0;
	var playerY = 0;
	turn = 0; // 0 = player 1, 1 = player 2

	highlightOn = false;
	highlightX = 0;
	highlightY = 0;

	moves = []; 
	// Series of strings representing moves made
	// Format is "{x,y}"
	
	// Display help
	console.gotoxy(1, screenHeight - 4);
	console.print("Controls: WASD=Move, E=Place/Confirm, Q=Quit");
	console.gotoxy(1, screenHeight - 3);
	console.print("Goal: Score points by making 3+ in a row (horizontal/vertical/diagonal)");

	renderBoard(gameboard);

	running = true;

	while (running) {

		// Get input
		var mk = mouse_getkey(K_NONE, 100, true);
		var key = mk.key;

		renderBoard(gameboard);
		moveMarker(playerX, playerY, playerX, playerY, gameboard); // To ensure highlighting after render draw. TODO: Remove
		
		// Display status bar
		console.gotoxy(1, screenHeight);
		var currentBoard = findCurrentSubboard(gameboard);
		var statusMsg = "Total: X=" + totalScores[0] + " O=" + totalScores[1] + 
						" | Board: X=" + currentBoard.scores[0] + " O=" + currentBoard.scores[1] + 
						" | Turn: " + ((turn === 0) ? "X" : "O");
		console.print(statusMsg + "                              ");

		if (highlightOn) {
			highlightSubboard(highlightX, highlightY, ANSI_NORMAL); // Remove old highlight
			if (checkSubboardLocation(gameboard, playerX, playerY)) {
				highlightSubboard(playerX, playerY, BG_CYAN); // New highlight
				highlightX = playerX;
				highlightY = playerY;
			}
			
			// Display board placement instructions
			console.gotoxy(1, screenHeight - 3);
			console.print("*** BOARD PLACEMENT MODE: Move cursor and press E to place new board ***");
		}

		if (debug) {
			console.gotoxy(1, 1);
			console.print("PX: " + playerX + " PY: " + playerY + " Key: " + key + " Sub OK: " + checkSubboardLocation(gameboard, playerX, playerY) + " X:" + totalScores[0] + " O:" + totalScores[1] + "   ");
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
						if (!(fullSubboard(findCurrentSubboard(gameboard)))) {
							if (validateMove(gameboard, {row: playerY, col: playerX})) {
								var playerChar = (turn === 0) ? "x" : "o";
								playMove(gameboard, totalScores, {row: playerY, col: playerX}, 
									playerChar, turn
								);
								
								// Check if board is now full
								if (fullSubboard(findCurrentSubboard(gameboard))) {
									var currentBoard = findCurrentSubboard(gameboard);
									currentBoard.active = false;
									console.gotoxy(1, screenHeight - 2);
									console.print("*** Board is full! X:" + currentBoard.scores[0] + " O:" + currentBoard.scores[1] + " ***");
									highlightOn = true; // Start board placement mode
									renderBoard(gameboard);
								} else {
									turn = (turn === 0) ? 1 : 0; // Switch turns
									renderBoard(gameboard);
								}
							}
						} else if (highlightOn === false) {
							highlightOn = true;
						} else {
							if (checkSubboardLocation(gameboard, playerX, playerY)) {
								var colorPair = freeColorPair(gameboard, playerX, playerY);
								var bc = colorPair.bc;
								var fc = colorPair.fc;
								turn = newSubboard(gameboard, totalScores, playerX, playerY, bc, fc, turn);
								highlightOn = false;
								renderBoard(gameboard);
							}
						}
						break;
					// End of switch-case
				}
			}
		}
	}
	
	// Game over - display final scores
	console.clear();
	console.print("\n=== Game Over ===\n\n");
	console.print("Final Score:\n");
	console.print("  Player X: " + totalScores[0] + "\n");
	console.print("  Player O: " + totalScores[1] + "\n\n");
	
	if (totalScores[0] > totalScores[1]) {
		console.print("Player X wins!\n");
	} else if (totalScores[1] > totalScores[0]) {
		console.print("Player O wins!\n");
	} else {
		console.print("It's a tie!\n");
	}
	
	console.pause();
}

function globalToLocalMove(currentBoard, globalX, globalY) {
	/* Convert global coordinates to local subboard coordinates.
	*  Returns an object with:
	*  - subboard: the subboard object that contains this position
	*  - row: local row within the subboard (0-2)
	*  - col: local column within the subboard (0-2)
	*  Returns null if the position is not within any subboard.
	*/
	for (var i = currentBoard.length - 1; i >= 0; i--) {
		var board = currentBoard[i];
		var relativeX = globalX - board.x;
		var relativeY = globalY - board.y;
		
		// Check if position is within this board's 3x3 bounds
		if (relativeX >= 0 && relativeX < 3 && relativeY >= 0 && relativeY < 3) {
			return {
				subboard: board,
				row: relativeY,
				col: relativeX
			};
		}
	}
	return null; // Position not within any subboard
}

function validateMove(currentBoard, playerMove) {
	var currentSubboard = findCurrentSubboard(currentBoard);
	var localMove = globalToLocalMove(currentBoard, playerMove.col, playerMove.row);
	
	// Check if the position is within any subboard
	if (!localMove) {
		return false; // Position not within any subboard
	}
	
	// Check if the move is in the current active subboard
	if (localMove.subboard !== currentSubboard) {
		return false; // Wrong subboard
	}
	
	// Check if the space is unoccupied or is a triangle
	var cellValue = localMove.subboard.sub[localMove.row][localMove.col];
	if (cellValue !== "0" && cellValue !== "t") {
		return false; // Space is occupied by X or O
	}
	
	return true; // Valid move
}

function playMove(currentBoard, totalScores, playerMove, playerChar, player) {
	var localMove = globalToLocalMove(currentBoard, playerMove.col, playerMove.row);
	
	// Validate that the position is within a subboard
	if (!localMove) {
		return false; // Position not within any subboard
	}
	
	var board = localMove.subboard;
	
	// Place the move in the subboard
	board.sub[localMove.row][localMove.col] = playerChar;
	
	// Calculate and apply scoring
	var points = scorePosition(currentBoard, board, playerMove.col, playerMove.row, player);
	board.scores[player] += points;
	totalScores[player] += points;
	
	if (points > 0) {
		// Display score notification
		console.gotoxy(1, screenHeight - 2);
		console.print("Player " + playerChar.toUpperCase() + " scores " + points + " points!                    ");
	}
	
	return true;
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
	for(var b=0; b<currentBoard.length; b++) {
		var board = currentBoard[b];
		// Note that every board occupies a 3x3 area starting at (board.x, board.y)
		for (var bx = 0; bx < 3; bx++) {
			for (var by = 0; by < 3; by++) {
				for (var dx = 0; dx < 3; dx++) {
					for (var dy = 0; dy < 3; dy++) { // TODO: Let's not use this many for loops
						if (board.x + bx - dx === x && board.y + by - dy === y) {
							return false; // Overlaps existing subboard
						}
					}
				}
			}
		}
	}
	// Check adjacency to existing subboards
	// A subboard is adjacent if it shares an edge (not just a corner)
	// This means at least one dimension must overlap or touch
	for (var i = 0; i < currentBoard.length; i++) {
		var board = currentBoard[i];
		var dx = Math.abs(board.x - x);
		var dy = Math.abs(board.y - y);
		
		// Valid if sharing an edge: one distance <= 3 AND the other distance <= 2
		// This prevents diagonal-only adjacency where both distances are 3
		if (dx <= 3 && dy <= 3 && !(dx === 3 && dy === 3)) {
			return true; // Adjacent to existing subboard
		}
	}
	return false; // Not adjacent to any existing subboard
}

function findAdjacentSubboards(currentBoard, x, y) {
	/* Find all subboards that are adjacent to the specified coordinates.
	*  Uses the same adjacency rules as checkSubboardLocation:
	*  - Must share an edge (not just a corner)
	*  - Returns an array of adjacent subboard objects
	*/
	var adjacentBoards = [];
	
	for (var i = 0; i < currentBoard.length; i++) {
		var board = currentBoard[i];
		var dx = Math.abs(board.x - x);
		var dy = Math.abs(board.y - y);
		
		// Valid if sharing an edge: one distance <= 3 AND the other distance <= 2
		// This prevents diagonal-only adjacency where both distances are 3
		if (dx <= 3 && dy <= 3 && !(dx === 3 && dy === 3)) {
			adjacentBoards.push(board);
		}
	}
	
	return adjacentBoards;
}

function freeColorPair(currentBoard, x, y) {
	/* Determine a color pair that is visually distinct from all adjacent subboards.
	*  Returns an object with { fg, bg } properties from the colorPairs array
	*  that is not used by any adjacent subboard.
	*/
	var adjacentBoards = findAdjacentSubboards(currentBoard, x, y);
	
	// Collect color pairs used by adjacent boards
	var usedColorPairs = [];
	for (var i = 0; i < adjacentBoards.length; i++) {
		var board = adjacentBoards[i];
		usedColorPairs.push({ fc: board.fc, bc: board.bc });
	}
	
	// Iterate through available color pairs to find one not in use
	for (var j = 0; j < colorPairs.length; j++) {
		var candidate = colorPairs[j];
		var isUsed = false;
		
		// Check if this candidate is used by any adjacent board
		for (var k = 0; k < usedColorPairs.length; k++) {
			if (candidate.fc === usedColorPairs[k].fc && candidate.bc === usedColorPairs[k].bc) {
				isUsed = true;
				break;
			}
		}
		
		// If not used, return this color pair
		if (!isUsed) {
			return candidate;
		}
	}
	
	// If all color pairs are used (unlikely), return the first one
	return colorPairs[0];
}

function highlightSubboard(x, y, color) {
	// Highlight the subboard at the specified coordinates
	var screenPos = virtualToScreenPos(x, y);
	var c = console.ansi(color);
	for (var row = 0; row < 3; row++) {
		for (var col = 0; col < 3; col++) {
			console.gotoxy(screenPos.x + col, screenPos.y + row);
			console.print(c + BACKGROUND_TILE);
		}
	}
}

function newSubboard(currentBoard, totalScores, x, y, bc, fc, turn) {
	// Create a new subboard at the specified coordinates
	bc = bc || ANSI_NORMAL; // Yeah we using old school js
	fc = fc || ANSI_NORMAL;
	
	var prevBoard = findCurrentSubboard(currentBoard);
	
	// Determine who creates the board based on scores
	var creator;
	if (prevBoard.scores[0] < prevBoard.scores[1]) {
		creator = 0; // X creates
	} else if (prevBoard.scores[1] < prevBoard.scores[0]) {
		creator = 1; // O creates
	} else {
		creator = turn; // Tied, current player creates
	}
	
	var creatorChar = (creator === 0) ? "X" : "O";
	console.gotoxy(1, screenHeight - 1);
	console.print("Player " + creatorChar + " creates the new board!                    ");
	
	var newBoard = {
		sub: [
			["0", "0", "0"],
			["0", "0", "0"],
			["0", "0", "0"]
		],
		x: x,
		y: y,
		bc: bc,
		fc: fc,
		scores: [0, 0],
		triangleScores: [0, 0],
		active: true,
		scoredCells: [
			[[false, false], [false, false], [false, false]],
			[[false, false], [false, false], [false, false]],
			[[false, false], [false, false], [false, false]]
		]
	};
	currentBoard.push(newBoard);
	
	// Place triangles
	placeTriangles(currentBoard, newBoard, creator);
	
	// Check for triple triangle
	if (checkTripleTriangle(newBoard)) {
		console.gotoxy(1, screenHeight - 1);
		console.print("*** TRIPLE TRIANGLE! Player " + creatorChar + " doubles their score! ***");
		totalScores[creator] *= 2;
		newBoard.active = false;
		
		// Return the opposing player to create next board
		return (creator === 0) ? 1 : 0;
	}
	
	// Return the creator as the first player on the new board
	return creator;
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
	} else if (char === "t") {
		return "\x1e"; // Triangle symbol (▲ or up arrow)
	} else {
		return char;
	}
}

function countInLine(currentBoard, x, y, dx, dy, player) {
	/* Count consecutive pieces (including triangles) in a direction.
	*  player: 0 for X, 1 for O
	*/
	var targetChar = (player === 0) ? "x" : "o";
	var count = 0;
	
	for (var i = 0; i < 10; i++) { // Check up to 10 in each direction
		var nx = x + dx * i;
		var ny = y + dy * i;
		var cell = getCharAtPos(nx, ny, currentBoard);
		
		if (cell === targetChar || cell === "t") {
			count++;
		} else {
			break;
		}
	}
	
	return count;
}

function scorePosition(currentBoard, board, x, y, player) {
	/* Calculate points scored by placing a piece at (x,y).
	*  Returns the total points scored.
	*  Also marks cells as scored in the board's scoredCells array.
	*/
	var totalPoints = 0;
	var cell = getCharAtPos(x, y, currentBoard);
	
	// Helper to check if a line can score (no already-scored cells except triangles)
	function canScoreLine(sx, sy, dx, dy, count) {
		for (var i = 0; i < count; i++) {
			var px = sx + dx * i;
			var py = sy + dy * i;
			var localMove = globalToLocalMove(currentBoard, px, py);
			if (localMove) {
				var cellVal = localMove.subboard.sub[localMove.row][localMove.col];
				// Can't score if this cell is X or O and already scored by this player
				if ((cellVal === "x" || cellVal === "o") && 
					localMove.subboard.scoredCells[localMove.row][localMove.col][player]) {
					return false;
				}
			}
		}
		return true;
	}
	
	// Helper to mark cells as scored
	function markScoredInLine(sx, sy, dx, dy, count) {
		for (var i = 0; i < count; i++) {
			var px = sx + dx * i;
			var py = sy + dy * i;
			// Find which board this cell belongs to and mark it
			var localMove = globalToLocalMove(currentBoard, px, py);
			if (localMove) {
				localMove.subboard.scoredCells[localMove.row][localMove.col][player] = true;
			}
		}
	}
	
	// Horizontal
	var left = countInLine(currentBoard, x - 1, y, -1, 0, player);
	var right = countInLine(currentBoard, x + 1, y, 1, 0, player);
	if (left + right + 1 >= 3 && canScoreLine(x - left, y, 1, 0, left + right + 1)) {
		var points = left + right + 1;
		totalPoints += points;
		markScoredInLine(x - left, y, 1, 0, points);
	}
	
	// Vertical
	var up = countInLine(currentBoard, x, y - 1, 0, -1, player);
	var down = countInLine(currentBoard, x, y + 1, 0, 1, player);
	if (up + down + 1 >= 3 && canScoreLine(x, y - up, 0, 1, up + down + 1)) {
		var points = up + down + 1;
		totalPoints += points;
		markScoredInLine(x, y - up, 0, 1, points);
	}
	
	// Diagonal (top-left to bottom-right)
	var tl = countInLine(currentBoard, x - 1, y - 1, -1, -1, player);
	var br = countInLine(currentBoard, x + 1, y + 1, 1, 1, player);
	if (tl + br + 1 >= 3 && canScoreLine(x - tl, y - tl, 1, 1, tl + br + 1)) {
		var points = tl + br + 1;
		totalPoints += points;
		markScoredInLine(x - tl, y - tl, 1, 1, points);
	}
	
	// Anti-diagonal (top-right to bottom-left)
	var tr = countInLine(currentBoard, x + 1, y - 1, 1, -1, player);
	var bl = countInLine(currentBoard, x - 1, y + 1, -1, 1, player);
	if (tr + bl + 1 >= 3 && canScoreLine(x + tr, y - tr, -1, 1, tr + bl + 1)) {
		var points = tr + bl + 1;
		totalPoints += points;
		markScoredInLine(x + tr, y - tr, -1, 1, points);
	}
	
	// Handle triangle scoring limits
	if (cell === "t") {
		if (board.triangleScores[player] >= 1) {
			return 0; // Can't score this triangle again
		}
		board.triangleScores[player]++;
	}
	
	return totalPoints;
}

function placeTriangles(currentBoard, newBoard, creator) {
	/* Place triangles on the new board where the creator would score 3+ */
	for (var row = 0; row < 3; row++) {
		for (var col = 0; col < 3; col++) {
			var gx = newBoard.x + col;
			var gy = newBoard.y + row;
			
			if (newBoard.sub[row][col] !== "0") continue;
			
			// Temporarily place the creator's mark
			var mark = (creator === 0) ? "x" : "o";
			newBoard.sub[row][col] = mark;
			
			// Check if this would score
			var wouldScore = false;
			
			// Check horizontal
			var hCount = countInLine(currentBoard, gx - 1, gy, -1, 0, creator) + 
						 countInLine(currentBoard, gx + 1, gy, 1, 0, creator) + 1;
			if (hCount >= 3) wouldScore = true;
			
			// Check vertical
			var vCount = countInLine(currentBoard, gx, gy - 1, 0, -1, creator) + 
						 countInLine(currentBoard, gx, gy + 1, 0, 1, creator) + 1;
			if (vCount >= 3) wouldScore = true;
			
			// Check diagonals
			var d1Count = countInLine(currentBoard, gx - 1, gy - 1, -1, -1, creator) + 
						  countInLine(currentBoard, gx + 1, gy + 1, 1, 1, creator) + 1;
			if (d1Count >= 3) wouldScore = true;
			
			var d2Count = countInLine(currentBoard, gx + 1, gy - 1, 1, -1, creator) + 
						  countInLine(currentBoard, gx - 1, gy + 1, -1, 1, creator) + 1;
			if (d2Count >= 3) wouldScore = true;
			
			// Remove temporary mark
			newBoard.sub[row][col] = "0";
			
			if (wouldScore) {
				newBoard.sub[row][col] = "t";
			}
		}
	}
}

function checkTripleTriangle(board) {
	/* Check for 3+ triangles in any row, column, or diagonal */
	// Check rows
	for (var y = 0; y < 3; y++) {
		var count = 0;
		for (var x = 0; x < 3; x++) {
			if (board.sub[y][x] === "t") count++;
		}
		if (count >= 3) return true;
	}
	
	// Check columns
	for (var x = 0; x < 3; x++) {
		var count = 0;
		for (var y = 0; y < 3; y++) {
			if (board.sub[y][x] === "t") count++;
		}
		if (count >= 3) return true;
	}
	
	// Main diagonal
	var d1Count = 0;
	for (var i = 0; i < 3; i++) {
		if (board.sub[i][i] === "t") d1Count++;
	}
	if (d1Count >= 3) return true;
	
	// Anti-diagonal
	var d2Count = 0;
	for (var i = 0; i < 3; i++) {
		if (board.sub[i][2 - i] === "t") d2Count++;
	}
	if (d2Count >= 3) return true;
	
	return false;
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
		var bc = console.ansi(board.bc);
		var fc = console.ansi(board.fc);
		// Render the 3x3 subboard
		for (var row = 0; row < 3; row++) {
			for (var col = 0; col < 3; col++) {
				console.gotoxy(screenPos.x + col, screenPos.y + row);
				
				var cellValue = board.sub[row][col];
				var scoredX = board.scoredCells[row][col][0];
				var scoredO = board.scoredCells[row][col][1];
				
				// Determine color based on cell value and scoring status
				if (cellValue === "0") {
					console.print(fc);
					console.print(bc);
					console.print(" ");
				} else if (cellValue === "x") {
					if (scoredX) {
						console.print(console.ansi(HIGH|RED));
					} else {
						console.print(console.ansi(RED));
					}
					console.print(bc);
					console.print("X");
				} else if (cellValue === "o") {
					if (scoredO) {
						console.print(console.ansi(HIGH|GREEN));
					} else {
						console.print(console.ansi(GREEN));
					}
					console.print(bc);
					console.print("O");
				} else if (cellValue === "t") {
					// Triangle display logic
					if (scoredX && scoredO) {
						console.print(console.ansi(DARKGRAY)); // Both scored - dim
					} else if (scoredX) {
						console.print(console.ansi(HIGH|RED)); // X scored
					} else if (scoredO) {
						console.print(console.ansi(HIGH|GREEN)); // O scored
					} else {
						console.print(console.ansi(YELLOW)); // Available
					}
					console.print(bc);
					console.print(charConvert("t"));
				} else {
					console.print(fc);
					console.print(bc);
					console.print(cellValue);
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