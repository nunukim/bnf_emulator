$(function(){

  // --- 状態管理
  var currentStatus = {}
  window.currentStatus = currentStatus;

  function resetStatus(){
    // 状態をリセットする。

    // BNF を解析する。
    var _ = parseBNF($('#bnf').val()), rules=_[0], err=_[1];

    if(err) {
      $("#error-bnf").text(err);
      $("#bnf").addClass("is-invalid");
      return false;
    } else if (rules.rules.length == 0) {
      $("#error-bnf").text('生成規則が空です');
      $("#bnf").addClass("is-invalid");
      return false;
    } else {
      $("#bnf").removeClass("is-invalid");
    }

    currentStatus.rules = rules;
    currentStatus.history = new GenerationTreeHistory(new NonterminalNode(rules.rules[0].src));

    redraw();
  }

  function applyPreset(){
    // BNF のプリセットを表示する。
    var preset_name = $('#preset-select').val(),
      preset = $('#resource #bnf-preset-' + preset_name).text();
    $('#bnf').val(preset)
  }

  function redraw(){
    var ViewClass = {
      "normal": SimpleView,
      "history": HistoryView,
    }[$("input[name=display-type]:checked").val()]

    var view = new ViewClass($("#view")[0], currentStatus.history, currentStatus.rules);
    view.render();
  }
  
  // --- イベントリスナーの登録
  $('#preset-select').change(function(e){
    applyPreset();
    return false;
  });

  $('#start-button').click(function(e){
    resetStatus();
    return false;
  });

  $('#reset-button').click(function(e){
    applyPreset();
    resetStatus();
    return false;
  });

  $('input[name=display-type]').change(function(e){
    redraw();
  });



  // --- 初期化
  applyPreset();
  resetStatus();
  redraw();
})



// --- 描画エンジンのビュークラス
class GenerationTreeHistoryView extends EventTarget {
  constructor (el, history, rules) {
    super();
    var self = this;
    this.el = el;
    this.history = history;
    this.rules = rules;

    var lstnr = function(){self.onRuleApplied()};
    this.history.addEventListener('ruleApplied', lstnr);
    this.addEventListener('destroy', function(){self.history.removeEventListener('ruleApplied', lstnr)});

    this.init();
  }

  init(){}
  render(){} // Override
  onRuleApplied(){} // Override

  destroy(){
    this.dispatchEvent(new CustomEvent('destroy'));
    this.el.innerHTML = ""
    this.history.removeEventListener('ruleApplied', this.onRuleApplied)
  }
}

class SimpleView extends GenerationTreeHistoryView {
  render() {
    var $el = $(this.el), self=this;

    // まずは全て消す。
    this.el.innerHTML = ""

    // 現在の記号列を表示する。
    var current = this.history.current;
    for(var i=0; i<current.length; i++){
      var node = current[i];
      if(node instanceof NonterminalNode){
        var applicable_rules = this.rules.bySrc[node.content];

        var $sel = $(
          '<select class="nonterm-selector" id="node-' + i + '">' +
          '<option style="display: none;" selected>&lt;' + node.content + '&gt;</option></select>'
        );
        $el.append($sel);

        for(var j=0; j<applicable_rules.length; j++){
          var rule = applicable_rules[j];

          var $opt = $('<option value="rule-' + rule._id + '"/>');

          for(var k=0; k<rule.dst.length; k++){
            var ruleChar = rule.dst[k];
            if(ruleChar.type == 'nonterm'){
              $opt.append("&lt;"+_escapeHTML(ruleChar.content)+"&gt;")
            }else{
              $opt.append("'"+_escapeHTML(ruleChar.content)+"'")
            }
          }
          $sel.append($opt)
        }
      } else if (node instanceof TerminalNode) {
        var $span = $('<span class="badge badge-light">')
        $span.html(_escapeHTML(node.content))
        $el.append($span)
      }

    }

    $el.find('select.nonterm-selector').on('change', function(e){
      var node_index = parseInt(e.target.id.match(/node-(\d+)/)[1]),
        node = self.history.current[node_index],
        $targ = $(e.target),
        rule_id = parseInt($targ.val().match(/rule-(\d+)/)[1]),
        rule = self.rules.byId[rule_id];

      self.history.applyRule(node, rule);

    })
  }

  onRuleApplied(){
    this.render();
  }

}

