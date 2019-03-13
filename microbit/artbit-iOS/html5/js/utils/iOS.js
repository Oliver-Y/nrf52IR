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

iOS.registerSound = function(dir, name, callback, fcn, t){
//	console.log (dir +" " +  name + " " + callback + " " + t);
	var ext = t ? t : "mp3";
	iOS.command('registerSound', dir+'\n'+ name+'\n' + callback+'\n' + ext+'\n', fcn);
}
iOS.playSndFX = function(str, fcn){iOS.command('playSound', str+'\n', fcn);}

iOS.playSong = function(list, fcn){iOS.command('playSong', list.toString()+'\n', fcn);}
iOS.stopSong = function(){iOS.command('stopSong', '');}

iOS.print = function(name, fcn){iOS.command('print', name+'\n', fcn);}
iOS.geturl = function(){iOS.command('geturl', '');}
iOS.changeSetting = function(key, value, fcn) {iOS.command('changesetting', key+'\n' + value+'\n', fcn);}
iOS.bleinit = function(fcn) {iOS.command('bleinit', '', fcn);}
iOS.scan = function(fcn) {iOS.command('scan','', fcn);}
iOS.stopscan = function(fcn) {iOS.command('stopscan', '', fcn); iOS.scanning = false;}
iOS.connect = function(name, fcn) {iOS.command('connect',  name+'\n', fcn);}
iOS.reconnectid = function(name, fcn) {iOS.command('connectid',  name+'\n', fcn);}
iOS.disconnect = function(name, fcn) {iOS.command('disconnect',  name+'\n', fcn);}
iOS.sendmessage = function(name, list, fcn) {
//	if (list[0] != 0xf5) console.log ("sendmessage " +  name + " " +list.toString());
//	console.log ("sendmessage " +  name + " " + list.toString());
	iOS.command('sendmessage',  name+'\n'+list.toString()+'\n', fcn);
}

iOS.sendwithhandshake = function(name, list, fcn) {
//	if (list[0] != 0xf5) console.log ("sendmessage " +  name + " " +list.toString());
//	console.log ("sendmessage " +  name + " " + list.toString());
	iOS.command('sendwithhandshake',  name+'\n'+list.toString()+'\n', fcn);
}


iOS.stopConnections = function(fcn) {iOS.command('stopconnections','', fcn);}

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

iOS.bleStarted = function(){
 console.log ("iOS.bleStarted ");
}

iOS.scanStarted = function(){
	iOS.scanning = true;
	console.log ("scanStarted ");
}

iOS.founddevice = function(name, uniqueId, rssi){
	//if (!iOS.queue[uniqueId]) console.log ("founddevice", name, uniqueId, dB)
	if (name.indexOf ("BBC micro:bit") < 0) return;
	var data = iOS.queue[uniqueId];
	console.log ("founddevice", data,  name, uniqueId, rssi)
	if (!data) data = {name: name, id: uniqueId, dBs: [], state: "found"}	
	var dB = Number (rssi);
	var isvalid =  dB != 127
	if (isvalid) data.dBs.push(dB);
	while (data.dBs.length > 5) data.dBs.shift();
	data.stamp = Date.now();
	iOS.queue[uniqueId] = data;
}

iOS.connectedTo = function(uniqueId){
	console.log ("connectedTo", uniqueId)
	function notresponding(){
		console.log ("perhaps not a microbit")
		iOS.queue[uniqueId].state = "failed";
		iOS.disconnect(uniqueId, console.log);
	}
	if (!iOS.pingTimeouts[uniqueId]) {
		if (iOS.devices.indexOf(uniqueId) < 0)  {
			iOS.devices.push(uniqueId); // when it is just a reconnect
			console.log ('iOS.FWversion', iOS.FWversion);
			if (!iOS.FWversion) iOS.sendmessage(uniqueId, [0xff], console.log);
			
		} 
	}
	else iOS.pingTimeouts[uniqueId] = setTimeout (notresponding, 1500)
}

// call back when the periferial got the tx characteristic
iOS.deviceIsReady = function(id) {
	// check if you are already connected
	iOS.queue[id].stamp = Date.now()
	iOS.queue[id].dB = -20;
	console.log ("deviceIsReady", id)
	if (Number(iOS.pingTimeouts[id]).toString() !="NaN") clearTimeout(iOS.pingTimeouts[id])
	var disconnect = function (){
		console.log ("microbit no firmware")
		iOS.queue[id].state = "failed";
		iOS.disconnect(id, console.log);
		
	}	
	iOS.sendmessage(id, [0xff], console.log);
//	console.log ('iOS.sendmessage', 0xff)
	// send poll message and if it doesn't respond disconnect 
	iOS.pingTimeouts[id] = setTimeout (disconnect, 500)
}

