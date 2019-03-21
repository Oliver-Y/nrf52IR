/*
Connection strategy

First check if there is it is connected to a microbit already. If so just update the connection.
Otherwise scan.

iPad will connect to the closest microbit scanned


*/

///////////////////////////////////////////
//
// Connection Center
//
///////////////////////////////////////////

CC = function() {};

CC.timeOut = undefined
CC.scantime =  10000; // 10 seconds
CC.statusIntervalId = undefined;
CC.ticker = 20;
CC.time  = 0;
CC.connectingToID = undefined;

///////////////////////////
//
// Microbit icon event 
//
///////////////////////////

CC.rescan = function(e) {
	e.preventDefault();
	e.stopPropagation();
	CC.time = 0;
	if (window['UI']) UI.unfocus();
	if (SimpleAudio) SimpleAudio.play("tap");
	if (!iOS.bleIsOn) {
		CC.close()
		CC.alert("scanlabel notavailable", Translation.strings["CC"]["bleoff"]);
		return;
	}
	if (iOS.devices.length == 0) {
		if (gn("microbit0_scanicon") && (gn("microbit0_scanicon").className == "ble connecting")) CC.close();
		else  CC.scan();
	}
	else CC.showDisconnectOption();
}

CC.scan = function(){
	CC.close();
	if (iOS.devices.length > 0) return;
	if (CC.connectingToID) return;
	iOS.stopscan();
	iOS.getBLEstatus(doNext);
	
	function doNext (obj){
		var reconnect = obj.connected;
		BLE.status = (iOS.devices.length == 0) ? "connecting" :  "ok";
		if (iOS.devices.length == 0) {
			var device = getConnectedDevice(reconnect);
			if (device) CC.updateConnection (device.id);
			else iOS.scan(CC.scanStarted);
		}
		
	}
	
	function getConnectedDevice(reconnect) { //
		console.log ("getConnectedDevice", reconnect)
		var keys = Object.keys (reconnect);
		if (keys.length == 0) return null;
		return reconnect[keys[0]]
	}	
	
}

CC.updateConnection = function(key){
	console.log ("CC.updateConnection", key)
	CC.connectingToID = key;
	var n = parseInt(Math.random() * CC.shapes.length);
	var shape = CC.shapes[n];
	var hasicon  = iOS.deviceIcon[key];
	iOS.deviceIcon[key] =  hasicon ?  iOS.deviceIcon[key] : shape;
	if (!hasicon) iOS.changeSetting("devices", btoa(JSON.stringify(iOS.deviceIcon)));
	iOS.updateConnection (key);
}
 
 CC.scanStarted = function(){
	CC.time = Date.now();
	iOS.queue = {}; // clear the queue - forget bad ones
	CC.timeOut =  setTimeout (function (){CC.nonefound();}, CC.scantime);
	CC.startTicker();
}

CC.nonefound = function () {
	if (iOS.devices.length > 0) return;
//	console.log ("nonefound", CC.connectingToID, iOS.devices.length, CC.connectingToID ? JSON.stringify(iOS.queue[CC.connectingToID]): null)
	if (CC.connectingToID) 	CC.timeOut = setTimeout (function (){CC.nonefound();}, CC.scantime);
 	else CC.alert ("scanlabel warning", Translation.strings["CC"]["powerup"]);
}

CC.showMenu = function(){
	CC.hideMenu();
	var mm = newHTML("div",'connectioncenter', frame);
	mm.setAttribute('id', 'devicemenu');
	var barrow = newHTML("div", "menuarrow", mm);
	var mdd= newHTML("div", "dropdowncontent", mm);
	var close = newHTML('div','close', mdd);
	close.id ="close";
	close[eventDispatch["end"]] = CC.closeDialog;
	var pal = newHTML('div','innerspace', mdd);
	pal.id = "innerspace";
}

///////////////////////////////////
//
// Menu Opening / Close UI
//
///////////////////////////////////

