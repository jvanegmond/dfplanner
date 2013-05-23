// DFDesigner - 2013
// Jos van Egmond / info@josvanegmond.nl / @manadar


// map is a 3d array which can be accessed in this way: map[z][x][y]
// z = elevation, top to bottom (0 = top, map_size_z = bottom)
// x = west to east (0 = north, map_size_x = east)
// y = north to south direction (0 = north, map_size_y = south)
var map;
var map_background; // for bg1 and bg2 and bg3
var map_temp; // TODO: Fill and render this, for displaying the current mouse operation

// SETTINGS //
// SETTINGS //
// SETTINGS //
var menu_width_tiles = 25; // makes the right side menu wider or smaller. its width is defined in a number of tiles (of size tile_size). You probably don't want to change this.
// END OF SETTINGS //
// END OF SETTINGS //
// END OF SETTINGS //

// the current viewport (eg browser)
var viewport_elementid = "drawregion";
var container_elementid = "container";
var viewport_width = 800;
var viewport_height = 600;

// size of the map, set to arbitrary defaults which are almost immediately overriden
var map_size_z = 40;
var map_size_x = 50;
var map_size_y = 50;

// current camera position
var camera_z = 19;
var camera_x = 0; // TODO: Implement a camera_x and camera_y which are not zero. I need to do this quickly or else I will have too much faulty assumptions in my code based on camera_N = 0;
var camera_y = 0;

// tiles
var tile_size = 16; // in pixels

// these go into map[][][]
var tile_types = { // TODO: Add the rest of the possible types of designations
    hidden: undefined,
    bg1: 'bg1',
    bg2: 'bg2',
    bg3: 'bg3',
    dig: 'dig',
    stairs_updown: 'stairs_updown',
};

// images variable stores loaded images in a dictionary
// TODO: Use a single sprite containing all the images for faster loading
var images = { // TODO: Add the rest of the possible types of designations
    bg1: 'bg1.png',
    bg2: 'bg2.png',
    bg3: 'bg3.png',
    dig: 'des_dig.png',
    stairs_updown: 'des_updownstairs.png',
    cursor: 'cursor.png',
    cursor_blink: 'cursor_blink.png',
    chrome: 'chrome.png'
};

// current cursor position (it is always on the same z-level as the camera)
var cursor_x = 0;
var cursor_y = 0;

var cursor_down = false;
var cursor_start_z = 0;
var cursor_start_x = 0;
var cursor_start_y = 0;

var cursor_tool = undefined;
var cursor_blink = false; // indicates whether or not the start point of an area is currently visible or visible (temp variable for draw() function)

// create tools

var tools = []; // tools array is populated using the loadTools() function
var tool_type_area = "area"; // An area tool is a tool which takes 6 coordinates: start z, end z, start y, end y, start x, end x
var tool_type_point = "point"; // A point tool is a tool which takes 3 coordinates: z, y, x

// text properties
var text_line_height = 22;
var text_font_color_active = "white";
var text_font_color = "#CCC";
var text_font = "12pt sans-serif";

function loadDesigner() {
    logmessage("loading designer");

    setCanvasSize();
    loadTools();

    window.onresize = function(event) {
        setCanvasSize();
    }

    logmessage("loading images");
    loadImages();

    logmessage("creating world");
    createWorld();

    logmessage("attaching UI events");
    attachUIEvents();

    logmessage("starting renderer");
    startDrawLoop();
}