iOS.disconnectedFrom = function(uniqueId){ 
// Requests a connection if the device is 
	var n = iOS.devices.indexOf(uniqueId);
	var data = iOS.queue[uniqueId];
	if (!data) data = {id: uniqueId}
	data.state = data.state && data.state == "failed" ? data.state :  (n > -1) ? "will reconnect" : "disconnected"
	if (data.state !=  "disconnected") iOS.queue[uniqueId] = data; // do not include the disconnected ones.
	//console.log ("disconnectedFrom", uniqueId,  n, iOS.queue[uniqueId])
	if (n > -1) {
		iOS.devices.splice (n,1);
	//	console.log (iOS.devices)
		if (iOS.devices.length == 0) iOS.reconnectid(uniqueId, function (str) {BLE.connectionStatus(str, false)});
	}	
}

iOS.getBLEstatus = function(doNext){
	console.log ("getBLEstatus");
	// return a string with two "&" separated lists: currently_connected & already_discovered
	// each list is a ":" separated string with the UUIDs
	var reconnectTo = {};
 	var fcn = function (str){
 		var data = str.split("|");
 		console.log (data)
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

// call backs
iOS.appMovedToActive = function (){if (Events.touchID) Events.forceCancel();}
iOS.gotpacket =  function(name, id, str){ 
//	console.log ("gotpacket", str)
	var list  = str.split(",")
	switch (Number(list[0])) {
		case 0xf5: BLE.gotPacket(id, list);break;
		case 0xff: 
			iOS.FWversion = list[2]+"."+list[3];
			if (gn('fwversion')) gn('fwversion').textContent = iOS.FWversion;
			if (iOS.pingTimeouts[id]) iOS.checkConnection (id);
			break;
		default:
			if (!HW.comms) break;
			var cb = HW.comms.packetcallback;
			if (cb == undefined) break;
			HW.comms.packetcallback = undefined;
	//		console.log ("calling", cb)
			cb();
			break;
	}
}

function gotpacket(l){
	if(packetcallback==null) insert('got: '+l+'\n');
	else packetcallback(l);
}

iOS.checkConnection =  function(id){ 
	console.log ("checkConnection", id,iOS.devices)
	clearTimeout(iOS.pingTimeouts[id]);
	delete iOS.pingTimeouts[id]
	if (iOS.devices.indexOf(id) < 0) iOS.devices.push(id);
	var shape = iOS.deviceIcon[id];
	var data = shape ? [].concat([0xf7], shape) : [0xf3];
	iOS.sendmessage(id, data, console.log)
//	iOS.changeSetting("lastconnected", id);
	var data  = iOS.queue[id];
	if (!data) data = {id: id};
	data.state = "connected"
	iOS.queue[id] = data;
}
			
/// SQL

iOS.SQLexe = function (str, fcn){iOS.command('exec', str+'\n', fcn);}
iOS.SQLopen = function (str, fcn){iOS.command('open', str+'\n', fcn);}
iOS.SQLclose = function (str, fcn){iOS.command('close', '', fcn);}
iOS.stmt =  function (json, fcn){iOS.command('stmt', JSON.stringify(json)+'\n', fcn);}
iOS.query =  function (json, fcn){iOS.command('query', JSON.stringify(json)+'\n', fcn);}

// call back
iOS.SQLerror = function (str){console.log (str);}


// call back
iOS.didFinishLoad = function(str) {
	var data = JSON.parse(str);
	console.log ("didFinishLoad", data)	
//	iOS.lastone = data["lastconnected"]
	iOS.deviceIcon = data["devices"] == '{}' ? new Object() : JSON.parse (atob(data["devices"]))
	iOS.lan = data["lan"]
	iOS.version  = data["version"]
	iOS.ready = true;
};

// call back from send message
iOS.writeValueResult = function(error, id) {
	 if (error != "")	console.log ("writeValueResult  error " + error + " my id " +id);
};

//////////////////////////
// Resource management
/////////////////////////

iOS.resourceToString = function(path, name, type, fcn){iOS.command('resourceToString', path+'\n'+name+'\n'+type+'\n', fcn);}
iOS.b64ToUtf8 = function(str) {return decodeURIComponent(escape(atob(str)));}
iOS.utf8Tob64 = function(str) {return btoa(unescape(encodeURIComponent(str)));}

