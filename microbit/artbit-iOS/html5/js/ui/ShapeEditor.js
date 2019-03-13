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
 
ShapeEditor = function() {};
ShapeEditor.gridsize = 5;
ShapeEditor.paintingShape = undefined;
ShapeEditor.defaultShapes = [[0,0,4,0,0], [0,14,10,14,0], [31, 17,17,17, 31]];
ShapeEditor.shapes = [];

//////////////////////
// Initialization
/////////////////////

ShapeEditor.init = function (){	
	ShapeEditor.initShapeBox ();
	ShapeEditor.addNew();
	ShapeEditor.displayAll();	
	ShapeEditor.caret =  ShapeEditor.getCaret();
	gn('palette')[eventDispatch["start"]] =  ShapeEditor.handleTouchStart;
}

ShapeEditor.initShapeBox = function (){	
	var div = gn("grid");
	div[eventDispatch["start"]] = ShapeEditor.startPaint;
	for (var i=0;  i < ShapeEditor.gridsize * ShapeEditor.gridsize; i++) {
		var dot = newHTML('div', 'griddot', div);
		var slot = newHTML('div', 'gridslot', dot);
		dot.color = 0;
	}
}	

ShapeEditor.displayAll  =  function (){
	var pal = gn('palette');
	while (pal.childElementCount > 0) pal.removeChild(pal.childNodes[0]);
	for (var i=0; i < ShapeEditor.shapes.length; i++) ShapeEditor.addThumb(i, ShapeEditor.shapes[i]);
}

ShapeEditor.addNew = function(){
  var t = gn('shapesbar');
  var tb = newHTML("div", "addshape", t);
 	var img = newHTML("div", "thumbimg newshape", tb);
 	img.textContent = "+";
 	tb.key = "new";
	tb[eventDispatch["start"]] = ShapeEditor.addShape;
}

ShapeEditor.addShape = function(e) {
	e.preventDefault();
	e.stopPropagation();
	UI.saveForUndo(true);
	Code.unfocus();
	UI.unfocus();
	SimpleAudio.play("tap");
	HW.shape = ShapeEditor.editShape('new');
	var lastone = gn("palette").childNodes [gn("palette").childElementCount - 1];
	var max = lastone.offsetTop + lastone.offsetHeight + 9 -  gn("palette").scrollTop;
	if (max < gn("palette").offsetHeight) return;	
	gn("palette").scrollTop = ( lastone.offsetTop + lastone.offsetHeight + 9 ) - gn("palette").offsetHeight;
}

ShapeEditor.clearShape = function() {
	if (!ShapeEditor.paintingShape) return;
	ShapeEditor.lastPainted = undefined;
	let list = [0,0,0,0,0];
	HW.shape = list;
	ShapeEditor.refresh(list);
	ShapeEditor.update();
}

ShapeEditor.addThumb = function(i, list){
  var parent = gn('palette');
  var tb = newHTML("div", "thumbslot", parent);
  tb.id = "thumb_" + i;
 	var num = newHTML("div", "thumbnum", tb);
 	num.textContent = (i+1) +".";
 	var img = newHTML("div", "thumbimg", tb);
 	tb.type = 'thumb';
 	tb.key = i;
 	var	svg = SVGTools.create(img, img.offsetWidth - 6, img.offsetHeight - 6);
	ShapeEditor.displayShape(svg, list);
	return tb;
}

ShapeEditor.getCaret = function(i, list){
  var tb = newHTML("div", "thumbslot caret");
  tb.id = "thumb_" + i;
 	var num = newHTML("div", "thumbnum", tb);
 	num.textContent = "";
 	var img = newHTML("div", "thumbimg", tb);
 	tb.type = 'thumb';
	return tb;
}

