Home = function(){}

Home.version = 2.0;
Home.dragging = false;
Home.dragginLayer = 1000;
Home.caret;
Home.shaking = false;
Home.menu;
Home.timeoutEvent = undefined;
Home.swicthInProgress = false;

//////////////////////////////////////////////////
// Home Screen
//////////////////////////////////////////////////

Home.setUpTimer = function() {}

Home.init = function (){
	libInit();
	document.body.addEventListener('touchmove', (e)=>{}, {passive: false, useCapture: false});
	var cond = function(){return iOS && iOS.ready;};
  waituntil (cond, Home.start); 
}

Home.init = function (){
  iOS.SQLopen("artbit", dbopen);	

	function dbopen(str){
		var cmd = "create table if not exists projects (id integer primary key autoincrement, ctime datetime default current_timestamp, name text, nameflag text, thumb text, projectdata text, owner text, pos integer, deletedflag text, version text)"
		iOS.SQLexe(cmd);
		iOS.fileToString('unsaved-work', next);
	}

	function next(str){
		if(str.length==0) startHome();
		else window.location.href = 'editor.html?pid=-2&ts='+ Date.now();
	}

	function startHome(){
		libInit();
		document.body.addEventListener('touchmove', (e)=>{}, {passive: false, useCapture: false});
		var cond = function(){return iOS.ready;};
	  waituntil (cond, Home.start); 
	}
}

//////////////////////////////////
// BLE
//////////////////////////////////

 Home.bleStart = function (e) {
 		e.preventDefault();
		e.stopPropagation();
		SimpleAudio.play("tap");
		CC.scan()
 }

//////////////////////////////////
//  Init misc
//////////////////////////////////

Home.start = function (){
	Translation.setLanguage(doNext);
	BLE.init();
	Home.setup();	
	window[eventDispatch["end"]] =  Home.handleTouchEnd;
	window[eventDispatch["start"]] =  Home.handleTouchStart;
	Home.caret =  newHTML("div", "thumb caret");
	SimpleAudio.init(true);
	Home.prev = Home.emptyProjectThumbnail(); 
	
	function doNext(lan) {
		Home.showLanguageChoice(lan);
		Home.changeDefaultNames();
		Home.showQuery();
		let fcn  = function (){ // delay the buttons when for when you come back from the page
		gn("lan_en")[eventDispatch["start"]] = function (e) {Home.switchLanguageTo(e, 'en'); }
		gn("lan_fr")[eventDispatch["start"]] = function (e) {Home.switchLanguageTo(e, 'fr'); }
		}
		if (Home.timeoutEvent) clearTimeout(Home.timeoutEvent);
		Home.timeoutEvent =  setTimeout(fcn, 250);
	}		
}

Home.switchLanguageTo = function(e, lan) {
	e.preventDefault();
	e.stopPropagation();
	if (Translation.lan == lan) return;
	if (Home.swicthInProgress)return;
	SimpleAudio.play("tap");
	Home.swicthInProgress = true;
	
	iOS.changeSetting("lan", lan, console.log);
	Translation.loadLanguage (lan, doNext);
	function doNext(val){
		Home.showLanguageChoice(lan);
		Home.changeDefaultNames();
		Home.swicthInProgress = false;
	}
}

Home.changeDefaultNames = function (){
	gn('title').textContent = Translation.strings['home']['title'];
	if (!Home.metadata) return;
	for (var id in Home.metadata) {
		 var d = Home.metadata[id];
		 if (d.name) continue;
		 else Home.translateName (gn("thumb_" + d.id), d)
	}
}

Home.translateName = function(div, data){
	if (!div) return;
	var id = data.id;
	var name = data.name;
	name = !name ? Translation.strings['home']['project']+ " " +data.id : name;
	if (div.childElementCount < 3) return;
	if (div.childNodes[1].childElementCount < 1) return;
	div.childNodes[1].childNodes[0].childNodes[0].value =  name;
}

Home.showLanguageChoice = function (val){
	var langdiv  = gn("languages")
 	langdiv.className = 'languages on';
 	var div = gn("enfr")
	for (let i=0; i < div.childElementCount; i++) div.childNodes[i].className ='';
	gn('lan_'+val).className = "selected";	
}

Home.closeMenu =	function (e){
	if (Home.menu && Home.menu.parentNode) Home.menu.parentNode.removeChild (Home.menu)	
	Home.menu = undefined;
}

Home.changePage = function (url){	
	if (Home.timeoutEvent) clearTimeout(Home.timeoutEvent);
	if (BLE.statusIntervalId != undefined) window.clearInterval(BLE.statusIntervalId);
	BLE.statusIntervalId = undefined;
	if (BLE.timeOut != null) {
		iOS.stopscan(doNext);
	}
	else doNext();
	function doNext (){
		setTimeout (function () {window.location.href = url;},  100);
	}
}

