/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2016 Massachusetts Institute of Technology
 * Modifications Copyright 2018 Kids Code Jeunesse
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
 
Blockly.Blocks['lights_clean'] = {
  init: function() {
    this.jsonInit({
      "message0": Translation.strings.editor.blocks["clean"],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
  }
};

Blockly.Blocks['lights_nextshape'] = {
  init: function() {
    this.jsonInit({
      "message0":  Translation.strings.editor.blocks["nextshape"],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
  }
};

Blockly.Blocks['lights_previousshape'] = {
  init: function() {
    this.jsonInit({
      "message0": Translation.strings.editor.blocks["previousshape"],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
  }
};

Blockly.Blocks['lights_scroll'] = {
  init: function() {
    this.jsonInit({
      "message0": Translation.strings.editor.blocks["scroll"],
        "args0": [
          {
            "type": "field_dropdown",
            "name": "SCROLL_OPTION",
            "options": [
             	[Translation.strings.editor.blocks['menu_left'], 'left'],
              [Translation.strings.editor.blocks['menu_right'], 'right'],
              [Translation.strings.editor.blocks['menu_up'], 'up'],
              [Translation.strings.editor.blocks['menu_down'], 'down']
            ]
          }
        ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
  }
};

Blockly.Blocks['lights_setshape'] = {
  init: function() {
    this.jsonInit({
      "message0":  Translation.strings.editor.blocks["setshape"],
      "args0": [
        {
          "type": "input_value",
          "name": "NUM"
        }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
    
  }

};

Blockly.Blocks['lights_doton'] = {
  init: function() {
    this.jsonInit({
      "message0": Translation.strings.editor.blocks["turnon"],
      "args0": [
        {
          "type": "input_value",
          "name": "X"
        },   
        {
          "type": "input_value",
          "name": "Y"
        }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });   
  }
};

Blockly.Blocks['lights_dotoff'] = {
  init: function() {
    this.jsonInit({
      "message0": Translation.strings.editor.blocks["turnoff"],
      "args0": [
        {
          "type": "input_value",
          "name": "X"
        },   
        {
          "type": "input_value",
          "name": "Y"
        }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });   
  }
};

Blockly.Blocks['lights_setpace'] = {
  init: function() {
    this.jsonInit({
      "message0": Translation.strings.editor.blocks["setpace"],
      "args0": [
           {
            "type": "field_dropdown",
            "name": "PACE_OPTION",
            "options": [
             	[Translation.strings.editor.blocks['menu_slow'], '1'],
              [Translation.strings.editor.blocks['menu_medium'], '0.5'],
              [Translation.strings.editor.blocks['menu_fast'], '0.1'],
              [Translation.strings.editor.blocks['menu_instant'], '0']
            ]
          }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
    
  }

};

Blockly.Blocks['lights_brightness'] = {
  /**
   * Block for positive number value, with decimal.
   * @this Blockly.Block
   */
  init: function() {
  	let fcn  = function(option) {return Math.max (1, Math.min(option, 100));}  
    this.jsonInit({
      "message0": "%1",
      "args0": [
        {
          "type": "field_number",
          "name": "NUM",
          "min": 1,
          "max": 100,
          "value": 100,
          'precision': 1,
          "validator": fcn
        }
      ],
      "output": "Number",
      "outputShape": Blockly.OUTPUT_SHAPE_ROUND,
      "colour": Blockly.Colours.motion.primary,
      "colourSecondary": Blockly.Colours.textField,
      "colourTertiary": Blockly.Colours.textField
    });
  }
};

Blockly.Blocks['lights_shape'] = {
  init: function() {
    this.jsonInit({
      "message0":  Translation.strings.editor.blocks["shape"],
      "category": Blockly.Categories.motion,
      "checkboxInFlyout": false,
   	  "extensions": ["colours_motion", "output_number"]  
    });
 
  }

};


Blockly.Blocks['lights_setbrightness'] = {
  init: function() {
    this.jsonInit({
      "message0":  Translation.strings.editor.blocks["setbrightness"],
      "args0": [
        {
          "type": "input_value",
          "name": "NUM"
        }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
    
  }

};

Blockly.Blocks['lights_print'] = {
  init: function() {
    this.jsonInit({
      "message0": Translation.strings.editor.blocks["print"],
      "args0": [
        {
          "type": "input_value",
          "name": "TEXT"
        }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
    
  }

};
