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


Runtime = function() {};

Runtime.threadsRunning=[];
Runtime.thread;
Runtime.intervalId;
Runtime.yield=false;
Runtime.ticker = 50;
Runtime.counter=0;
Runtime.shape = [0,0,0,0,0];
Runtime.brightness = 100;

Runtime.startTimer = function() {
	resett()
	Runtime.stopTimer ();
	console.log ("startTimer")
	Runtime.intervalId = window.setInterval(function (){Runtime.tickTask();}, Runtime.ticker);
}

Runtime.stopTimer = function(){
	if(Runtime.intervalId != null) window.clearInterval(Runtime.intervalId);
	Runtime.intervalId = null;
	Runtime.stopThreads(Code.scripts);
	UI.updateRunStopButtons();
}

Runtime.stopThreads = function(sc) {
	Runtime.turnOffStacks(sc);
	for (var i=0; i <  Runtime.threadsRunning.length; i++) {
		if (Runtime.threadsRunning[i].isRunning) {
			Runtime.stopThread(Runtime.threadsRunning[i]);
		}
	}	
  Prim.currentShape = {n: undefined, dx:0, dy: 0}
//	HW.shape = [0,0,0,0,0];
}

Runtime.stopOthers = function(t) {
	for (var i=0; i <  Runtime.threadsRunning.length; i++) {
		if (Runtime.threadsRunning[i] ==  t) continue;
		if (Runtime.threadsRunning[i].isRunning) {
			Runtime.stopThread(Runtime.threadsRunning[i]);
		}
	}	
}

Runtime.turnOffStacks = function(sc) {
	var topblocks = sc.blocksContainer.getScripts()
	for (var i=0; i <  topblocks.length; i++) {
		var id = topblocks[i]
		if (Runtime.isBlock(sc, id))Code.workspace.glowStack(id, false)
	}	
}
	
Runtime.tickTask = function() {
	Runtime.send();
	HW.poll();
	Runtime.run();
}

Runtime.send = function() { 
	if ((HW.shape && Runtime.shape) && (HW.shape.join(' ') != Runtime.shape.join(' '))) HW.sendShape();
	if (HW.brightness !=  Runtime.brightness) HW.sendBrightness();
//	HW.broadcast()
	Runtime.shape = HW.shape ;
	Runtime.brightness = HW.brightness;	
}

Runtime.run = function() { 
	Runtime.updateThreads();
	UI.updateRunStopButtons();
	Runtime.scanTriggers();
	for (var i=0; i < Runtime.threadsRunning.length; i++) Runtime.step(i);
}
	
Runtime.isBlock = function(sc, id) { 
	 var bc = sc.blocksContainer;
	 var b = bc.getBlock(id)
	 if (!b) return false
	 var opcode = bc.getOpcode(b);
	 var prim = opcode.split ("_")[1]
	 var blockFunction =  Prim[opcode];
	 var isreporter =  (Defs.primtives[prim]) ?  Defs.primtives[prim][1] == "r" : true;
	 if (!blockFunction || isreporter) return false;
	 return true
 }

Runtime.updateThreads = function (){
 	var activeThreads=[];
  for (var i=0; i < Runtime.threadsRunning.length; i++) {if (Runtime.threadsRunning[i].isRunning) activeThreads.push(Runtime.threadsRunning[i]);}
	Runtime.threadsRunning = activeThreads;
}

Runtime.isActive = function (){return (Runtime.threadsRunning.length > 0)}

Runtime.step = function (n){
	Runtime.yield=false;
	Runtime.thread=Runtime.threadsRunning[n];
	while (true) {
		if (Runtime.thread.waitFcn) {
			if (!Runtime.thread.waitFcn()){
				Runtime.yield=true;
				break;
			}
			else Runtime.thread.waitFcn = undefined
			} 
		if (Runtime.yield) break;
		if (Runtime.thread.thisblock == undefined) {
			Runtime.endCase(); 
			Runtime.yield=true;
		}
		else Runtime.runPrim();
	}			
}

Runtime.runPrim = function() {
	var b = Runtime.thread.thisblock;
//	console.log (timer(), "runPrim", (typeof b)=='string' ? b : b.opcode);
	if((typeof b)=='string') Prim[b]();
	else {
		if (!Runtime.thread.getBlock(b.id)) Runtime.stopThread(Runtime.thread);
		else Runtime.runBlock(b);
	}
}

