;(function(exports) {
  var EnvStore, _, Utils;
  if(typeof module !== 'undefined' && module.exports) { // node
    EnvStore = require('../env-store.js').EnvStore;
    _ = require("Underscore");
    Utils = require('../../node_modules/isla/src/utils.js').Utils;
  } else { // browser
    EnvStore = window.EnvStore;
    Utils = window.Isla.Utils;
    _ = window._;
  }

  function Planets(canvasCtx, demoTalker) {
    if (canvasCtx == null) {
      throw "You must provide a canvas context to draw to.";
    }

    if (demoTalker == null) {
      throw "You must provide a demo talker to communicate with.";
    }

    if (canvasCtx.fillRect === undefined) {
      throw "The variable you passed does not seem to be a canvas context.";
    }

    var _currentCtx;
    var currentCtx = function(inCtx) {
      if (inCtx !== undefined) {
        _currentCtx = inCtx;
        demoTalker.emit("demo:ctx:new", _currentCtx);
      } else {
        return _currentCtx;
      }
    };

    //setupHelp(demoTalker, this);
    drawBackground(canvasCtx);

    // main draw loop
    this._draw = function() {
      if (currentCtx() !== undefined) { // no ctx until sent 1st one by runner
        currentCtx(move(currentCtx()));
        drawBackground(canvasCtx);
        drawBodies(canvasCtx, currentCtx());
      }
    };

    // sets up cb to take latest Isla ctx, process planets and issue update
    demoTalker.on(this, "isla:ctx:new", function(ctx) {
      try {
        var retCtx = EnvStore.extend(true, {}, ctx); // ctx unres, refs no wk
        for (var i in retCtx) {
          if (isType(retCtx[i], "planet")) {
            retCtx[i] = planetDefaults(canvasCtx, retCtx[i]);
          } else if (isType(retCtx[i], "star")) {
            retCtx[i] = starDefaults(canvasCtx, retCtx[i]);
          }
        }
        currentCtx(retCtx);
      } catch(e) {
        console.log(e.message);
        throw e;
      }
    });

    // set draw loop going
    var self = this;
    this.interval = setInterval(function() {
      self._draw();
    }, 33);
  }

  Planets.prototype = {
    getTutorSteps: function() {
      return steps;
    },

    // stop drawing
    end: function() {
      clearInterval(this.interval);
    },
  };

  var pf = parseFloat;

  var drawBackground = function(canvasCtx) {
    canvasCtx.fillStyle = "#000";
    canvasCtx.fillRect(0, 0, canvasCtx.canvas.width, canvasCtx.canvas.height);
  };

  var drawBodies = function(canvasCtx, ctx) {
    for (var i in ctx) {
      if (isType(ctx[i], "planet") || isType(ctx[i], "star")) {
        drawBody(canvasCtx, ctx[i]);
      }
    }
  };

  // returns mass for object of density and radius
  var mass = function(density, radius) {
    return density * Math.pow(radius, 3) * Math.PI;
  };

  // returns the gravitational force between body1 and body2
  var gravitationalForce = function(body1, body2) {
    var m1 = mass(density(body1.density), size(body1.size) / 2);
    var m2 = mass(density(body2.density), size(body2.size) / 2);
    var r2 = Math.pow(body2._x - body1._x, 2) +
             Math.pow(body2._y - body1._y, 2);
    return (6.673e-11 * m1 * m2) / r2;
  };

  // returns the horizontal and vertical pull of body2 on body1
  var gravitationalVector = function(body1, body2) {
    var force = gravitationalForce(body1, body2);
    return {
      x: (body2._x - body1._x) * force,
      y: (body2._y - body1._y) * force
    };
  };

  var move = function(ctx) {
    // build list of gravitational pulls on bodies
    var m = [];
    for (var i in ctx) {
      for (var j in ctx) {
        if ((ctx[i] !== ctx[j] && isType(ctx[i], "planet")) &&
            (isType(ctx[j], "planet") || isType(ctx[j], "star"))) {
          m.push({
            bodyId: i,
            vec: gravitationalVector(ctx[i], ctx[j])
          })
        }
      }
    }

    // apply m to speed, and move
    var retCtx = EnvStore.extend(true, {}, ctx); // ctx unres, refs won't wk
    for (var i = 0; i < m.length; i++) {
      var retBody = retCtx[m[i].bodyId];
      retBody._xSpeed = pf(retBody._xSpeed) + m[i].vec.x;
      retBody._ySpeed = pf(retBody._ySpeed) + m[i].vec.y;
      retBody._x = pf(retBody._x) + retBody._xSpeed;
      retBody._y = pf(retBody._y) + retBody._ySpeed;

      retBody._xSpeed = retBody._xSpeed.toString();
      retBody._ySpeed = retBody._ySpeed.toString();
      retBody._x = retBody._x.toString();
      retBody._y = retBody._y.toString();
    }

    return retCtx;
  };

  var isType = function(obj, type) {
    return obj._meta !== undefined && obj._meta.type === type;
  };

  var drawBody = function(canvasCtx, body, indicate) {
    var bodySize = size(body.size);
    canvasCtx.strokeStyle = color(body.color);
    canvasCtx.beginPath();
    canvasCtx.arc(body._x, body._y, bodySize / 2, 0, Math.PI * 2, true);
    canvasCtx.closePath();
    if (indicate) {
      canvasCtx.lineWidth = 4;
    }

    canvasCtx.stroke();
  };

// var setupHelp = function(demoTalker, demo) {
//   demoTalker.on(this, "isla:mouse:mouseover", function(data) {
//     if (data.thing === "token" && data.syntaxNode.syntax === "variable") {
//       var operations = demo.operations();
//       for (var i = 0; i < operations.length; i++) {
//         if (operations[i].name === data.syntaxNode.code) {
//           operations[i].indicate = true;
//         }
//       }
//     }
//   });

//   demoTalker.on(this, "isla:mouse:mouseout", function() {
//     var operations = demo.operations();
//     for (var i = 0; i < operations.length; i++) {
//       operations[i].indicate = false;
//     }
//   });
// };

  var clearHelp = function() {
    indicate("clear");
  };

  var indicate = function(event, data) {
    consoleIndicator.write({ event: event, data: data, id: id});
  };

  var random = function(guide) {
    if (Utils.type(guide) === "Object") {
      var keys = _.keys(guide);
      return keys[Math.floor(Math.random() * keys.length)];
    } else {
      return Math.floor(Math.random() * guide); // random under max
    }
  };

  var COLORS = {
    red: "#FF0000",
    yellow: "#FFF700",
    green: "#4DFA51",
    blue: "#009DFE",
    indigo: "#5669FF",
    violet: "#8A6CFF",
  };

  var color = function(raw) {
    if (COLORS[raw] !== undefined) {
      return COLORS[raw];
    } else {
      return raw;
    }
  };

  var SIZES = { small:20, medium:40, big:80, large:80 };
  var DENSITIES = { light:1, medium:2, heavy:3 };

  var translateNumberWord = function(word, words) {
    var lowerWord = word.toLowerCase();
    if (words[lowerWord] !== undefined) {
      return words[lowerWord];
    } else if(parseFloat(word) !== NaN) {
      return parseFloat(word);
    } else {
      throw "I do not understand this number: " + word;
    }
  };

  var size = function(sizeStr) {
    return translateNumberWord(sizeStr, SIZES);
  };

  var density = function(densityStr) {
    return translateNumberWord(densityStr, DENSITIES);
  };

  var planetDefaults = function(canvasCtx, planet) {
    var retPlanet = EnvStore.extend(true, {}, planet);
    retPlanet.size = retPlanet.size || random(SIZES);
    retPlanet.color = retPlanet.color || random(COLORS);
    retPlanet.density = retPlanet.density || random(DENSITIES);
    retPlanet._xSpeed = retPlanet._xSpeed || random(5) - 2.5;
    retPlanet._ySpeed = retPlanet._ySpeed || random(5) - 2.5;
    retPlanet._x = retPlanet._x || random(canvasCtx.canvas.width);
    retPlanet._y = retPlanet._y || random(canvasCtx.canvas.height);
    return retPlanet;
  };

  var starDefaults = function(canvasCtx, star) {
    var retStar = EnvStore.extend(true, {}, star);
    retStar.size = retStar.size || "big";
    retStar.color = retStar.color || "yellow";
    retStar.density = retStar.density || "10";
    retStar._x = retStar._x || canvasCtx.canvas.width / 2;
    retStar._y = retStar._y || canvasCtx.canvas.height / 2;
    return retStar;
  };

  var steps = [];

  exports.Planets = Planets;
})(typeof exports === 'undefined' ? this : exports)