function loadTools() {
    // Creates a list of tools which are supported by the designer.
    // They are shown (in menus and such) in the order of appearance here.

    // The required keycode property is taken from a list found here: http://unixpapa.com/js/key.html (Example: Space is 32)
    // Alternatively, you can use this program here: http://jsfiddle.net/vWx8V/

    // Dig designation tool
    tools.dig = {
        name: "Dig",
        type: tool_type_area,
        hotkey: "d", 
        keycode: 68,
        run: function(start_z, end_z, start_x, end_x, start_y, end_y) {
            for (z = start_z; z <= end_z; z += 1) {
                for (x = start_x; x <= end_x; x += 1) {
                    for (y = start_y; y <= end_y; y += 1) {
                        map[z][x][y] = tile_types.dig;
                    }
                }
            }
        }
    };

    // Up/Down stairs designation tool
    tools.updownstairs = {
        name: "Up/Down Stairway",
        type: tool_type_area,
        hotkey: "i",
        keycode: 73,
        run: function(start_z, end_z, start_x, end_x, start_y, end_y) {
            for (z = start_z; z <= end_z; z += 1) {
                for (x = start_x; x <= end_x; x += 1) {
                    for (y = start_y; y <= end_y; y += 1) {
                        map[z][x][y] = tile_types.stairs_updown;
                    }
                }
            }
        }
    };

    // Up/Down stairs designation tool
    tools.removedes = {
        name: "Remove designation",
        type: tool_type_area,
        hotkey: "x",
        keycode: 88,
        run: function(start_z, end_z, start_x, end_x, start_y, end_y) {
            for (z = start_z; z <= end_z; z += 1) {
                for (x = start_x; x <= end_x; x += 1) {
                    for (y = start_y; y <= end_y; y += 1) {
                        map[z][x][y] = tile_types.hidden;
                    }
                }
            }
        }
    };

    // Clear tool for current z-level
    tools.clearlevel = {
        name: "Clear selected z-level",
        type: tool_type_point,
        hotkey: "y",
        keycode: 89,
        run: function(start_z, end_z, start_x, end_x, start_y, end_y) { // for a tool of type tool_type_point the start_N and end_N variables are guaranteed to be the same.
            for (x = 0; x <= map_size_x - 1; x += 1) {
                for (y = 0; y <= map_size_y - 1; y += 1) {
                    map[camera_z][x][y] = tile_types.hidden;
                }
            }
        }
    };

    // Export tool
    tools.export_quickfort = {
        name: "Export to QuickFort (area select)",
        type: tool_type_area,
        hotkey: "q",
        keycode: 81,
        run: function(start_z, end_z, start_x, end_x, start_y, end_y) {
            var exportmap = { // TODO: add more designation types
                dig: 'd',
                stairs_updown: 'i'
            };

            var seperator = ',';

            var output = "#dig Blueprint generated by DFDesigner. Z-level: " + (camera_z + 1).toString() + ".\n\n";

            // TODO: Skip empty columns and rows from start to finish

            for (y = start_y; y <= end_y; y += 1) {
               for (x = start_x; x <= end_x; x += 1) {
                    if (map[camera_z][x][y] != undefined) {
                        output += exportmap[map[camera_z][x][y]];
                    }
                    output += seperator;
                }

                output += '\n';
            }

            alert(output); // TODO: Show output proper (text box / HTML element?)
        }
    };

    // TODO: A tool to dig circles

    // The default tool is set here:
    cursor_tool = tools.dig;
}

function setCanvasSize() {
    var drawregion = document.getElementById(viewport_elementid);

    viewport_width = document.width;
    viewport_height = document.height;

    drawregion.width = viewport_width;
    drawregion.height = viewport_height;

    map_size_x = Math.floor(viewport_width / tile_size);
    map_size_y = Math.floor(viewport_height / tile_size);

    logmessage("map size (z, x, y): " + map_size_z.toString() + ", " + map_size_x.toString() + ", " + map_size_y.toString());
}

