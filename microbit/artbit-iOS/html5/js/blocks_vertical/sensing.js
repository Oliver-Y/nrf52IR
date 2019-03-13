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

'use strict';

Blockly.Blocks['sensing_apressed'] = {
  /**
   * Block to report timer
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0": Translation.strings.editor.blocks["pressed?"], 
      "args0": [
      	{
          "type": "field_image",
          "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/sensing_pressa.svg",
          "width": 32,
          "height": 32,
          "alt": "flag",
          "flip_rtl": true
        }
      ],
      "category": Blockly.Categories.sensing,
      "checkboxInFlyout": false,
      "extensions": ["colours_sensing", "output_boolean"]
    });
  }
};

Blockly.Blocks['sensing_bpressed'] = {
  /**
   * Block to report timer
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0":  Translation.strings.editor.blocks["pressed?"], 
      "args0": [
      	{
          "type": "field_image",
          "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/sensing_pressb.svg",
          "width": 32,
          "height": 32,
          "alt": "flag",
          "flip_rtl": true
        }
      ],
      "category": Blockly.Categories.sensing,
      "checkboxInFlyout": false,
      "extensions": ["colours_sensing", "output_boolean"]
    });
  }
};

Blockly.Blocks['sensing_accx'] = {
  /**
   * Block to report timer
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0":  Translation.strings.editor.blocks["tilt"],
      "args0": [
      	{
          "type": "field_image",
          "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/sensing_microbit.svg",
          "width": 32,
          "height": 32,
          "alt": "flag",
          "flip_rtl": true
        }
      ],
      "category": Blockly.Categories.sensing,
      "checkboxInFlyout": false,
      "extensions": ["colours_sensing", "output_number"]
    });
  }
};

Blockly.Blocks['sensing_timer'] = {
  /**
   * Block to report timer
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0": Translation.strings.editor.blocks["timer"], 
      "category": Blockly.Categories.sensing,
      "checkboxInFlyout": false,
      "extensions": ["colours_sensing", "output_number"]
    });
  }
};

Blockly.Blocks['sensing_resett'] = {
  /**
   * Block to reset timer
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0":  Translation.strings.editor.blocks["resettimer"],
      "category": Blockly.Categories.sensing,
      "extensions": ["colours_sensing", "shape_statement"]
    });
  }
};