ShapeEditor.doAction =  function (e){
	var pt = Events.getTargetPoint(e);
	var dx = ShapeEditor.startScroll.x - pt.x; var dy =  ShapeEditor.startScroll.y - pt.y;
  if  (Events.distance(dx,dy) >  30) return;
	e.preventDefault();
	e.stopPropagation();
	ShapeEditor.removeCaret();
	var t = e.target;
	while (t && (t.key== undefined) && (t.parentNode != frame))  t = t.parentNode;
	if (t== undefined) return;
	if (t.key== undefined) return;
	let n =  t.key;
	Runtime.stopThreads(Code.scripts);
	UI.saveForUndo(true);
	switch(UI.toolmode) {
		case "clone":	
			ShapeEditor.clone(n);
			UI.selectTool(undefined);
			SimpleAudio.play("shapecopied");
			break;
		case "scissors":
			let scrollto = gn('palette').scrollTop; 
			if (t.className == "thumbslot selected") ShapeEditor.unfocus();
			if ((t.className == 'thumbslot') && t.parentNode) t.parentNode.removeChild(t);
			ShapeEditor.reOrder(); 
			UI.selectTool(undefined);
			SimpleAudio.play("delete");
			break;
		default:
			SimpleAudio.play("tap");
			HW.shape = ShapeEditor.editShape(t.key);
			break;
	}
}

ShapeEditor.clone =  function (n){  // prim
	 var shape =  ShapeEditor.shapes[n];
	 ShapeEditor.shapes.push(shape);
	 let key = ShapeEditor.shapes.length - 1;
	 let tb = ShapeEditor.addThumb(key, shape);
	 HW.shape = ShapeEditor.editShape(tb.key);
	 let pos = tb.offsetTop + tb.offsetHeight + 12;
	 let h = gn('palette').offsetHeight;
	 if (pos > h) gn('palette').scrollTop = pos - h; 
}
			
ShapeEditor.getShapeData =  function (data){  // prim
	let n = data.n ? data.n : 0;
	if (ShapeEditor.shapes.length == 0) return [0,0,0,0,0];
	if ((data.dx == 0) && (data.dy == 0)) return ShapeEditor.shapes[n];
	else if (data.dx != 0) return ShapeEditor.interPolateHorizontal(n, data.dx)
	else return ShapeEditor.interPolateVertical(n, data.dy)
}	

ShapeEditor.interPolateHorizontal =  function (n, dx){  // prim
	dx = dx.mod(5)
	let lefts =  ShapeEditor.shapes[n]
	let rights =  ShapeEditor.shapes[(n + 1).mod(ShapeEditor.shapes.length)];
	let line1 = ((lefts[0]<<dx)&31)+ ((rights[0]>>(5-dx))&31);
	let line2 = ((lefts[1]<<dx)&31)+ ((rights[1]>>(5-dx))&31);
  let line3 = ((lefts[2]<<dx)&31)+ ((rights[2]>>(5-dx))&31);
  let line4 = ((lefts[3]<<dx)&31)+ ((rights[3]>>(5-dx))&31);
  let line5 = ((lefts[4]<<dx)&31)+ ((rights[4]>>(5-dx))&31);
  return [line1,line2,line3,line4,line5];
}	

ShapeEditor.interPolateVertical =  function (n, dy){  // prim
	dy = dy.mod(5)
	let down = ShapeEditor.shapes[n]
 	let up = ShapeEditor.shapes[(n-1).mod(ShapeEditor.shapes.length)];
 	let newshape = up.concat(down)
 	return newshape.slice(5-dy,(5-dy) + 5)
}


//////////////////////////////
// Draw shape in svg
// Either as the blocks's icon
// or as the shape
////////////////////////////////

ShapeEditor.displayShape= function(svg, list){
	var states = ShapeEditor.convertRowToState(list);
	var t = "translate(" + 3  + " " + 3 + ")";
	var g = SVGTools.addChild(svg, "g", {transform: t});
	ShapeEditor.drawShape(states, g, 12 , 2.5);
}

ShapeEditor.drawShape = function (array, g, spacing, size){	
	for (var y=0; y < ShapeEditor.gridsize; y++) {	
		for (var x=0; x < ShapeEditor.gridsize; x++) {
			var i = x + y * ShapeEditor.gridsize;
		 	var val  = i < array.length ? array[i] : 0;
 			var c = val == 1 ? "#DD1A22" : "#cccccc";
			ShapeEditor.createDot(g,  x, y, spacing, size, c);
		}
	}
}

