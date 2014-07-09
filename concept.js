$(function() {
	$('#svgbasics').svg({onLoad: drawInitial});
	$('#export').click(function() {
		var xml = $('#svgbasics').svg('get').toSVG();
		$('#svgexport').html(xml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
	});
});

var calculator_example = {
states: {
"on" : {
    handlers: {
                CE: {dst: "begin"},
                DIGIT_0: {dst: "zero1"},
                DIGIT_1_9: {dst: "int1"},
                POINT: {dst: "frac1"}
    },
    states: {
        negated: {
            handlers: {
                CE: {dst: "begin"},
                DIGIT_0: {dst: "zero1"},
                DIGIT_1_9: {dst: "int1"},
                POINT: {dst: "frac1"}
            }
        },
        ready: {
            handlers: {
                initial: { dst: "begin" },
                POINT: { dst: "frac1" },
                DIGIT_0: { dst: "zero1" },
                DIGIT_1_9: { dst: "int1" },
                OPER: {dst: "opEntered" },
            },
            states: {
                result: { },
                begin: { 
                    handlers: {
                        OPER_: {dst: "negated1" }
                    }
                }
            }
        },
        opEntered: { 
            handlers: {
                OPER: { dst: "negated2" },
                POINT: { dst: "frac2" },
                DIGIT_1_9: { dst: "int2" },
                DIGIT_0: { dst: "zero2" }
            }
        },
        operand1: {
            states: {
                zero1: {
                    handlers: {
                        DIGIT_1_9: { dst: "int1" },
                        POINT: { dst: "frac1" }
                    }
                },
                int1: {
                    handlers: {
                        POINT: { dst: "frac1" }
                    }
                },
                frac1: { }
            }
        },
        negated2: { 
             handlers: {
                        CE: { dst: "opEntered" },
                        DIGIT_0: { dst: "zero2" },
                        POINT: { dst: "frac2" },
                        DIGIT_1_9: { dst: "int2" }
            }
        },
        operand2: {
            states: {
                zero2: {
                    handlers: {
                        DIGIT_1_9: { dst: "int2" },
                        POINT: { dst: "frac2" }
                    }
                },
                int2: {
                        POINT: { dst: "frac2" }
                },
                frac2: { }
            }
        },
        error: { }
    }
}
}
};

var colorlist = ['purple', 'red', 'orange', 'lime', 'green', 'blue', 'navy', 'black',
'aqua', 'fuchsia', 'gray', 'maroon', 'olive','silver', 'teal',
"#9D2E2C", "#F9EA99", "#7DB6D5", "#E7A555", "#4A4747"];

function polarToCartesian(cx, cy, rad, angle) 
{
    var anglerad = (angle-90) * Math.PI / 180.0;
    return {
        x: cx + (rad * Math.cos(anglerad)),
        y: cy + (rad * Math.sin(anglerad))
  };
}

var colorindex = 0;


function drawstate(chart, statename, state, x, y, startAngle, available_angle, radius, stepradius) 
{
    // debug: mark center of the diagram
    chart.svg.circle(x, y, 10, {fill: 'none', stroke: 'green', 'stroke-width': 3});

    chart.states.push( {
        state: statename,
        startAngle: startAngle,
        stopAngle: startAngle+available_angle,
        next_to_slot: 0
    });

    var color = colorlist[colorindex++];
    // draw state arc
    var endAngle = startAngle + available_angle;
    var start = polarToCartesian(x, y, radius, startAngle);
    var end = polarToCartesian(x, y, radius, endAngle);
    var arcSweep = (endAngle - startAngle) <= 180 ? false : true;
    var path = chart.svg.createPath({fill: 'none', stroke: color, 'stroke-width': 3});
    chart.svg.path(path.move(start.x, start.y).arc(
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
    var text = chart.svg.text('', 
    {fontFamily: 'Verdana', fontSize: '20', fill: color});
    var texts = chart.svg.createText(); 
    chart.svg.textpath(text, '#'+statename, texts.string(statename)); 

    /* draw handlers */
    if ("handlers" in state) {
        var index = 0;
        var handlers = Object.keys(state.handlers).length;
        var angle_increment = available_angle;
        if (handlers>0) {
             angle_increment /= handlers;
        }
        for (var handlername in state.handlers) {
            var handler = state.handlers[handlername];
            var pos = polarToCartesian(x, y, radius, startAngle + angle_increment * index);
            chart.svg.circle(pos.x, pos.y, 5, {fill: 'none', stroke: color, 'stroke-width': 1});
            ++index;

            chart.handlers.push( {
                state: statename,
                startAngle: startAngle,
                stopAngle: startAngle+available_angle,
                next_to_slot: 0
            });
        }
    }
    /* draw substates */
    if ("states" in state) {
        var displacement = 0;

        for (var statename in state.states) {
            var substate = state.states[statename];
            if (substate.totalhandlers > state.totalhandlers) {
                throw "error";
            }
            var state_angle = available_angle*(substate.totalhandlers / state.totalhandlers);

            drawstate(chart, statename, substate, x, y, 
                startAngle + displacement + chart.padding,
                state_angle - chart.padding, 
                radius - stepradius, 
                stepradius
            ); 
            displacement += state_angle;
        }
    }
}

function maxsubstates(statename, state) {
        if (state.hasOwnProperty("handlers")) {
            handlers = Object.keys(state.handlers).length;
        } else {
            //allocate for empty states
            handlers = 1;
        }
        totalhandlers = 0;
        if (state.hasOwnProperty("states")) {
            for (var statename in state.states) {
                substate = maxsubstates(statename, state.states[statename]);
                state.states[statename] = substate; 
                totalhandlers += substate["totalhandlers"];
            }
        }
        if (handlers > totalhandlers) {
                totalhandlers = handlers;
        }
        state["totalhandlers"] = totalhandlers;
        return state; 
}


function drawtransitions(chart, statename, state, x, y, startAngle, angle, radius, stepradius, stepangle) 
{
    chart.states.push( {
        state: statename,
        startAngle: startAngle,
        stopAngle: startAngle+angle,
        next_to_slot: 0
    });

    /* draw handlers */
    if ("handlers" in state) {
        var index = 0;
        var availableangle = angle / Object.keys(state.handlers).length;
        for (var handlername in state.handlers) {
            var handler = state.handlers[handlername];
            var pos = polarToCartesian(x, y, radius, startAngle + availableangle * index);
            chart.svg.circle(pos.x, pos.y, 5, {fill: 'none', stroke: color, 'stroke-width': 1});
            ++index;
        }
    }
}

function drawInitial(svg) 
{
    var x = 450;
    var y = 450;
    var index=0;
    var chart = {padding: 1, svg: svg, states: [], handlers:[]};
    chart["rootstate"] = maxsubstates("root", calculator_example);
    for (var statename in chart.rootstate.states) {
        drawstate(chart, statename, chart.rootstate.states[statename], x, y, 0, 359, 400, 30);
        index++;
    }

    for (var statename in chart.rootstate.states) {
        drawtransitions(chart, statename, chart.rootstate.states[statename], x, y, 0, 359, 400, 30, 1);
        index++;
    }
}

