$(function() {
	$('#svgbasics').svg({onLoad: drawInitial});
	$('#export').click(function() {
		var xml = $('#svgbasics').svg('get').toSVG();
		$('#svgexport').html(xml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
	});
});

var calculator_example = {
"on" : {
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
};

var fewstates_example = {
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
        var availableangle = angle / Object.keys(state.handlers).length;
        for (var handlername in state.handlers) {
            var handler = state.handlers[handlername];
            var pos = polarToCartesian(x, y, radius, startAngle + availableangle * index);
            chart.svg.circle(pos.x, pos.y, 5, {fill: 'none', stroke: color, 'stroke-width': 1});
            ++index;
        }
    }
    /* draw substates */
    if ("states" in state) {
        var index = 0;
        var availableangle = (angle / Object.keys(state.states).length) - stepangle;
        for (var statename in state.states) {
            var substate = state.states[statename];
            drawstate(chart, statename, substate, x, y, 
                startAngle + stepangle *index + availableangle*index, 
                availableangle, 
                radius - stepradius, 
                stepradius, 
                stepangle);
            ++index;
        }
    }
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
    var chart = {svg: svg, states: []};
    for (var statename in calculator_example) {
        drawstate(chart, statename, calculator_example[statename], x, y, 0, 359, 400, 30, 1);
        index++;
    }
}

