
////////////////////////////////////
//
// top level commands
//
////////////////////////////////////

var PROCS = 0x30000;

function ccrun(l){
	var cmd = [].concat(0xf8, l.length, l);
	sendReceive(cmd, ignore);
}

function download(bytes){
	var erasecmd = [].concat(0xfb, fourbytes(PROCS))
	sendReceive(erasecmd, next);

	function next(){
		var writeflashcmd = [].concat(0xfc, fourbytes(PROCS), bytes.length, bytes);
		sendReceive(writeflashcmd, function(){console.log('written.')});
	}
}

function start(){send([0xfa]);}

////////////////////////////////////
//
// connect, disconnect, sendreceive
//
////////////////////////////////////

var bitname = 'Adafruit Bluefruit LE';
var response;

function sendReceive(l, fcn){
//	console.log('sending:', l);
	packetcallback = fcn;
	sendl(l);
}

function sendl(l){
	while(l.length>0){
		send(l.slice(0,8));
		l=l.slice(8);
	}
}

function send(l){sendmessage(bitname, l);}
function bitconnect(){connect(bitname);}
function bitdisconnect(){disconnect(bitname);}



////////////////////////////////////
//
// native calls and callbacks
//
////////////////////////////////////

var connected = false;
var packetcallback = null;
var packet = [];

function bleinit(fcn) {nativeCommand('bleinit', '', fcn);}
function connect(name, fcn) {nativeCommand('connect',  name+'\n', fcn);}
function disconnect(name, fcn) {nativeCommand('disconnect',  name+'\n', fcn);}
function scan(fcn) {nativeCommand('scan', '', fcn);}
function sendmessage(name, list, fcn) {nativeCommand('sendmessage',  name+'\n'+list.toString()+'\n', fcn);}

function bleStarted(){
	lprint('bleStarted');
	scan();
}

function foundbrick(name){
//	insert('foundbrick '+name+'\n');
	if(name==bitname) connect (name);
}

function connectedTo(name){
	lprint('connected to '+name);	
	connected = true;
}

function disconnectedFrom(name){
	lprint('disconnected from '+ name);	
	connected = false;
}


function gotpacket(l){
//	console.log('got bytes:', l);
	for(var i in l) gotChar(l[i]);

	function gotChar(c){
		if((packet.length==0)&&(c>=0xf0)) packet.push(c);
		else if(c==0xed){
			if(packet.length==packet[1]+2) handlePacket(packet);
			packet = [];
		} else packet.push(c);
	}

	function handlePacket(p){
		if(packetcallback==null) lprint('got: '+p);
		else packetcallback(p);
	}
}

var nativeRequests = [];
var nativeReqno = 0;

function nativeCommand(cmd, str, fcn){
	nativeRequests[nativeReqno] = fcn;
	if(webkit.messageHandlers[cmd]==undefined) console.log('unhandled message', cmd);
	else webkit.messageHandlers[cmd].postMessage([String(nativeReqno++), str]);
}

function nativeResponse(id, str){
	var fcn = nativeRequests[id];
	delete nativeRequests[id];
	if(fcn) fcn(str);
}



////////////////////////////////////
//
// etc
//
////////////////////////////////////

function b64ToUtf8( str ) {return decodeURIComponent(escape(atob(str)));}
function twobytes(n){return [n&0xff, (n>>8)&0xff];}
function fourbytes(n){return [n&0xff, (n>>8)&0xff, (n>>16)&0xff, (n>>24)&0xff];}
function ignore(x){}
