var bitname = '9C941966-28B8-43B2-83C4-4FD90CD72FD2';
var connected = false;

var CC = 0x20003000;
var FONT = 0x31000;
var PROCS = 0x30000;

var packetcallback = null;

function download(l){
	var addr = PROCS;
	packetcallback = download2;
	flasherase(PROCS);

	function download2(){
		console.log(l);
		if(l.length==0) packetcallback = null;
		else {
			flashwrite(addr, l.slice(0,128));
			addr+=128;
			l=l.slice(128);
		}
	}
}

function ccrun(l){
	l.push(0);
	ramwrite(CC, l);
	sendl([0xfc]);
}

function fontwrite(l){
	l.push(0xff);
	packetcallback = fontwrite2;
	flasherase(FONT);

	function fontwrite2(){
		packetcallback = null;
		ramwrite(CC, l);
		flashwrite(CC, FONT, 128);
	}
}

function directshape(l){
	sendl([].concat([0,0xf9], l));
}

function flasherase(addr){
	sendl([].concat([0,0xfb], fourbytes(addr)));
}

function flashwrite(dst, list){
	sendl([].concat([0xfc], fourbytes(dst), list.length, list));
}

function ramwrite(addr,l){
	sendl([].concat([0,0xfd], fourbytes(addr), twobytes(l.length), l));
}

function sendl(l){
//	console.log(l);
	while(l.length>0){
		send(l.slice(0,8));
		l=l.slice(8);
	}
}

function twobytes(n){return [n&0xff, (n>>8)&0xff];}
function fourbytes(n){return [n&0xff, (n>>8)&0xff, (n>>16)&0xff, (n>>24)&0xff];}

function send(l){sendmessage(bitname, l);}


function bitconnect(){connect(bitname);}
function bitdisconnect(){disconnect(bitname);}

function print(name, fcn){nativeCommand('print', name+'\n', fcn);}
function bleinit(fcn) {nativeCommand('bleinit', '', fcn);}
function scan(fcn) {nativeCommand('scan', '', fcn);}
function scanoff(fcn) {nativeCommand('scanoff', '', fcn);}
function connect(name, fcn) {nativeCommand('connect',  name+'\n', fcn);}
function disconnect(name, fcn) {nativeCommand('disconnect',  name+'\n', fcn);}
function sendmessage(name, list, fcn) {nativeCommand('sendmessage',  name+'\n'+list.toString()+'\n', fcn);}
function recvmessage(name, fcn) {nativeCommand('recvmessage',  name+'\n', fcn);}

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

function b64ToUtf8( str ) {
    return decodeURIComponent(escape(atob(str)));
}

function bleStarted(){
	insert('bleStarted\n');
	scan();
}

// Call backs

function founddevice(name, uuid){
//	insert('founddevice '+name+' '+uuid+'\n');
	if(uuid==bitname) connect (uuid);
}

function connectedTo(name){
	insert('connected to '+name+'\n');	
	connected = true;
}

function disconnectedFrom(name){
	insert('disconnected from '+ name+'\n');	
	connected = false;
}

function gotpacket(l){
	if(packetcallback==null) insert('got: '+l+'\n');
	else packetcallback(l);
}
