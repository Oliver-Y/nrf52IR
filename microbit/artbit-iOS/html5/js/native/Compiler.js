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


var primlist = 
 ['stop','c',0,   'output','c',1,   'stopall','c',0, 'stopothers','c',0, 
  'repeat','c',2,   'forever','c',1,   'if','c',2,   'ifelse','c',3,   
  'waituntil','c',0,  'repeatuntil','c',0, '%stepbox','c',4,
  'add','r',2,  'subtract','r',2,   'multiply','r',2,'divide','r',2, 'modulo','r',2,
 	'equals','r',2,   'notequals','r',2,   'gt','r',2,   'lt','r',2, 
 	'and','r',2,   'or','r',2,   'xor','r',2,  'not','r',1, 
  '%gwrite','c',2,   '%gread','r',1,  '%gchange','r',1, 
   'broadcast','c',1, 
  'random','r',2, 'wait','c',1, 
  ];

var libprimlist = 
 ['print','c',1, 'prs','c',1,  'prf','c',2, 
  'resett','c',0,   'timer','r',0,   'ticks','r',0, 
  'setshape','c',1, 'shape','r',0,  'clean','c',0, 
  'nextshape','c',0,  'previousshape', 'c',0,  
  'scrollleft','c','0', 'scrollright','c','0', 'scrolldown','c','0', 'scrollup','c','0',
  'doton','c',2,  'dotoff','c',2, 'setbrightness','c',1,
  'setpace','c','1',
  'accx','r',0,   'accy','r',0,   'accz','r',0, 'acc','r','0',
  'apressed','r','0',  'bpressed','r','0',
  'send','c','1',  'recv','r','0', 
	];


