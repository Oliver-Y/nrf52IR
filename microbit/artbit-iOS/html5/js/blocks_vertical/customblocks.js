/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 * Modifications Copyright 2018 Playful Invention Company
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

Blockly.CustomBlocks = Blockly.CustomBlocks || {}

Blockly.MINE_CATEGORY_NAME = 'MYBLOCKS';
Blockly.CustomBlocks.PROC_DEFAULT = '    ';

Blockly.CustomBlocks.getProcedures = function(w) {
  var blocks = w.getTopBlocks(false);
  var res = [];
  for (var i = 0; i <  blocks.length; i++) {
    var block = blocks[i];
    if (block.type != 'myblocks_definition') continue;
    var spec = block["_spec"];
    var values = block["_values"];
    var name =  values[0].replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
    if (name == "") continue;
    res.push(block);
  }
  return res;
};

/**
 * Construct the blocks required by the flyout for the variable category.
 * @param {!Blockly.Workspace} workspace The workspace contianing variables.
 * @return {!Array.<!Element>} Array of XML block elements.
 */
Blockly.CustomBlocks.flyoutCategory = function(workspace) {
  var xmlList =  Blockly.CustomBlocks.getProcDefs(workspace);
  xmlList =  xmlList.concat(Blockly.CustomBlocks.getVarDefs(workspace));
  // add a print
  /*
  var block = document.createElement('block');
  block.setAttribute('type', 'myblocks_print');
  block.appendChild(Blockly.CustomBlocks.createMathNumberDom_("1"));
  xmlList.push(block);
  */
  return xmlList;
}

Blockly.CustomBlocks.getProcDefs = function(workspace) {
  var xmlList = [];
  var procblocks =  Blockly.CustomBlocks.getProcedures(workspace);
  if (Blockly.Blocks['myblocks_definition']) {
    var block = document.createElement('block');
    block.setAttribute('type', 'myblocks_definition');
    var mut = document.createElement('mutation');
    block.appendChild(mut);
    mut.setAttribute('spec', Translation.strings.editor.blocks['define']+ " %t");
  	mut.setAttribute('values', Blockly.CustomBlocks.PROC_DEFAULT);
    block.setAttribute('gap', 32);
    xmlList.push(block);
  }

  for (var i = 0; i < procblocks.length; i++) {
    var block = procblocks[i];
    if (block.type != 'myblocks_definition') continue;
    let defkey =  Translation.strings.editor.blocks['define'];
    var spec = block["_spec"].split(defkey +" ")[1];
    var values = block["_values"].concat();
    var pname  = values[0];
    values = values.length > 1 ? values.join(":") : values;
    var block = document.createElement('block');
    block.setAttribute('type', 'myblocks_procedure');
    var mut = document.createElement('mutation');
    block.appendChild(mut);
    mut.setAttribute('spec', spec);
    mut.setAttribute('values', values);
    block.setAttribute('gap', 8);
    xmlList.push(block);
  }

  return xmlList;
}