CC.tickTask = function (){ 
	if (iOS.devices.length != 0)  {
		// will clear all variables
		CC.hideMenu();
		CC.close();
		return;
	}
	var t = Date.now()
	if ((t - CC.time) < 500) return; // 1/2 second to gather devices
	let keys  = Object.keys(iOS.queue);
	if (keys.length == 0) return
	if (!CC.connectingToID ) CC.connectToBest();
}

CC.hideMenu = function(){
	if (gn('devicemenu')) gn('devicemenu').parentNode.removeChild(gn('devicemenu'));
}

CC.connectToBest = function (){ 
	CC.connectingToID = undefined; // clear variable
	let key = CC.getBest();
	// pick a shape
	if (!key) return false;
	CC.connectingToID = key;
	var n = parseInt(Math.random() * CC.shapes.length);
	var shape = CC.shapes[n];
	iOS.deviceIcon[key] = shape;
	iOS.changeSetting("devices", btoa(JSON.stringify(iOS.deviceIcon)));
	iOS.connect(key);
	return true;
}

 CC.getBest = function(){
		var val = -99999999999;
		var who = null;
		for (let key in iOS.queue) {
			if (iOS.queue[key].state == "will reconnect") continue; // ignore these
			if (iOS.queue[key].state == "unavailable") continue; // ignore these
			var a = getAverage(iOS.queue[key].dBs)
	//		console.log (key, iOS.queue[key].name, a, val)
			if (a > val) {
				val  = a;
				who = key;
			}
		}
		return who;
		
	function getAverage(list) {
		var sum = 0;
		if (!list) return -999;
//		console.log (list)
		for (let i=0; i< list.length; i++) {
			sum +=	list[i];
		}
		return sum  / list.length;
	}	
}

CC.checkConnectionStatus = function (){
	//console.log ('checkConnectionStatus', CC.connectingToID, iOS.queue[CC.connectingToID])
	if (CC.connectingToID == undefined) return;
	if (!iOS.queue[CC.connectingToID]) return;
	var state  = iOS.queue[CC.connectingToID].state;
  //  console.log (state)
  if (state == "unavailable"){ // get another one in the queue
  	var canconnect = CC.connectToBest();
  	if (canconnect) return;
  	else state = "failed";
  }
	if (state != "failed") return;
	CC.close()
	CC.alert("scanlabel error", Translation.strings["CC"]["badhex"]);
	CC.connectingToID = undefined;
}

CC.alert = function (css, str) {
	CC.showMenu();
	var referenceNode = gn("close");
	var p= newHTML("p", css, undefined);
	referenceNode.parentNode.insertBefore(p, referenceNode.nextSibling)
	p.textContent = str;
	p.id = "warning";
}
	
CC.startTicker = function(){	
	if (CC.statusIntervalId != undefined) window.clearInterval(CC.statusIntervalId);
	CC.statusIntervalId = window.setInterval(function (){CC.tickTask();}, CC.ticker);
}

CC.close = function (){
	if (iOS.bleIsOn) iOS.stopscan();
	if (CC.timeOut != undefined) window.clearTimeout(CC.timeOut);
	CC.timeOut = undefined;
	if (CC.statusIntervalId != undefined) window.clearInterval(CC.statusIntervalId);
	CC.statusIntervalId = undefined;
	CC.hideMenu();
	CC.connectingToID = undefined;
}

CC.closeDialog = function (e){
	e.preventDefault();
	e.stopPropagation();
	SimpleAudio.play("tap");
	CC.close();
}

/////////////////////
//
//  Disconnect 
//
/////////////////////

CC.showDisconnectOption = function(){
 	CC.showMenu();
 	var pal = gn('innerspace');
	if (iOS.devices[0]) CC.insertOption(pal, iOS.devices[0])
}