class Compiler {


/////////////////////////////////
// 
// Entry Points
//
/////////////////////////////////

runCommandLine(str, fcn){
	this.pc = 0;
	try {
		this.thisproc = undefined;
		var compiledtokens = this.compileCommands(parse(str));
//		console.log(compiledtokens);
		var code = this.encodeItems(compiledtokens);
		code.push(0);
		console.log(code);
 		if(HW.comms.serialID) HW.comms.ccrun(code);
 	} catch (e) {console.log(e); if (fcn) fcn();}
}

downloadProcs(str, shapes, fcn){
//	console.log (str)
	this.pc = this.vectorlen;
	try {
		this.setup();
		var bytes = this.compileProcs(str);
		this.dump(bytes)
		if(iOS.devices.length > 0) HW.comms.download(bytes, shapes, fcn);
		else fcn("no microbit found");
 	} catch (e) {
 		console.log("error in download", e); 
 		if (fcn) fcn("download error");
 	}
}


/////////////////////////////////
// 
// Vectors
//
/////////////////////////////////

vectors(){
	var t = this;
	var res = [];
	var nextvector = 0;

	for(var i=0;i<t.vectorlen;i++) res.push(0);
	setupVectors('onstart',8);
	setupVectors('onbuttona',0x80);
	setupVectors('onbuttonb',0x81);
	setupVectors('onbuttonab',0x82);
	setupVectors('onreceiveall',0x83);
	for(var i=0;i<8;i++) setupVectors('onreceive'+i,0xf0+i);
	return res;

	function setupVectors(type,op){
	//	setupVector(type,op);
		for(var i=0;i<t.vectorlen/4;i++) setupVector(type+i,op);
	}

	function setupVector(name, op){
		var proc = t.oblist[name];
		if(proc==undefined) return;
		var addr = proc.addr;
		res[nextvector++] = op
		res[nextvector++] = addr&0xff;
		res[nextvector++] = (addr>>8)&0xff;
		nextvector++;
	}
}


 

/////////////////////////////////
// 
// Procedure Compiler
//
/////////////////////////////////

compileProcs(str){
	var t = this;
	var tk = new Tokenizer(str);
	while(!tk.eof()) onePass1Command();
	for(var i in t.procnames) compileProcBody(t.procnames[i]);
	return [].concat(t.vectors(), t.encodeProcs());

	function onePass1Command(){
		var sol = tk.offset;
		var parsed = parse(tk.nextLine());
		if(parsed.length==0) return;
			if(parsed[0]=='to') parseTo();
			else if(parsed[0]=='shapes') parseShapes();
			else if(parsed[0]=='global') parseGlobal();
		
		function parseTo(){
			var name = parsed[1];
			var proc = {};
			parseTitleLine();
			proc.type = 'ufun';
			proc.len = 3;
			proc.nargs = parsed.length-2;
			proc.body = gatherBody();
			proc.outputs = proc.body.match(/(^|\s)output\s/);
			t.oblist[name] = proc;
			t.procnames.push(name);

			function parseTitleLine(){
				if(parsed.length==1) throw '"to" needs to be followed by a name'; 
				if((typeof parsed[1])!='string') throw parsed[1]+' can\'t be used as a name'; 
				proc.args = [];
				proc.locals = [];
				var args = parsed.slice(2);
				for(var i in args){
					var arg = args[i];
					if((typeof arg)!='string') throw '"'+arg.toString().replace(',',' ')+'" can\'t be used as an input name'; 
					if(arg[0]!=':') throw '"'+arg+'" needs a ":" to be an input';
					t.oblist[arg] = {type: 'getlocal', outputs: true};
					t.oblist['set'+arg] = {type: 'setlocal', outputs: false};
					t.oblist['change'+arg] = {type: 'changelocal', outputs: false};
					proc.args.push(arg); 
				}
			}

			function gatherBody(){
				var res = '';
				while(true){
					if(tk.eof()) return res;
					var line = tk.nextLine();
					if(line=='end') return res;
					res = res+line+'\n';
				}
			}
		}
		
		function parseGlobal(){
			backup();
			var globals = tk.readToken();
			for(var i in globals) setupGlobal(globals[i]);
		}
		
		function parseShapes(){
			backup();
			t.shapes = t.shapes.concat(tk.readToken().map(shapeNum));

			function shapeNum(s){
				var res = 0;
				s.split('').map(function(c){res=res*2+((c=='x')?1:0);});
				return res;
			}
		}
		
		function backup(){tk.offset=sol; tk.readToken();}
	}
	
	function compileProcBody(name){
		var proc = t.oblist[name];
		t.thisproc = name;
		proc.addr = t.pc;
		t.pc += 1;
		proc.items = t.compileCommands(parse(proc.body+'stop\n'));
	}

}

	
/////////////////////////////////
// 
// Command Compiler
//
/////////////////////////////////

compileCommands(list){
	var t = this;
	var res = [];
	while(list.length>0) compileItem(list.shift());
	return res;

	function compileItem(item, inputfor){
		var type = typeof item;
		if(type=='number') compileNumber(item);
		else if(type=='object') compileList(item);
		else if(item.substring(0,1)=="'") compileString(item);
		else if(item.substring(0,1)==':') compileLocalGet(item);
		else if(item.substring(0,4)=='set:') compileLocalSet(item);
		else if(item.substring(0,7)=='change:') compileLocalChange(item);
		else compileSymbol(item);
		var command = (t.oblist[item])&&!t.oblist[item].outputs;
		if((!command)&&(inputfor==undefined)) throw 'you don\'t say what to do with '+item+thisProc();
		if(inputfor&&command) throw item+' doesn\'t output to '+inputfor+thisProc();
	}

	function compileNumber(n){
		if((n<256)&&(n>=0)&&(n==Math.round(n))) addAndCount(['byte',n],2);
		else addAndCount(['number',n*100],5)
	}

	function compileList(l){
		addAndCount(['list',0],3)
		var oldlist = list;
		list = l;
		while(list.length>0) compileItem(list.shift());
		list = oldlist;
		addAndCount(['eol',0],1)
	}

	function compileString(str){
		str = str.substring(1);
		str = str.substring(0,str.length-1);
		str = str.replace('\\n', '\n');
		str += String.fromCharCode(0);
		addAndCount(['string',str],str.length+3);
	}
	
	function compileLocalGet(name){
		var index = localIndex(name);
		if(index==undefined) throw name+' has no value'+thisProc();
		addAndCount(['localget',index],2);
	}

	function compileLocalSet(setname){
		var name = setname.substring(3);
		var index = localIndex(name);
		if(index==undefined) throw name+' has no value'+thisProc();
		argloop(1, setname);
		addAndCount(['localset',index],2);
	}

	function compileLocalChange(cname){
		var name = cname.substring(6);
		var index = localIndex(name);
		if(index==undefined) throw name+' has no value'+thisProc();
		argloop(1, cname);
		addAndCount(['localchange',index],2);
	}

	function compileSymbol(name){
		var sym = t.oblist[name];
		if(sym==undefined) throw 'I don\'t know how to '+name+thisProc();
		else if(sym.type=='global') compileGlobalGet(sym.index);
		else if(sym.type=='setglobal') compileGlobalSet(sym.index);
		else if(sym.type=='changeglobal') compileGlobalChange(sym.index);
		else if(sym.type=='waituntil') compileWaituntil();
		else if(sym.type=='repeatuntil') compileRepeatuntil();
		else if(sym.type=='stepglobal') compileGlobalStep(sym.index);
		else compileCallSym();

		function compileCallSym(){
			argloop(sym.nargs, name);
			addAndCount([sym.type, name], sym.len);
		}

		function compileGlobalGet(index){
			addAndCount(['byte',index],2);
			addAndCount(['prim','%gread'],1);
			infixCheck();
		}

		function compileGlobalSet(index){
			addAndCount(['byte',index],2);
			argloop(1, name);
			addAndCount(['prim','%gwrite'],1);
		}

		function compileGlobalChange(index){
			addAndCount(['byte',index],2);
			argloop(1, name);
			addAndCount(['prim','%gchange'],1);
		}

		function compileGlobalStep(index){
			addAndCount(['byte',index],2);
			argloop(3, name);
			addAndCount(['prim','%stepbox'],1);
		}

		function compileWaituntil(){
			addAndCount(['list',0],3)
			var oldlist = list; list = list.shift();
			argloop(1, 'waituntil');
			list = oldlist;
			addAndCount(['eol',0],1)
			addAndCount(['prim','waituntil'],1);
		}

		function compileRepeatuntil(){
			addAndCount(['list',0],3)
			var oldlist = list; list = list.shift();
			argloop(1, 'repeatuntil');
			list = oldlist;
			addAndCount(['eol',0],1)
			argloop(1, 'repeatuntil');
			addAndCount(['prim','repeatuntil'],1);
		}

	}

	function argloop(nargs, name){
		for(var i=0;i<nargs;i++) {
			if(list.length==0) throw name+' needs more inputs'+thisProc();
			compileItem(list.shift(),name);
			infixCheck();
		}
	}

	function infixCheck(){
		var infixnext = (list.length>0)&&(t.oblist[list[0]])&&(t.oblist[list[0]].nargs==-1);
		if(!infixnext) return;
		var isym = list.shift();
		if(list.length==0) throw isym+' needs more inputs'+thisProc();
		compileItem(list.shift(),isym);
		addAndCount(['prim',isym],1);
		infixCheck();
	}

	function localIndex(name){
		if(t.thisproc==undefined) return undefined;
		var args = t.oblist[t.thisproc].args;
		var index = args.indexOf(name);
		if(index!=-1) return args.length-1-index;
		var locals = t.oblist[t.thisproc].locals;
		index = locals.indexOf(name);
		if(index==-1) return undefined;
		return 0xff&-index-1;
	}

	function thisProc(){
		if(t.thisproc) return ' in '+t.thisproc;
		else return '';
	}

	function addAndCount(x,n){
		res.push([t.pc].concat(x));
		t.pc+=n;
	}

// Special cases

	function compileLet(){
		var old = list;
		list = old.shift();
		while(list.length>0){
			var local = ':'+list.shift();
			t.oblist[local] = {type: 'getlocal', outputs: true};
			t.oblist['set'+local] = {type: 'setlocal', outputs: false};
			t.oblist['change'+local] = {type: 'changelocal', outputs: false};
			t.oblist[t.thisproc].locals.push(local); 
			compileLocalSet('set'+local);
		}
		list = old;
	}

}




/////////////////////////////////
// 
// Generate ByteCodes
//
/////////////////////////////////

encodeItems(items){
	var res = [];
	var lists = [];
	for(var i in items) this.encodeItem(items[i], res, lists);
	return res;
}

encodeProcs(){
	var res = [];
	var lists = [];
	for(var i in this.procnames){
		var proc = this.oblist[this.procnames[i]];
		var items = proc.items;
		res.push(proc.args.length);
//		res.push(proc.locals.length);
		for(var i in items) this.encodeItem(items[i], res, lists);
	}
	return res;
}

encodeItem(i, res, lists){
	var val = i[2];
	switch(i[1]){
	case 'byte':
		res.push(1);
		res.push(val&0xff);
		break;
	case 'number':
		res.push(2);
		res.push(val&0xff);
		res.push((val>>8)&0xff);
		res.push((val>>16)&0xff);
		res.push((val>>24)&0xff);
		break;
	case 'list':
		res.push(3);
		lists.push(res.length);
		res.push(0);
		res.push(0);
		break;
	case 'string':
		res.push(3);
		res.push(val.length&0xff);
		res.push((val.length>>8)&0xff);
		val.split('').map(function(x){res.push(x.charCodeAt(0));});
		break;
	case 'eol':
		addEOL(4);
		break;
	case 'localget':
		res.push(5);
		res.push(val);
		break;
	case 'localset':
		res.push(6);
		res.push(val);
		break;
	case 'localchange':
		res.push(7);
		res.push(val);
		break;
	case 'prim':
		res.push(this.oblist[val].code);
		break;
	case 'ufun':
		res.push(8);
		res.push(this.oblist[val].addr&0xff);
		res.push((this.oblist[val].addr>>8)&0xff);
		break;
	default: 
		res.push(i[1]);
		break;
	}

	function addEOL(n){
		res.push(n);
		var offset = lists.pop();
		var len = res.length-offset-2;
		res[offset] = len&0xff;
		res[offset+1] = (len>>8)&0xff;
	}
}


/////////////////////////////////
// 
// Setup
//
/////////////////////////////////

dump(list){
	var l = list.concat();
	var addr = 0;
	while(l.length>0){
		var line = hexWord(addr)+' - ';
		for(var i=0;i<16;i++){
			if(l.length==0) break;
			line+= hexByte(l.shift());
			line+= ' ';
			addr++;
		}
	//	console.log(line)
	}
	function hexByte(n){return (n+256).toString(16).substring(1);}
	function hexWord(n){return (n+65536).toString(16).substring(1);}
}

setupGlobal(name){
	this.oblist[name] = {type: 'global', index: this.nextglobal, outputs: true};
	this.oblist['set'+name] = {type: 'setglobal', index: this.nextglobal, outputs: false};;
	this.oblist['change'+name] = {type: 'changeglobal', index: this.nextglobal, outputs: false};;
	this.oblist['step'+name] = {type: 'stepglobal', index: this.nextglobal, outputs: false};;
	this.nextglobal++;
}


setup(){
	var t = this;
	this.vectorlen = 64;
	this.oblist = {};
	this.nextglobal = 0;
	this.procnames = [];
	this.shapes = [];
	setupBuiltIns('prim', primlist, 9, 1);
	setupBuiltIns('prim', libprimlist, 0x40, 1);
	this.oblist['let'] = {type: 'let', outputs: false};
	this.oblist['waituntil'].type = 'waituntil';
	this.oblist['repeatuntil'].type = 'repeatuntil';
	this.setupGlobal('box1');
	this.setupGlobal('box2');
	this.setupGlobal('box3');

	function setupBuiltIns(type, list, index, len){
		list = [].concat(list);
		while(list.length>0){
			var name = list.shift();
			var ops = list.shift()=='r';
			var nargs = list.shift();
			t.oblist[name] = {type: type, len: len, code: index++, nargs: nargs, outputs: ops};
		}
	}

}

}
