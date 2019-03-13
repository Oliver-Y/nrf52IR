/**
 * @license
 *
 * Copyright 2017 Playful Invention Company
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
 
UI = function() {};

UI.toolmode = undefined;
UI.tooldown = false;
UI.projectID = undefined;	
UI.undoStack = [];
UI.redoStack = [];
UI.blocklyStacks = {undo: 0, redo: 0};
UI.version = 2.0;
UI.busy = false;

UI.setup = function(){
	gn('nametag').textContent = Translation.strings["editor"]["shapes"];
//	gn("microbitstate")[eventDispatch["start"]] =  UI.checkState;
	gn('home')[eventDispatch["start"]] = UI.saveProject;
	gn("playbutton")[eventDispatch["start"]] = Code.togglePlay;
	gn('filemenu')[eventDispatch["start"]] = UI.toggleMenu;
	UI.setupToolbar(gn("toolbarmenu"), ["scissors", "clone", "undo", "redo"]);
	ShapeEditor.init();
	UI.resize();
	window.onresize = UI.resize;
	window.onkeydown = UI.handleKeyDown;
}

UI.handleKeyDown = function(e) {
	if (document.activeElement.nodeName.toLowerCase() == "input") return;
	if (e.keyCode == 8) ShapeEditor.clearShape();
}

UI.resize = function(e) {
	var h = getDocumentHeight();
	var dh = gn("topbar").offsetHeight;
	var w = getDocumentWidth();
	gn("contents").style.height = (h - dh)+ "px";
//	gn("contents").style.top =  dh + "px";
	gn("contents").style.width = (w - gn("rightpanel").offsetWidth)+ "px";
	gn("rightpanel").style.height = (h - dh)+ "px";
	gn("palette").style.height = (h - gn("grid").offsetTop - gn("grid").offsetHeight - dh - gn("shapesbar").offsetHeight)+ "px";
	gn('playbutton').style.left = (gn('extratools').offsetLeft +  gn('extratools').offsetWidth) + "px";
	Blockly.hideChaff(true);
  Blockly.svgResize(Code.workspace);	
}

UI.updateRunStopButtons = function() {
  gn("playbutton").className = Runtime.isActive() ? "play on" : "play off";
}

UI.checkState= function (e){
	e.preventDefault();
	e.stopPropagation();
	let key = gn("microbitstate").className.split(' ')[1];
	switch (key) {
		case 'connecting': 
		case 'fail': BLE.checkBLEdevices(); break; // try to re-connnect
	}
}

UI.checkStatus = function (e){
	Code.unfocus(e);
	UI.unfocus();
}	
	
UI.unfocus =  function (){
	 UI.closeDropdown();
}

UI.toggleMenu = function (e){
	e.preventDefault();
	e.stopPropagation();
	CC.hideMenu();
	SimpleAudio.play("tap");
	let menus = Translation.strings["editor"]["menu"];
	if (gn('appmenu')) UI.closeDropdown();
	else {	
		var hasValidName = UI.projectName && !UI.projectSamples[UI.projectName];	
		var options = iOS.devices.length > 0 ? [menus["savecopy"], menus["close"], menus["download"]] : [menus["savecopy"], menus["close"]];
		var optionfcns = iOS.devices.length > 0 ? ["savecopy", "close", 'download'] : ["savecopy", "close"] ;
		UI.openBalloon(frame, options, optionfcns);
		gn('appmenu')[eventDispatch["start"]] = UI.doAction;
	}
}

UI.openBalloon = function(p,  labels, fcns){
	var mm = newHTML("div", 'dropdownballoon ' + Defs.lan, p);
	var barrow = newHTML("div", "menuarrow "  + Defs.lan, mm);
	let csstype =  "dropdown " + Defs.lan;
	var mdd= newHTML("div",csstype, mm);
	mm.setAttribute('id', 'appmenu');
	for (var i=0; i < labels.length; i++) {
		var ul =  newHTML("ul", undefined, mdd);
		var li = newHTML("li", undefined, ul);
		li.setAttribute("key", labels[i]);
		li.textContent =  labels[i];
		li.fcn = fcns[i];
  	if (i < labels.length - 1)  var div = newHTML("li", 'divider', ul); 
	}
}	

UI.doAction = function(e){
	var t = e.target;
	t.className = "selectmenu";
	if (t.fcn) UI[t.fcn](e);
	var endfcn = function () {
		if (gn('appmenu')) gn('appmenu').parentNode.removeChild(gn('appmenu'));
 	}
 	setTimeout(endfcn, 100);
}

UI.cleanWorkspace =  function (){
	UI.cleanUndo();
	Code.workspace.clear();
	UI.blocks = {};
	Prim.pace = 0.5;
}

UI.cleanUndo = function (){
	UI.undoStack = [];
	UI.redoStack = [];
	UI.blocklyStacks = {undo: 0, redo: 0};
	Code.workspace.clearUndo();
	UI.selectTool(undefined);
}

UI.closeDropdown =  function (){if (gn('appmenu')) gn('appmenu').parentNode.removeChild(gn('appmenu'))}

///////////////////
// Tools
///////////////////
 
UI.setupToolbar = function(p, tools){
	UI.selectTool(undefined);
	gn('extratools')[eventDispatch["start"]] = UI.pressTool;
	gn('extratools')[eventDispatch["end"]] = UI.releaseTool;
}

UI.pressTool = function(e){
	e.preventDefault();
	e.stopPropagation();
	Code.unfocus();
	UI.unfocus();
	var t = e.target;
	SimpleAudio.play("tap");
	UI.selectTool(t);
	UI.tooldown = true;
}

UI.releaseTool = function(e){
	var t = e.target;
	var b = t.id;
//	if(b=='undo') Code.workspace.undo(false);
//	if(b=='redo') Code.workspace.undo(true);
	if(b=='undo') UI.undo();
	if(b=='redo') UI.redo();
	UI.tooldown = false;
}

UI.selectTool = function(t){
	if (t && (UI.toolmode  == t.id)) t = undefined;
	UI.updateToolsState(t);
	UI.toolmode = (t) ? t.id : undefined;
}

UI.updateToolsState = function(t){
	var p = gn('extratools');
	if (!p) return;	
	for(var i=0;i< p.children.length;i++){
		var mt = p.children[i];
		if (!mt.id) continue;
		if ((mt.id == "undo") || (mt.id == "redo")) mt.className =  UI.getStackState(mt.id) ?  "icon "+  mt.id : "icon "+  mt.id + " NA";
		else mt.className = (mt == t) ? "icon "+  mt.id+" on": "icon "+  mt.id;
 }
}

///////////////////
// NEW
///////////////////

UI.newProject =  function (e){
	Runtime.stopThreads(Code.scripts);
	UI.cleanWorkspace(); 
  var empty = '<xml></xml>';
	var xml = Blockly.Xml.textToDom(empty);
	Blockly.Xml.domToWorkspace(xml, Code.workspace);
	Code.createDefaultVars();
	ShapeEditor.shapes = [];
	ShapeEditor.unfocus();
	ShapeEditor.displayAll();
	UI.projectID = undefined;
	UI.cleanUndo();
}

///////////////////
// close
///////////////////

UI.close = function (e){
	e.preventDefault();
	e.stopPropagation();
	SimpleAudio.play("tap");
	setTimeout(function (){window.location.href = "index.html?ts="+ Date.now();}, 500);   
}

///////////////////
// Download
///////////////////

UI.download =  function (e){
	e.preventDefault();
	e.stopPropagation();
	SimpleAudio.play("download");
	Code.download();
}


///////////////////
// Save Copy
///////////////////

UI.savecopy =  function (e){
	e.preventDefault();
	e.stopPropagation();
	if (UI.busy) return;
	SimpleAudio.play("shapecopied");
	UI.busy = true;
	if ((UI.projectID < 0) ||  !UI.projectdata.name) UI.createProject(ignore);
	else UI.createCopy(UI.projectID, UI.projectdata.name);	
	function ignore(){	UI.busy = false;}
}

UI.createCopy =  function (id, name){
	var thumb = Doc.getThumbnail(184, 154)
	if (!thumb){whenDone(); return;} 
	UI.queryName (name, function (str) {doNext(str, name)})
	
	function doNext(str, name){
		let next = UI.getNextNumber(str, name);
		UI.getPositionInfo ( function (str) {save(str, name + " " +next)})
	}
	
	function save(str, name){
		var data = JSON.parse(str);
		UI.projectPosition = data.length == 0 ? 10000 : Number(data[0].pos) + 10;
		var json = {};
		var data =  UI.getProjectContents();
		var keylist = ["name", "version", "deletedflag", "projectdata", "pos", "thumb"];
		var values = "?,?,?,?,?,?";
		json.values = [name, UI.version, "NO", iOS.utf8Tob64(data), UI.projectPosition, iOS.utf8Tob64(thumb)];
		console.log (json.values)
		json.stmt = "insert into "+ iOS.database + " ("+  keylist.toString() + ") values ("+values +")";
		iOS.stmt(json, changeID);
	}
	
	function  changeID(id){
		UI.projectID =  Number (id).toString() == 'NaN'  ? -1 :  Number (id);
		UI.busy = false;
	}
}
	
UI.queryName = function (name, fcn){
	var obj = {};	
	var key  = name.replace(/\d+$/, "");
	obj ["cond"] = "deletedflag = ? AND  name LIKE ?";
	obj ["items"] = ["name"];
	obj ["values"] = ['NO', name+"%"];
	obj ["order"] = "pos desc";
	var json = {};	
	json.stmt = "select " + obj.items +" from "+ iOS.database + " where " + obj.cond + (obj.order ? " order by " + obj.order : "") ;
	json.values = obj.values;
	iOS.query(json, fcn);
}

UI.getNextNumber = function (str, name){
 var data = JSON.parse(str);
 	console.log (data)
	 var values =  [];
	 for (let i = 0; i < data.length; i++){ 		
		 var val = data[i].name;
		 console.log (val, val == undefined)
		 if (val == undefined) values.push(0); 
		 else {
		 	 val  = val.replace (name , '') 
			 let num = Number (val.replace (/[^0-9.,]+/ , '')) 
			 console.log ("number", num, (num == undefined) , (num == "") , (num.toString() == 'NaN'))
			 if ((num == undefined) || (num == "") || (num.toString() == 'NaN')) values.push(0);
			 else  values.push (num)
		 }
	 }
	
	 values = values.sort(function(a, b) {return a  - b});
	  console.log (values)
	 return (values.length == 0)  ? 1 : values [values.length - 1] + 1
	}		
			
///////////////////
// save
///////////////////

UI.saveProject = function (e){
	e.preventDefault();
	e.stopPropagation();
	console.log ("saveProject", UI.busy)
	if (UI.busy) return;
	SimpleAudio.play("tap");
	UI.busy = true;
	if (UI.projectID < 0) UI.createProject(switchPage);
	else UI.updateDB(UI.projectID, switchPage);	
	function switchPage(){
		setTimeout(function (){window.location.href = "index.html?ts="+ Date.now();}, 500);   
	}
}

UI.getPositionInfo = function (fcn){
	var obj = {};	
	obj ["cond"] = "deletedflag = ? AND version = ?";
	obj ["items"] = ["pos"];
	obj ["values"] = ['NO', UI.version];
	obj ["order"] = "pos desc";
	var json = {};	
	json.stmt = "select " + obj.items +" from "+ iOS.database + " where " + obj.cond + (obj.order ? " order by " + obj.order : "") ;
	json.values = obj.values;
	iOS.query(json, fcn);
};

UI.createProject = function (whenDone){
	var thumb = Doc.getThumbnail(184, 154)
	if (!thumb){whenDone(); return;} 
	UI.getPositionInfo (findPos);
	function findPos(str){
		var data = JSON.parse(str);
//		console.log (data);
		UI.projectPosition = data.length == 0 ? 10000 : Number(data[0].pos) + 10;
		var json = {};
		var data =  UI.getProjectContents();
		var keylist = ["version", "deletedflag", "projectdata", "pos", "thumb"];
		var values = "?,?,?,?,?";
		json.values = [UI.version, "NO", iOS.utf8Tob64(data), UI.projectPosition, iOS.utf8Tob64(thumb)];
		console.log (json.values)
		json.stmt = "insert into "+ iOS.database + " ("+  keylist.toString() + ") values ("+values +")";
//		SimpleAudio.play("snap");
		iOS.stmt(json, whenDone);
	}
}

UI.updateDB = function (id, fcn){ 	
	var json = {};
	var data = UI.getProjectContents();
	var thumb = Doc.getThumbnail(184, 154)
	var json = {};
	var keylist = [ "version = ?", "projectdata = ?", "thumb = ?"];
	json.values = [UI.version, iOS.utf8Tob64(data), iOS.utf8Tob64(thumb)];
	json.stmt = "update "+ iOS.database + " set "	+  keylist.toString() + " where id = " + id;
	iOS.stmt(json, whenDone);
	function whenDone(str){
		//console.log (str);
		fcn();
	 }
}

///////////////////
// Load
///////////////////
 
UI.loadProject = function (id){
 	UI.cleanWorkspace();
	var json = {};
	json.stmt = "select * from "+ iOS.database + " where id = ?";
	json.values = [id];
	iOS.query(json, whenDone);
  function whenDone(str){
  	if (str !="no webkit") {
  	//	console.log (str);
			var data = JSON.parse(str);
			var obj = data[0];
			UI.projectdata = obj;
			UI.projectID = obj.id;
			UI.projectPosition = obj.pos;
			var prj = iOS.b64ToUtf8(obj.projectdata)
			if (obj.projectdata) UI.loadXML(prj, UI.finishSetup); 
			else UI.finishSetup();
		}
		else UI.finishSetup();
  }
}

UI.loadUnsavedWork = function (){
 	UI.cleanWorkspace();
 	iOS.fileToString('unsaved-work', next);

  function next(str){
		var data = str.split('\n');
		UI.projectID = data[3];
		if(data[4]>-1) UI.projectdata = {};
		if(data[5]) UI.projectdata.name = data[5];
		UI.loadXML(str, UI.finishSetup); 
		iOS.eraseFile('unsaved-work');
	}
}

 UI.finishSetup = function (){
		Code.createDefaultVars();
		Code.updatePalette()	
		UI.cleanUndo();
 }
  
UI.loadXML = function (str, whenDone){ 
	var data  = str.split('\n')
	try {
		let watermark = data[0].split(" ");
		console.log (watermark, (watermark[0] != "art:bit"))
		if (watermark[0] != "art:bit") loadempty();
		else {
			let code = data [1];
			var xml = Blockly.Xml.textToDom([code]);
			ShapeEditor.shapes =  data[2] == "" ? [] : JSON.parse(data[2]);
			Blockly.Xml.domToWorkspace(xml, Code.workspace);
  		ShapeEditor.displayAll(); 
  		ShapeEditor.unfocus();
 	 		if (whenDone) whenDone()
		}
	} catch(e){
		console.log (e)
		loadempty();
	}
	function loadempty(){
		ShapeEditor.shapes = [[0,0,4,0,0], [0,14,10,14,0], [31, 17,17,17, 31]];
  	ShapeEditor.displayAll(); 
  	ShapeEditor.unfocus();
		whenDone();
	}
	
}
	
UI.getExtendedProjectContents = function (){
	var str = UI.getProjectContents();
	str += UI.projectID;
	str += '\n';
	if(UI.projectdata&&UI.projectdata.name) str = str+UI.projectdata.name+'\n';
	return str;
}

UI.getProjectContents = function (){
	var xml = Blockly.Xml.workspaceToDom(Code.workspace, true);
	let str = "art:bit 2.0";
	str +="\n"
	str +=  Blockly.Xml.domToText(xml);
	str +="\n"
	str += JSON.stringify(ShapeEditor.shapes)
	str +="\n"
	return str;
}

/*blockly overrrides */
Blockly.VerticalFlyout.prototype.DEFAULT_WIDTH = 230;