Blockly.CustomBlocks.getVarDefs = function(workspace) {
  var xmlList = [];
  var variableList = workspace.getAllVariables();
  variableList.sort(caseInsensitiveCompare);
   if (variableList.length > 0) { // The button is always there.
  //  xmlList[xmlList.length - 1].setAttribute('gap', 24);
    if (Blockly.Blocks['myblocks_setglobal']) {
      // <block type="myblocks_setvariableto" gap="20">
      //   <value name="VARIABLE">
      //    <shadow type="myblocks_variablemenu"></shadow>
      //   </value>
      //   <value name="VALUE">
      //     <shadow type="text">
      //       <field name="TEXT">0</field>
      //     </shadow>
      //   </value>
      // </block>
      var block = document.createElement('block');
      block.setAttribute('type', 'myblocks_setglobal');  
   	  block.appendChild(Blockly.CustomBlocks.createFieldDom_(variableList[0].name));
      block.appendChild(Blockly.CustomBlocks.createMathNumberDom_("0"));
      block.setAttribute('gap', 8);
      xmlList.push(block);
    }
    if (Blockly.Blocks['myblocks_changeglobal']) {
      // <block type="myblocks_changevariableby">
      //   <value name="VARIABLE">
      //    <shadow type="myblocks_variablemenu"></shadow>
      //   </value>
      //   <value name="VALUE">
      //     <shadow type="math_number">
      //       <field name="NUM">0</field>
      //     </shadow>
      //   </value>
      // </block>
      var block = document.createElement('block');
      block.setAttribute('type', 'myblocks_changeglobal');
      block.setAttribute('gap', 8);
   //   block.appendChild(Blockly.CustomBlocks.createFieldDom_(variableList[0].name));
      block.appendChild(Blockly.CustomBlocks.createMathNumberDom_("1"));
      xmlList.push(block);
    }
    xmlList[xmlList.length - 1].setAttribute('gap', 24); // PB MODIFICATION

    for (var i = 0; i < variableList.length; i++) {
      if (Blockly.Blocks['myblocks_box']) {
        // <block type="myblocks_box">
        //   <mutation varname="%1"> </mutation>
        // </block>
        var block = document.createElement('block');
        block.setAttribute('type', 'myblocks_box');
        var mut = document.createElement('mutation');
        block.appendChild(mut);
        mut.setAttribute('varname', variableList[i].name);
        block.setAttribute('gap', 8);
        xmlList.push(block);
      }
    }
  }
  return xmlList;
  
  function caseInsensitiveCompare (str1, str2) {
		var test1 = String(str1).toLowerCase();
		var test2 = String(str2).toLowerCase();

		if (test1 < test2)  return -1;
		else if (test1 == test2)return 0;
		else return 1;
	}
};

Blockly.CustomBlocks.createFieldDom_ = function(val) {
  var field = document.createElement('field');
  field.setAttribute('name', 'VARIABLE');
  field.textContent = val;
  return field;
}

/**
 * Create a dom element for a value tag with the given name attribute.
 * @param {string} name The value to use for the name attribute.
 * @return {!Element} An XML element: <value name="name"></value>
 */
Blockly.CustomBlocks.createValueDom_ = function(name) {
  var value = document.createElement('value');
  value.setAttribute('name', name);
  return value;
};

/**
 * Create a dom element for a shadow tag with the given tupe attribute.
 * @param {string} type The value to use for the type attribute.
 * @param {string} value The value to have inside the tag.
 * @return {!Element} An XML element: <shadow type="type">value</shadow>
 */
Blockly.CustomBlocks.createShadowDom_ = function(type) {
  var shadow = document.createElement('shadow');
  shadow.setAttribute('type', type);
  return shadow;
};

/**
 * Create a dom element for value tag with a shadow text inside.
 * @return {!Element} An XML element.
 */
Blockly.CustomBlocks.createTextDom_ = function() {
  //   <value name="VALUE">
  //     <shadow type="text">
  //       <field name="TEXT">0</field>
  //     </shadow>
  //   </value>
  var value = Blockly.CustomBlocks.createValueDom_('NUM');
  var shadow = Blockly.CustomBlocks.createShadowDom_('text');
  var field = document.createElement('field', null, '0');
  field.setAttribute('name', 'TEXT');
  shadow.appendChild(field);
  value.appendChild(shadow);
  return value;
};

/**
 * Create a dom element for value tag with a shadow number inside.
 * @return {!Element} An XML element.
 */
Blockly.CustomBlocks.createMathNumberDom_ = function(n) {
  //   <value name="VALUE">
  //     <shadow type="math_number">
  //       <field name="NUM">0</field>
  //     </shadow>
  //   </value>
  var value = Blockly.CustomBlocks.createValueDom_('NUM');
  var shadow = Blockly.CustomBlocks.createShadowDom_('math_number');
  var field = document.createElement('field', null, n);
  field.setAttribute('name', 'NUM');
  field.textContent =  n;
  shadow.appendChild(field);
  value.appendChild(shadow);
  return value;
};

/**
 * Return the text that should be used in a field_variable or
 * field_variable_getter when no variable exists.
 * TODO: #572
 * @return {string} The text to display.
 */
Blockly.CustomBlocks.noVariableText = function() {
  return "No variable selected";
};



/**
 * Create a new variable on the given workspace.
 * @param {!Blockly.Workspace} workspace The workspace on which to create the
 *     variable.
 * @param {function(?string=)=} opt_callback A callback. It will
 *     be passed an acceptable new variable name, or null if change is to be
 *     aborted (cancel button), or undefined if an existing variable was chosen.
 */