function attachUIEvents() {
    var drawregion = document.getElementById(viewport_elementid);

    drawregion.onkeydown = function(evt) {
        evt = evt || window.event;

        // NOTE: There is no concept of a key being "handled". All key binds have a unique action to them due to the limited scope of the project.

        //logmessage("Key pressed: " + evt.keyCode);

        // step is a variable that indicates how much to move the cursor by.
        // It is ignored for anything other than the arrow keys.
        var step = 1;
        if (evt.shiftKey) {
            step = 10;
        }

        if (evt.ctrlKey) {
            step = 2;
        }

        switch (evt.keyCode) {
            case 28: // escape
                // menu up

            case 39: // right arrow
                cursor_x += step;
                cursor_x = Math.min(cursor_x, map_size_x - 1);
                break;

            case 37: // left arrow
                cursor_x -= step;
                cursor_x = Math.max(cursor_x, 0);
                break;

            case 38: // up arrow
                cursor_y -= step;
                cursor_y = Math.max(cursor_y, 0);
                break;

            case 40: // down arror
                cursor_y += step;
                cursor_y = Math.min(cursor_y, map_size_y - 1)
                break;

            case 33: // page up
			case 188: // .
                camera_z += 1;
                camera_z = Math.min(camera_z, map_size_z - 1);
                break;

			case 34: // page down
            case 190: // ,
                camera_z -= 1;
                camera_z = Math.max(camera_z, 0);
                break;

			case 13: // enter
                if (cursor_tool.type == tool_type_area) {

    				if (cursor_down) {
    					// finish rectangle
    					logmessage("finishing area select");
    					cursor_down = false;
    					
                        // TODO: Make function out of this (shared with mouse)
                        var start_z = camera_z;
    					var start_x = cursor_x;
    					var start_y = cursor_y;
                        var end_z = cursor_start_z;
    					var end_x = cursor_start_x;
    					var end_y = cursor_start_y;
    					
    					if (start_x > end_x) { end_x = start_x; start_x = cursor_start_x; }
    					if (start_y > end_y) { end_y = start_y; start_y = cursor_start_y; }
                        if (start_z > end_z) { end_z = start_z; start_z = cursor_start_z; }
    					
                        cursor_tool.run(start_z, end_z, start_x, end_x, start_y, end_y);
    				} else {
    					logmessage("starting area select");
                        cursor_start_z = camera_z;
    					cursor_start_x = cursor_x;
    					cursor_start_y = cursor_y;
    					
    					cursor_down = true;
    				}
                } else if (cursor_tool.type == tool_type_point) {
                    logmessage("point select");

                    var start_z = camera_z;
                    var start_x = cursor_x;
                    var start_y = cursor_y;

                    cursor_tool.run(start_z, start_z, start_x, start_x, start_y, start_y);

                }
				break;
        }

        // Check if any of the current tools have the pushed key set as the hotkey
        for(var tool in tools) {
            tool = tools[tool];
            if (evt.keyCode == tool.keycode) {
                cursor_tool = tool;

                logmessage("selected tool: " + cursor_tool.name);

                if (cursor_tool.type == tool_type_point) {
                    cursor_down = false;
                }
            }
        }

        draw(); // extra draw for that snappy response times
    }

    drawregion.onmousedown = function(evt) {
        var x = evt.clientX;
        var y = evt.clientY;

        // TODO: Make function out of this
        var tile_x = Math.floor(x / tile_size) - 1; // minus 1 because of the chrome
        var tile_y = Math.floor(y / tile_size) - 1;

        cursor_x = tile_x;
        cursor_y = tile_y;

        if (cursor_tool.type == tool_type_area) {
            cursor_start_x = cursor_x;
            cursor_start_y = cursor_y;
            cursor_start_z = camera_z;

            cursor_down = true;
        }

        logmessage("starting mouse select");

    };

    drawregion.onmousemove = function(evt) {
        // TODO: Ignore small pixel movements (accidental mouse bumps)

        var x = evt.clientX;
        var y = evt.clientY;

        var tile_x = Math.floor(x / tile_size) - 1; // minus 1 because of the chrome
        var tile_y = Math.floor(y / tile_size) - 1;

        cursor_x = tile_x;
        cursor_y = tile_y;
    };

    drawregion.onmouseup = function(evt) {
        cursor_down = false;

        // TODO: Make it possible to click the menu items
        
        // TODO: Make function out of this (shared with keyboard)
        var start_z = camera_z;
        var start_x = cursor_x;
        var start_y = cursor_y;
        var end_z = cursor_start_z;
        var end_x = cursor_start_x;
        var end_y = cursor_start_y;
        
        if (start_x > end_x) { end_x = start_x; start_x = cursor_start_x; }
        if (start_y > end_y) { end_y = start_y; start_y = cursor_start_y; }
        if (start_z > end_z) { end_z = start_z; start_z = cursor_start_z; }
        
        cursor_tool.run(start_z, end_z, start_x, end_x, start_y, end_y);

        logmessage("ending mouse select");
    };

    // TODO: Functionality for scroll wheel. What makes sense? Menu item switch or z-level change or ...?

    // TODO: Right mouse does nothing, what can I make it do?
}

function startDrawLoop() {
    draw();

    setInterval(function() {
        draw();
    }, 100);
}

function loadImages() {

    var loadedImages = 0;
    var numImages = 0;
    // get num of sources
    for(var src in images) {
        numImages++;
    }
    // load images
    for(var src in images) {
        var url = images[src];

        images[src] = new Image();
        images[src].onload = function() {
            loadedImages += 1;
            if (loadedImages == numImages) {
				logmessage("images loaded");
                draw();
            }
        };
        images[src].src = "img/" + url;
    };
}

function createWorld() {
    map = []; map_background = [];

    // initialize map as a series of arrays containing arrays
    for (z = 0; z < map_size_z; z += 1) {
        map[z] = []; map_background[z] = [];
        for (x = 0; x < map_size_x; x += 1) {
            map[z][x] = []; map_background[z][x] = [];
            for (y = 0; y < map_size_y; y += 1) {
                // randomly distribute some background tiles (bg1 through bg3) to those tiles
                var ran = Math.floor((Math.random()*450)+1);
                if (ran == 1) {
                    map_background[z][x][y] = tile_types.bg1;
                }
                if (ran == 2) {
                    map_background[z][x][y] = tile_types.bg2;
                }
                if (ran == 3) {
                    map_background[z][x][y] = tile_types.bg3;
                }
            }
        }
    }

}

