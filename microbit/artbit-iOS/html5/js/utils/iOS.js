/* Paula Bont‡ 2017 */

iOS = function () {};

iOS.devices = []; // ids 
iOS.deviceIcon = {};
iOS.requests = [];
iOS.pingTimeouts = {};
iOS.requestno = 0;
iOS.scanning = false;
iOS.database = "projects";
iOS.ready = false;
iOS.queue = {}
iOS.FWversion ="";
iOS.bleIsOn = true;

iOS.registerSound = function(dir, name, callback, fcn, t){
	var ext = t ? t : "mp3";
	iOS.command('registerSound', dir+'\n'+ name+'\n' + callback+'\n' + ext+'\n', fcn);
}

iOS.playSndFX = function(str, fcn){iOS.command('playSound', str+'\n', fcn);}
iOS.changeSetting = function(key, value, fcn) {iOS.command('changesetting', key+'\n' + value+'\n', fcn);}
iOS.bleinit = function(fcn) {iOS.command('bleinit', '', fcn);}
iOS.scan = function(fcn) {iOS.command('scan','', fcn);}
iOS.stopscan = function(fcn) {iOS.command('stopscan', '', fcn); iOS.scanning = false;}
iOS.connect = function(name, fcn) {iOS.command('connect',  name+'\n', fcn);}
iOS.reconnectid = function(name, fcn) {iOS.command('connectid',  name+'\n', fcn);}
iOS.disconnect = function(name, fcn) {iOS.command('disconnect',  name+'\n', fcn);}

iOS.stringToFile = function(fname, str, fcn){iOS.command('stringToFile', fname+'\n'+str, fcn);}
iOS.fileToString = function(str, fcn){iOS.command('fileToString', str+'\n', function(str){fcn(iOS.b64ToUtf8(str));})}
iOS.eraseFile = function(fname, fcn){iOS.command('eraseFile', fname+'\n', fcn);}

iOS.sendmessage = function(name, list, fcn) {
	iOS.command('sendmessage',  name+'\n'+list.toString()+'\n', fcn);
}

iOS.sendwithhandshake = function(name, list, fcn) {
	iOS.command('sendwithhandshake',  name+'\n'+list.toString()+'\n', fcn);
}

iOS.getBLEstatus = function(doNext){
// console.log ("getBLEstatus");
	var reconnectTo = {};
 	var fcn = function (str){
 		var data = str.split("|");
 		var list = [];
 		for (var i = 0 ; i < data.length; i++){
 			var device = data[i].split(",");
 			if (iOS.devices.indexOf(device[0]) > -1) continue;
 			if (!device[1]) continue;
 			reconnectTo[device[1]]  = {name: device[0], id:device[1]}; 
 		}
 	
 	 if (doNext)	doNext ({connected: reconnectTo});
 	}
 	iOS.command('getBLEstatus', '', fcn);
 }
 
iOS.command = function(cmd, str, fcn){
	iOS.requests[iOS.requestno] = fcn;
	if (!window.webkit) {
		if(fcn) fcn("no webkit");
		return;
	}
	if(webkit.messageHandlers[cmd]==undefined) console.log('unhandled message ' + cmd);
	else webkit.messageHandlers[cmd].postMessage([String(iOS.requestno++), str]);
}

iOS.response = function(id, str){
//console.log ("response " +  id + " " +str);
	var fcn = iOS.requests[id];
	delete iOS.requests[id];
	if(fcn) fcn(str);
}

iOS.b64ToUtf8 = function( str ) {return decodeURIComponent(escape(atob(str)));}


// this function is called when something is connected already

iOS.updateConnection = function(uniqueId){
//	console.log ("updateConnection", uniqueId,iOS.pingTimeouts[uniqueId], CC.connectingIDToID, "connected devices", iOS.devices.length )
	if (iOS.devices.indexOf(uniqueId) < 0)  {
		if (!iOS.pingTimeouts[uniqueId]) iOS.setdevice(uniqueId)
	}
}

// this function is called to verify the microbit has proper FW
// it is being ping twice because sometimes it does not send the 
// gotpacket callback