Blockly.CustomBlocks.createVariable = function(workspace, opt_callback) {
  var promptAndCheckWithAlert = function(defaultName) {
    Blockly.CustomBlocks.promptName(Blockly.Msg.NEW_VARIABLE_TITLE, defaultName,
      function(text) {
        if (text) {
          if (workspace.variableIndexOf(text) != -1) {
            Blockly.alert(Blockly.Msg.VARIABLE_ALREADY_EXISTS.replace('%1',
                text.toLowerCase()),
                function() {
                  promptAndCheckWithAlert(text);  // Recurse
                });
          } else {
            workspace.createVariable(text);
            if (opt_callback) {
              opt_callback(text);
            }
          }
        } else {
          // User canceled prompt without a value.
          if (opt_callback) {
            opt_callback(null);
          }
        }
      });
  };
  promptAndCheckWithAlert('');
};


/**
 * Prompt the user for a new variable name.
 * @param {string} promptText The string of the prompt.
 * @param {string} defaultText The default value to show in the prompt's field.
 * @param {function(?string)} callback A callback. It will be passed the new
 *     variable name, or null if the user picked something illegal.
 */
Blockly.CustomBlocks.promptName = function(promptText, defaultText, callback) {
  Blockly.prompt(promptText, defaultText, function(newVar) {
    // Merge runs of whitespace.  Strip leading and trailing whitespace.
    // Beyond this, all names are legal.
    if (newVar) {
      newVar = newVar.replace(/[\s\xa0]+/g, ' ').replace(/^ | $/g, '');
      if (newVar == Blockly.Msg.RENAME_VARIABLE ||
          newVar == Blockly.Msg.NEW_VARIABLE) {
        // Ok, not ALL names are legal...
        newVar = null;
      }
    }
    callback(newVar);
  });
};



////////////

Blockly.CustomBlocks.handleProcName = function(w, b, field, val) {
	let oldMutation = Blockly.Xml.domToText(b.mutationToDom());
  var indx = 0;
  var argname = b._argumentNames[indx];
  var newname = val.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
  var oldname = b._values[indx].replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
  var name = null;
	if ((newname =="") && (oldname =="")) return null;
	else if ((newname =="") && (oldname !=""))  {
	 	console.log ("revert name");
	 	return null
	}
	Blockly.Events.setGroup(true);
	if ((newname !="") && (oldname =="")) {
	  name = Blockly.CustomBlocks.createCall(w, b, indx, newname);
	}
	else if (newname != oldname) {
		name = Blockly.CustomBlocks.renameProcAndCalls(w, b, indx, oldname, newname)
	}
	if (name) b.renameField (indx, field, name, oldMutation)
  Blockly.Events.setGroup(false);
  return name
}

Blockly.CustomBlocks.createCall = function (w, b, indx, val){
  var name = Blockly.CustomBlocks.validate (val, w, b);
  var oldname = b._values[indx];
  b._values[indx] = name;
  return name;
}

Blockly.CustomBlocks.renameProcAndCalls = function(w, b,indx, oldName, val) {
  var name = Blockly.CustomBlocks.validate (val, w, b);
  var oldname = b._values[indx];
  var argname = b._argumentNames[indx];
  b._values[indx] = name;
  if (oldname != name && oldname != val) {
    var blocks = w.getAllBlocks();
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].renameProcedure) {
        blocks[i].renameProcedure(oldname, name);
      }
    }
  }
 return name;
};

Blockly.CustomBlocks.validate = function(name, workspace, block) {
  while (!Blockly.CustomBlocks.uniqueName(name, workspace, block)) {
    // Collision with another procedure.
    var r = name.match(/^(.*?)(\d+)$/);
    if (!r) {
      name += '2';
    } else {
      name = r[1] + (parseInt(r[2], 10) + 1);
    }
  }
  return name;
};

Blockly.CustomBlocks.uniqueName = function(name, workspace, opt_exclude) {
  var blocks = workspace.getAllBlocks();
  // Iterate through every block and check the name.
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i] == opt_exclude) {
      continue;
    }
    if (blocks[i].getProcedureDef) {
      var procName = blocks[i].getProcedureDef();
      if (Blockly.Names.equals(procName, name)) {
        return false;
      }
    }
  }
  return true;
};

