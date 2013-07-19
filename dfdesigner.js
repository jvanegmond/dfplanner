// DFDesigner - 2013
// Jos van Egmond / info@josvanegmond.nl / @manadar


// Big todo's before initial release:
// - Add the remaining designation types
// - Circles are filled instead of hollow (maybe an option?)
// - Finish export to quickfort functionality

// Todo's:
// - Small indicator of size of selection: Format: XxY. Eg: 7x6
// - Serious code cleanup

// map is a 3d array which can be accessed in this way: map[z][x][y]
// z = elevation, top to bottom (0 = top, map_size_z = bottom)
// x = west to east (0 = north, map_size_x = east)
// y = north to south direction (0 = north, map_size_y = south)
var map;
var map_background; // for bg1 and bg2 and bg3

// SETTINGS //
var menu_width_tiles = 23; // makes the right side menu wider or smaller. its width is defined in a number of tiles (of size tile_size). You probably don't want to change this.
// END OF SETTINGS //

// tiles
var tile_size = 16; // in pixels

// the current viewport (eg browser)
var viewport_elementid = "drawregion";
var container_elementid = "container";
var viewport_width = 800;
var viewport_height = 600;

var viewport_height_tiles = Math.floor(viewport_height / tile_size) - 1;
var viewport_width_tiles = Math.floor(viewport_width / tile_size) - 1;

var fps = 15;

// size of the map, set to arbitrary defaults which are almost immediately overriden
var map_size_z = 40;
var map_size_x = 200;
var map_size_y = 200;

// current camera position
var camera_z = 19;
var camera_x = 0;
var camera_y = 0;

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
var tool_type_none = 0; // A tool where none of the below fit.
var tool_type_area_square = 1; // An area tool which makes a square shape. This type of tool accepts 2 points. For example: The dig tool.
var tool_type_point = 2; // A point tool is a tool which takes 1 point. No tools use this yet, but buildings might use this in the future. For example, a chair tool.
var tool_type_area_circle = 4; // An area tool which makes a circle shape. This type of tool accepts 1 point (center) and a radius. For example: The dig tool.
var tool_type_level = 8; // A level tool is a tool which works on an entire z-level. For example: Clear this z-level
var tool_current_shape = tool_type_area_square;

// text properties
var text_line_height = 22;
var text_font_color_active = "white";
var text_font_color = "#CCC";
var text_font = "12pt sans-serif";

function loadDesigner() {
    logmessage("loading designer");

    setCanvasSize(true);
    loadTools();

    window.onresize = function(event) {
        setCanvasSize(false);
    }

    logmessage("loading images");
    loadImages();

    logmessage("creating world");
    createWorld();

    logmessage("starting renderer");
    startDrawLoop();
}

function startDrawLoop() {
    draw();

    setInterval(function() {
        draw();
    }, 1000 / fps);

    setInterval(function() {
        tick();
    }, 100);
}

