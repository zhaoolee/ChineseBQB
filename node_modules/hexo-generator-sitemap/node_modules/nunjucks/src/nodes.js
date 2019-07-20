'use strict';

var lib = require('./lib');
// jshint -W079
var Object = require('./object');

function traverseAndCheck(obj, type, results) {
    if(obj instanceof type) {
        results.push(obj);
    }

    if(obj instanceof Node) {
        obj.findAll(type, results);
    }
}

var Node = Object.extend('Node', {
    init: function(lineno, colno) {
        this.lineno = lineno;
        this.colno = colno;

        var fields = this.fields;
        for(var i = 0, l = fields.length; i < l; i++) {
            var field = fields[i];

            // The first two args are line/col numbers, so offset by 2
            var val = arguments[i + 2];

            // Fields should never be undefined, but null. It makes
            // testing easier to normalize values.
            if(val === undefined) {
                val = null;
            }

            this[field] = val;
        }
    },

    findAll: function(type, results) {
        results = results || [];

        var i, l;
        if(this instanceof NodeList) {
            var children = this.children;

            for(i = 0, l = children.length; i < l; i++) {
                traverseAndCheck(children[i], type, results);
            }
        }
        else {
            var fields = this.fields;

            for(i = 0, l = fields.length; i < l; i++) {
                traverseAndCheck(this[fields[i]], type, results);
            }
        }

        return results;
    },

    iterFields: function(func) {
        lib.each(this.fields, function(field) {
            func(this[field], field);
        }, this);
    }
});

// Abstract nodes
var Value = Node.extend('Value', { fields: ['value'] });

// Concrete nodes
var NodeList = Node.extend('NodeList', {
    fields: ['children'],

    init: function(lineno, colno, nodes) {
        this.parent(lineno, colno, nodes || []);
    },

    addChild: function(node) {
        this.children.push(node);
    }
});

var Root = NodeList.extend('Root');
var Literal = Value.extend('Literal');
var Symbol = Value.extend('Symbol');
var Group = NodeList.extend('Group');
var Array = NodeList.extend('Array');
var Pair = Node.extend('Pair', { fields: ['key', 'value'] });
var Dict = NodeList.extend('Dict');
var LookupVal = Node.extend('LookupVal', { fields: ['target', 'val'] });
var If = Node.extend('If', { fields: ['cond', 'body', 'else_'] });
var IfAsync = If.extend('IfAsync');
var InlineIf = Node.extend('InlineIf', { fields: ['cond', 'body', 'else_'] });
var For = Node.extend('For', { fields: ['arr', 'name', 'body', 'else_'] });
var AsyncEach = For.extend('AsyncEach');
var AsyncAll = For.extend('AsyncAll');
var Macro = Node.extend('Macro', { fields: ['name', 'args', 'body'] });
var Caller = Macro.extend('Caller');
var Import = Node.extend('Import', { fields: ['template', 'target', 'withContext'] });
var FromImport = Node.extend('FromImport', {
    fields: ['template', 'names', 'withContext'],

    init: function(lineno, colno, template, names, withContext) {
        this.parent(lineno, colno,
                    template,
                    names || new NodeList(), withContext);
    }
});
var FunCall = Node.extend('FunCall', { fields: ['name', 'args'] });
var Filter = FunCall.extend('Filter');
var FilterAsync = Filter.extend('FilterAsync', {
    fields: ['name', 'args', 'symbol']
});
var KeywordArgs = Dict.extend('KeywordArgs');
var Block = Node.extend('Block', { fields: ['name', 'body'] });
var Super = Node.extend('Super', { fields: ['blockName', 'symbol'] });
var TemplateRef = Node.extend('TemplateRef', { fields: ['template'] });
var Extends = TemplateRef.extend('Extends');
var Include = Node.extend('Include', { fields: ['template', 'ignoreMissing'] });
var Set = Node.extend('Set', { fields: ['targets', 'value'] });
var Output = NodeList.extend('Output');
var Capture = Node.extend('Capture', { fields: ['body'] });
var TemplateData = Literal.extend('TemplateData');
var UnaryOp = Node.extend('UnaryOp', { fields: ['target'] });
var BinOp = Node.extend('BinOp', { fields: ['left', 'right'] });
var In = BinOp.extend('In');
var Or = BinOp.extend('Or');
var And = BinOp.extend('And');
var Not = UnaryOp.extend('Not');
var Add = BinOp.extend('Add');
var Concat = BinOp.extend('Concat');
var Sub = BinOp.extend('Sub');
var Mul = BinOp.extend('Mul');
var Div = BinOp.extend('Div');
var FloorDiv = BinOp.extend('FloorDiv');
var Mod = BinOp.extend('Mod');
var Pow = BinOp.extend('Pow');
var Neg = UnaryOp.extend('Neg');
var Pos = UnaryOp.extend('Pos');
var Compare = Node.extend('Compare', { fields: ['expr', 'ops'] });
var CompareOperand = Node.extend('CompareOperand', {
    fields: ['expr', 'type']
});