Runtime.scanTriggers = function (){
	var blocks = []
	for (let type in HW.state) {	
		switch (type){	
			case "apressed": 
			case "bpressed": 
			case "abpressed": 
				blocks = blocks.concat (Code.scripts.triggerButton(type))	
				break;
			case "recc": 
				blocks = blocks.concat (Code.scripts.triggerBroadast(HW.state[type]))
				break;
		}
	}
	for (var i=0; i < blocks.length; i++) Runtime.addScript(Code.scripts, blocks[i]);
}

Runtime.runBlock = function(b) {	
	var token=Prim[b.opcode];
	if (!token) token=Prim["missing"];
//	console.log (b.opcode)
	let keepOn = ["myblocks_definition"]
	if (keepOn.indexOf(b.opcode) < 0) {
		Runtime.unglowBlock(Runtime.thread, Runtime.thread.onblock);
		Runtime.thread.onblock = null;
	}
	var setoff = ["missing", 'control_repeat', 'events_onbuttona', 'events_onbuttonb', 'events_onreceive']
	if (setoff.indexOf(b.opcode) < 0) {
		Runtime.time = new Date().getTime();
		Runtime.glowBlock(Runtime.thread, b);
		Runtime.thread.onblock = b;
	}
	token();
}

Runtime.endCase = function () {
  if (Runtime.thread.stack.length == 0) Prim.done();
  else {  
    var b = (Runtime.thread.stack).pop();
    Runtime.thread.thisblock = b;
  }
}

Runtime.addScript = function(sc, block){
//	console.log (timer(), "addScript",  block.opcode);
	var  newThread =  new Thread(sc, block);
	Runtime.restartThread(newThread);
}

Runtime.restartThread = function (newThread) {
  var wasRunning = false;
  var notSpecial = false;
  for (var i = 0; i < Runtime.threadsRunning.length; i++) {  	
   	if (Runtime.threadsRunning[i].firstBlock == newThread.firstBlock) {
   		let thread = Runtime.threadsRunning[i];
   		Runtime.stopThread(thread);
      wasRunning = true;
      notSpecial = newThread.firstBlock.opcode.indexOf('events_onbutton') < 0; 
     	thread.isRunning = notSpecial;
     	if (notSpecial) thread.restart();
      else Prim.cancelThread(thread);
    }
  }
  if (!wasRunning) {
  	Runtime.threadsRunning.push(newThread);
  	newThread.startGlow();
  }
}

Runtime.stopScript = function (thread) {
	var procId = thread.thisblock ? thread.sc.blocksContainer.getTopLevelScript(thread.thisblock.id) : null;
	if (!procId) thread.stop();
	else {
		var block = thread.sc.blocksContainer.getBlock(procId);
	//	console.log ("exitProcedure")
		var opcode = block.opcode
		if (opcode == "myblocks_definition") return thread.stopProcedure();
		else  {
			thread.stop();
			return undefined;
		}
	}
}

Runtime.stopThread = function (thread) {
	if (thread.onblock){
		var procId = thread.sc.blocksContainer.getTopLevelScript(thread.onblock.id)
		let block =  !procId ? undefined : thread.sc.blocksContainer.getBlock(procId);
		if (block) {
			var opcode = block.opcode
			if (opcode == "myblocks_definition") thread.exitProcedure()
		}
	}
	thread.stop();
}

Runtime.stopThreadForBlock = function (topblock, whenDone) {
	var running = false
 	for (var i = 0; i < Runtime.threadsRunning.length; i++) {  
 		var thread = 	Runtime.threadsRunning[i]
   	if (thread.firstBlock.id == topblock.id) {
			running = true; 
			Runtime.stopThread(thread, whenDone);
   	}
 	}
 	if (!running) whenDone()
}	
	
Runtime.glowBlock = function(t, b) {if (b && t.blockExists(b.id)) Code.workspace.glowBlock(b.id, true);}
Runtime.unglowBlock = function(t, b) {if (b && t.blockExists(b.id)) Code.workspace.glowBlock(b.id, false);}

Runtime.glowStack = function(t, b) {if (b && t.blockExists(b.id)) Code.workspace.glowStack(b.id, true);}
Runtime.unglowStack = function(t, b) {if (b && t.blockExists(b.id)) Code.workspace.glowStack(b.id, false);}
