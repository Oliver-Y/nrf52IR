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


Events = function() {};

Events.dragged=false;
Events.dragmousex=0;
Events.dragmousey=0;
Events.jsobject= undefined;
Events.timeoutEvent= undefined;
Events.fcnstart= undefined;
Events.fcnend= undefined;
Events.updatefcn= undefined;
Events.fcnclick= undefined;
Events.mouseDownTime= 0;
Events.lastMouseMove = 0;
Events.touchID= undefined;
Events.activeFocus = undefined;
Events.dragdistance = 15;

Events.thumbnails = function(divs) {
  var res = new Array();
  for(var j=0;j< divs.length;j++) {
    var section = divs[j];
    for(var i=0;i<section.childElementCount;i++) res.push(section.childNodes[i]);   
    }
  return res;
}
  
Events.registerTouch = function(e){Events.touchID = isiPad ? e.changedTouches[0].identifier : e.identifier;}
Events.unregisterTouch = function(){Events.touchID = undefined;}
Events.extraFingerEvent = function(e){
  if (isiPad) {
    if (e.changedTouches.length > 0) {
    	 if (e.changedTouches[0].identifier == Events.touchID) return false;
    	 else return true;
     }
    else return false;
    }
  return false;
}

Events.startDrag = function (c, atstart, atend, atdrag, atclick, athold){
//	console.log (c, atstart, atend, atdrag, atclick, athold);
  Events.dragged = false;
  Events.mouseDownTime = Date.now(); 
  Events.jsobject = c;
  Events.fcnstart = atstart;
  Events.fcnend = atend;
  Events.fcnclick= atclick;
  if (athold) holdit (c, athold); 
  Events.updatefcn = atdrag;
  window[eventDispatch["move"]] = Events.mouseMove;
	window[eventDispatch["end"]] = Events.mouseUp;
  Events.dragdistance = (isiPad) ? 15 : 7;
	function holdit(c, fcn) {
  	var repeat = function () {
   // 	Events.clearEvents();
   	 	fcn(Events.jsobject);
   	 	 if (Events.timeoutEvent) clearTimeout(Events.timeoutEvent);
   // 	Events.clearDragAndDrop();
   // 	Events.unregisterTouch();
    }
  Events.timeoutEvent = setTimeout(repeat, 500);
	}
}

Events.clearDragAndDrop = function (){
  if (Events.timeoutEvent) clearTimeout(Events.timeoutEvent);
  Events.timeoutEvent = undefined;
  Events.timeoutEvent = undefined;
  Events.dragged = false;
  Events.jsobject = undefined;
  Events.fcnstart = undefined;
  Events.fcnend = undefined;
  Events.fcnclick= undefined;
}

Events.mouseMove = function (e){
 // be forgiving about the click
 if (Events.extraFingerEvent(e)) {
   	e.preventDefault();
  	e.stopPropagation();
  	return;
 }

  var pt = Events.getTargetPoint(e);
  var dx = Events.dragmousex - pt.x; var dy =  Events.dragmousey - pt.y;
  
  if (!Events.dragged && (Events.distance(dx,dy) <  Events.dragdistance)) return;
  if (!Events.dragged) {
  	Events.lastMouseMove = Date.now();
    if (Events.timeoutEvent) clearTimeout(Events.timeoutEvent);
  	Events.timeoutEvent = undefined;
  	Events.fcnstart(e);
  	Events.dragged = true;
		}
  var dx = pt.x-Events.dragmousex;
  var dy = pt.y-Events.dragmousey;
 // console.log (Date.now() - Events.lastMouseMove)
  //Events.move(Events.jsobject, dx, dy);
  if (Events.updatefcn) Events.updatefcn(e, Events.jsobject);
  Events.dragmousex = pt.x;
  Events.dragmousey = pt.y;
  Events.lastMouseMove = Date.now();
 }

Events.distance = function (dx, dy){ return Math.round(Math.sqrt((dx*dx)+(dy*dy)));}

Events.mouseUp = function (e){
 if (Events.extraFingerEvent(e)) {
   	e.preventDefault();
  	e.stopPropagation();
  	return;
 	}
  if (Events.timeoutEvent) clearTimeout(Events.timeoutEvent);
  Events.timeoutEvent = undefined;
  Events.clearEvents();
  if (!Events.dragged) Events.itIsAClick(e);
  else Events.performMouseUpAction(e);
  Events.clearDragAndDrop();
  Events.unregisterTouch();
}
 
Events.clearEvents = function(){
	window [eventDispatch["move"]] =  undefined;
	window [eventDispatch["end"]] =  undefined;
}

Events.move3D = function(el, dx, dy){
	if (! el) return;
  el.top +=dy;
  el.left+= dx;
  var t = 'translate3d('+ el.left + 'px,' +el.top +'px, 0)';
  setTransform (el, t);
}

Events.moveTo3D = function(el, dx, dy){
	if (! el) return;
  el.top =dy;
  el.left = dx;
  var t = 'translate3d('+ el.left + 'px,' +el.top +'px, 0)';
  setTransform (el, t);
}

Events.move = function (el, dx, dy){
	if (el && el.move) el.move(el.left+dx, el.top+dy);
}

Events.performMouseUpAction = function (e){
// use checkplace at a higher level
//console.log ("performMouseUpAction" , Events.dragged);
	if (Events.fcnend)  Events.fcnend(e, Events.jsobject);
}

Events.itIsAClick = function (e){	
//	console.log ("itIsAClick" , Events.dragged);
  if (Events.fcnclick) Events.fcnclick(e, Events.jsobject);
}

Events.getTargetPoint = function(e){
  if (isiPad) {
    if (e.changedTouches && (e.changedTouches.length > 0))  return {x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY };
    }
  return {x: e.clientX, y: e.clientY};
}


Events.isMultiTouch = function(e){
	if (!isiPad) return false;
	return  (e.touches.length > 1); 
}

Events.forceCancel = function (){
  if (Events.timeoutEvent) clearTimeout(Events.timeoutEvent);
  Events.timeoutEvent = undefined;
  Events.clearEvents();
  if (Events.dragged) Events.performMouseUpAction();
  Events.clearDragAndDrop();
  Events.unregisterTouch();
}
 