ShapeEditor.createDot = function(g, x, y, spacing, size, c){
	var attr = {fill: c, opacity: 0.75, stroke:"#000000", 
			"stroke-miterlimit": 10, "stroke-opacity": 0.2,  r: size,
			cx: size + x*spacing, cy: size + y*spacing}
	SVGTools.addChild(g, 'circle', attr)
}


//////////////////////////////
//  Pattern functions
///////////////////////////

	ShapeEditor.unfocus = function (){
		ShapeEditor.clear();
		if (ShapeEditor.paintingShape) ShapeEditor.paintingShape.className = "thumbslot";
		ShapeEditor.paintingShape = undefined;
	}
	
	ShapeEditor.clear = function (){
		var pos  = 15
		for (var i=0; i < gn("grid").childElementCount; i++) {
			var kid = gn("grid").childNodes[i];
			kid.childNodes[0].style.background = "#cccccc"
			kid.color = 0;
		}
	}

	ShapeEditor.refresh = function (list){ 
 		var states = ShapeEditor.convertRowToState(list);
 		for (var i=0; i < gn("grid").childElementCount; i++) {
 			var kid = gn("grid").childNodes[i];
 			kid.color = states[i];
 			kid.childNodes[0].style.background = 	kid.color == 1 ? "#DD1A22" : "#cccccc";
 	 }
 	}

ShapeEditor.convertRowToState = function (list) {
	var result = new Array(ShapeEditor.gridsize*ShapeEditor.gridsize);
	for (var i=0; i < list.length; i++) {
			var val = getValue(list[i]);
			var y = i;
			for (var j = 0; j < val.length; j++){
				var x =  ShapeEditor.gridsize - 1 -j;
				var pos =  y*ShapeEditor.gridsize + x; 
				var isOn = val.charAt(x) == "1" ;
				result [pos] = 	isOn ? 1 : 0;
		}
	}
	return result;
	
		function getValue (n){
			var b = n.toString(2);
			while(b.length < 5) b= "0"+b;
			return b;
		}
}

ShapeEditor.convertState2Number = function (list) {
	var result = new Array(5);
	for (var i=0; i < result.length; i++) result[i] = "00000";
	for (var j=0; j < list.length; j++) {
			var val = list [j];
			var x = (j%5);
			var y = Math.floor(j / 5);
			var pos =  x + y*ShapeEditor.gridsize; 	
		//	var dy = ShapeEditor.gridsize - 1 -  y;
			var dx = ShapeEditor.gridsize - 1 -  x;
			result [y] = result[y].replaceAt(x, list[pos].toString());
	}
	for (var i=0; i < result.length; i++) result[i] = Number("0b"+result[i]);
	return result;
}


//////////////////////////
// Editor UI/UX
/////////////////////////

ShapeEditor.startPaint  = function(e) {
	e.preventDefault();
	e.stopPropagation();
	if (e.touches && (e.touches.length > 1)) return;
	Code.unfocus();
	UI.unfocus();
	var t = e.target;
	ShapeEditor.lastPainted = undefined;
	if (t.className == "gridslot")  t = t.parentNode;
	if (t.className != "griddot") return;
	UI.saveForUndo(true);
	if (!ShapeEditor.paintingShape) ShapeEditor.editShape("new");
	Runtime.stopThreads(Code.scripts);
	var isOn = t.color == 1;
	t.childNodes[0].style.background = isOn ?  "#cccccc" : "#DD1A22";
	t.color = isOn ?  0 : 1;
	ShapeEditor.lastPainted = t;
	Events.registerTouch(e);
	window[eventDispatch["move"]] = ShapeEditor.switchColor;
	window[eventDispatch["end"]] = ShapeEditor.endPaint;
	ShapeEditor.update();
}

ShapeEditor.switchColor = function(e) {
	e.preventDefault();
	e.stopPropagation();
	if (Events.extraFingerEvent(e)) return;
	Runtime.stopThreads(Code.scripts);
	var pt = Events.getTargetPoint(e);
	var t = document.elementFromPoint(pt.x, pt.y);
	if (t.className == "gridslot")  t = t.parentNode;
	if (t.className != "griddot") return;
	if (ShapeEditor.lastPainted == t) return;
	var isOn = t.color == 1;
	t.childNodes[0].style.background = isOn ?  "#cccccc" : "#DD1A22";
	t.color = isOn ?  0 : 1;
	ShapeEditor.lastPainted = t;
	ShapeEditor.update();
}