class HistoryView extends GenerationTreeHistoryView {
  render() {
    var $el = $(this.el), self=this;

    // まずは全て消す。
    this.el.innerHTML = ""

    // これまでの記号列を表示する
    console.log(this.history.history.length)
    for(var i=0; i<this.history.history.length-1; i++){
      var $row = $('<p></p>'),
        hist = this.history.history[i];

      for(var j=0; j<hist.length; j++){
        var node = hist[j],
          $span = $('<span class="badge">');
        if(node instanceof NonterminalNode){
          $span.html('&lt;'+_escapeHTML(node.content)+'&gt;')
          if(node._children){
            $span.addClass('badge-primary')
          } else {
            $span.addClass('badge-secondary')
          }
        } else if (node instanceof TerminalNode) {
          $span.addClass('badge-light')
          $span.html(_escapeHTML(node.content))
        }
        $row.append($span)
      }
      $el.append($row)

    }

    // 現在の記号列を表示する。
    var current = this.history.current;
    for(var i=0; i<current.length; i++){
      var node = current[i];
      if(node instanceof NonterminalNode){
        var applicable_rules = this.rules.bySrc[node.content];

        var $sel = $(
          '<select class="nonterm-selector" id="node-' + i + '">' +
          '<option style="display: none;" selected>&lt;' + node.content + '&gt;</option></select>'
        );
        $el.append($sel);

        for(var j=0; j<applicable_rules.length; j++){
          var rule = applicable_rules[j];

          var $opt = $('<option value="rule-' + rule._id + '"/>');

          for(var k=0; k<rule.dst.length; k++){
            var ruleChar = rule.dst[k];
            if(ruleChar.type == 'nonterm'){
              $opt.append("&lt;"+_escapeHTML(ruleChar.content)+"&gt;")
            }else{
              $opt.append("'"+_escapeHTML(ruleChar.content)+"'")
            }
          }
          $sel.append($opt)
        }
      } else if (node instanceof TerminalNode) {
        var $span = $('<span class="badge badge-light">')
        $span.html(_escapeHTML(node.content))
        $el.append($span)
      }

    }

    $el.find('select.nonterm-selector').on('change', function(e){
      var node_index = parseInt(e.target.id.match(/node-(\d+)/)[1]),
        node = self.history.current[node_index],
        $targ = $(e.target),
        rule_id = parseInt($targ.val().match(/rule-(\d+)/)[1]),
        rule = self.rules.byId[rule_id];

      self.history.applyRule(node, rule);
    })
  }

  onRuleApplied(){
    this.render();
  }
}




// --- イベント
class RuleApplied extends CustomEvent {
  constructor (){
    super('ruleApplied', {})
  }
}

// --- 生成する構文木のモデル
class GenerationTreeHistory extends EventTarget {
  constructor (rootNode){
    super();
    if(!(rootNode instanceof NonterminalNode)){
      throw 'root node must be nonterminal character'
    }
    this.rootNode = rootNode;

    this._allNodes = [rootNode];
    this.current = [rootNode];
    this.history = [this.current];

  }

  applyRule (node, rule) {
    if(!(node instanceof NonterminalNode)){
      throw 'cannot apply rules to terminal character'
    }

    if(node.content != rule.src){
      throw 'cannot apply rules: name mismatch'
    }
    
    var idx = this.current.indexOf(node);
    if(idx < 0){
      throw 'cannot apply rules to inactive node'
    }

    var newNodes = rule.generateNodes();
    for(var i=0; i<newNodes; i++){
      newNodes[i]._parent = node;
    }
    node._children = newNodes;

    var prev = this.current;
    this.current = prev.slice(0,idx).concat(newNodes, prev.slice(idx+1));
    this.history.push(this.current);

    this.dispatchEvent(new RuleApplied())
  }
}

class Node {
  constructor(content){
    this._parent = null;
    this._children = null;
    this.content = content;
  }
};
class NonterminalNode extends Node { };
class TerminalNode extends Node { };


// --- 生成規則のモデル
class Rules {
  constructor() {
    // 生成規則の集合
    this.rules = [];
    this.byId = {};
    this.bySrc = {};

    var _incId = 0;
    this.addRule = function(rule){
      rule._id = _incId++;
      this.rules.push(rule);
      this.byId[rule._id] = rule;
      if(!this.bySrc[rule.src]){
        this.bySrc[rule.src] = [];
      }
      this.bySrc[rule.src].push(rule);
    }
  }
}
class Rule {
  // 1 つの生成規則。(非終端記号, 生成される記号列) のペア。
  constructor(src) {
    this._id = null;
    this.src = src;
    this.dst = []
  }

  addChar(ruleChar) {
    this.dst.push(ruleChar);
  }
  generateNodes() {
    var ret = [];
    for(var i=0; i<this.dst.length; i++){
      var d = this.dst[i];
      if(d.type == 'nonterm') {
        ret.push(new NonterminalNode(d.content))
      } else if (d.type == 'term'){
        ret.push(new TerminalNode(d.content))
      } else {
        throw "Something's wrong"
      }
    }
    return ret;
  }
}
class RuleChar {
  // 生成規則で生成される記号列における1つの記号(終端・非終端)
  constructor(type, content) {
    this.type = type;
    this.content = content;
  }
}

