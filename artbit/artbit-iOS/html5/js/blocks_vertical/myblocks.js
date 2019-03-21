/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2016 Massachusetts Institute of Technology
 * Modifications Copyright 2018 Playful Invention Company
 * All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
'use strict';

Blockly.Blocks['myblocks_definition'] = {
  /**
   * Block for defining a procedure with no return value.
   * @this Blockly.Block
   */
  init: function() {
    this.setCategory(Blockly.Categories.myblocks);
    this.setColour(Blockly.Colours.more.primary,
    Blockly.Colours.more.secondary,
    Blockly.Colours.more.tertiary);
    this.setNextStatement(true);

    /* Data known about the procedure. */
    this._spec = '';
    this._values = [];
    this._argumentNames = [];
    this._warp = false;
    this._pos = this.xy_;
  },
  mutationToDom: function() {
    var container = document.createElement('mutation');
    container.setAttribute('spec', this._spec);
    container.setAttribute('values', this._values.join(':'));
    let names =  this._argumentNames;
    for (let i=0; i < names.length; i++)  {
  //  	console.log (i, names[i], this._values[i])
    	container.setAttribute(names[i], this._values[i]);
    }
    return container;
  },
  domToMutation: function(xmlElement) {
 // 	console.log (xmlElement)
    this._spec = xmlElement.getAttribute('spec');
   	let cmd = this._spec.split(" ");
   	let prim =	cmd.shift();
   	this._spec = Translation.strings.editor.blocks['define'] + " " + cmd.join(' ');
    this._values = xmlElement.getAttribute('values').split(":");
  //  console.log (this._spec, this._values)
    this._updateDisplay();
  },
 
 	renameField: function (n, field, name, oldMutation){
		var argname  = this._argumentNames[n]
		this._values[n] = name;	
		let newMutation = Blockly.Xml.domToText(this.mutationToDom());
		let val  = new Blockly.Events.BlockChange(this, 'mutation', argname, oldMutation, newMutation)
		Blockly.Events.fire(val);
 	},
 	
  addInput: function (val, type){
  	this._argumentNames.push ("arg" + this._values.length);
    this._values.push (val);
    this._spec = this._spec + " " + type;
		return this.mutationToDom();
  },
  
  getProcedureDef: function(){return this._values[0].replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');},
  
  getNextInputName: function(){
    var inputCount = 0;
    var inputPrefix = "arg";
    while (this._argumentNames.indexOf(inputPrefix+ inputCount) > -1) inputCount++;
    return inputPrefix+ inputCount;
  },

  removeInput: function (val){
    var values = this._values.concat();
    var indx = values.indexOf (val);
    if (indx < 0) return null;
    values.splice(indx, 1);

    var spec = this._spec.split ("%") [0];
    spec = spec +  "%t";
    for (var i=1; i < values.length; i++) spec = spec + " %n";
    this._spec = spec;
    this._values = values;
    return this.mutationToDom();
  },
  
  clearInputs: function (){		
  	for (var i = 0, input; input = this.inputList[i]; i++) {
  	 	if (input.connection && input.connection.isConnected()) {
        input.connection.setShadowDom(null);
        var block = input.connection.targetBlock();
        if (block.isShadow()) block.dispose()
        else block.unplug();
      }
  		input.dispose();
  	}
	  this._argumentNames = [];
  	this.inputList = [];
  },

  _updateDisplay: function() {
    // Split the proc into components, by %n, %b, and %s (ignoring escaped).
    var procComponents = this._spec.split(" ");
		var ws = this.workspace;
		var b = this;
		this.clearInputs();
 
    procComponents = procComponents.map(function(c) {
      return c.trim(); // Strip whitespace.
    });
    var values = this._values.concat();
    var inputPrefix = "arg";
    var inputCount = 0;
    // Create inputs and shadow blocks as appropriate.
    for (var i = 0, component; component = procComponents[i]; i++) {
      var newLabel;
      if (component.substring(0, 1) == '%') {
        var inputType = component.substring(1, 2);
        newLabel = component.substring(2).trim();
        var val = values[inputCount] ? values[inputCount] : null;
        var inputName = inputPrefix + (inputCount++);
        this._argumentNames.push(inputName);
        switch (inputType) {
          case 'n':
       	   var input = this.appendValueInput(inputName);
            var local = this.workspace.newBlock('myblocks_localnumber');
            local.setShadow(false);
 	          local.outputConnection.connect(input.connection);
 	          local._setValue(val);
 	         	local.initSvg();
    				local.render(false);
            break;
          case "t": 
            var val = val ? val : "";
  	 				var fcn =	function(option) {
  	 						if (ws.isFlyout) return '    ';
  	 						var last  = ws.undoStack_[ws.undoStack_.length - 1]
  	 						// remove the typing from the undo stack
  	 						if (last && (last.type == "change") && (b.id == last.blockId) &&
  	 						 (last.name == 'arg0') ) ws.undoStack_.pop();
            		if (this.prev == option) return Blockly.CustomBlocks.handleProcName(ws,b, this, option);
            		else {
            			this.prev = option;
            			return option;
          			}	
          		}  
          	var myfield = new Blockly.FieldTextInput(val, fcn);    		
          	var input = this.appendDummyInput(inputName);  	
            input.appendField(myfield,inputName)
            break;
        }
      } else {
        newLabel = component.trim();
        this.appendDummyInput("label"+i).appendField(newLabel.replace(/\\%/, '%'));
      }
    }

  }
};


Blockly.Blocks['myblocks_procedure'] = {
  /**
   * Block for calling a procedure with no return value.
   * @this Blockly.Block
   */
  init: function() {
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setCategory(Blockly.Categories.myblocks);
    this.setColour(Blockly.Colours.more.primary,
      Blockly.Colours.more.secondary,
      Blockly.Colours.more.tertiary);
    this._spec = '';
    this._values = [];
    this._argumentNames = [];
    this._warp = false;
  },
   mutationToDom: function() {
    var container = document.createElement('mutation');
    container.setAttribute('spec', this._spec);
    container.setAttribute('values', this._values.join(':'));
    let names =  this._argumentNames;
    
    for (let i=0; i < names.length; i++) {
   // 	console.log (i, names[i], this._values[i])
    	container.setAttribute(names[i], this._values[i]);
    } 
    return container;
  },
  domToMutation: function(xmlElement) {
    this._spec = xmlElement.getAttribute('spec');
    this._values = xmlElement.getAttribute('values').split(":");
    this._updateDisplay();
  },
  
  renameProcedure: function(oldName, name) {
  	var field  = this.getInput("input0");
  	if (this._values[0] != oldName) return;
  	var field  = this.getInput("input0");
  	field.fieldRow[0].setText(name);
  	this._values[0] = oldName;
		let oldMutation = Blockly.Xml.domToText(this.mutationToDom());
  	this._values[0] = name;
  	let newMutation = Blockly.Xml.domToText(this.mutationToDom());
  	let val  = new Blockly.Events.BlockChange( this, 'mutation', 'input0', oldMutation, newMutation)
		Blockly.Events.fire(val);
  },
  
  _updateDisplay: function() {
    // Split the proc into components, by %n, %b, and %s (ignoring escaped).
    var procComponents = this._spec.split(" ");
    for (var i = 0, input; input = this.inputList[i]; i++) input.dispose();
  	this.inputList = [];
  	this._argumentNames = [];
    procComponents = procComponents.map(function(c) {
      return c.trim(); // Strip whitespace.
    });
    var values = this._values.concat();
    // Create inputs and shadow blocks as appropriate.
    var inputPrefix = 'input';
    var inputCount = 0;
    for (var i = 0, component; component = procComponents[i]; i++) {
      var newLabel;
      if (component.substring(0, 1) == '%') {
        var inputType = component.substring(1, 2);
        newLabel = component.substring(2).trim();
        var val = values[inputCount] ? values[inputCount] : null;
        var inputName = inputPrefix + (inputCount++);
        this._argumentNames.push(inputName);
        switch (inputType) {
          case 'n':
            var input = this.appendValueInput(inputName);
            var num = this.workspace.newBlock('math_number');
            num.setShadow(true);
            num.outputConnection.connect(input.connection);
            break;
          case 'b':
            var input = this.appendValueInput(inputName);
            input.setCheck('Boolean');
            break;
          case 's':
            var input = this.appendValueInput(inputName);
            var text = this.workspace.newBlock('text');
            text.setShadow(true);
            text.outputConnection.connect(input.connection);
            break;
          case "t":
            newLabel = val.trim();
            this.appendDummyInput(inputName).appendField(newLabel.replace(/\\%/, '%'), inputName);
            break;
        }
      } else {
        newLabel = component.trim();
        this.appendDummyInput().appendField(newLabel.replace(/\\%/, '%'));
      }
    }
  }
};

Blockly.Blocks['myblocks_param'] = {
  /**
   * Block for a parameter.
   * @this Blockly.Block
   */
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabel(), 'paramName');
    this.setPreviousStatement(false);
    this.setNextStatement(false);
    this.setOutput(true);

    this.setCategory(Blockly.Categories.myblocks);
    this.setColour(Blockly.Colours.more.primary,
      Blockly.Colours.more.secondary,
      Blockly.Colours.more.tertiary);
    this._paramName = 'undefined';
    this._shape = 'r';
  },
  /**
   * Create XML to represent the (non-editable) name and arguments.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function() {
    var container = document.createElement('mutation');
    container.setAttribute('paramname', this._paramName);
    container.setAttribute('shape', this._shape); 
    return container;
  },
  /**
   * Parse XML to restore the (non-editable) name and parameters.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function(xmlElement) {
    this._paramName = xmlElement.getAttribute('paramname');
    this._shape = xmlElement.getAttribute('shape');
    this._updateDisplay();
  },
  _updateDisplay: function() {
    this.setFieldValue(this._paramName, 'paramName');
    switch (this._shape) {
      case 'b':
        this.setOutputShape(Blockly.OUTPUT_SHAPE_HEXAGONAL);
        this.setOutput(true, 'Boolean');
        break;
      case 's':
      default:
        this.setOutputShape(Blockly.OUTPUT_SHAPE_ROUND);
        this.setOutput(true, 'String');
        break;
    }
  }
};

Blockly.Blocks['myblocks_localnumber'] = {
  /**
   * Block of Variables
   * @this Blockly.Block
   */
  init: function() {
    this.appendDummyInput().appendField(new Blockly.FieldLabel(), 'varname');
    this.setCategory(Blockly.Categories.myblocks);
    this.setColour(Blockly.Colours.more.secondary,
    Blockly.Colours.more.primary,
    Blockly.Colours.more.tertiary);
    this.setOutputShape(Blockly.OUTPUT_SHAPE_ROUND);
    this.setOutput(true, "Number");
    this._varname = Translation.strings.editor.blocks['box1'];
  },
  mutationToDom: function() {
    var container = document.createElement('mutation');
    container.setAttribute('varname', this._varname);
    return container;
  },
  domToMutation: function(xmlElement) {
    this._varname = xmlElement.getAttribute('varname');
    this._updateDisplay();
  },
  _setValue: function(str) {
    this._varname = str;
    this._updateDisplay();
  },
  _updateDisplay: function() {
    this.setFieldValue(this._varname, 'varname');
  }
};