var CallExtension = Node.extend('CallExtension', {
    fields: ['extName', 'prop', 'args', 'contentArgs'],

    init: function(ext, prop, args, contentArgs) {
        this.extName = ext._name || ext;
        this.prop = prop;
        this.args = args || new NodeList();
        this.contentArgs = contentArgs || [];
        this.autoescape = ext.autoescape;
    }
});

var CallExtensionAsync = CallExtension.extend('CallExtensionAsync');

// Print the AST in a nicely formatted tree format for debuggin
function printNodes(node, indent) {
    indent = indent || 0;

    // This is hacky, but this is just a debugging function anyway
    function print(str, indent, inline) {
        var lines = str.split('\n');

        for(var i=0; i<lines.length; i++) {
            if(lines[i]) {
                if((inline && i > 0) || !inline) {
                    for(var j=0; j<indent; j++) {
                        process.stdout.write(' ');
                    }
                }
            }

            if(i === lines.length-1) {
                process.stdout.write(lines[i]);
            }
            else {
                process.stdout.write(lines[i] + '\n');
            }
        }
    }

    print(node.typename + ': ', indent);

    if(node instanceof NodeList) {
        print('\n');
        lib.each(node.children, function(n) {
            printNodes(n, indent + 2);
        });
    }
    else if(node instanceof CallExtension) {
        print(node.extName + '.' + node.prop);
        print('\n');

        if(node.args) {
            printNodes(node.args, indent + 2);
        }

        if(node.contentArgs) {
            lib.each(node.contentArgs, function(n) {
                printNodes(n, indent + 2);
            });
        }
    }
    else {
        var nodes = null;
        var props = null;

        node.iterFields(function(val, field) {
            if(val instanceof Node) {
                nodes = nodes || {};
                nodes[field] = val;
            }
            else {
                props = props || {};
                props[field] = val;
            }
        });

        if(props) {
            print(JSON.stringify(props, null, 2) + '\n', null, true);
        }
        else {
            print('\n');
        }

        if(nodes) {
            for(var k in nodes) {
                printNodes(nodes[k], indent + 2);
            }
        }

    }
}

// var t = new NodeList(0, 0,
//                      [new Value(0, 0, 3),
//                       new Value(0, 0, 10),
//                       new Pair(0, 0,
//                                new Value(0, 0, 'key'),
//                                new Value(0, 0, 'value'))]);
// printNodes(t);

module.exports = {
    Node: Node,
    Root: Root,
    NodeList: NodeList,
    Value: Value,
    Literal: Literal,
    Symbol: Symbol,
    Group: Group,
    Array: Array,
    Pair: Pair,
    Dict: Dict,
    Output: Output,
    Capture: Capture,
    TemplateData: TemplateData,
    If: If,
    IfAsync: IfAsync,
    InlineIf: InlineIf,
    For: For,
    AsyncEach: AsyncEach,
    AsyncAll: AsyncAll,
    Macro: Macro,
    Caller: Caller,
    Import: Import,
    FromImport: FromImport,
    FunCall: FunCall,
    Filter: Filter,
    FilterAsync: FilterAsync,
    KeywordArgs: KeywordArgs,
    Block: Block,
    Super: Super,
    Extends: Extends,
    Include: Include,
    Set: Set,
    LookupVal: LookupVal,
    BinOp: BinOp,
    In: In,
    Or: Or,
    And: And,
    Not: Not,
    Add: Add,
    Concat: Concat,
    Sub: Sub,
    Mul: Mul,
    Div: Div,
    FloorDiv: FloorDiv,
    Mod: Mod,
    Pow: Pow,
    Neg: Neg,
    Pos: Pos,
    Compare: Compare,
    CompareOperand: CompareOperand,

    CallExtension: CallExtension,
    CallExtensionAsync: CallExtensionAsync,

    printNodes: printNodes
};