function tick() {
    cursor_blink = !cursor_blink;
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

    // initialize map as a series of arrays containing arrays (making a "3 dimensional"-array)
    for (z = 0; z < map_size_z; z += 1) {
        map[z] = []; map_background[z] = [];
        for (x = 0; x < map_size_x; x += 1) {
            map[z][x] = []; map_background[z][x] = [];
            for (y = 0; y < map_size_y; y += 1) {
                // randomly distribute some background tiles (bg1 through bg3) to those tiles
                var ran = Math.floor((Math.random()*450)+1); // 450 chosen as magic number through a bit of experimentation
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

function loadTools() {
    // Creates a list of tools which are supported by the designer.
    // They are shown (in menus and such) in the order of appearance here.

    // The required keycode property is taken from a list found here: http://unixpapa.com/js/key.html (Example: Space is 32)
    // Alternatively, you can use this program here: http://jsfiddle.net/vWx8V/

    // Dig designation tool
    tools.dig = {
        name: "Dig",
        type: tool_type_area_square | tool_type_area_circle,
        hotkey: "d", 
        preview: true,
        keycode: 68,
        run: function(map, tool_selector) {
            tool_selector(function(x,y,z) {
                map[z][x][y] = tile_types.dig;
            });
        }
    };

    // Up/Down stairs designation tool
    tools.updownstairs = {
        name: "Up/Down Stairway",
        type: tool_type_area_square | tool_type_area_circle,
        hotkey: "i",
        preview: true,
        keycode: 73,
        run: function(map, tool_selector) {
            tool_selector(function(x,y,z) {
                map[z][x][y] = tile_types.stairs_updown;
            });
        }
    };

    // Up/Down stairs designation tool
    tools.removedes = {
        name: "Remove designation",
        type: tool_type_area_square | tool_type_area_circle,
        hotkey: "x",
        preview: true,
        keycode: 88,
        run: function(map, tool_selector) {
            tool_selector(function(x,y,z) {
                map[z][x][y] = tile_types.hidden;
            });
        }
    };

    // Clear tool for current z-level
    tools.clearlevel = {
        name: "Clear selected z-level",
        type: tool_type_level,
        hotkey: "y",
        preview: false,
        keycode: 89,
        run: function(map, tool_selector) {
            tool_selector(function(x,y,z) {
                map[z][x][y] = tile_types.hidden;
            });
        }
    };

    // Export tool
    tools.export_quickfort = {
        name: "Export to QuickFort",
        type: tool_type_area_square,
        hotkey: "q",
        preview: false,
        keycode: 81,
        run: function(map, tool_selector) {
            var exportmap = { // TODO: add more designation types
                dig: 'd',
                stairs_updown: 'i'
            };

            var seperator = ',';

            var output = "#dig Blueprint generated by DFDesigner. Z-level: " + (camera_z + 1).toString() + ".\n\n";

            // TODO: Skip empty columns and rows at the beginning and ending of the selection area
            tool_selector(function(x,y,z) {
                if (map[camera_z][x][y] != undefined) {
                    output += exportmap[map[camera_z][x][y]];
                }
                output += seperator;
            });

                    
            output += '\n';

            alert(output); // TODO: Show output proper (text box / HTML element?)
        }
    };

    tools.space1 = { name: "Spacer", select: function(oldtool) { cursor_tool = oldtool; } };

    tools.switch_tool_shape = {
        name: "Switch tool shape [Square]",
        type: tool_type_none,
        hotkey: "h",
        preview: false,
        keycode: 72,
        run: function(map, tool_selector) {
        },
        select: function(oldtool) {
            if (tool_current_shape === tool_type_area_square) {
                logmessage("Switched tool shape to circle");
                tool_current_shape = tool_type_area_circle;
                this.name = "Switch tool shape [Circle]";
            } else {
                logmessage("Switched tool shape to square");
                tool_current_shape = tool_type_area_square;
                this.name = "Switch tool shape [Square]";
            }
            cursor_tool = oldtool;
        }
    }

    // The default tool is set here:
    cursor_tool = tools.dig;
}

// when you want to call the run function of a tool with specific coordinates but aren't sure if you are inside the boundary of the map or not
function toolwboundary(tool, x, y, z) {
    if (x < 0) { return; }
    if (y < 0) { return; }
    if (z < 0) { return; }

    if (x >= map_size_x) { return; }
    if (y >= map_size_y) { return; }
    if (z >= map_size_z) { return; }

    tool(x, y, z);
}

function create_selector_area_circle(start_z, end_z, center_x, center_y, radius) {
    if (start_z > end_z) { var t = end_z; end_z = start_z; start_z = t; }

    return function(tool) {
        if (radius < 0) { return; }

        for (z = start_z; z <= end_z; z += 1) {
            var x = radius, y = 0;
            var radiusError = 1 - x;
            
            while (x >= y) {
                toolwboundary(tool, x + center_x, y + center_y, start_z);
                toolwboundary(tool, y + center_x, x + center_y, start_z);
                toolwboundary(tool, -x + center_x, y + center_y, start_z);
                toolwboundary(tool, -y + center_x, x + center_y, start_z);
                toolwboundary(tool, -x + center_x, -y + center_y, start_z);
                toolwboundary(tool, -y + center_x, -x + center_y, start_z);
                toolwboundary(tool, x + center_x, -y + center_y, start_z);
                toolwboundary(tool, y + center_x, -x + center_y, start_z);

                y = y + 1;
                if (radiusError < 0) {
                    radiusError = radiusError + (2 * y + 1);
                } else {
                    x = x - 1;
                    radiusError = radiusError + (2 * (y - x + 1));
                }
            }
        }
    }
}


function create_selector_area_square(start_z, end_z, start_x, end_x, start_y, end_y) {
    if (start_x > end_x) { var t = end_x; end_x = start_x; start_x = t; }
    if (start_y > end_y) { var t = end_y; end_y = start_y; start_y = t; }
    if (start_z > end_z) { var t = end_z; end_z = start_z; start_z = t; }

    return function(tool) {
        for (z = start_z; z <= end_z; z += 1) {
            for (x = start_x; x <= end_x; x += 1) {
                for (y = start_y; y <= end_y; y += 1) {
                    tool(x, y, z);
                }
            }
        }
    }
}

function setCanvasSize(set_world_size) {
    var drawregion = document.getElementById(viewport_elementid);

    viewport_width = document.body.clientWidth;
    viewport_height = document.body.clientHeight;

    drawregion.width = viewport_width;
    drawregion.height = viewport_height;

    viewport_height_tiles = Math.floor(viewport_height / tile_size) - 1;
    viewport_width_tiles = Math.floor(viewport_width / tile_size) - 1;

    if (set_world_size) {
        var map_size_x_min = 100;
        var map_size_y_min = 60;

        map_size_x = Math.max(viewport_width_tiles - menu_width_tiles, map_size_x_min);
        map_size_y = map_size_x; //Math.max(map_size_y_min, Math.floor(viewport_height / tile_size));
        logmessage("map size (z, x, y): " + map_size_z.toString() + ", " + map_size_x.toString() + ", " + map_size_y.toString());

        // TODO: Set the camera to the middle or the bottom right of the screen
    }    

    logmessage("viewport size (w, h): " + viewport_width.toString() + ", " + viewport_height.toString());
}

function switchTool(tool) {
    var oldtool = cursor_tool;
    cursor_tool = tool;

    if (tool.select) {
        tool.select(oldtool);
    }

    logmessage("selected tool: " + cursor_tool.name);
}

function enableDesigner() {
    logmessage("attaching UI events");

    var drawregion = document.getElementById(viewport_elementid);

    drawregion.onkeydown = function(evt) {
        evt = evt || window.event;

        // Indicates or not whether this keypress is handled. Supresses default browser behavior.
        var handled = false;

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
                // menu up (or close notices etc.)
                break;
            case 39: // right arrow
                moveCursor(camera_z, cursor_x + step, cursor_y);
                handled = true;
                break;
            case 37: // left arrow
                moveCursor(camera_z, cursor_x - step, cursor_y);
                handled = true;
                break;
            case 38: // up arrow
                moveCursor(camera_z, cursor_x, cursor_y - step);
                handled = true;
                break;
            case 40: // down arror
                moveCursor(camera_z, cursor_x, cursor_y + step);
                handled = true;
                break;
            case 33: // page up
			case 188: // ,
                moveCursor(camera_z + 1, cursor_x, cursor_y);
                handled = true;
                break;
			case 34: // page down
            case 190: // .
                moveCursor(camera_z - 1, cursor_x, cursor_y);
                handled = true;
                break;
			case 13: // enter
                if (cursor_tool.type & tool_type_area_square || cursor_tool.type & tool_type_area_circle) {

    				if (cursor_down) {
                        logmessage("finishing area select");

    					// finish rectangle
                        handle_endAreaSelect();

    				} else {
    					logmessage("starting area select");

                        cursor_start_z = camera_z;
    					cursor_start_x = cursor_x;
    					cursor_start_y = cursor_y;
    					
    					cursor_down = true;
    				}
                } else {
                    handle_endAreaSelect();
                }

                handled = true;
				break;
        }

        // Check if any of the tools have the currently pushed key set as the hotkey
        for(var tool in tools) {
            tool = tools[tool];
            if (evt.keyCode == tool.keycode) {
                switchTool(tool);

                if (cursor_tool.type & tool_type_none) {
                    cursor_down = false;
                }

                handled = true;
            }
        }

        if (handled) {
            draw(); // extra draw for that snappy response times
            return false; // suppress default behavior
        } else {
            return true;
        }
    }

    drawregion.onmousedown = function(evt) {
        handle_onMouseDown(evt.clientX, evt.clientY);
        return false; // prevents the default browser behavior
    };

    drawregion.addEventListener('touchstart', function(evt) {
        // If there's exactly one finger inside this element
        if (evt.targetTouches.length == 1) {
            logmessage("touch down");
            // Place element where the finger is
            var touch = evt.targetTouches[0];
            handle_onMouseDown(touch.pageX, touch.pageY);
        }

        evt.preventDefault();
        return false;
    });

    drawregion.onmousemove = function(evt) {
        // TODO: Maybe ignore small pixel movements (accidental mouse bumps)
        handle_onMouseMove(evt.clientX, evt.clientY);
        return false; // prevents the default behavior. Fixes problem with cursor changes and broken mouse functionality.
    };

    drawregion.addEventListener('touchmove', function(evt) {
        // If there's exactly one finger inside this element
        if (evt.targetTouches.length == 1) {
            // Place element where the finger is
            var touch = evt.targetTouches[0];
            handle_onMouseMove(touch.pageX, touch.pageY);
        }

        evt.preventDefault();
        return false;
    });


    drawregion.onmouseup = function(evt) {
        handle_onMouseUp(evt.clientX, evt.clientY);
        return false; // prevents the default behavior
    };

    drawregion.addEventListener('touchend', function(evt) {
        // If there's exactly one finger inside this element
        if (evt.changedTouches.length > 0) {
            logmessage("touch up");

            // Place element where the finger is
            var touch = evt.changedTouches[0];
            handle_onMouseUp(touch.pageX, touch.pageY);
        }

        evt.preventDefault();
        return false;
    });

    // TODO: Functionality for scroll wheel. What makes sense? Menu item switch or z-level change or ...?
}

function handle_onMouseDown(x, y) {
    var menu_border = (1 + viewport_width_tiles - menu_width_tiles) * tile_size;

    if (x > menu_border) { return; }

    logmessage("starting select");

    // TODO: Make function out of this
    var tile_x = Math.floor(x / tile_size) - 1; // minus 1 because of the chrome
    var tile_y = Math.floor(y / tile_size) - 1;

    moveCursor(camera_z, tile_x + camera_x, tile_y + camera_y);

    if (cursor_tool.type & tool_type_area_square) {
        cursor_start_x = cursor_x;
        cursor_start_y = cursor_y;
        cursor_start_z = camera_z;

        cursor_down = true;
    }
}

function handle_onMouseUp(x, y) {

    // Check if the mouse is clicked inside the menu
    var menu_border = (1 + viewport_width_tiles - menu_width_tiles) * tile_size;

    if (x > menu_border) {
        // ending a drag in the menu border should still work
        if (cursor_down) {
            handle_endAreaSelect();
        } else {
            // clicked a menu item, the menu items start at: tile_size * 4 and are then evenly spaced apart by text_line_height pixels
            var menu_start = tile_size * 4;
            var menu_index = Math.round((y - menu_start) / text_line_height);
            
            if (menu_index >= 0) {

                var n = 0;
                for (var tool in tools)
                {
                    tool = tools[tool];
                    if (n == menu_index) {
                        switchTool(tool);

                        if (cursor_tool.type & tool_type_none) {
                            cursor_down = false;
                        }
                    }
                    n += 1;
                }
            }

        }
    } else {
        handle_endAreaSelect();
    }
}

function handle_endAreaSelect() {
    logmessage("ending select");

    cursor_down = false;

    var selector = getSelector();
    cursor_tool.run(map, selector);
}

// based on the current context (selected tool, preferred tool shape) returns the proper selector
function getSelector() {
    var preferred = tool_current_shape;
    var supported = cursor_tool.type;

    // level select
    if (cursor_tool.type & tool_type_level) {
        return selector = create_selector_area_square(camera_z, camera_z, 0, map_size_x - 1, 0, map_size_y - 1);
    }

    // if the preferred tool is supported, use the preferred tool
    if (supported & preferred) {
        // if preferred tool is circle select, use circle select
        if (preferred & tool_type_area_circle) {
            var radius = Math.max(Math.abs(cursor_start_x - cursor_x), Math.abs(cursor_start_y - cursor_y));
            return create_selector_area_circle(camera_z, cursor_start_z, cursor_start_x, cursor_start_y, radius);
        }
        // if preferred tool is square select, use square select
        if (preferred & tool_type_area_square) {
            return create_selector_area_square(camera_z, cursor_start_z, cursor_x, cursor_start_x, cursor_y, cursor_start_y);
        }
    } else {
        // if selected tool is not available, defaulting to square select
        if (supported & tool_type_area_square) {
            return create_selector_area_square(camera_z, cursor_start_z, cursor_x, cursor_start_x, cursor_y, cursor_start_y);
        }
    }

    // if we don't have a selector, we default to a point select. This covers adequatly the case: cursor_tool.type & tool_type_none || cursor_tool.type & tool_type_point
    return create_selector_area_square(camera_z, camera_z, cursor_x, cursor_x, cursor_y, cursor_y);
}

var cursor_in_menu = false;

function handle_onMouseMove(x, y) {
    // ignore mouse moves inside the menu
    var menu_bar_x = (Math.floor(viewport_width / tile_size) - menu_width_tiles) * tile_size;
    if (x > menu_bar_x) { 
        cursor_in_menu = true;
        return; 
    } else {
        cursor_in_menu = false;
    }

    var tile_x = camera_x + Math.floor(x / tile_size) - 1; // minus 1 because of the chrome
    var tile_y = camera_y + Math.floor(y / tile_size) - 1;

    // move the cursor, but dont follow the camera immediately
    var moved = moveCursor(camera_z, tile_x, tile_y, true);

    // if we didnt move the cursor, there's no point in moving the camera
    if (!moved) { return; }

    var oldz = camera_z;
    var moveCameraLater = function() {
        if (oldz != camera_z) { return; }
        if (cursor_x != tile_x) { return; }
        if (cursor_y != tile_y) { return; }
        // delayed camera movement is disabled while the cursor is in the menu (because the user intended to use the menu, and not move camera)
        if (cursor_in_menu) { return; }

        moveCameraToCursor();

        // and repeat the process in order to keep the camera moving
        tile_x = camera_x + Math.floor(x / tile_size) - 1; // minus 1 because of the chrome
        tile_y = camera_y + Math.floor(y / tile_size) - 1;
        moved = moveCursor(camera_z, tile_x, tile_y, true);

        setTimeout(moveCameraLater, 300);
    };

    // after N seconds, check if the cursor is still in the same spot, and move the camera
    setTimeout(moveCameraLater, 300);
}

// move the cursor, with a flag to indicate if the camera should follow the cursor.
// returns whether or not the cursor has moved
function moveCursor(z, x, y, dont_move_camera) {
    if (camera_z == z && cursor_x == x && cursor_y == y) { return false; }

    camera_z = Math.min(Math.max(z, 0), map_size_z - 1);
    cursor_x = Math.min(Math.max(x, 0), map_size_x - 1);
    cursor_y = Math.min(Math.max(y, 0), map_size_y - 1);

    if (!dont_move_camera) {
        moveCameraToCursor();
    }

    return true;
}

function moveCameraToCursor() {
    logmessage("move camera");
    var camera_step = 10;

    var rel_x = cursor_x - camera_x;
    var rel_y = cursor_y - camera_y;

    var diff_x = rel_x - viewport_width_tiles + menu_width_tiles - 1;
    var diff_y = rel_y - viewport_height_tiles;

    // idk why this works but it does

    // Check camera up
    if (rel_y < 3) {
        camera_y = Math.max(0, camera_y - camera_step);
    }

    // Check camera down
    if (diff_y > -5) {
        camera_y = Math.min(map_size_y, camera_y + camera_step);
    }

    // Check camera left
    if (rel_x < 3) {
        camera_x = Math.max(0, camera_x - camera_step);
    }

    // Check camera right
    if (diff_x > -5) {
        camera_x = Math.min(map_size_x, camera_x + camera_step);
    }
}

function draw() {
    //logmessage("draw");

    var drawregion = document.getElementById(viewport_elementid);
    var context = drawregion.getContext("2d");

    // fill with black
    context.fillStyle="black";
    context.fillRect(0, 0, viewport_width, viewport_height);

    
    // calculations to aid drawing process this makes sure we don't render (much) more than is necessary
    var max_render_x = Math.min(camera_x + viewport_width_tiles, map_size_x);
    var max_render_y = Math.min(camera_y + viewport_height_tiles, map_size_y);

    // render current z-level
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

    // render current tool preview
    if (cursor_down && cursor_tool.preview) {
        map_temp = [];

        // initialize map as a series of arrays containing arrays
        for (z = 0; z < map_size_z; z += 1) {
            map_temp[z] = [];
            for (x = 0; x < map_size_x; x += 1) {
                map_temp[z][x] = [];
                for (y = 0; y < map_size_y; y += 1) {
                    map_temp[z][x][y] = 'herpaderpa';
                }
            }
        }

        var selector = getSelector();
        cursor_tool.run(map_temp, selector);

        context.fillStyle="black";

        for (x = camera_x; x < max_render_x; x += 1) {
            for (y = camera_y; y < max_render_y; y += 1) {

                // only paint non-empty tiles
                if (map_temp[camera_z][x][y] === 'herpaderpa') { continue; }

                if (map_temp[camera_z][x][y] === tile_types.hidden) {
                    var pos_x = 1 + x - camera_x;
                    var pos_y = 1 + y - camera_y;

                    context.fillRect(pos_x * 16, pos_y * 16, tile_size, tile_size);

                    // hidden tiles have random backgrounds, paint those
                    if (map_background[camera_z][x][y] !== undefined) {

                        context.drawImage(images[map_background[camera_z][x][y]], pos_x * 16, pos_y * 16, tile_size, tile_size);
                    }
                } else {
                    var pos_x = 1 + x - camera_x;
                    var pos_y = 1 + y - camera_y;

                    context.drawImage(images[map_temp[camera_z][x][y]], pos_x * 16, pos_y * 16, tile_size, tile_size);
                }
            }
        }

    }


    // render cursor blinking when its down
    if (cursor_down && camera_z == cursor_start_z) {
        if (cursor_blink) {
            context.drawImage(images.cursor_blink, (cursor_start_x - camera_x + 1) * 16, (cursor_start_y - camera_y + 1) * 16, tile_size, tile_size);
        }
    }
	
	// render cursor
	context.drawImage(images.cursor, (cursor_x - camera_x + 1) * 16, (cursor_y - camera_y + 1) * 16, tile_size, tile_size);

    // clear space for menu

    var menu_bar = Math.floor(viewport_width / tile_size) - menu_width_tiles;

    context.fillStyle="black";
    context.fillRect(menu_bar * tile_size, 0, viewport_width, viewport_height);

    // render chrome: top bar
    for (x = 0; x < viewport_width_tiles; x += 1) {
        context.drawImage(images.chrome, x * 16, 0, tile_size, tile_size);
    }

    // render chrome: bottom bar
    for (x = 0; x < viewport_width_tiles; x += 1) {
        context.drawImage(images.chrome, x * 16, viewport_height_tiles * 16, tile_size, tile_size);
    }

    // render chrome: left bar
    for (y = 0; y < viewport_height_tiles; y += 1) {
        context.drawImage(images.chrome, 0, y * 16, tile_size, tile_size);
    }

    // render chrome: right bar
    for (y = 0; y < viewport_height_tiles + 1; y += 1) {
        context.drawImage(images.chrome, viewport_width_tiles * 16, y * 16, tile_size, tile_size);
    }

    // render chrome: middle bar ( for menu )
    for (y = 0; y < viewport_height_tiles; y += 1) {
        context.drawImage(images.chrome, menu_bar * 16, y * 16, tile_size, tile_size);
    }

    // paint current z-level in top right as 2 characters above each other
    var ui_x = (Math.floor(viewport_width / tile_size) - 1) * tile_size;

    var z = (camera_z + 1).toString();
    context.font = text_font;
    context.fillStyle = text_font_color_active;
    context.fillText(z.substring(0, 1), ui_x + 3, tile_size * 2);
    context.fillText(z.substring(1, 2), ui_x + 3, tile_size * 3);

    // draw menu
    pos_x = (menu_bar + 2) * tile_size; // pos_x indicates the starting position for the menu items. This is next to the menu bar with 1 tile in between.
    pos_y = tile_size * 4;

    var n = -1; // counter for vertical position (relative)
    for (var tool in tools) {
        tool = tools[tool];
        n += 1;

        if (tool.name == "Spacer") { continue; }

        if (tool == cursor_tool) {
            context.fillStyle = text_font_color_active;
        } else {
            context.fillStyle = text_font_color;
        }

        context.fillText(tool.name, pos_x, pos_y + (text_line_height * n)); // paint name of tool on the left side
        context.fillText("( " + tool.hotkey + " )", pos_x + ((menu_width_tiles * tile_size) - 100), pos_y + (text_line_height * n)); // paint hotkey of tool on the right side
    }
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