iOS.setdevice = function(id) {	
	if (iOS.pingTimeouts[id]) clearTimeout(iOS.pingTimeouts[id])
	var tryagain = function (){
		console.log ("microbit unresponsive", id, iOS.devices)
		iOS.sendwithhandshake(id, [0xff], console.log)	
		iOS.pingTimeouts[id] = setTimeout (doNext, 2000)
	}
	
	var doNext = function (){
		console.log ("microbit no firmware", id, iOS.devices)
		var data = iOS.queue[id];
	  if (!data) data = {id: id}
	  iOS.queue[id] = data;
		iOS.queue[id].state = "unavailable";
		iOS.disconnect(id, console.log);	
	}	
	
	console.log ("send ping", id, iOS.devices)
	iOS.sendwithhandshake(id, [0xff], console.log);
	// send get FW version message and if it doesn't respond disconnect 
	iOS.pingTimeouts[id] = setTimeout (tryagain, 2000)
}
	

iOS.checkConnection =  function(id){ 
//	console.log ("checkConnection", id,iOS.devices)
	if (iOS.pingTimeouts[id]) clearTimeout(iOS.pingTimeouts[id])
	delete iOS.pingTimeouts[id]
	if (iOS.devices.indexOf(id) < 0) iOS.devices.push(id);
	var shape = iOS.deviceIcon[id];
	var data = shape ? [].concat([0xf7], shape) : [0xf3];
	if (shape) HW.shape = shape;
	iOS.sendmessage(id, data, console.log)
	var data  = iOS.queue[id];
	if (!data) data = {id: id};
	data.state = "connected"
	iOS.queue[id] = data;
}

////////////////////////////////////
// Swift Sync Callbacks
/////////////////////////////////////

iOS.scanStarted = function(){
	iOS.scanning = true;
	console.log ("scanStarted ");
}


////////////////////////////////////
// Swift Async Callbacks
/////////////////////////////////////


iOS.bleChangedStatus = function(state){ 
 iOS.bleIsOn = (state == "true");
 console.log ("iOS.bleChangedStatus ", state, iOS.bleIsOn);
 if (!iOS.bleIsOn) {
    iOS.devices = []
    iOS.queue = {}
   }
 BLE.init();
}

iOS.founddevice = function(name, uniqueId, rssi){
	if (name.indexOf ("BBC micro:bit") < 0) return;
	var data = iOS.queue[uniqueId];
	//console.log ("founddevice", data,  name, uniqueId, rssi)
	if (!data) data = {name: name, id: uniqueId, dBs: [], state: "found"}	
	if (!data.dBs) data.dBs = [];
	var dB = Number (rssi);
	var isvalid =  dB != 127
	if (isvalid) data.dBs.push(dB);
	while (data.dBs.length > 5) data.dBs.shift();
	iOS.queue[uniqueId] = data;
}

// callback when the peripherial got the tx characteristics

iOS.connectionEstablished = function(id) {
	console.log ("connectionEstablished", id, "waiting for characteristics", iOS.devices, Date.now())
	var doNext = function (){
		console.log ("the peripherial has no characteristics", id, iOS.devices)
		// very rare case of someone naming a device "BBC micro:bit" when it is not
		if (iOS.pingTimeouts[id]) clearTimeout(iOS.pingTimeouts[id])
		delete iOS.pingTimeouts[id]
		iOS.disconnect(id, console.log);	
		iOS.queue[id] = {id: id, state:  "unavailable"};
	}	
	if (iOS.queue[id]) iOS.queue[id].state =  undefined;
	
	if (iOS.devices.length == 0) { 
	// swift should send deviceIsReady(<#id#>)
	// if after 10sec it did not get it it should give up
		iOS.pingTimeouts[id] = setTimeout (doNext, 10000)
	}	
 	else {
 		var n = iOS.devices.indexOf(id);
		if (n == 0) return; // do not disconnect the one stablished
		if (n > 0) iOS.devices.splice (n,1);
 	  iOS.disconnect(id, console.log);
 	}

}

// callback from connect
// very rare event
iOS.failToConnect = function(id) {
	console.log ("failToConnect "  +id);
	if (!iOS.queue[id]) iOS.queue[id] = {id: uniqueId}
  iOS.queue[id].state =  "unavailable";
};

// callback after the tx chars of peripherial were detected
iOS.deviceIsReady = function(id) {
	// check if you are already connected
//	console.log ("deviceIsReady", id,iOS.pingTimeouts[id], CC.connectingIDToID, "connected devices", iOS.devices.length )
	if (!iOS.queue[id]) iOS.queue[id] = {id: id}
	if (iOS.pingTimeouts[id]) clearTimeout(iOS.pingTimeouts[id])
	delete iOS.pingTimeouts[id]
	iOS.queue[id].state =  undefined;
	console.log ("deviceIsReady", id, Date.now())
	iOS.pingTimeouts[id] = setTimeout(function(){iOS.setdevice(id);}, 500);
}