function draw() {
    //logmessage("draw");

    var drawregion = document.getElementById(viewport_elementid);
    var context = drawregion.getContext("2d");

    // fill with black
    context.fillStyle="black";
    context.fillRect(0, 0, viewport_width, viewport_height);

    // render current z-level
    var max_render_x = map_size_x - menu_width_tiles; // TODO: Repair wrong assumption, map can be larger than screen
    var max_render_y = map_size_y; // TODO: Repair wrong assumption, map can be larger than screen

    for (x = camera_x; x < max_render_x; x += 1) {
        for (y = camera_y; y < max_render_y; y += 1) {

            // only paint non-empty tiles
            if (map[camera_z][x][y] === tile_types.hidden) {
                
                // hidden tiles have random backgrounds, paint those
                if (map_background[camera_z][x][y] !== undefined) {
                    var pos_x = 1 + x - camera_x;
                    var pos_y = 1 + y - camera_y;

                    context.drawImage(images[map_background[camera_z][x][y]], pos_x * 16, pos_y * 16, tile_size, tile_size);
                }
            } else {
                var pos_x = 1 + x - camera_x;
                var pos_y = 1 + y - camera_y;

                context.drawImage(images[map[camera_z][x][y]], pos_x * 16, pos_y * 16, tile_size, tile_size);
            }
        }
    }


    // render cursor blinking when its down
    if (cursor_down && camera_z == cursor_start_z) {
        cursor_blink = !cursor_blink;
        if (cursor_blink) {
            context.drawImage(images.cursor_blink, (cursor_start_x + 1) * 16, (cursor_start_y + 1) * 16, tile_size, tile_size);
        }
    }
	
	// render cursor
	context.drawImage(images.cursor, (cursor_x + 1) * 16, (cursor_y + 1) * 16, tile_size, tile_size);

    // render chrome
    var chrome = images.chrome;

    // top bar
    var pos_y = 0;
    for (x = 0; x < map_size_x; x += 1) {
        context.drawImage(chrome, x * 16, pos_y * 16, tile_size, tile_size);
    }

    // bottom bar
    var pos_y = Math.floor(viewport_height / tile_size) - 1;
    for (x = 0; x < map_size_x; x += 1) {
        context.drawImage(chrome, x * 16, pos_y * 16, tile_size, tile_size);
    }

    // left bar
    var pos_x = 0;
    for (y = 0; y < map_size_y; y += 1) {
        context.drawImage(chrome, pos_x * 16, y * 16, tile_size, tile_size);
    }

    // right bar
    var pos_x = Math.floor(viewport_width / tile_size) - 1;
    for (y = 0; y < map_size_y; y += 1) {
        context.drawImage(chrome, pos_x * 16, y * 16, tile_size, tile_size);
    }

    // middle bar ( for menu )
    var pos_x = Math.floor(viewport_width / tile_size) - menu_width_tiles;
    for (y = 0; y < map_size_y; y += 1) {
        context.drawImage(chrome, pos_x * 16, y * 16, tile_size, tile_size);
    }

    // paint current z-level in top right
    var ui_x = (Math.floor(viewport_width / tile_size) - 1) * tile_size;

    var z = (camera_z + 1).toString();
    var z1 = z.substring(0, 1);
    var z2 = z.substring(1, 2);
    context.font = text_font;
    context.fillStyle = text_font_color_active;
    context.fillText(z1.toString(), ui_x + 3, tile_size * 2);
    context.fillText(z2.toString(), ui_x + 3, tile_size * 3);

    // draw menu

    pos_x = (pos_x + 2) * 16; // lol what is this
    pos_y = tile_size * 4;

    var n = 0;

    for (var tool in tools) {
        tool = tools[tool];

        if (tool == cursor_tool) {
            context.fillStyle = text_font_color_active;
        } else {
            context.fillStyle = text_font_color;
        }

        context.fillText(tool.name, pos_x, pos_y + (text_line_height * n));
        context.fillText("( " + tool.hotkey + " )", pos_x + ((menu_width_tiles * tile_size) - 100), pos_y + (text_line_height * n));

        n += 1;
    }
    // logmessage("end draw"); // can use for some mediocre performance testing
}

function isEmptyTile(tile_type) {
    return tile_type == tile_type_hidden || tile_type == tile_type_hidden_var1 || tile_type_hidden_var2 || tile_type_hidden_var3;
}

function logmessage(message) {
    d = new Date();
    console.log(
        d.getHours() + ":" +
        d.getMinutes() + ":" +
        d.getSeconds() + "." +
        d.getMilliseconds() + " - " +
        message);
}