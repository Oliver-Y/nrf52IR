/*
Connection strategy

First check if there is it is connected to a microbit already. If so just update the connection.
Then the last one connected has priority and it will connect automatically if available
If not available, will try to connect to other register devices.
Otherwise it will scan.

First time
It scans and shows the list of available devices to register
Only registered devices are available for connection.

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
CC.failedshape = [0, 27, 0, 14, 17];
CC.connecting = undefined;

/////////////////////
//
// UI dev
//
/////////////////////

CC.scan = function(){
	console.log ("CC.scan")
	CC.close();
	if (iOS.devices.length > 0) return;
	iOS.scan(CC.scanStarted);
}

CC.scanStarted = 	function(){
	CC.time = Date.now();
	CC.timeOut =  setTimeout (function (){CC.nonefound();}, CC.scantime);
	CC.startTicker();
}

CC.nonefound = function () {
	console.log ("nonefound", CC.connecting)
	if (CC.connecting) CC.timeOut = setTimeout (function (){CC.nonefound();}, CC.scantime);
 	else {
 		CC.showMenu();
		var referenceNode = gn("close");
		var p= newHTML("p", "scanlabel warning", undefined);
		referenceNode.parentNode.insertBefore(p, referenceNode.nextSibling)
		p.textContent = Translation.strings["CC"]["powerup"];
		p.id = "warning";
 	}
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

///////////////////////////
//
// Menu Opening
//
///////////////////////////

CC.rescan = function(e) {
	e.preventDefault();
	e.stopPropagation();
	if (iOS.devices.length == 0) CC.scan();
	else CC.showDisconnectOption();
}

///////////////////////////////////
//
// Menu Opening / Close UI
//
///////////////////////////////////

CC.tickTask = function (){ 
	if (iOS.devices.length != 0)  {
		CC.close();
		return;
	}
	var t = Date.now()
	if ((t - CC.time) < 500) return;
	let keys  = Object.keys(iOS.queue);
	if (!CC.connecting  && (keys.length > 0)) {
		CC.connectToBest();
	}
}

CC.hideMenu = function(){
	if (gn('devicemenu')) gn('devicemenu').parentNode.removeChild(gn('devicemenu'));
}

CC.connectToBest = function (){ 
	let key = getBest();
	// pick a shape
	console.log ("best", key)
	if (!key) return;
	CC.connecting = key;
	var n = parseInt(Math.random() * CC.shapes.length);
	var shape = CC.shapes[n];
	iOS.deviceIcon[key] = shape;
	iOS.changeSetting("devices", btoa(JSON.stringify(iOS.deviceIcon)));
	iOS.pingTimeouts[key] = "connect";
	iOS.connect(key);
	
	function getAverage(list) {
		var sum = 0;
		if (!list) return -999;
//		console.log (list)
		for (let i=0; i< list.length; i++) {
			sum +=	list[i];
		}
		return sum  / list.length;
	}
	
	function getBest (){
		var val = -99999999999;
		var who = null;
		for (let key in iOS.queue) {
			var a = getAverage(iOS.queue[key].dBs)
	//		console.log (key, iOS.queue[key].name, a, val)
			if (a > val) {
				val  = a;
				who = key;
			}
		}
		return who;
	}
}

CC.checkConnectionStatus = function (){
//	console.log ('checkConnectionStatus', CC.connecting, iOS.queue[CC.connecting])
	if (CC.connecting == undefined) return;
	if (!iOS.queue[CC.connecting]) return;
	var state  = iOS.queue[CC.connecting].state;
	if (state != "failed") return;
	var key  = CC.connecting;
	CC.close()
	CC.connecting = key;
	CC.failToConnect();
}

CC.failToConnect = function(){
	var div  = gn("microbit0_image");
	while (div.childElementCount > 0) div.removeChild(div.childNodes[0]);	
	div.className = div.className.replace("off" , "on");
	var svg = SVGTools.create (div, 33, 35);
	var off = div.className.indexOf("topbar") > -1 ? "#3bb2f7" :"#ffffff";
	iOS.deviceIcon[CC.connecting] = CC.failedshape;
	CC.drawIcon(svg, "#d81637", off, CC.failedshape)
 	CC.showMenu();
	var referenceNode = gn("close");
	var p= newHTML("p", "scanlabel error", undefined);
	referenceNode.parentNode.insertBefore(p, referenceNode.nextSibling)
	p.textContent = Translation.strings["CC"]["badhex"]; 
	p.id = "warning";
}

CC.startTicker = function(){	
	if (CC.statusIntervalId != undefined) window.clearInterval(CC.statusIntervalId);
	CC.statusIntervalId = window.setInterval(function (){CC.tickTask();}, CC.ticker);
}

CC.close = function (){
	iOS.stopscan();
	if (CC.timeOut != undefined) window.clearTimeout(CC.timeOut);
	CC.timeOut = undefined;
	if (CC.statusIntervalId != undefined) window.clearInterval(CC.statusIntervalId);
	CC.statusIntervalId = undefined;
	CC.hideMenu();
	CC.connecting = undefined;
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
	label.textContent =  key
	var dx = (action.offsetWidth -  gobutton.offsetWidth) / 2;
	gobutton.style.left = Math.floor (dx) + "px";
	if (CC[key]) action[eventDispatch["end"]] =  CC[key]	
}

CC.disconnect = function (e){
	e.preventDefault();
	e.stopPropagation();
	SimpleAudio.play("tap");
	var t = e.target;
	while (t && t.className != 'line') t = t.parentNode;
	if (!t) return;

	if (iOS.devices.indexOf(t.id)  < 0) return;
	else  {
		 var id = iOS.devices.shift();
		 iOS.disconnect(t.id, doNext);
		 delete iOS.queue[t.id];
	 }
 
	function doNext(){
		console.log ('disconnected')
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
CC.shapes =[[4,6,5,31,14],[10,31,31,14,4],[10,10,0,17,14],[0,27,0,14,17],[10,27,4,4,4],
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

CC.t = function (){
	var pal = gn("innerspace");
	var unregister = {"id":"1EC817C9-2AA4-297F-68BE-C48780DE6DED","dB":"-43", stamp: Date.now(), "state":"found"}
	var failed = {"id":"2EC817C9-2AA4-297F-68BE-C48780DE6DED","dB":"-63", stamp: Date.now(), "state":"failed"}	
	iOS.deviceIcon["2EC817C9-2AA4-297F-68BE-C48780DE6DED"] = [10,10,0,17,14];
	iOS.deviceIcon["3EC817C9-2AA4-297F-68BE-C48780DE6DED"] = [0,27,0,14,17];
	iOS.queue ["1EC817C9-2AA4-297F-68BE-C48780DE6DED"] = unregister;
	iOS.queue ["2EC817C9-2AA4-297F-68BE-C48780DE6DED"] = failed;
	iOS.devices = ["1EC817C9-2AA4-297F-68BE-C48780DE6DED"];
}