$(function() {
	$('#svgbasics').svg({onLoad: drawInitial});
	$('#export').click(function() {
		var xml = $('#svgbasics').svg('get').toSVG();
		$('#svgexport').html(xml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
	});
});

var rootstate = {
"rootstate": {
    "handlers": {
        "entry": {
            "run": "code to executea()"
        },
        "SIGINT1": { 
            "run": "code to executeb()",
            "dst": "state2"
        },
        "initial": {
            "dst": "state1"
        }
    },
    "states": {
        "state1": {
            "handlers": {
                "SIGINT1": { 
                    "run": "code to execute1()",
                    "dst": "rootstate"
                },
                "SIGINT2": { 
                    "run": "code to execute2()"
                },
                "SIGINT3": { 
                    "run": "code to execute3()",
                    "dst": "state2"
                }
            },
            "states": {
                "test1" : {},
                "test2" : {}
            }
        },
        "state2": {
            "handlers": {
                "entry": {
                    "run": "code to execute()"
                },
                "exit": {
                    "run": "code to execute()"
                }
            }
        }
    }
}
};

var colorlist = ['purple', 'red', 'orange', 'lime', 'green', 'blue', 'navy', 'black'];

function polarToCartesian(cx, cy, rad, angle) 
{
    var anglerad = (angle-90) * Math.PI / 180.0;
    return {
        x: cx + (rad * Math.cos(anglerad)),
        y: cy + (rad * Math.sin(anglerad))
  };
}

var colorindex = 0;

function drawstate(svg, statename, state, x, y, startAngle, angle, radius, stepradius, stepangle) 
{


    // debug: mark center of the diagram
    svg.circle(x, y, 10, {fill: 'none', stroke: 'green', 'stroke-width': 3});

    var color = colorlist[colorindex++];
    // draw state arc
    var endAngle = startAngle + angle;
    var start = polarToCartesian(x, y, radius, startAngle);
    var end = polarToCartesian(x, y, radius, endAngle);
    var arcSweep = (endAngle - startAngle) <= 180 ? false : true;
    var path = svg.createPath({fill: 'none', stroke: color, 'stroke-width': 3});
    svg.path(path.move(start.x, start.y).arc(
        radius,
        radius, 
        //startAngle, 
        0,
        arcSweep/*draw large part*/, 
        true /*clockwise*/, 
        end.x,/* arc end x*/
        end.y,/* arc end y*/
        false /*relative*/ 
    ), {fill: 'none', stroke: color, strokeWidth: 5, id:statename});

    // add name of the state
    var text = svg.text('', 
    {fontFamily: 'Verdana', fontSize: '20', fill: color});
    var texts = svg.createText(); 
    svg.textpath(text, '#'+statename, texts.string(statename)); 

    /* draw handlers */
    if ("handlers" in state) {
        var index = 0;
        var availableangle = angle / Object.keys(state.handlers).length;
        for (var handlername in state.handlers) {
            var handler = state.handlers[handlername];
            var pos = polarToCartesian(x, y, radius, startAngle + availableangle * index);
            svg.circle(pos.x, pos.y, 5, {fill: 'none', stroke: color, 'stroke-width': 1});

            ++index;
        }
    }
    /* draw substates */
    if ("states" in state) {
        var index = 0;
        var availableangle = (angle / Object.keys(state.states).length) - stepangle;
        for (var statename in state.states) {
            var substate = state.states[statename];
            drawstate(svg, statename, substate, x, y, 
                startAngle + stepangle *index + availableangle*index, 
                availableangle, 
                radius - stepradius, 
                stepradius, 
                stepangle);
            ++index;
        }
    }
}

function drawInitial(svg) 
{
    var x = 300;
    var y = 300;
    var index=0;
    for (var statename in rootstate) {
        drawstate(svg, statename, rootstate[statename], x, y, 0, 359, 200, 30, 5);
        index++;
    }
}