Home.setup = function(){
	var c = gn("content");
	var h = getDocumentHeight();
	c.style.height = (h  - gn("topbar").offsetHeight - 5) + "px";
//	gn("sidebar").style.height = getDocumentHeight() + "px";
}

Home.emptyProjectThumbnail = function(){
 	var tb = newHTML("div", "thumb newproject", gn('scrollarea'));
 	tb.pid = 'newproject'; 
 	return tb;
}

/* SQL fields
		id --> automatically assigned
		ctime --> automatic
		name --> project name
		nameflag --> YES/NO if project name has been modified
		thumb --> project thumb png name
		json --> project content
		owner --> only use to distinguish between DEMO and not demo projects
		pos --> sorting info
		deletedflag --> deleted flag
		version --> not used...	
	*/
		
Home.showQuery = function (){	
	Home.doQuery(doNext);
	
	function doNext(str){
		if (str == "no webkit") return;
		else {
			var data = JSON.parse(str);
			Home.metadata =  new Object();
			Home.displayProjects (data)
		}
	}
}
	
Home.displayProjects = function (data){	
	for (var i = 0; i < data.length; i++) {
		 var p = Home.addProject(data[i]);
		 p.prev =  Home.prev;
		 if (Home.prev) Home.prev.next = p;	
		 Home.prev = p;
	}
}

Home.doQuery = function (fcn){
	var obj = {};	
	obj ["cond"] = "deletedflag = ? AND version = ?"
	obj ["items"] = ["name", 'nameflag', 'id', 'pos', 'thumb'];
	obj ["values"] = ['NO', Home.version];
	obj ["order"] = "pos desc";
	var json = {};	
	json.stmt = "select " + obj.items +" from "+ iOS.database + " where " + obj.cond + (obj.order ? " order by " + obj.order : "") ;
	json.values = obj.values;
//	console.log (json)
	iOS.query(json, fcn);
};

Home.addProject = function(data){
	
	var name = data.name;
	var info = data.info ? unescape(data.info) : undefined;
	var t = newHTML ("div", "thumb",  gn('scrollarea'));	
	if (data.thumb) {
		let str  = iOS.b64ToUtf8(data.thumb);
		var div = newHTML ("div", "svgimage", t);
		div.innerHTML = str
		} 
	// for old project compatibility
	t.pid = data.id;
	t.name = data.name;
	Home.metadata[data.id] = data;
	t.id  = "thumb_" +t.pid;
	name = !name ? Translation.strings['home']['project']+ " " +data.id : name;
	var info = newHTML ("div", "projectinfo", t);
	
	Home.addEditableField(info, name);
 	var cb = newHTML('div', 'delete', t);
 	return t;
}

Home.addEditableField = function(p, name) {
	var field = newHTML("form", "projectname" , p); 
  var ti = newHTML("input", "instruction", field);  
	ti.value = name;
	ti.autocomplete = "off";
  ti.autocapitalize = "off";
  ti.maxLength = 25;
  ti.autocorrect = false;
  ti.onfocus = function(evt){
  	ti.oldname=ti.value; ti.className =  "instruction select";
  	var n = ti.value.length;	
  	ti.setSelectionRange(n, n);
  }; 
  ti.onblur = function(evt){Home.unfocusText(evt);}; 
  ti.onkeypress = function(evt) {Home.handleWrite(evt);};
  ti.onsubmit= function(evt){Home.unfocusText(evt);};
	return field;
}

Home.handleWrite = function(e){
  var key=e.keyCode || e.which;
  var ti = e.target;
//  console.log (e, key)
  if (key==13) {
    e.preventDefault();
    e.target.blur();
  }
}

//////////////////////////////////////////////////
// Top Level Events
//////////////////////////////////////////////////

Home.handleTouchStart = function(e){
	Home.closeMenu();
	Home.dragging = false;
	if (Home.timeoutEvent) clearTimeout(Home.timeoutEvent);
	Home.timeoutEvent = undefined;
	var t =e.target;
	if (t.nodeName == 'INPUT') return;
	if (t.className == "delete") {
		Home.deleteProject(e);
		Home.stopShaking();
		return;
	}
	window[eventDispatch["end"]] = Home.handleTouchEnd;
	window[eventDispatch["move"]] = Home.handleMove;
	if (document.activeElement.className == "instruction select") return;
  Home.holding = false;
	var mytarget = Home.getMouseTarget(e);
	Home.actionTarget  = mytarget;
	Home.initialPt = Events.getTargetPoint(e);
	if (Home.actionTarget && Home.actionTarget.pid) Home.setHoldAction();
	else if (Home.shaking) Home.stopShaking();
	Home.scrolltop = document.body.scrollTop;
}
	
Home.setHoldAction = function()	{
	window[eventDispatch["move"]] = Home.handleMove;
	var repeat = function (){
		window[eventDispatch["end"]] = function (e){e.preventDefault(); e.stopPropagation();};
		if (Home.timeoutEvent) clearTimeout(Home.timeoutEvent);
		Home.timeoutEvent = undefined;
		Home.startShaking();
	}
	Home.timeoutEvent = setTimeout(repeat, 500);
}