/////////////////////////
//
//  undo/redo
//
/////////////////////////

UI.saveForUndo = function(state){
	let skip = state ? false : UI.shouldSkipBlocklyAction();
	if (skip) return;
	UI.undoStack.push(UI.getShapesState(state));
	UI.redoStack = [];
	UI.updateToolsState(undefined);
}

 UI.shouldSkipBlocklyAction = function () {
 		let redolength = Code.workspace.redoStack_.length;
		let undolength = Code.workspace.undoStack_.length
 		let flag = true; // redo is not zero
		if ((UI.blocklyStacks.undo + UI.blocklyStacks.redo) != (undolength + redolength)) flag = false; // added something new
		UI.blocklyStacks = {redo: redolength, undo: undolength};		
		return flag;
	}
		
UI.undo = function(){
	Runtime.stopThreads(Code.scripts)
	var obj = UI.undoStack.pop();		
	if (obj) {
		if (obj.isEditor) UI.redoStack.push(UI.getShapesState(true));
		else UI.redoStack.push(UI.getShapesState(false));
		UI.restoreState(obj, false);	
	}
	else if (Code.workspace.undoStack_.length > 0) Code.workspace.undo(false);
	UI.updateToolsState(undefined);
	Code.updatePalette();
}

UI.redo = function(){
	Runtime.stopThreads(Code.scripts)
	var obj = UI.redoStack.pop();
	if (obj) {
		if (obj.isEditor) UI.undoStack.push(UI.getShapesState(true));
		else UI.undoStack.push(UI.getShapesState(false));
		UI.restoreState(obj, true);	
	}
	else if (Code.workspace.redoStack_.length > 0) Code.workspace.undo(true);
	UI.updateToolsState(undefined);
	Code.updatePalette();
}