// --- Utility functions
var BNF_TOKEN_REGEX = {
  "nonterm": /^<[A-Za-z][A-Za-z_-]*>/,
  "term": /^'(?:[^'\\]|[\\]'|[\\][\\])*'/,
  "assign": /^::=/,
  "alt": /^[|]/,
  "ws": /^\s+/,
  "eos": /^$/,
},
  BNF_TOKEN_EXTRACT_CONTENT = {
    "nonterm": function(s){return s.substring(1,s.length-1);},
    "term": function(s){return s.substring(1,s.length-1).replace("\\'", "'").replace("\\\\", "\\");},
  };

function parseBNF(str){
  // --- BNF を解析して規則を抽出する。

  // --- Tokenization
  var tokens = [];
  for(var idx=0;;){
    var hit = null,
      sub = str.substring(idx);
    for(t in BNF_TOKEN_REGEX){
      var m = sub.match(BNF_TOKEN_REGEX[t]);
      if(m && m.index==0){
        hit = {
          type: t,
          text: m[0],
          index: idx,
        };
        if(BNF_TOKEN_EXTRACT_CONTENT[t]){
          hit.content = BNF_TOKEN_EXTRACT_CONTENT[t](hit.text);
        }
        break;
      }
    }
    if(hit){
      if(hit.type == 'eos'){
        break;
      }else if(hit.type != 'ws'){
        tokens.push(hit);
      }
      idx += hit.text.length;
    }else{
      return [null, _get_string_location(str, idx).message + ' 不正な文字列です: ' + sub.split(/\n/)[0].substring(0,10)];
    }
  }
  var original_tokens = tokens.slice();

  // --- Parsing
  var rules = new Rules(),
    already_defined_nonterm = {},
    current_rule = null;
  while(tokens[0]){
    var t0 = tokens.shift();

    if (tokens[0] && tokens[0].type=='assign') {
      // <nonterm> ::= の形
      var t1 = tokens.shift(), t2 = tokens.shift();
      if (t0.type != 'nonterm') {
        return [null, _get_string_location(str, t0.index).message + ' ::= の左辺は非終端記号でなければなりません'];
      }
      if (!t2) {
        return [null, _get_string_location(str, t1.index).message + ' ::= の右辺がありません'];
      }
      if (t2.type != 'nonterm' && t2.type != 'term') {
        return [null, _get_string_location(str, t1.index).message + ' ::= の右辺は記号列でなければなりません'];
      }

      if (already_defined_nonterm[t0.content]) {
        return [null, _get_string_location(str, t0.index).message + ' 定義が重複しています: ' + t0.content];
      } else {
        already_defined_nonterm[t0.content] = true;
      }

      current_rule = new Rule(t0.content);
      current_rule.addChar(new RuleChar(t2.type, t2.content));
      rules.addRule(current_rule);

    } else if (t0.type=='alt') {
      // | <xxx> の形

      var t1 = tokens.shift();
      if (!t1) {
        return [null, _get_string_location(str, t0.index).message + ' 末尾が | で終了しています'];
      }
      if (t1.type!='nonterm' && t1.type!='term') {
        return [null, _get_string_location(str, t1.index).message + ' | の後は記号列でなければなりません'];
      }
      if (!current_rule) {
        return [null, _get_string_location(str, t1.index).message + ' 先頭が | で始まっています'];
      }

      current_rule = new Rule(current_rule.src);
      current_rule.addChar(new RuleChar(t1.type, t1.content));
      rules.addRule(current_rule);

    } else if (t0.type=='nonterm' || t0.type=='term') {
      // <xxx> の形
      if (!current_rule) {
        return [null, _get_string_location(str, t0.index).message + ' ::= がありません'];
      }

      current_rule.addChar(new RuleChar(t0.type, t0.content));

    } else {
      return [null, _get_string_location(str, t0.index).message + ' 不正な記号です: ' + t0.text];
    }
  }


  // 全ての非終端記号が定義されているかチェック
  for(var i=0; i<original_tokens.length; i++) {
    var token = original_tokens[i];
    if (token.type=='nonterm' && !rules.bySrc[token.content]) {
      return [null, _get_string_location(str, token.index).message + ' 非終端記号が未定義です' + token.text];
    }
  }

  return [rules, null]
}

function _get_string_location(str, idx){
  // 文字列の位置から何行目の何文字目かを返す。
  var sp = str.substring(0,idx).split(/\n/),
    row= sp.length - 1,
    col= sp[sp.length-1].length;
  return {
    row: row,
    col: col,
    message: '['+row+'行目'+col+'文字目]',
  };
}
function _escapeHTML(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/ /g, '&nbsp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