ShapeEditor.endPaint = function(e) {
	e.preventDefault();
	e.stopPropagation();
	Events.unregisterTouch();
	Runtime.stopThreads(Code.scripts);
	window[eventDispatch["move"]] = undefined;
	window[eventDispatch["end"]] =  undefined;
	ShapeEditor.lastPainted = undefined;
	ShapeEditor.update();
}

ShapeEditor.update = function (){
	var pos = Number(ShapeEditor.paintingShape.id.split("_")[1]);
	var val = ShapeEditor.convertState2Number(ShapeEditor.getShape());
	ShapeEditor.shapes[pos] = val;
	var states = ShapeEditor.convertRowToState(val);
	HW.shape = val;
//	console.log ("update", val.join(' '));
	var svg = ShapeEditor.paintingShape.childNodes[1].childNodes[0];
	while (svg.childElementCount > 0) svg.removeChild(svg.childNodes[0]);
	var t = "translate(" + 3  + " " + 3 + ")";
	var g = SVGTools.addChild(svg, "g", {transform: t});
	ShapeEditor.drawShape(states, g, 12 , 2.5);
}

ShapeEditor.getShape = function (){
	var res = [];
	for (var i=0; i < gn("grid").childElementCount; i++) res.push(gn("grid").childNodes[i].color);
	return res;
}

ShapeEditor.editShape =  function (key){
	if (ShapeEditor.paintingShape) ShapeEditor.paintingShape.className = "thumbslot";
	if (key == "new") {
		var shape = ShapeEditor.createShape();
		key = shape.id.split("_")[1];
	}
	gn("thumb_"+key).className = "thumbslot selected";
	ShapeEditor.paintingShape  = gn("thumb_"+key);
	let n = Prim.mapValueShape(Number(key));
	Prim.currentShape = {n: n, dx:0, dy: 0};
	var list  = ShapeEditor.shapes[n];
	ShapeEditor.refresh(list);
	return list;
}

ShapeEditor.createShape = function (){
		var key = ShapeEditor.shapes.length;
		ShapeEditor.shapes.push([0,0,0,0,0]);	
		return ShapeEditor.addThumb(key, ShapeEditor.shapes[key]);
	}

/////////////////////////////
// Shapes dragging
/////////////////////////////

ShapeEditor.actionTarget;
ShapeEditor.mindist = 10;
ShapeEditor.threshold = 150, //required min distance traveled to be considered swipe
ShapeEditor.allowedTime = 200, // maximum time allowed to travel that distance
ShapeEditor.timeout = undefined;
ShapeEditor.listenerRemoved = false;

//////////////////////////////////////////////////
// Top Level Events
//////////////////////////////////////////////////

ShapeEditor.handleTouchStart = function(e){
	if ((e.button != 0) && !isiPad) {
	  e.preventDefault();
  	e.stopPropagation();
  	return;
	}
	if (e.touches && (e.touches.length > 1)) return;
	Code.unfocus();
	UI.unfocus();
	let t = e.target;
	let target  = ShapeEditor.getMouseTarget(e);
	ShapeEditor.actionTarget = target;
	Events.registerTouch(e);
	ShapeEditor.startScroll = Events.getTargetPoint(e);
	ShapeEditor.isDraggingThumb = false;
	Events.dragmousex = ShapeEditor.startScroll.x;
  Events.dragmousey = ShapeEditor.startScroll.y; 
	Events.startDrag(ShapeEditor.actionTarget, ShapeEditor.prepareToScroll, ShapeEditor.actionEnd, ShapeEditor.doScroll, ShapeEditor.thumbClicked, ShapeEditor.prepareToDragThumb);
}

////////////////////////////////
// scroling events
///////////////////////////////


ShapeEditor.prepareToScroll = function (e){
  e.preventDefault();
  e.stopPropagation();
	if (Events.extraFingerEvent(e)) return;
	var pt = Events.getTargetPoint(e);
  Events.dragmousex = pt.x;
  Events.dragmousey = pt.y;  
}

