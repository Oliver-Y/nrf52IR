/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2016 Massachusetts Institute of Technology
 * Modifications Copyright 2017 Playful Invention Company
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
 *
 * Paula Bonta merged node modules adapter, mutation-adapter, xml-escape, htmlparser2 
 * with no node.js dependency
*/

Adapter = function(){}

/**
 * Convert outer blocks DOM from a Blockly CREATE event
 * to a usable form for the Scratch runtime.
 * This structure is based on Blockly xml.js:`domToWorkspace` and `Adapter.domToBlock`.
 * @param {Element} blocksDOM DOM tree for this event.
 * @return {Array.<object>} Usable list of blocks from this CREATE event.
 */
Adapter.domToBlocks = function (blocksDOM) {
    // At this level, there could be multiple blocks adjacent in the DOM tree.
    var blocks = {};
    for (var i = 0; i < blocksDOM.length; i++) {
        var block = blocksDOM[i];
        if (!block.name || !block.attribs) {
            continue;
        }
        var tagName = block.name.toLowerCase();
        if (tagName === 'block' || tagName === 'shadow') {
            Adapter.domToBlock(block, blocks, true, null);
        }
    }
    // Flatten blocks object into a list.
    var blocksList = [];
    for (var b in blocks) {
        if (!blocks.hasOwnProperty(b)) continue;
        blocksList.push(blocks[b]);
    }
    return blocksList;
};

/**
 * Adapter between block creation events and block representation which can be
 * used by the Scratch runtime.
 * @param {object} e `Blockly.events.create`
 * @return {Array.<object>} List of blocks from this CREATE event.
 */
Adapter.parse = function (e) {
    // Validate input
    if (typeof e !== 'object') return;
    if (typeof e.xml !== 'object') return;
		var parsed = Adapter.parseDOM(e.xml.outerHTML)
    return Adapter.domToBlocks(parsed, null, null,null);
};

/**
 * Convert and an individual block DOM to the representation tree.
 * Based on Blockly's `domToBlockHeadless_`.
 * @param {Element} blockDOM DOM tree for an individual block.
 * @param {object} blocks Collection of blocks to add to.
 * @param {boolean} isTopBlock Whether blocks at this level are "top blocks."
 * @param {?string} parent Parent block ID.
 * @return {undefined}
 */
Adapter.domToBlock = function (blockDOM, blocks, isTopBlock, parent) {
    // Block skeleton.
    var block = {
        id: blockDOM.attribs.id, // Block ID
        opcode: blockDOM.attribs.type, // For execution, "event_whengreenflag".
        inputs: {}, // Inputs to this block and the blocks they point to.
        fields: {}, // Fields on this block and their values.
        next: null, // Next block in the stack, if one exists.
        topLevel: isTopBlock, // If this block starts a stack.
        parent: parent, // Parent block ID, if available.
        shadow: blockDOM.name === 'shadow', // If this represents a shadow/slot.
        x: blockDOM.attribs.x, // X position of script, if top-level.
        y: blockDOM.attribs.y // Y position of script, if top-level.
    };
    // Add the block to the representation tree.
    blocks[block.id] = block;

    // Process XML children and find enclosed blocks, fields, etc.
    for (var i = 0; i < blockDOM.children.length; i++) {
        var xmlChild = blockDOM.children[i];
        // Enclosed blocks and shadows
        var childBlockNode = null;
        var childShadowNode = null;
        for (var j = 0; j < xmlChild.children.length; j++) {
            var grandChildNode = xmlChild.children[j];
            if (!grandChildNode.name) {
                // Non-XML tag node.
                continue;
            }
            var grandChildNodeName = grandChildNode.name.toLowerCase();
            if (grandChildNodeName === 'block') {
                childBlockNode = grandChildNode;
            } else if (grandChildNodeName === 'shadow') {
                childShadowNode = grandChildNode;
            }
        }

        // Use shadow block only if there's no real block node.
        if (!childBlockNode && childShadowNode) {
            childBlockNode = childShadowNode;
        }

        // Not all Blockly-type blocks are handled here,
        // as we won't be using all of them for Scratch.
        switch (xmlChild.name.toLowerCase()) {
        case 'field':
            // Add the field to this block.
            var fieldName = xmlChild.attribs.name;
            var fieldData = '';
            if (xmlChild.children.length > 0 && xmlChild.children[0].data) {
                fieldData = xmlChild.children[0].data;
            } else {
                // If the child of the field with a data property
                // doesn't exist, set the data to an empty string.
                fieldData = '';
            }
            block.fields[fieldName] = {
                name: fieldName,
                value: fieldData
            };
            break;
        case 'value':
        case 'statement':
            // Recursively generate block structure for input block.
            Adapter.domToBlock(childBlockNode, blocks, false, block.id);
            if (childShadowNode && childBlockNode !== childShadowNode) {
                // Also generate the shadow block.
                Adapter.domToBlock(childShadowNode, blocks, false, block.id);
            }
            // Link this block's input to the child block.
            var inputName = xmlChild.attribs.name;
            block.inputs[inputName] = {
                name: inputName,
                block: childBlockNode.attribs.id,
                shadow: childShadowNode ? childShadowNode.attribs.id : null
            };
            break;
        case 'next':
            if (!childBlockNode || !childBlockNode.attribs) {
                // Invalid child block.
                continue;
            }
            // Recursively generate block structure for next block.
            Adapter.domToBlock(childBlockNode, blocks, false, block.id);
            // Link next block to this block.
            block.next = childBlockNode.attribs.id;
            break;
        case 'mutation':
            block.mutation = Adapter.mutation(xmlChild);
            break;
        }
    }
}