CC.insertOption = function (pal, id){
	var tb = newHTML('div','line', pal);
	tb.id = id;
	var action =  newHTML('div', "action", tb);	
	var wrapper = newHTML('div','wrapper', action);
	var gobutton = newHTML('div','gobutton blue', wrapper);
	var img = newHTML('div','goicon blue', gobutton);
	var label = newHTML('div','label blue', gobutton);
	var key = "disconnect"
	label.textContent =   Translation.strings["CC"][key];
	var dx = (action.offsetWidth -  gobutton.offsetWidth) / 2;
	gobutton.style.left = Math.floor (dx) + "px";
	if (CC[key]) action[eventDispatch["end"]] =  CC[key]	
}

CC.disconnect = function (e){
	e.preventDefault();
	e.stopPropagation();
	SimpleAudio.play("tap");
//	CC.connectingToID = undefined;
	var t = e.target;
	while (t && t.className != 'line') t = t.parentNode;
	if (!t) return;

	if (iOS.devices.indexOf(t.id)  < 0) return;
	else  {
		// if (window['Runtime']) Runtime.stopThreads(Code.scripts)
		 var id = iOS.devices.shift();
	//	 console.log ("disconnect", iOS.devices)
		 iOS.disconnect(t.id, doNext);
		 delete iOS.queue[t.id];		 
	 }
 
	function doNext(){
		console.log ('disconnected')
	 	if (gn('fwversion')) gn('fwversion').textContent = "";
		iOS.FWversion ="";
		CC.close();
	}
}


/////////////////////
// Show design
/////////////////////

CC.svgled = "c0,-0.37,0.31,-0.68,0.68,-0.68s0.68,0.37,0.68,0.68v1.98c0,0.37-0.31,0.68-0.68,0.68s-0.68,-0.31-0.68-0.68z" 
CC.deltay =  0.68;
CC.spacingx = 7;
CC.spacingy = 7.1;
CC.startAt = {x: 1.7, y: 1.7}
CC.shapes =[[4,6,5,31,14],[10,31,31,14,4],[10,10,0,17,14],[24,27,0,17,14],[10,27,4,4,4],
						[4,4,31,4,4],[2,20,14,5,8],[17,10,4,10,17],[16,24,28,30,31],[31,31,31,31,31],
						[31,15,7,3,1],[4,31,4,10,17],[21,14,4,10,17],[4,14,21,10,17],[17,27,14,4,0],
						[4,14,31,14,4],[4,14,31,14,14],[14,14,31,14,4],[4,30,31,30,4],[4,15,31,15,4],
						[4,14,14,14,4],[14,17,17,17,14],[14,31,31,31,14],[0,14,14,14,0],[31,31,31,31,31],
						[31,17,17,17,31],[0,14,10,14,0],[4,14,31,17,31],[27,27,0,27,27],[21,10,21,10,21],
						[10,31,10,31,10],[14,10,10,10,14],[0,31,17,31,0],[0,0,4,14,31],[31,14,4,0,0],
						[1,3,7,3,1],[16,24,28,24,16],[3,7,14,28,24],[24,28,14,7,3],[7,5,31,30,30]];
						
CC.removeIcon = function (div){			
	while (div.childElementCount > 0) div.removeChild(div.childNodes[0]);	
}

CC.drawIcon = function (svg, oncolor, offcolor, list){
	var attr0 = {fill: offcolor}
	var attr1 = {fill: oncolor, 'stroke': "#d81637", "stroke-width": 2};		
//	console.log ("drawIcon", svg, oncolor, offcolor, list)
	for (var i=0; i < list.length; i++) {
		var val = getValue(Number(list[i]));
		var y = i;
		for (var j = 0; j < val.length; j++){
			var x =  5 - 1 -j;
			var pos =  y*5 + x; 
			var isOn = val.charAt(x) == "1" ;
			var dx = (CC.startAt.x + x*CC.spacingx).trim(2);
			var dy =  (CC.deltay + CC.startAt.y + y*CC.spacingy).trim(2);
			var d = "M"+ dx+","+dy+CC.svgled
			var attr = isOn ? attr1 : attr0;
			attr['d'] = d
			var dot = SVGTools.addChild(svg, 'path', attr);	
		}
	}
	function getValue (n){
		var b = n.toString(2);
		while(b.length < 5) b= "0"+b;
		return b;
	}
}

