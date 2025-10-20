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
		graphic.drawfx();
	else
		graphic.draw();
	sleep(delay);
}

function logo() {
	console.clear();
	show_image(tictactriangle_title, false, 0);
	console.pause();
	console.clear();
}

try {
	console.print("Press any key to play TicTacTriangle...");
	console.pause();
	logo();
    console.pause();
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