UI.getShapesState = function(state){
	return  {isEditor: state, bloclky: {undos: Code.workspace.undoStack_.length, redos: Code.workspace.redoStack_.length},  editor: ShapeEditor.getState ()};
}

UI.restoreState = function(obj, isRedo){
//	console.log ('restoreState is editor', obj.isEditor, isRedo,UI.undoStack.length, UI.redoStack.length );
	if (!obj.isEditor) Code.workspace.undo(isRedo);
	else ShapeEditor.setState(obj.editor);
}

UI.getStackState = function(type){
	if (Code.workspace[type+"Stack_"].length > 0) return true;	
	if (UI[type+"Stack"].length == 0) return false;
	if ((Code.workspace[type+"Stack_"].length == 0) && stackNotEditor(UI[type+"Stack"])) return false;
	return (UI[type+"Stack"].length > 0 );
	
	function stackNotEditor(list){
		for (let i=0; i< list.length; i++) {
			if (list[i].isEditor) return false;
		}
		return true;
	}	
}


// ENABLE only clean up (align stacks) individual blocks BLOCKLY context menus

Blockly.FieldTextIcon.DROPDOWN_WIDTH = 156;
Blockly.WorkspaceSvg.prototype.showContextMenu_ = function(e) {
  if (this.options.readOnly || this.isFlyout) {
    return;
  }
  var menuOptions = [];
  var topBlocks = this.getTopBlocks(true);
  var ws = this;

  // Option to clean up blocks.
  if (this.scrollbar) {
    menuOptions.push(
        Blockly.ContextMenu.wsCleanupOption(this,topBlocks.length));
  }

  Blockly.ContextMenu.show(e, menuOptions, this.RTL);
};

// DISABLE individual blocks BLOCKLY context menus

Blockly.BlockSvg.prototype.showContextMenu_ = function(e) {}