ShapeEditor.doScroll = function (e){
	if (Events.extraFingerEvent(e)) return;
	var lastone = gn("palette").childElementCount == 0 ? null : gn("palette").childNodes [gn("palette").childElementCount - 1];
	let max = (lastone.offsetTop + lastone.offsetHeight) + 9;
	var scroll = !lastone ? false : gn("palette").scrollTop > 0 || max > gn("palette").offsetHeight;
	if (!scroll) return;
	var pt = Events.getTargetPoint(e);
  var dy = Events.dragmousey - pt.y;
  var pos = gn("palette").scrollTop;
  var scrollmax =  max - gn("palette").offsetHeight;
  gn("palette").scrollTop = Math.max(0, Math.min(scrollmax, dy + pos))
  Events.dragmousey = pt.y;  
}

ShapeEditor.actionEnd = function (e){
  e.preventDefault();
  e.stopPropagation();
  if (Events.extraFingerEvent(e)) return;
  if (!ShapeEditor.isDraggingThumb)  {
  	ShapeEditor.handleThumbActionEnd();
  	return;
  }
  ShapeEditor.removeCaret();
  var pt = Events.getTargetPoint(e);
  let place = getPlace(pt);
  var m = Events.jsobject;
  switch (place){
  	case "delete":
  		if (ShapeEditor.paintingShape == Events.jsobject) ShapeEditor.unfocus();
  		if (Events.jsobject.parentNode) Events.jsobject.parentNode.removeChild(Events.jsobject); 
  		ShapeEditor.reOrder(); 
  		SimpleAudio.play("delete");
  		break;
  	case "move":  
  		ShapeEditor.repositionThumb();
  		SimpleAudio.play("snap");
  		break;
  	case "edit":  
  		ShapeEditor.backToPlace();		
  		SimpleAudio.play("tap");
  		break;	
  }
	ShapeEditor.handleThumbActionEnd();
	
	function getPlace (pt) {
		let topEdge = globaly(gn('palette'))
		let leftEdge = globalx(gn('palette'));
		if (pt.x < leftEdge) return "delete";
		if (pt.y < topEdge) return "edit";
		return "move";
	}
}  

ShapeEditor.prepareToDragThumb = function (obj){
	if (!obj) return;
	UI.saveForUndo(true);
	SimpleAudio.play("swish");
  ShapeEditor.cleanCaret();
  ShapeEditor.liftThumb (obj);
  if (ShapeEditor.intervalId != null) window.clearInterval(ShapeEditor.intervalId);
 	ShapeEditor.intervalId = window.setInterval(function (){ShapeEditor.cursorOnEdge();}, 10);
 	Events.updatefcn = function (e) {ShapeEditor.draggingThumb (e);}	
 	ShapeEditor.isDraggingThumb = true;
 	Events.dragged = true;
}

ShapeEditor.getMouseTarget = function(e){
	var t = e.target;
	while (t && (t.tagName.toLowerCase() != 'div')) t = t.parentNode;
	if (!t) return null;
	if (t == frame) return null;
	if (t && t.className && t.className.indexOf("thumbslot") > -1 )return t;
	while (t && t.className && (t.className.indexOf("thumbslot") < 0 )) t = t.parentNode;
	if (t && !t.className) return null;
	return t;
}


////////////////////////////////
// draging thumb events
///////////////////////////////

ShapeEditor.liftThumb = function (obj){ 
  var gpt = {x: globalx(obj), y : globaly(obj)};  
 	obj.className = "thumbslot lifted";
 	setProps(obj.style, {position: 'absolute', top: "0px", left: "0px"});	
 	obj.style.zIndex = ShapeEditor.dragginLayer;
  Events.moveTo3D(obj,gpt.x - 6, gpt.y - 8);
 	ShapeEditor.removeCaret();
 	var pos = obj.id.split("_")[1];
  pos--;
	var insertBefore = ShapeEditor.getObjectAfter(pos);
	ShapeEditor.insertThumb(ShapeEditor.caret, insertBefore);
	frame.appendChild(obj);
}

