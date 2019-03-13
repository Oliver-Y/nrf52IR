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


///////////////////////////
// Thread specs
///////////////////////////

class Thread {
	constructor (sc, b) {
		this.sc = sc;
		this.firstBlock = b;
		var op = ((typeof b)=='string') ? b  : b.opcode.split("_")[1];
		this.trigger = !Defs.primtives[op] ?  false: Defs.primtives[op][1] == "t"		
		this.waitFcn = undefined;
		this.isRunning=true;
		this.thisblock = b;
		this.onblock = null;
		this.stack=[];
	}
	
	startGlow(){Runtime.glowStack(this, this.firstBlock);}
		
	stop() {
		if (this.onblock) Runtime.unglowBlock(this, this.onblock);
		Runtime.unglowStack(this, this.firstBlock);
		this.onblock = null;
		this.isRunning = false;
		this.thisblock = undefined;
		this.waitfcn= undefined;
		this.stack=[];
	}
	
	cancel() {		
//		console.log ("cancel")
		this.exitProcedure()
		this.onblock = null;
		this.isRunning = false;
		this.thisblock = undefined;
		this.waitfcn= undefined;
		this.stack=[];
	}
	
	stopProcedure(){
		var key = null
		while ((key != "exitProc")&&(this.stack.length >  0)) {key = this.stack.pop()}
		if (key!="exitProc") return null;
		var next = this.stack.pop();
		var proccall = this.stack.pop();
		var callblock = this.stack.pop();
		Runtime.unglowBlock(this, proccall);
		Runtime.unglowStack(this, callblock);
		return next;
	}
		
	exitProcedure(){
	//	console.log ("exitProcedure")
		let next = this.stopProcedure();
		if (this.stack.length >  0) this.exitProcedure()
	}

	restart () {
		Runtime.stopThread(this);
		this.isRunning = true;
		this.thisblock = this.firstBlock;
		this.startGlow();
	}
	 
	getProcStack () {
		var b = this.thisblock;
		var bc = this.sc.blocksContainer
		var callblock = undefined;
		var args = this.getArgs(b, false).mutation;
		var procName = args["input0"];
		var topblocks = bc.getScripts()
		for (var i=0; i < topblocks.length; i++) {
			var block = bc.getBlock(topblocks[i]);		
			if (!block) continue
			if (block.opcode =='myblocks_definition') {		
				var mutation = this.getArgs(block, false).mutation
				if (!mutation) continue;
				let name  = mutation.arg0;
				if (name == procName) {
					callblock = block;
					break;
				}
			}
		}
		return callblock
	}
	
	next () {
		var b = this.thisblock
		if (!b) return undefined;
		var nb = this.getBlock(b.next)
		return !nb ? undefined : nb;
	}

	getBlock(id) {return this.sc.blocksContainer.getBlock(id)}
	
	 // PB  under the hood check
	blockExists(id) {return Code.workspace.blockDB_[id]} // ask the other side of the fence for glow features
	
	getSubStack (b, type){
		var ref = b.inputs[type];
	 	if (ref) {
			var blockID = ref.block
			return this.sc.blocksContainer._blocks[blockID];
		}
		else return undefined
	}

	
	//////////////////////////
	// Stack to text
	//////////////////////////
	
	decode (n) {
		var commands = []
		var done = false
		var cmd;
		var self = this;
		while (!done) {	
			while (!self.thisblock) {
				if(self.stack.length==0) break;
				let values = self.popFromStack()			
				if (values.cmd) commands =	commands.concat (values.cmd)
				self.thisblock = values.next
			}
			let b = self.thisblock
			if (!b) break;
			var list = b.opcode.split("_")
			list.shift();
			var op = list.join("")
			var textblock = self.getBlockText(b)
			var prim  = list.join("_")
			var hasFlowInputs =  (Defs.primtives[prim]) ?  Defs.primtives[prim][1] == "l" : false 
			if (self.thisblock == self.firstBlock) {				
				if (textblock == "0") return [] // ignore empty procedure name
				cmd  =  op != "definition" ? "to " + textblock + n : "to " + textblock 	
				commands.push (cmd)
				self.stack.push (null)
				self.stack.push ("end")
			}
			else commands.push (textblock)
			if (hasFlowInputs) manageFlowInputs(b)
			else self.thisblock = self.next()
		}
		return commands


	function manageFlowInputs (b){ 
		commands.push ("["); // open statement
		// build stack
		if	(b.opcode == "control_ifelse"){
			self.stack.push(self.next());
			self.stack.push ("]");
			self.stack.push(self.getSubStack(b,"SUBSTACK2"));
			self.stack.push ("[");
			self.stack.push(null);
			} 
		else self.stack.push(self.next());
		self.stack.push ("]");
		self.thisblock = self.getSubStack (b, "SUBSTACK");
	}
}		
	 		