// callback from disconnect
iOS.disconnectedFrom = function(uniqueId){ 
// Requests a connection if the device is 
	var n = iOS.devices.indexOf(uniqueId);
	var data = iOS.queue[uniqueId];
	if (!data) data = {id: uniqueId}
	iOS.queue[uniqueId] = data;
	if (data.state ==  "will reconnect") return;
  var ignorestates = ["disconnected", "failed", "unavailable"]
  var keepdata = ["failed", "unavailable"]
  var flag  = keepdata.indexOf (data.state) > -1
 // console.log (n, flag, uniqueId, data)
  if (ignorestates.indexOf (data.state) < 0)  iOS.queue[uniqueId].state = (n > -1) ? "will reconnect" : "disconnected";
	if (n > -1) {
		iOS.devices.splice (n,1);
		if (iOS.devices.length == 0) iOS.reconnectid(uniqueId, function (str) {BLE.connectionStatus(str)});
	}	
	else if (iOS.queue[uniqueId] && !flag) delete iOS.queue[uniqueId];
//	console.log (uniqueId, iOS.queue[uniqueId])
}

// app call backs
iOS.appMovedToActive = function(){
	console.log ("appMovedToActive");
	iOS.eraseFile('unsaved-work', function(resp){console.log(resp);});
}

iOS.appMovedToBackground = function(){
	console.log ("appMovedToBackground");
	if(window ['UI']==undefined) return;
	iOS.stringToFile('unsaved-work', UI.getExtendedProjectContents(), function(resp){console.log(resp);});
}

// callback didUpdateValueFor 
iOS.gotpacket =  function(name, id, str){ 
//	console.log ("gotpacket", str)
	var list  = str.split(",")
	switch (Number(list[0])) {
		case 0xf5: BLE.gotPacket(id, list);break;
		case 0xff: 
			console.log ("ping response")
			iOS.FWversion = list[2]+"."+list[3];
			if (gn('fwversion')) gn('fwversion').textContent = iOS.FWversion;
			if (iOS.pingTimeouts[id]) iOS.checkConnection (id);
			break;
		default:
			if (!HW.comms) break;
			var cb = HW.comms.packetcallback;
			if (cb == undefined) break;
			HW.comms.packetcallback = undefined;
			cb();
			break;
	}
}

			
			
/// SQL

iOS.SQLexe = function (str, fcn){iOS.command('exec', str+'\n', fcn);}
iOS.SQLopen = function (str, fcn){iOS.command('open', str+'\n', fcn);}
iOS.SQLclose = function (str, fcn){iOS.command('close', '', fcn);}
iOS.stmt =  function (json, fcn){iOS.command('stmt', JSON.stringify(json)+'\n', fcn);}
iOS.query =  function (json, fcn){iOS.command('query', JSON.stringify(json)+'\n', fcn);}

// callback
iOS.SQLerror = function (str){console.log (str);}


// callback
iOS.didFinishLoad = function(str) {
	var data = JSON.parse(str);
	console.log ("didFinishLoad", data)	
//	iOS.lastone = data["lastconnected"]
	iOS.deviceIcon = data["devices"] == '{}' ? new Object() : JSON.parse (atob(data["devices"]))
	iOS.lan = data["lan"]
	iOS.version  = data["version"]
	iOS.ready = true;
};

// callback from send message with handshake
iOS.didWriteValueFor = function(error, id) {
	console.log ("didWriteValueFor  error " + error + " my id " +id);
	if (error == "") return;
	iOS.disconnect(id, console.log);
	delete iOS.queue[id];
	var n = iOS.devices.indexOf(id);
	if (n > -1) iOS.devices.splice (n,1);
};

//////////////////////////
// Resource management
/////////////////////////

iOS.resourceToString = function(path, name, type, fcn){iOS.command('resourceToString', path+'\n'+name+'\n'+type+'\n', fcn);}
iOS.b64ToUtf8 = function(str) {return decodeURIComponent(escape(atob(str)));}
iOS.utf8Tob64 = function(str) {return btoa(unescape(encodeURIComponent(str)));}