ShapeEditor.insertThumb = function (thumb, next){
 	var p = gn("palette");
 	if (next && next.parentNode && (next.parentNode.id == "frame")) return;
 	if (next) p.insertBefore(thumb, next);
	else p.appendChild(thumb);
} 
  
 ShapeEditor.removeCaret = function (){
  var thumb = ShapeEditor.caret;
 	if (thumb.parentNode) thumb.parentNode.removeChild(thumb);
} 
   
ShapeEditor.getPos = function (div){	
	var w = div.offsetWidth + 10;// css margin
	var  h =  div.offsetHeight + 16; // css margin
	var x = div.offsetLeft + (div.offsetWidth / 2);
	var y =  div.offsetTop + (div.offsetHeight / 2) + gn('palette').scrollTop;
	var pos = (Math.round (x / w) - 1) +  (Math.round (y / h) - 1) * 2;
	return pos;
}
	
ShapeEditor.getAbsolutePos = function (div){	
	var w = div.offsetWidth + 10;// css margin
	var  h =  div.offsetHeight + 16; // css margin
	var midpoint = gn("palette").offsetWidth / 2;
	var x = globalx(div.childNodes[1]) - globalx(gn("palette")) + (div.offsetWidth / 2);
	var y = globaly(div.childNodes[1]) - globaly(gn("palette")) + (div.offsetHeight / 2) + gn('palette').scrollTop;
//	var pos = x > midpoint ? 2 +  Math.round (y / h) :  Math.round (y / h) + 1;
	var pos = (Math.round (x / w) - 1) +  (Math.round (y / h) - 1) * 2;
	return pos;
}
	
ShapeEditor.cursorOnEdge = function (){
	if (!Events.jsobject) {
		ShapeEditor.cleanCaret(); return;
	}
 	var pt = {x: globalx(Events.jsobject), y: globaly(Events.jsobject) };
 	let bottomEdge = getDocumentHeight()  -  Events.jsobject.offsetHeight - 12;
 	let topEdge = globaly(gn('palette')) + 30;
 
 	if (gn("palette").childElementCount  != 0) {
 		let last = gn("palette").childNodes[gn("palette").childElementCount - 1];
 		let maxscroll = last.offsetTop + last.offsetHeight + 4  -  gn("palette").offsetHeight + last.offsetHeight;
 		if (pt.y >  bottomEdge) gn('palette').scrollTop =  Math.min (maxscroll, gn('palette').scrollTop + 4);
 	}
 	if (pt.y <  topEdge) gn('palette').scrollTop =  Math.max (0, gn('palette').scrollTop - 4);
} 

ShapeEditor.backToPlace = function (){
	ShapeEditor.removeCaret();
	var pos = Events.jsobject.id.split("_")[1];
	pos--;
	setProps(Events.jsobject.style, {position: '', top: "", left: "", zIndex: "" });	
 	setTransform (Events.jsobject, "");
 	Events.jsobject.className = "thumbslot";
	var insertBefore = ShapeEditor.getObjectAfter(pos);
	ShapeEditor.insertThumb(Events.jsobject, insertBefore);
	ShapeEditor.editShape(Events.jsobject.key);
}

ShapeEditor.repositionThumb = function (){
	var pos = ShapeEditor.getAbsolutePos(Events.jsobject);
 	pos--;
 	ShapeEditor.removeCaret();
	var insertBefore = ShapeEditor.getObjectAfter(pos);
	setProps(Events.jsobject.style, {position: '', top: "", left: "", zIndex: "" });	
 	setTransform (Events.jsobject, "");
 	Events.jsobject.className = "thumbslot";
	ShapeEditor.insertThumb(Events.jsobject, insertBefore);
	ShapeEditor.reOrder();
}

ShapeEditor.reOrder = function (){
	let p  = gn('palette');
	let shapes = [];
	let editting = undefined;
	for (let i=0; i < p.childElementCount; i++) {
		let tb = p.childNodes[i];
		if (tb.childElementCount < 2) continue;
		if (tb.childNodes[1].childElementCount == 0) continue; 
		tb.id = "thumb_" + i;
		tb.childNodes[0].textContent = (i+1) +".";
 		tb.key = i;
		let shape = ShapeEditor.fromSVGToArray(tb.childNodes[1].childNodes[0]);
		shapes.push (shape);
		if (tb.className == "thumbslot selected") editting = tb;		
	}
	ShapeEditor.shapes = shapes;
	ShapeEditor.paintingShape = editting;
}

