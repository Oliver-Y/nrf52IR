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
		var b = pad4(bytes);
		var writeflashcmd = [].concat(0xfc, fourbytes(PROCS), b.length, b);
		sendReceive(writeflashcmd, function(){console.log('written.')});
	}
}

function start(){send([0xfa]);}

function pad4(l){
	for(var i=0;i<4;i++){
		if((l.length%4)==0) return l;
		l.push(0xff);
	}
}

function saveAs(name){
	var a = document.createElement('a');
	a.href = 'data:text/plain;charset=UTF-8,'+encodeURIComponent(procs.value);
	a.download = name+'.txt';
	frame.appendChild(a);
	a.click();
	frame.removeChild(a);
}



////////////////////////////////////
//
// connect, sendreceive
//
////////////////////////////////////

var packetcallback = null;
var packet = [];

var serialID;

function sendReceive(l, fcn){
//	console.log('sending:', l);
	packetcallback = fcn;
	sendl(l);
}

function sendl(l){
	console.log('sending: ',l);
	chrome.serial.send(serialID, new Uint8Array(l), function(){});
}

function onrecc(r){
	var l = Array.from(new Uint8Array(r.data));
//	console.log('got:',l);
	for(var i in l) gotChar(l[i]);

	function gotChar(c){
		if((packet.length==0)&&(c>=0xf0)) packet.push(c);
		else if(c==0xed){
			if(packet.length==packet[1]+2) handlePacket(packet);
			packet = [];
		} else packet.push(c);
	}

	function handlePacket(p){
		console.log('received:', p);
		if(packetcallback==null) lprint(String.fromCharCode.apply(null,p.slice(2,p.length-1)));
		else packetcallback(p);
		packetcallback=null;
	}
}


function openSerialPort(){
	chrome.serial.getDevices(gotDevices);
}

function gotDevices(devices){
	for(var i in devices){
		var d = devices[i];
//		console.log(d);
		if((d.path.indexOf('cu.usbmodem')==-1)&&(d.path.indexOf('ttyACM')==-1)) continue;
		chrome.serial.connect(d.path, {bitrate: 19200}, function(r){connected(r);});
		return;
	}
}

function connected(r){
	console.log(r);
	chrome.serial.onReceive.addListener(onrecc);
	serialID = r. connectionId;
	lprint('connected');
}

function twobytes(n){return [n&0xff, (n>>8)&0xff];}
function fourbytes(n){return [n&0xff, (n>>8)&0xff, (n>>16)&0xff, (n>>24)&0xff];}
function ignore(x){}