Blockly.Blocks['myblocks_box'] = {
  /**
   * Block of Variables
   * @this Blockly.Block
   */
  init: function() {
    this.appendDummyInput().appendField(new Blockly.FieldLabel(), 'varname');
    this.setCategory(Blockly.Categories.myblocks);
    this.setColour(Blockly.Colours.more.primary,
    Blockly.Colours.more.secondary,
    Blockly.Colours.more.tertiary);
    this.setOutputShape(Blockly.OUTPUT_SHAPE_ROUND);
    this.setOutput(true, "Number");
    this._varname = '';
  },
  mutationToDom: function() {
    var container = document.createElement('mutation');
    container.setAttribute('varname', this._varname);
    return container;
  },
  domToMutation: function(xmlElement) {
    this._varname = xmlElement.getAttribute('varname');
    let num = this._varname.replace(/\D+/g, '');
    this._varname =  'box' + num;
    this._updateDisplay();
  },
  _updateDisplay: function() {
    this.setFieldValue(Translation.strings.editor.blocks[this._varname], 'varname');
  }
};

Blockly.Blocks['myblocks_setglobal'] = {
  /**
   * Block to set variable to a certain value
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0": Translation.strings.editor.blocks["set"],
      "args0": [
        {
          "type": "field_dropdown",
          "text": Translation.strings.editor.blocks["box1"],
          "name": "VARIABLE",
           "options": [
              [Translation.strings.editor.blocks['box1'], 'box1'],
              [Translation.strings.editor.blocks['box2'], 'box2'],
              [Translation.strings.editor.blocks['box3'], 'box3']
            ]
        },
        {
          "type": "input_value",
          "name": "NUM"
        }
      ],
    "category": Blockly.Categories.myblocks,
    "extensions": ["colours_more", "shape_statement"]
    });
  }
};

Blockly.Blocks['myblocks_changeglobal'] = {
  /**
   * Block to change variable by a certain value
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0": Translation.strings.editor.blocks["change"],
      "args0": [
        {
          "type": "field_dropdown",
          "text": Translation.strings.editor.blocks["box1"],
          "name": "VARIABLE",
           "options": [
              [Translation.strings.editor.blocks['box1'], 'box1'],
              [Translation.strings.editor.blocks['box2'], 'box2'],
              [Translation.strings.editor.blocks['box3'], 'box3']
            ]
        },
        {
          "type": "input_value",
          "name": "NUM"
        }
      ],
    "category": Blockly.Categories.myblocks,
    "extensions": ["colours_more", "shape_statement"]
    });
  }
};

Blockly.Blocks['myblocks_print'] = {
  /**
   * Block to set variable to a certain value
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0": "print %1",
      "args0": [
        {
          "type": "input_value",
          "name": "NUM"
        }
      ],
    "category": Blockly.Categories.myblocks,
    "extensions": ["colours_more", "shape_statement"]
    });
  }
};