ShapeEditor.fromSVGToArray = function (svg){
	let g = svg.childNodes[0];
	let values = [];
	var counter = 0;
	for (let i=0; i < g.childElementCount; i++) {
		if ((i%5) == 0) {
			values.push(counter);
			counter = 0;
		}
		let kid = g.childNodes[i];
	  let shifvalue = (kid.getAttribute('fill')  == "#cccccc" ? 0 : 1) << (4 - (i%5))
		counter += shifvalue;
	}
	values.push (counter);
	values.shift();
	return values;
}

ShapeEditor.draggingThumb = function (e){
  e.preventDefault();
  e.stopPropagation();
  if (Events.extraFingerEvent(e)) return;
  var pt = Events.getTargetPoint(e);
  var dx = pt.x-Events.dragmousex;
  var dy = pt.y-Events.dragmousey;
	Events.move3D(Events.jsobject, dx, dy);	
	ShapeEditor.removeCaret();
 	let place = getPlace(pt);
  switch (place){
  	case "delete":  // add UI feedback
  		break;
  	case "move":  
  		var pos = ShapeEditor.getAbsolutePos(Events.jsobject);
 			pos--;
			var insertBefore = ShapeEditor.getObjectAfter(pos);
			ShapeEditor.insertThumb(ShapeEditor.caret, insertBefore);
			break;
  	case "edit": // add UI feedback
  		var pos = Events.jsobject.id.split("_")[1];
  		pos--;
			var insertBefore = ShapeEditor.getObjectAfter(pos);
			ShapeEditor.insertThumb(ShapeEditor.caret, insertBefore);
  		break;	
  }

	function getPlace (pt) {
		let topEdge = globaly(gn('palette'))
		let leftEdge = globalx(gn('palette'));
		if (pt.x < leftEdge) return "delete";
		if (pt.y < topEdge) return "edit";
		return "move";
	}
}  

ShapeEditor.getObjectAfter = function (pos){
	var p = gn("palette");
	pos++;	
 	if (pos < p.childElementCount){
 		if (pos < 0) return p.childNodes[0];
 		else return p.childNodes[pos];
 	}
 	else return undefined;
}
 	
ShapeEditor.thumbClicked = function (e){
	if (Events.extraFingerEvent(e)) return;
	ShapeEditor.handleThumbActionEnd();
	ShapeEditor.doAction(e);
	gn('palette')[eventDispatch["start"]] =  ShapeEditor.handleTouchStart;
}

ShapeEditor.handleThumbActionEnd = function (){
  ShapeEditor.cleanCaret(); 
  Events.clearEvents();
  Events.unregisterTouch();
	Events.dragged = false;
	gn('palette')[eventDispatch["start"]] =  ShapeEditor.handleTouchStart;
}
	
ShapeEditor.cleanCaret = function (){
	if (ShapeEditor.caret.parentNode) ShapeEditor.caret.parentNode.removeChild(ShapeEditor.caret);
	if (ShapeEditor.intervalId != null) window.clearInterval(ShapeEditor.intervalId);
	ShapeEditor.intervalId  = null;
}

/////////////////////////
//
//  undo/redo
//
/////////////////////////

ShapeEditor.getState = function (){
	let list  = [];
	for (let i = 0; i < ShapeEditor.shapes.length; i++) list.push(ShapeEditor.shapes[i].concat());
//	console.log (list.join (' '), "---",  ShapeEditor.paintingShape ?  ShapeEditor.paintingShape.key : null);
	return {state: list,  selected: ShapeEditor.paintingShape ?  ShapeEditor.paintingShape.key : null}
}

ShapeEditor.setState = function (obj){
//	console.log ("setState", obj);
	ShapeEditor.shapes = obj.state;
	ShapeEditor.paintingShape = undefined;
	ShapeEditor.displayAll();	
	if (obj.selected)	{
		HW.shape = ShapeEditor.editShape(obj.selected);
		ShapeEditor.paintingShape = gn("thumb_" + obj.selected)
	}
	else ShapeEditor.refresh([0,0,0,0,0])
}