/**
 * Convert a part of a mutation DOM to a mutation VM object, recursively.
 * @param {object} dom DOM object for mutation tag.
 * @return {object} Object representing useful parts of this mutation.
 */
Adapter.mutatorTagToObject = function (dom) {
    var obj = Object.create(null);
    obj.tagName = dom.name;
    obj.children = [];
    for (var prop in dom.attribs) {
        if (prop === 'xmlns') continue;
        obj[prop] = dom.attribs[prop];
    }
    for (var i = 0; i < dom.children.length; i++) {
        obj.children.push(
            Adapter.mutatorTagToObject(dom.children[i])
        );
    }
    return obj;
};

/**
 * Adapter between mutator XML or DOM and block representation which can be
 * used by the Scratch runtime.
 * @param {(object|string)} mutation Mutation XML string or DOM.
 * @return {object} Object representing the mutation.
 */
Adapter.mutation = function (mutation) {
    var mutationParsed;
    // Check if the mutation is already parsed; if not, parse it.
    if (typeof mutation === 'object') {
        mutationParsed = mutation;
    } else {
        mutationParsed = Adapter.parseDOM(mutation)[0];
    }
    return Adapter.mutatorTagToObject(mutationParsed);
};


Adapter.parseDOM = function (dom) {
	var xmlDoc=new DOMParser().parseFromString(dom, "text/xml");
	return Adapter.domToData(xmlDoc,[], null, null,null)
}

Adapter.domToData = function (blocksDOM, blocks, parent, next, prev ) {
	for (var i = 0; i < blocksDOM.children.length; i++) {
		var block = blocksDOM.children[i];
		var attr = Adapter.getAttributes(block);	
		if (!block.tagName || !attr)  continue;
		var tagName = block.tagName.toLowerCase();
		var b = {}
		b.attribs = attr;
		b.name = tagName
		b.next = next;
		b.prev = prev
		b.parent = parent
		b.type = "tag"
		var children = Adapter.domToData(block, [], b)
		for (let j=0; j < children.length; j++) {
			children[j].next = j < children.length - 1 ? children[ children.length - 1] : null;
			children[j].prev = j > 0 ? children[j] : null;
		}
		b.children = children;
		blocks.push(b)
	}
	if ((blocksDOM.children.length == 0) && parent) {
		if (blocksDOM.textContent!="")  {
			var obj = {next: null, parent: parent, type: "text", data: blocksDOM.textContent}
			blocks.push(obj)
		}
	}		
	return blocks;
};

Adapter.getAttributes = function(el){  
  var res = {}; 
  var noval= true;
  for (var att, i = 0, atts = el.attributes, n = atts.length; i < n; i++) {
    att = atts[i];
    noval = false;
    res[att.nodeName]= att.nodeValue;
  }
  return res;
}
