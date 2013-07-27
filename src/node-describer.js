;(function(exports) {
  var Isla, _, multimethod;
  if(typeof module !== 'undefined' && module.exports) { // node
    Isla = require('../node_modules/isla/src/isla.js').Isla;
    codeAnalyzer = require('../src/code-analyzer').codeAnalyzer;
  } else { // browser
    Isla = window.Isla;
    codeAnalyzer = window.codeAnalyzer;
  }

  var nodeDescriber = {
    describe: function(text, index, env) {
      var syntaxNode = codeAnalyzer.getSyntaxNode(text, index);
      if (syntaxNode.syntax === "variable") {
        var val;
        if (syntaxNode.node.tag === "scalar") { // x is a t
          val = Isla.Interpreter.evaluateValue(syntaxNode.node, env).val;
        } else if (syntaxNode.node.tag === "identifier") {
          // x age is '1' - x not wrapped in scalar tag so can't evaluate
          // if tried to use tok one level up (in obj tag), would get attr val
          val = Isla.Interpreter.resolve({ ref:syntaxNode.node.c[0] }, env);
        }

        return describeValue(val, env);
      } else if (syntaxNode.syntax === "attribute") {
        var lineNumber = codeAnalyzer.getLineNumber(text, index);
        var line = codeAnalyzer.getLine(text, lineNumber);
        var tokens = codeAnalyzer.expressionTokens(line);
        var objToken = tokens[getTokenIndex(text, index)];
        var val = Isla.Interpreter.evaluateValue(objToken.c[0], env).val;
        return describeValue(val, env);
      } else {
        return undefined;
      }
    },
  };

  var describeValue = function(unresolvedVal, env) {
    var description = "Has no value.";
    if (unresolvedVal !== undefined) {
      // resolve any refs - non-refs will pass untouched
      val = Isla.Interpreter.resolve(unresolvedVal, env);
      if(Isla.Utils.type(val) === "String") {
        description = "'" + val + "'";
      } else {
        // can't just use Isla's toString - want to exclude _private attrs
        description = "";
        var lines = val.toString().split("\n");
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].indexOf("_") === -1) { // exclude private attrs
            description += lines[i];
            if (i < lines.length - 1) {
              description += "\n";
            }
          }
        }
      }
    }

    return description;
  }

  // hacky fn that returns mhich of main expr tokens the index falls in
  // does not dive below surface into sub tokens
  var getTokenIndex = function(text, index) {
    var tokenIndex;
    var lineNumber = codeAnalyzer.getLineNumber(text, index);
    var line = codeAnalyzer.getLine(text, lineNumber);
    var tokens = codeAnalyzer.expressionTokens(line);
    if (tokens !== undefined) {
      var lineIndex = codeAnalyzer.getLineIndex(text, index);
      tokenIndex = tokens.reduce(function(a, x, i) {
        return lineIndex >= x.index ? i : a;
      }, 0);
    }

    return tokenIndex;
  };

  exports.nodeDescriber = nodeDescriber;
})(typeof exports === 'undefined' ? this : exports)