Home.handleMove = function(e){
	var pt = Events.getTargetPoint(e);
	var delta = Home.diff(pt,Home.initialPt);
	if (!Home.dragging && (Home.len(delta) > 20)) Home.dragging = true;
	if (! Home.dragging) return;
	if (Home.timeoutEvent) clearTimeout(Home.timeoutEvent);
	Home.timeoutEvent = undefined;
}

Home.len = function (a){
	return Math.sqrt (a.x*a.x + a.y*a.y);
}

Home.diff = function(a, b){
	var res = {};
	res.x = a.x - b.x;
	res.y = a.y - b.y;
	return res;
}

Home.getMouseTarget = function(e){
	var t = e.target;
	if (t == frame) return null;
	while(t && t.nodeName.toLowerCase()!= 'div')   t = t.parentNode;
	if (t.nodeName.toLowerCase() == "svg") return t.parentNode
	if (t && t.className && t.className.indexOf("thumb") > -1 )return t;
	while (t && t.className && (t.className.indexOf("thumb") < 0 )) t = t.parentNode;
	return t;
}

Home.handleTouchEnd = function(e){
	if (Home.timeoutEvent) clearTimeout(Home.timeoutEvent);
	Home.timeoutEvent = undefined;
	if (e.target.tagName.toLowerCase() == 'input') return;
	if (e.touches && (e.touches.length > 1)) return;
	window[eventDispatch["move"]] =  undefined;
	if (Home.dragging) return;
	Home.performAction(e);
}

Home.performAction = function(e) {
  e.preventDefault();
  e.stopPropagation(); 
  var action = Home.getAction(e);
//  console.log (action);
 	switch (action) {
		case 'newproject':
			SimpleAudio.play("tap");
			var url = 'editor.html?pid=-1&ts='+ Date.now();
			Home.changePage(url);
			break;
		case 'project':
			SimpleAudio.play("tap");
			var md5 = Home.actionTarget.pid;
			var url = 'editor.html?pid='+ md5+'&ts='+ Date.now();
			Home.changePage(url);
			break;
		default:
			break;
	}	
}

Home.deleteProject =  function(e){
	var pid = e.target.parentNode.pid;
	SimpleAudio.play("delete");
 	Home.updateField (pid, "deletedflag", "YES");
 	var p = e.target.parentNode;
 	if (p.parentNode) p.parentNode.removeChild(p);
}

Home.getAction = function(e){
	var t = e.target;
//	console.log (t, Home.holding, Home.actionTarget)
	if (Home.holding) return "none";
	if (t.className=="delete") return "delete";
	if (!Home.actionTarget) return 'none';
	if (!Home.actionTarget.pid) return 'none';
	if (Home.actionTarget.pid == "newproject") return "newproject";
  return 'project';
}

Home.startShaking = function (){
	var div  = gn("scrollarea");
	Home.shaking = false;
	if (!Home.actionTarget) return;
	var tb = Home.actionTarget
	if (tb.pid == 'newproject') return; 
	var cc = tb.getAttribute('class');
  tb.className = tb.className +  ' shake';
  Home.shaking = true;	
}

Home.stopShaking = function (){	
	var div  = gn("scrollarea");
	for (var i=0; i < div.childElementCount; i++){
		var tb = div.childNodes[i];
		if (tb.pid == 'newproject') continue; 
  	tb.className = 'thumb';
	}
	Home.shaking = false;
}


/////////////////
// SQL calls
//////////////////

Home.unfocusText = function(e){ 	
	e.preventDefault();
	e.stopPropagation();
	var ti = e.target;
	ti.className = "instruction";
	var tb = ti.parentNode.parentNode.parentNode;
	if(ti.value=='') {ti.value=ti.oldname; return;}
	var newname = ti.value;
	ti.value = newname;
	if(tb.name==newname) return;
	tb.name = newname;
	Home.setName (newname, tb.pid);
	SimpleAudio.play("snap");
}

Home.setName = function (name, id){
	var obj = {};
	var keylist = [ "name = ?" , "nameflag = ?"];	
	obj.values = [name , "YES"];	
	obj.stmt = "update "+ iOS.database + " set "	+  keylist.toString() + " where id = " + id;
	iOS.stmt(obj, console.log);
	Home.metadata[id].name = name;
}

Home.updateField = function (id, fieldname, value, fcn){
	if (!id) {if (fcn) fcn(null); return;}
	var obj = {};
	var keylist = [ fieldname +" = ?"];
	obj.values = [value];
	obj.stmt = "update "+ iOS.database + " set "	+  keylist.toString() + " where id = " + id;
	iOS.stmt(obj, doNext);
	function doNext(str){if (fcn) fcn(str);}
}	