	popFromStack (){ // stack structure [b, ".."] pairs
		var str = this.stack.pop()
		var b = this.stack.pop();
		return {next: b, cmd: [str]};
	}	

	getBlockText (b){
		var textarg = this.getArgs(b, true)
		const runList = ['waituntil', 'repeatuntil']
		var text = textarg;
		var cmd = textarg.split(" ")
		var op = this.getDefName(b.opcode)
		var hasRunList =  runList.indexOf(op) > -1
		if (hasRunList) {
			var indx = text.indexOf(" ")
			text = text.splice(indx+1,0,"[");
			text += "]";
		}
		switch (op) {
			case 'step':
				let prim =	cmd.shift();
				cmd[0] = prim+cmd[0]
				text = cmd.join(" ");
				break;
			case 'scroll':
			case "onreceive":			
				text = cmd.join("")
		//		console.log ("result", text)
				break;				
			case "setglobal":
				cmd.shift();
				cmd[0] = "set"+cmd[0]
				text = cmd.join(" ");
				break;
			case "changeglobal":
				cmd.shift();
				cmd[0] = "change"+cmd[0]
				text = cmd.join(" ");
				break;
		}
		text = text.replace(/  /g, ' ');	
		text = text.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
		return text;
 	}  

	getMutationValues (opcode, values) {
		var args = {}
		var special = ["myblocks_definition", "myblocks_procedure"] // exception name with no space at the LOGO level
		var keys  = Defs.argsKeys[opcode] ?  Defs.argsKeys[opcode].args  : [];// has the order
		for (let j=0; j < keys.length; j++) {
			let key =  keys[j]
			if (values[key]) {
				if ((j==0)&&(special.indexOf(opcode) > -1))  {
					var name  = values[key].replace(/[\s\xa0]+/g, '')
					if (name == "") return {}
					args [key]  =  name.replace(" ", "-")
				}
				else args [key] = values [key]
			} 
		} 
		return args
	}
	
	getArgs (block, isText){
		var argValues = {}
		var bc = this.sc.blocksContainer
		var opcode = bc.getOpcode(block);
    var fields = bc.getFields(block);
    var inputs = bc.getInputs(block);
    var mutation = bc.getMutation(block);
    if (mutation != undefined)  argValues.mutation = this.getMutationValues(opcode, mutation);
    var blockFunction =  Prim[opcode]
    var prim = opcode.split ("_")[1]
   	var isreporter =  (Defs.primtives[prim]) ?  Defs.primtives[prim][1] == "r" : true 
    if (!blockFunction && isreporter) { // math_number, text field, empty boolean
    	var val  = "0"
     	for (var fieldName in fields) {
     		if (!fields.hasOwnProperty(fieldName)) continue;
        val = fields[fieldName].value;
    	}
    	return val
    }
  
    for (var fieldName in fields) {
     		if (!fields.hasOwnProperty(fieldName)) continue;
     	  argValues[fieldName] = fields[fieldName].value;
    }

    for (var inputName in inputs) {
    	 if (!inputs.hasOwnProperty(inputName)) continue;
        var input = inputs[inputName];
        var inputBlockId = input.block; 
     		if (!inputBlockId) continue
        argValues[inputName] = this.getArgs(bc.getBlock(inputBlockId), isText) 
    }

    // Add any mutation to args (e.g., for procedures).
 		if (isText) return this.block2Text (opcode, argValues)
    if (blockFunction && isreporter) return Prim[opcode](this.getBlockInputs(opcode, argValues));
    return argValues;
	}

	block2Text (opcode, args){
		var op = this.getDefName(opcode)
		var inputs = []
		if (!Defs.argsKeys[opcode]) return ""
		var keys  = Defs.argsKeys[opcode].args // has the order
	//	console.log (op, keys)
		if (args.mutation) {
			for (let elem in args.mutation) args[elem.toUpperCase()] = args.mutation[elem]
		}
		for (let j=0; j < keys.length; j++) {
			let val =  args[keys[j].toUpperCase()]
			let value = val ? val : "0"
			inputs.push(value)
		} 
		var textargs = inputs.join(" ").replace(/  /g, " ")
		var valid  = !Defs.argsKeys[opcode] || args.mutation 
		return valid ? textargs :  op + " " +textargs;
 	}

	getBlockInputs (opcode, args){
		let json = {}
		var keys  = Defs.argsKeys[opcode].args // has the order
		if (args.mutation) {
			for (let elem in args.mutation) args[elem.toUpperCase()] = args.mutation[elem]
		}
		for (let j=0; j < keys.length; j++) {
			let val =  args[keys[j].toUpperCase()]
			let value = val ? val : "0"
			json [keys[j].toUpperCase()] =  value
		} 
		return json;
	}
		
	getDefName (opcode){ // stack structure [b, ".."] pairs
		var list = opcode.split("_")
		list.shift();	
		return list.join("");
	}	
	
	
}