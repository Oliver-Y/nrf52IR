/* Paula Bontá 2017 */

BLE = function() {};

BLE.debug = false;

		
///////////////////////////////////////////////////////////////////////////
// BLE
//
// BLE init is done on the Swift shell
// Once the page is loaded iOS.didFinishload will be called and
// iOS class variables be set
// Check the status of iOS.ready before doing a BLE.init
// 
///////////////////////////////////////////////////////////////////////

BLE.statusIntervalId = undefined;
BLE.ticker = 20;
BLE.status = "ok";
	
BLE.init = function (){
	gn("microbit0")[eventDispatch["start"]] =  CC.rescan;
	iOS.stopscan();
	if (iOS.devices.length == 0) iOS.getBLEstatus(BLE.chooseDefaultMicrobit);
}

BLE.chooseDefaultMicrobit= function (obj){ 
	var reconnect = obj.connected;
	BLE.status = (iOS.devices.length == 0) ? "connecting" :  "ok";
	if (iOS.devices.length == 0) {
		var device = getConnectedDevice(reconnect);
		if (device) iOS.connectedTo (device.id);
	}
	
	if (BLE.statusIntervalId != undefined) window.clearInterval(BLE.statusIntervalId);
	BLE.statusIntervalId = window.setInterval(function (){BLE.tickTask();}, BLE.ticker);
	
	function getConnectedDevice(reconnect) { //
		console.log ("getConnectedDevice", reconnect)
		var keys = Object.keys (reconnect);
		if (keys.length == 0) return null;
		return reconnect[keys[0]]
	}
} 

BLE.connectionStatus = function(str, trigger){
	var data = str.split(":");
	switch (data[0]) {
		case "notallowed": 
		case "disconnected":
		case "disconnecting":
			break;
		case "connected":
			console.log ("previouslyDiscovered", data)
			iOS.connectedTo (data[1]);
			break;
	}
}

			
BLE.displayState = function (){ 
	var state = BLE.status;
	
	let id =  "microbit0";
	if (gn(id+"_scanicon")) gn(id+"_scanicon").className = "ble "+ state;
	var div  = gn("microbit0_image");
	if ((state == 'ok') && (div.className.indexOf("off") > -1)) {
		div.className = div.className.replace("off" , "on");
		var svg = SVGTools.create (div, 33, 35);
		var off = div.className.indexOf("topbar") > -1 ? "#3bb2f7" :"#ffffff";
		CC.drawIcon(svg, "#d81637", off, iOS.deviceIcon [iOS.devices[0]])
	}	
	else if(isUnplugged()) {
		div.className = div.className.replace("on" , "off");
		while (div.childElementCount > 0) div.removeChild(div.childNodes[0]);	
	}
	else CC.checkConnectionStatus();
	
	function isUnplugged(){
		if ((CC.connecting != undefined) && iOS.queue[CC.connecting]) return false;
		if ((state != 'ok') && (div.className.indexOf("on") > -1)) return true;
	}
}

BLE.tickTask = function (){ 	
	if (BLE.status == "download") {
	//	console.log ("downloading")
		return;
	}
	if (!CC.statusIntervalId && (iOS.devices.length == 0)) BLE.status = "failed"; // scanning not active and no connection
	else if (iOS.devices.length > 0) BLE.status  = "ok"; // has a connection
	else BLE.status  = "connecting"; // whether or not has a connection indicate if it is scanning
	BLE.displayState();
}

BLE.gotPacket = function(id, list){
	if (BLE.debug) console.log (id + "---->" + list.join(" "));
	list.shift();
	list.shift();
	HW.gotPollPacket(list)
}