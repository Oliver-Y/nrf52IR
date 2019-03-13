/* 
Copyright (c) 2017 Playful Invention Company

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

////////////////////////////////////////
// Code
////////////////////////////////////////

var Code = function() {};

Code.workspace = undefined;
Code.flyoutworkspace = undefined;
Code.scripts  = undefined;
Code.flyoutScripts  = undefined;
Code.timeout = undefined;
Code.compile = undefined;
Code.variables = {}
Code.cache = '';
Code.timeout = undefined;

// Init
Code.start = function(e){
	libInit();
	document.body.addEventListener('touchmove', Code.handleMouseDown, {passive: false});
//	document.body.addEventListener('touchmove', (e)=>{}, {passive: false, useCapture: false});
	SimpleAudio.init();
	var urlvars = getUrlVars();
	var cond = function(){return iOS.ready;};
  waituntil (cond, function (){Defs.init(doNext)} );
	function doNext (){
	 	Blockly.Msg.CLEAN_UP = Translation.strings['editor']["cleanup"];
		var toolbox = Defs.getXML(Defs.verticalBlocks, false);
		Defs.workspaceAttributes.toolbox =  toolbox;
		Code.workspace = Blockly.inject('blocklyDiv', Defs.workspaceAttributes);
		Code.scripts = new Scripts(false, new Blocks());
		Code.flyoutworkspace = Code.workspace.getFlyout().getWorkspace();
		Code.workspace.addChangeListener(Code.blockListener);
		Code.flyoutBlocks = new Scripts(true, Code.flyoutworkspace.blocksDB_);
		Code.flyoutworkspace.addChangeListener(Code.blockListenerFlyout);
		Code.blocklyOverrides();	
		Code.updatePalette();
		Code.createDefaultVars();
		HW.compiler = new Compiler();
		HW.comms = new Comms();
		HW.compiler.setup();
		UI.setup();
		UI.cleanUndo();
		Runtime.startTimer();
		var pid = Number(urlvars['pid']);
		UI.projectID = pid;
		if (pid > -1) UI.loadProject (pid)
		else {
			ShapeEditor.shapes = ShapeEditor.defaultShapes.concat();
			ShapeEditor.displayAll();
		}
		BLE.init();	
	}
 }

Code.handleMouseDown = function (e){e.preventDefault();}
 
Code.reset = function (str){
	if (gn('blocklyDiv')) gn('blocklyDiv').parentNode.removeChild (gn('blocklyDiv'))	
	let bd = newHTML('div', undefined, gn('contents'),'blocklyDiv');
	Code.workspace = Blockly.inject('blocklyDiv', Defs.workspaceAttributes);
	Code.scripts = new Scripts(false, new Blocks());
	Code.flyoutworkspace = Code.workspace.getFlyout().getWorkspace();
	Code.workspace.addChangeListener(Code.blockListener);
	Code.flyoutBlocks = new Scripts(true, Code.flyoutworkspace.blocksDB_);
	Code.flyoutworkspace.addChangeListener(Code.blockListenerFlyout);
	Code.blocklyOverrides();	
	Code.updatePalette();
	UI.loadXML(str, whenDone);
	function whenDone(){
  	Code.updatePalette()	
  	UI.cleanUndo();
  }
}		
		
Code.updatePalette = function (){
	var xml = Defs.getXML(Defs.verticalBlocks, true);
	Code.workspace.updateToolbox(xml)	
}
	
Code.createDefaultVars = function (){
	let keyname ='box';
	for (let i=1; i < 4; i++) {
	 	Code.workspace.createVariable("box" + i);
		Code.variables[keyname + i] =  0;
	}
}
	
Code.blocklyOverrides = function(){
	Code.workspace.registerToolboxCategoryCallback(Blockly.MINE_CATEGORY_NAME, Blockly.CustomBlocks.flyoutCategory);
}

Code.getToolboxElement= function () {
	var match = location.search.match(/toolbox=([^&]+)/);
	return document.getElementById('toolbox-' + (match ? match[1] : 'categories'));
}

 Code.blockListener= function(e){
 	 UI.unfocus();
	 UI.updateToolsState(undefined);
   Code.scripts.blocksContainer.blocklyListen(e,  Code.scripts);
}

 Code.blockListenerFlyout = function(e){
 	UI.unfocus();
	UI.updateToolsState(undefined);
  Code.flyoutBlocks.blocksContainer.blocklyListen(e, Code.flyoutBlocks);
}

 Code.clear = function (){
	 Code.workspace.clear();
	 Code.workspace.clearUndo();
	 Code.scripts.clean(); 
}

Code.unfocus = function(e){
	let skip = e ? e.target.className.indexOf('menuitem') > -1 : false;
	if (!skip) Blockly.ContextMenu.hide();
	if (!document.activeElement) return;
	if (document.activeElement.className != "blocklyHtmlInput") return;
  Blockly.WidgetDiv.hide();
  Blockly.DropDownDiv.hideWithoutAnimation();
}

////////////////////////
// Toggle tether run
////////////////////////

Code.togglePlay = function(e){
	e.preventDefault();
	e.stopPropagation();
	Code.startOrStop();
}

Code.startOrStop = function(){	
	Code.unfocus();
	UI.unfocus();
	if (Runtime.isActive()) Runtime.stopThreads(Code.scripts);
	else  Code.scripts.triggerHats("onbuttona");
}

/////////////////////////
// Download
/////////////////////////

Code.download = function (){	
	if (Code.timeout) return;
	var blocktext = Code.scripts.blocksToString();
	if (blocktext == '') return;
	Runtime.stopTimer();
	BLE.status = "download"; 
	gn("microbit0_scanicon").className  = "ble download";
	Code.timeout = setTimeout(function () {Code.startDownload(blocktext);}, 500);
}

Code.cleartimeout  = function (){	
	if (Code.timeout) window.clearTimeout(Code.timeout);
	Code.timeout = undefined;
}



Code.startDownload = function (blocktext){		
	var downloadEnd = (a)=>	{
		Code.cleartimeout();
		BLE.status = "ok"; 
		gn("microbit0_scanicon").className  = "ble ok";
		Runtime.startTimer();
	}
	
	let msg =  blocktext+' '+flatten(ShapeEditor.shapes).join(' ');
	if ((Code.cache != msg) && (blocktext != '')) HW.compiler.downloadProcs(blocktext, flatten(ShapeEditor.shapes), doNext)
	else downloadEnd();


	function doNext(str){
		var value  = str ? "ERROR: "+str : 'downloaded.'
		console.log (value)
		if (!str) Code.cache = msg;
		downloadEnd();
	}	
}


document.addEventListener("contextmenu", function(e) {e.preventDefault();});

window.onload = Code.start;
