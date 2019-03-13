/* 
Copyright (c) 2017 Playful Invention Company

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

Doc = function() {};

/////////////////////////////////////////////////////////////////
// tool For documentation and data to svg rendering
// keep the savesvg,php on the folder for testing purposes
/////////////////////////////////////////////////////////////////

Doc.xmlns =  "http://www.w3.org/2000/.svg";
Doc.xmlnslink = "http://www.w3.org/1999/xlink";

Doc.getThumbnail = function (w, h){
	var svg = SVGTools.create(undefined, w, h)
	let hasStacks = Code.scripts.blocksContainer._scripts.length > 0;
	let hasShapes =  (ShapeEditor.shapes.length > 0) && (ShapeEditor.shapes.join(" ") != ShapeEditor.defaultShapes.join(" "));
	if (!hasShapes && !hasStacks)  return null;
	if (hasStacks) Doc.addMainStack(svg, new Rectangle (0,0, w/2, h), 0.5)
	Doc.addShapes(svg, w, h);		
	var str = svg.outerHTML;
	str = str.replace (/&nbsp;/g, ' ')
	return str;
}

Doc.addMainStack = function (svg, rect){
	var stacks  = Code.scripts.blocksContainer.getScripts();
	var topblocks = {};
	for (let i=0; i < stacks.length; i++) {
		var b  = Code.scripts.blocksContainer.getBlock (stacks[i]);
		var list  =  topblocks [b.opcode]
		if (!list ) list  = [];
		let n = getStackSize (b)
		list.push ({block: b, stacksize: n});
		topblocks [b.opcode] =  list;
	}
	var ref = Object.keys(topblocks);
	var mainstack;
	if (ref.indexOf("events_onbuttona") > -1)  mainstack = "events_onbuttona";
	else if (ref.indexOf ("events_onbuttonb") > -1)  mainstack = "events_onbuttonb";
	else if (ref.indexOf ("events_onbuttonab") > -1)  mainstack = "events_onbuttonab";
	else mainstack = ref[0]
	var stacks = topblocks [mainstack];
	stacks = stacks.sort(function(a, b) {		
			return list[a].stacksize  - list[b].stacksize
	});
	let scale = 0.4;
	var stack = stacks[stacks.length - 1];
	var elem = findStack(Math.abs(stack.block.x), Math.abs(stack.block.y))
	var dy =  mainstack.indexOf ("events_") < 0 ? 10 : 25;
	var dx = 10;
//	console.log (mainstack,topblocks [mainstack],stacks, elem)
	if (elem) {
		var svgstack = Doc.getStack(svg, elem, rect)
		var mtx ="matrix("+ scale +" 0 0 " + scale +" " +  Math.round(dx*scale) + " " + Math.round(dy*scale)+")" ;
		svgstack.setAttribute("transform", mtx);	
		svg.appendChild(svgstack)
	}
	
	function getStackSize(b) {
		var state = true;
		var n = 0
		while (state) {
		 	 var loop =	Code.scripts.blocksContainer.getBranch(b.id, 1);
		 	 if (loop != null) n += 4;	 
			 var nextid =  Code.scripts.blocksContainer.getNextBlock(b.id)	
			 if (!nextid) break;
			 b = Code.scripts.blocksContainer.getBlock(nextid)
			 n++;
		}
		return n;
	}
	
	function findStack(x, y) {
//		console.log ('findStack', x, y)
		let blocks = Code.workspace.svgBlockCanvas_;	
		for (let i=0; i < blocks.childElementCount; i++) {
			var elem  = blocks.childNodes[i]
			if (!elem) continue;
			var pt = getTransform(elem);
		//	console.log (pt)
			if ((Math.abs(pt.x) == x) && (Math.abs(pt.y) == y)) return elem;
		}
		return null
	}
	
}


Doc.addShapes = function (svg, w, h){
	var p =  SVGTools.createGroup(svg)
	var dx = Math.round((w *0.75) - 45);
	var rows  = (ShapeEditor.shapes.length % 2) + Math.floor (ShapeEditor.shapes.length / 2)
	var dy = Math.max (2, (h - (rows*40)) / 2);
	var mtx = 'matrix(0.5 0 0 0.5 ' +  dx+ " " + dy + ')'
	p.setAttribute("transform", mtx);	
	p.setAttributeNS(null,'width', dx*2);
	p.setAttributeNS(null, 'height',h*2);
	
	var dotsize = 5;
	var palette = gn("palette")
	for (var i= 0; i < ShapeEditor.shapes.length; i++) {
		var dx = 5 + (i % 2) * 80;
		var dy = 5 + Math.floor (i / 2) * 80;
		var g = SVGTools.createGroup(p);
		g.setAttribute("transform", 'matrix(1 0 0 1 ' +  dx + " " + dy + ')');	
		var myframe = Doc.addBorder(g, 60,  60, "#FFFFFF", 1);	
		mtx = 'matrix(1 0 0 1 10 10)';
		myframe.setAttribute("transform", mtx);	
		var sh = SVGTools.createGroup(g);
		attr = {"transform": 'matrix(1 0 0 1 13 13)'};
		for (var val in attr) sh.setAttribute(val, attr[val]);
		var obj  = palette.childNodes[i];
		if (!obj) return;
		obj = obj.childNodes[1].childNodes[0]
		let shape = SVGTools.getCopy(obj)
		sh.appendChild(shape.childNodes[0])
	}
}

Doc.addSelectedImage = function (svg, w, h){
	var palette = gn("palette")
	var p =  SVGTools.createGroup(svg)
	var dx = Math.round((w *0.75) - 40);
	var dy = Math.round((h - 80) / 2);
	var mtx = "translate(" + dx + ", " + dy+")";
	p.setAttribute("transform", mtx);	
	var overlay = Doc.addBorder(p, 80,  80, "#FFFFFF");	
	overlay.setAttribute("fill-opacity", "0.7");		
	let pos= ShapeEditor.paintingShape ?  Number(ShapeEditor.paintingShape.id.split("_")[1]) :  0;
	var g = SVGTools.createGroup(p);
	let myframe = Doc.addBorder(g, 60,  60, "#FFFFFF", 1);	
	mtx = 'matrix(1 0 0 1 10 10)';
	myframe.setAttribute("transform", mtx);	
	var sh = SVGTools.createGroup(g);
	attr = {"transform": 'matrix(1 0 0 1 13 13)'};
	for (var val in attr) sh.setAttribute(val, attr[val]);
	var obj  = palette.childNodes[pos];
	if (!obj) return;
	obj = obj.childNodes[1].childNodes[0]
	let shape = SVGTools.getCopy(obj)
	sh.appendChild(shape.childNodes[0])

}
	
Doc.addBorder = function (g, w, h, color, s){
	var shape = document.createElementNS(SVGTools.xmlns, "path");	
	g.appendChild(shape);
	let attr = {'d': Doc.getRoundRect(w,h,2,s?s:1), fill: color};	
	if (s) {
		attr["stroke-width"] =  s;
		attr["stroke"] =  "#d3d4d5";
	}
	for (var val in attr) shape.setAttribute(val, attr[val]);
	return shape;
}	

Doc.print = function (){
	var svg = SVGTools.create(undefined, 792, 612)
	var group =  SVGTools.createGroup(svg)
	let rect = Doc.printStacks(group, 0.5);
	if ((rect.x < 0) || (rect.y < 0)) {
		let dx = -rect.x;
		let dy = -rect.y;
		let transform = "matrix( 1 0 0 1 " + (5 + (dx/2)) + " " + (10+(dy/2)) +")";
		group.setAttribute( "transform", transform);
	}
	var p =  SVGTools.createGroup(svg)
	var mtx ="matrix( 1 0 0 1 " + 572 + " " + 0+")" ;
	p.setAttribute("transform", mtx);	
	Doc.dumpShapes(p);
	let svgstr = (new XMLSerializer()).serializeToString(svg)
	Doc.saveContent (svgstr)
}

Doc.printStacks = function(svg, scale){	
	let totalrect = new Rectangle(0,0, 792, 612);
	let blocks = Code.workspace.svgBlockCanvas_;	
	for (let i=0; i < blocks.childElementCount; i++) {
		var rect = new Rectangle(200000,200000,0,0);
		var g = Doc.getStack(svg, blocks.childNodes[i], rect)
		let dx =  rect.x
		let dy = rect.y;
		totalrect =  totalrect.union (rect)
		var mtx ="matrix("+ scale +" 0 0 " + scale +" " + (dx*scale) + " " + (dy*scale)+")" ;
		g.setAttribute("transform", mtx);	
		svg.appendChild(g)
	}
 return totalrect;
}

Doc.getStack = function(svg, p, rect){
	var g =  SVGTools.createGroup(svg)
	var pc = p.getAttribute('class')
//	console.log ("get stack", p.tagName.toLowerCase(), pc)
	switch (p.tagName.toLowerCase()){
		case 'g':
			if (pc == 'blocklyIcon') {
				g.setAttribute("height", p.getAttribute("height"));
				g.setAttribute("width", p.getAttribute("width"));
				g.setAttribute("x", p.getAttribute("x"));
				g.setAttribute("y", p.getAttribute("y"));
			}
			break;
	}
	var pt = getTransform(p);
	let dx =  pt.x;
	let dy =  pt.y;
	if (rect.x > dx)  rect.x = dx;
	if (rect.y > dy)  rect.y = dy;
	for (let i=0; i < p.childElementCount; i++ ) {
		let kid = p.childNodes[i];		
		if (kid.style.visibility == "hidden") continue;
		switch (kid.tagName.toLowerCase()) {
			case 'path':
				 var elem = SVGTools.getCopy(kid);
				 g.appendChild(elem)
				break;
			case 'rect':	
				var elem = SVGTools.getCopy(kid);
				g.appendChild(elem)	
				break;		; 
			case 'image':	
				let icon = Doc.getImage(kid, p); 
				if (icon) g.appendChild(icon); 
				break;
			case 'text': 
				g.appendChild(Doc.getText(kid, p));
				break;
			case "g": 
				var grouprect = new Rectangle(200000,200000,0,0);
				var newblock =  Doc.getStack (g, kid, grouprect)
				var mtx ="matrix( 1 0 0 1 " + grouprect.x + " " + grouprect.y+")" ;
				newblock.setAttribute("transform", mtx);	
				break;
		}
	}

	var mtx ="matrix( 1 0 0 1 " + rect.x + " " + rect.y+")" ;
	g.setAttribute("transform", mtx);	
	return g;
}

Doc.getImage = function(kid, p)	{
	let name  = kid.getAttribute("xlink:href")
	if (!name) return null;
	var iconstr = Doc.icons[name]
	if (!iconstr) {
		console.warn ("Please add image", name)
	}
	if (!iconstr) return null;
	var svgicon = SVGTools.toObject(atob(iconstr));
	var icon  = Doc.stripOutSVGWrapper(svgicon);
	var imgsize = kid.getAttribute("height") ?  Number (kid.getAttribute("height").replace (/[^0-9.,]+/ , '')) : null;
	var iconsize = svgicon.getAttribute("height") ?  Number (svgicon.getAttribute("height").replace (/[^0-9.,]+/ , '')) : null;
	var scale = !imgsize || !iconsize ? 1 :  imgsize < iconsize ? imgsize / iconsize : 1;
//	console.log (scale, icon, svgicon.getAttribute("width"), svgicon.getAttribute("height"), kid.getAttribute("width"), kid.getAttribute("height"))
	var pt = getTransform(kid);
	var shouldScale  = name.indexOf ('sensing_microbit') > -1;	
	var t =  "matrix("+ scale +" 0 0 " + scale +" " + pt.x + ", " + pt.y+")";
	icon.setAttribute("transform",t);	
	icon.setAttribute("height", kid.getAttribute("height"));
	icon.setAttribute("width", kid.getAttribute("width"));
	return icon
}

Doc.stripOutSVGWrapper = function(svg){
	var g = SVGTools.createGroup(null)
	for (let i=0; i < svg.childElementCount; i++ ) {
		let kid = svg.childNodes[i];		
		switch (kid.tagName.toLowerCase()) {
			case 'title': break;
			case 'svg': break;			
			default:
				g.appendChild(SVGTools.getCopy(kid));
				break;
		}
	}
	return g;
}
					
Doc.getText = function(kid, p){			
	let white  = 'fill: rgb(255, 255, 255); ';
	let black =  'fill: rgb(87, 94, 117); '
	var style = 'font-family: "Helvetica Neue", Helvetica, sans-serif; font-size: 16px; font-weight: 500;'
	let attrlist  = kid.getAttributeNames();
	var attr = {}
	for (let i = 0; i <attrlist.length; i++) {
		if (attrlist[i] == 'class') continue;
		if (attrlist[i] == 'transform') continue;
		let key = attrlist[i];
		attr[key] = kid.getAttribute(key);
	}
	var txt  = SVGTools.addChild(undefined, 'text', attr)
	txt.textContent = kid.textContent;//.replace (/:/g, "");
	var cn = kid.getAttribute('class')
	var pcn = p.getAttribute('class')
	var pt = getTransform(kid);
	switch (cn){
		case "blocklyText":
			style =  pcn == 'blocklyEditableText' ? black + style : white + style;	
			var t =  "translate(" + pt.x + ", " + pt.y+")" 
			break;
		case "blocklyText blocklyEditableLabel":
		case "blocklyText blocklyDropdownText":
			style =  white + style;	
			var t =  "translate(" + pt.x + ", " + pt.y+")" 
			break;		
	}
	txt.setAttribute("style", style)
	if (t) txt.setAttribute("transform",t);
	return txt;
}
 
Doc.saveContent = function (str){		
	let name =  'noname.svg';                
	chrome.fileSystem.chooseEntry({type: "saveFile", suggestedName: name}, next1)
	function next1(fe){
		if(fe!=undefined) Doc.save(fe, str);
		else console.log ("cancelled")
	}
}

Doc.save = function (fe, content){
	var blob = new Blob([content], {type: 'plain/text'});
	fe.createWriter(next1);
	function next1(writer){
		writer.onwriteend = next2; 
		writer.write(blob);
	}
	function next2(){writer.onwriteend=undefined; writer.truncate(blob.size);}
}

Doc.create = function(parent, w,h){
	var el = document.createElementNS(Doc.xmlns,".svg");
	el.setAttributeNS(null, 'version', 1.1);
	if (w) el.setAttributeNS(null,'width',w);
	if (h) el.setAttributeNS(null, 'height', h);
	if (parent) parent.appendChild(el);
	return el;
}

Doc.saveShapes = function (){
	var p = SVGTools.create();	
	Doc.dumpShapes(p);
	Doc.saveContent((new XMLSerializer()).serializeToString(p));
}

Doc.getRoundRect = function (w, h, r, sw){
	let offset = sw / 2;
	var dx = offset; var dy = r +offset;
	var d = "M"+dx +","+ dy;
	dx+= r; dy-=r;
	d = d + "A "+ r + " " +r +" 0 0 1 " + dx+ " " +dy;	
	dx += w;
	d = d + "L"+ dx + "," + dy;
	dx+= r; dy+=r;
	d = d + "A "+ r + " " +r +" 0 0 1 " + dx+ " " +dy;
	dy+=h;
	d = d + "L"+ dx + "," + dy;
	dx-= r; dy+=r;
	d = d + "A "+ r + " " +r +" 0 0 1 " + dx+ " " +dy;
	dx -=w;
	d = d + "L"+ dx + "," + dy;
	dx -= r; dy-=r;
	d = d + "A "+ r + " " +r +" 0 0 1 " + dx+ " " +dy;
	d = d+ "z"
	return d;
}

Doc.roundRect = "M0.5,0.5M2.5,0.5A 2 2 0 0 1 4.5 -1.5L60.5,-1.5A 2 2 0 0 1 62.5 0.5L62.5,56.5A 2 2 0 0 1 60.5 58.5L4.5,58.5A 2 2 0 0 1 2.5 56.5z"
Doc.font= 'Lucida Grande';// 'Lucida Grande';
Doc.labelsize = 15;
Doc.argsize = 9;

Doc.dumpShapes = function (p){
	p.setAttributeNS(null,'width', 150 * 2);
	p.setAttributeNS(null, 'height',( 1 + (ShapeEditor.shapes.length / 2)) * 150 );
	var dotsize = 5;
	var palette = gn("palette")
	for (var i= 0; i < ShapeEditor.shapes.length; i++) {
		var dx = 5 + (i % 2) * 120;
		var dy = 5 + Math.floor (i / 2) * 80;
		var g = SVGTools.createGroup(p);
		var attr = {"transform": 'matrix(1 0 0 1 ' +  dx + " " + dy + ')'};
	 	for (var val in attr) g.setAttribute(val, attr[val]);	
	 	Doc.addframe(g, 60,  60);	
		var attr = {"transform": 'matrix(1 0 0 1 ' + 0 + " "+ 12 +')',
		fill: "#8e8e8e", "font-family": Doc.font, "font-size": 12, "font-weight": "bold"};
		var kid = SVGTools.addChild(g, "text", attr);
		kid.textContent = (i+1) + ".";
		var sh = SVGTools.createGroup(g);
		var attr = {"transform": 'matrix(1 0 0 1 23 -1)'};
	 	for (var val in attr) sh.setAttribute(val, attr[val]);
	 	var obj  = palette.childNodes[i];
	 	if (!obj) return;
	 	obj = obj.childNodes[1].childNodes[0]
		let shape = SVGTools.getCopy(obj)
		sh.appendChild(shape.childNodes[0])
	}
}
	 
Doc.addframe = function (g, w, h){
	var shape = document.createElementNS(SVGTools.xmlns, "path");	
	g.appendChild(shape);
	let attr = {'d': Doc.roundRect, "transform": 'matrix(1 0 0 1 20 0)', fill: "#FFFFFF", "stroke-width": 1, stroke: "#d3d4d5"};	
	for (var val in attr) shape.setAttribute(val, attr[val]);
}	

Doc.saveStage = function (name){
	var p = SVGTools.create();
	Doc.dumpStage(p);
	SVGTools.save(name + ".svg", (new XMLSerializer()).serializeToString(p));
}

Doc.dumpStage = function (p){
	var w =	gn("stage").offsetWidth - 14;
	var h = gn("stage").offsetHeight - 8;
	p.setAttributeNS(null,'width', w);
	p.setAttributeNS(null, 'height', h);
	var g = SVGTools.createGroup(p);
	var attr = {"transform": 'matrix(1 0 0 1 0 0)', width: w, height: h, fill: "#f2f2f2"};
	var  bkg = SVGTools.addChild(g, "rect", attr);
	var div = gn("grid");
	for (var i=0; i <div.childElementCount; i++){
		var kid = div.childNodes[i];
		var radius = kid.offsetWidth / 2;
		var color = kid.style.background;
 		var x = kid.offsetLeft + radius - 2;
 		var y = kid.offsetTop + radius - 2;
 		var attr = {"transform": 'matrix(1 0 0 1 ' +x + " "+  y +')', r: radius, "stroke-width": 1, fill: color, stroke: "#222222"};
		var kid = SVGTools.addChild(g, "circle", attr);
	}
}

Doc.displayTime = function (){
	gn("currenttime").textContent = Runtime.seconds.toFixed(1);
}

function setnumbers (n, dist){
	var mold = 	'<tspan x="0" y="%a" font-family="%c" font-size="13px">%b</tspan>';
	var str = "";
	for (var i = 0; i < n ; i++){
			var num = n - i - 1;
			var entry = mold.replace("%a", i*dist);
			entry = entry.replace("%b", num);
			entry = entry.replace("%c",	"'AvenirNext-DemiBold'");

			str+= entry;
	}
	return str;
}

Doc.icons = {
  "assets/media/dropdown-arrow.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB3aWR0aD0iMTIuNzEiIGhlaWdodD0iOC43OSIgdmlld0JveD0iMCAwIDEyLjcxIDguNzkiPjx0aXRsZT5kcm9wZG93bi1hcnJvdzwvdGl0bGU+PGcgb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMTIuNzEsMi40NEEyLjQxLDIuNDEsMCwwLDEsMTIsNC4xNkw4LjA4LDguMDhhMi40NSwyLjQ1LDAsMCwxLTMuNDUsMEwwLjcyLDQuMTZBMi40MiwyLjQyLDAsMCwxLDAsMi40NCwyLjQ4LDIuNDgsMCwwLDEsLjcxLjcxQzEsMC40NywxLjQzLDAsNi4zNiwwUzExLjc1LDAuNDYsMTIsLjcxQTIuNDQsMi40NCwwLDAsMSwxMi43MSwyLjQ0WiIgZmlsbD0iIzIzMWYyMCIvPjwvZz48cGF0aCBkPSJNNi4zNiw3Ljc5YTEuNDMsMS40MywwLDAsMS0xLS40MkwxLjQyLDMuNDVhMS40NCwxLjQ0LDAsMCwxLDAtMmMwLjU2LS41Niw5LjMxLTAuNTYsOS44NywwYTEuNDQsMS40NCwwLDAsMSwwLDJMNy4zNyw3LjM3QTEuNDMsMS40MywwLDAsMSw2LjM2LDcuNzlaIiBmaWxsPSIjZmZmIi8+PC9zdmc+PC9zdmc+",
  "assets/media//repeat.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0icmVwZWF0IiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDI0IDI0IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyNCAyNDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6I0NGOEIxNzt9Cgkuc3Qxe2ZpbGw6I0ZGRkZGRjt9Cjwvc3R5bGU+PHRpdGxlPnJlcGVhdDwvdGl0bGU+PHBhdGggY2xhc3M9InN0MCIgZD0iTTIzLjMsMTFjLTAuMywwLjYtMC45LDEtMS41LDFoLTEuNmMtMC4xLDEuMy0wLjUsMi41LTEuMSwzLjZjLTAuOSwxLjctMi4zLDMuMi00LjEsNC4xICBjLTEuNywwLjktMy42LDEuMi01LjUsMC45Yy0xLjgtMC4zLTMuNS0xLjEtNC45LTIuM2MtMC43LTAuNy0wLjctMS45LDAtMi42YzAuNi0wLjYsMS42LTAuNywyLjMtMC4ySDdjMC45LDAuNiwxLjksMC45LDIuOSwwLjkgIHMxLjktMC4zLDIuNy0wLjljMS4xLTAuOCwxLjgtMi4xLDEuOC0zLjVoLTEuNWMtMC45LDAtMS43LTAuNy0xLjctMS43YzAtMC40LDAuMi0wLjksMC41LTEuMmw0LjQtNC40YzAuNy0wLjYsMS43LTAuNiwyLjQsMEwyMyw5LjIgIEMyMy41LDkuNywyMy42LDEwLjQsMjMuMywxMXoiLz48cGF0aCBjbGFzcz0ic3QxIiBkPSJNMjEuOCwxMWgtMi42YzAsMS41LTAuMywyLjktMSw0LjJjLTAuOCwxLjYtMi4xLDIuOC0zLjcsMy42Yy0xLjUsMC44LTMuMywxLjEtNC45LDAuOGMtMS42LTAuMi0zLjItMS00LjQtMi4xICBjLTAuNC0wLjMtMC40LTAuOS0wLjEtMS4yYzAuMy0wLjQsMC45LTAuNCwxLjItMC4xbDAsMGMxLDAuNywyLjIsMS4xLDMuNCwxLjFzMi4zLTAuMywzLjMtMWMwLjktMC42LDEuNi0xLjUsMi0yLjYgIGMwLjMtMC45LDAuNC0xLjgsMC4yLTIuOGgtMi40Yy0wLjQsMC0wLjctMC4zLTAuNy0wLjdjMC0wLjIsMC4xLTAuMywwLjItMC40bDQuNC00LjRjMC4zLTAuMywwLjctMC4zLDAuOSwwTDIyLDkuOCAgYzAuMywwLjMsMC40LDAuNiwwLjMsMC45UzIyLDExLDIxLjgsMTF6Ii8+PC9zdmc+PC9zdmc+",
  "assets/media/repeat.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0icmVwZWF0IiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDI0IDI0IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyNCAyNDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6I0NGOEIxNzt9Cgkuc3Qxe2ZpbGw6I0ZGRkZGRjt9Cjwvc3R5bGU+PHRpdGxlPnJlcGVhdDwvdGl0bGU+PHBhdGggY2xhc3M9InN0MCIgZD0iTTIzLjMsMTFjLTAuMywwLjYtMC45LDEtMS41LDFoLTEuNmMtMC4xLDEuMy0wLjUsMi41LTEuMSwzLjZjLTAuOSwxLjctMi4zLDMuMi00LjEsNC4xICBjLTEuNywwLjktMy42LDEuMi01LjUsMC45Yy0xLjgtMC4zLTMuNS0xLjEtNC45LTIuM2MtMC43LTAuNy0wLjctMS45LDAtMi42YzAuNi0wLjYsMS42LTAuNywyLjMtMC4ySDdjMC45LDAuNiwxLjksMC45LDIuOSwwLjkgIHMxLjktMC4zLDIuNy0wLjljMS4xLTAuOCwxLjgtMi4xLDEuOC0zLjVoLTEuNWMtMC45LDAtMS43LTAuNy0xLjctMS43YzAtMC40LDAuMi0wLjksMC41LTEuMmw0LjQtNC40YzAuNy0wLjYsMS43LTAuNiwyLjQsMEwyMyw5LjIgIEMyMy41LDkuNywyMy42LDEwLjQsMjMuMywxMXoiLz48cGF0aCBjbGFzcz0ic3QxIiBkPSJNMjEuOCwxMWgtMi42YzAsMS41LTAuMywyLjktMSw0LjJjLTAuOCwxLjYtMi4xLDIuOC0zLjcsMy42Yy0xLjUsMC44LTMuMywxLjEtNC45LDAuOGMtMS42LTAuMi0zLjItMS00LjQtMi4xICBjLTAuNC0wLjMtMC40LTAuOS0wLjEtMS4yYzAuMy0wLjQsMC45LTAuNCwxLjItMC4xbDAsMGMxLDAuNywyLjIsMS4xLDMuNCwxLjFzMi4zLTAuMywzLjMtMWMwLjktMC42LDEuNi0xLjUsMi0yLjYgIGMwLjMtMC45LDAuNC0xLjgsMC4yLTIuOGgtMi40Yy0wLjQsMC0wLjctMC4zLTAuNy0wLjdjMC0wLjIsMC4xLTAuMywwLjItMC40bDQuNC00LjRjMC4zLTAuMywwLjctMC4zLDAuOSwwTDIyLDkuOCAgYzAuMywwLjMsMC40LDAuNiwwLjMsMC45UzIyLDExLDIxLjgsMTF6Ii8+PC9zdmc+PC9zdmc+",
  "assets/media/microbit/event_when-broadcast-received_coral.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5MZXR0ZXJHZXRfQ29yYWw8L3RpdGxlPjxwYXRoIGZpbGw9IiNGRjgzOUUiIHN0cm9rZT0iI0JGNTY2OCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzQsMzZINS45Yy0xLjEsMC0yLTAuOS0yLTJMNCwxNyAgYzAtMC42LDAuMy0xLjIsMC44LTEuNmwxNC0xMC41YzAuNy0wLjUsMS43LTAuNSwyLjQsMGwxNCwxMC41YzAuNSwwLjQsMC44LDEsMC44LDEuNnYxN0MzNiwzNS4xLDM1LjEsMzYsMzQsMzZ6Ii8+PHBhdGggZmlsbD0iI0Y5RjhGRiIgc3Ryb2tlPSIjQkY1NjY4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xMCw4aDIwYzEuMSwwLDIsMC45LDIsMnYxNiAgYzAsMS4xLTAuOSwyLTIsMkgxMGMtMS4xLDAtMi0wLjktMi0yVjEwQzgsOC45LDguOSw4LDEwLDh6Ii8+PGcgb3BhY2l0eT0iMC4xIj48cGF0aCBmaWxsPSIjMjMxRjIwIiBkPSJNMzYuNSwxN3YxYzAsMC4yLTAuMSwwLjMtMC4yLDAuNGwtMTQuOSw5LjNjLTAuNCwwLjMtMC45LDAuNC0xLjMsMC40Yy0wLjUsMC0wLjktMC4xLTEuMy0wLjRsLTE1LTkuNCAgIGMtMC4xLTAuMS0wLjItMC4zLTAuMi0wLjR2LTEuMmMwLjEtMC43LDAuNC0xLjMsMS0xLjhsMC43LTAuNWMwLjItMC4xLDAuNC0wLjEsMC42LDBsMTEuMyw3bDEuNS0xLjFjMC45LTAuNywyLjEtMC43LDMsMGwxLjUsMS4xICAgbDExLjMtNy4xYzAuMi0wLjEsMC40LTAuMSwwLjYsMGwwLjYsMC41QzM2LjEsMTUuNSwzNi41LDE2LjIsMzYuNSwxN3oiLz48L2c+PHBhdGggZmlsbD0iI0ZGODM5RSIgc3Ryb2tlPSIjQkY1NjY4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0zNiwxOGwtMTQuOSw5LjNjLTAuNiwwLjQtMS41LDAuNC0yLjEsMCAgTDQsMTh2MTZjMCwxLjEsMC45LDIsMiwyaDI4YzEuMSwwLDItMC45LDItMlYxOHoiLz48cGF0aCBmaWxsPSIjRkY4MzlFIiBzdHJva2U9IiNCRjU2NjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTQuOSwzNWwxMy45LTEwLjFjMC43LTAuNSwxLjctMC41LDIuNCwwICBMMzUsMzUiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSIxMS44IiB5MT0iNC4xIiB4Mj0iMTAuMSIgeTI9IjEiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI1LjMiIHkxPSIxMSIgeDI9IjIiIHkyPSI4LjYiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSIyOC4yIiB5MT0iNC4xIiB4Mj0iMjkuOCIgeTI9IjEiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSIzNC43IiB5MT0iMTEiIHgyPSIzNy45IiB5Mj0iOC42Ii8+PC9zdmc+PC9zdmc+",
  "assets/media/microbit/event_broadcast_coral.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5ldmVudF9icm9hZGNhc3RfY29yYWw8L3RpdGxlPjxwYXRoIGZpbGw9IiNGRjgzOUUiIGQ9Ik0zNS44LDMwLjVIMTEuMWMtMSwwLTEuOC0wLjgtMS44LTEuN2MwLDAsMCwwLDAsMGwwLjEtMTcuM2MwLTEsMC44LTEuNywxLjgtMS43aDI0LjVjMSwwLDEuOCwwLjgsMS44LDEuOCAgdjE3LjNDMzcuNSwyOS43LDM2LjcsMzAuNSwzNS44LDMwLjV6Ii8+PHBvbHlsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0JGNTY2OCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBwb2ludHM9IjEwLjQsMjkuNiAyMy41LDE4LjcgMzYuNiwyOS42ICIvPjxnIG9wYWNpdHk9IjAuMSI+PHBhdGggZmlsbD0iIzIzMUYyMCIgZD0iTTM3LjksMTIuOEwyNiwyNS4xYy0xLjMsMS40LTMuNSwxLjQtNC45LDAuMWMwLDAtMC4xLTAuMS0wLjEtMC4xTDkuMSwxMi44QzksMTIuNyw4LjksMTIuNCw5LDEyLjMgICBDOS4xLDEyLjEsOS4zLDEyLDkuNSwxMmgyOGMwLjIsMCwwLjQsMC4xLDAuNSwwLjNDMzgsMTIuNSwzOCwxMi43LDM3LjksMTIuOHoiLz48L2c+PHBhdGggZmlsbD0iI0ZGODM5RSIgc3Ryb2tlPSIjQkY1NjY4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0zNy41LDExLjVMMjUuNSwyMS44Yy0xLjEsMS0yLjgsMS0zLjksMCAgTDkuNSwxMS41Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNyIgeTE9IjEyIiB4Mj0iNC41IiB5Mj0iMTIiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI3IiB5MT0iMjAiIHgyPSI0LjUiIHkyPSIyMCIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIyOCIgeDI9IjQuNSIgeTI9IjI4Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNyIgeTE9IjI0IiB4Mj0iMSIgeTI9IjI0Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNyIgeTE9IjE2IiB4Mj0iMSIgeTI9IjE2Ii8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQkY1NjY4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0zNS44LDMwLjVIMTEuMWMtMSwwLTEuOC0wLjgtMS44LTEuNyAgYzAsMCwwLDAsMCwwbDAuMS0xNy4zYzAtMSwwLjgtMS43LDEuOC0xLjdoMjQuNWMxLDAsMS44LDAuOCwxLjgsMS44djE3LjNDMzcuNSwyOS43LDM2LjcsMzAuNSwzNS44LDMwLjV6Ii8+PC9zdmc+PC9zdmc+",
  "assets/media/microbit/event_broadcast_blue.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBpZD0iSWNvbiIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+ZXZlbnRfYnJvYWRjYXN0X2JsdWU8L3RpdGxlPjxwYXRoIGQ9Ik0zNS43NSwzMC41MkgxMS4xM2ExLjc1LDEuNzUsMCwwLDEtMS43NS0xLjc2bDAuMS0xNy4zYTEuNzUsMS43NSwwLDAsMSwxLjc1LTEuNzRIMzUuNzVhMS43NSwxLjc1LDAsMCwxLDEuNzUsMS43NXYxNy4zQTEuNzUsMS43NSwwLDAsMSwzNS43NSwzMC41MloiIGZpbGw9IiM0Yzk3ZmYiLz48cG9seWxpbmUgcG9pbnRzPSIxMC4zNiAyOS42NCAyMy41IDE4LjcyIDM2LjYzIDI5LjY0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzZDc5Y2MiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxnIG9wYWNpdHk9IjAuMSI+PHBhdGggZD0iTTM3Ljg3LDEyLjgxTDI2LDI1LjE0YTMuNDksMy40OSwwLDAsMS01LjA1LDBMOS4xMiwxMi44QTAuNDksMC40OSwwLDAsMSw5LDEyLjI2LDAuNTEsMC41MSwwLDAsMSw5LjQ4LDEyaDI4YTAuNTEsMC41MSwwLDAsMSwuNDYuM0EwLjUzLDAuNTMsMCwwLDEsMzcuODcsMTIuODFaIiBmaWxsPSIjMjMxZjIwIi8+PC9nPjxwYXRoIGQ9Ik0zNy41MSwxMS40N0wyNS40NSwyMS44M2EzLDMsMCwwLDEtMy45MSwwTDkuNDksMTEuNDYiIGZpbGw9IiM0Yzk3ZmYiIHN0cm9rZT0iIzNkNzljYyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGxpbmUgeDE9IjciIHkxPSIxMiIgeDI9IjQuNTMiIHkyPSIxMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjciIHkxPSIyMC4wMyIgeDI9IjQuNTMiIHkyPSIyMC4wMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjciIHkxPSIyOCIgeDI9IjQuNTMiIHkyPSIyOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjciIHkxPSIyNCIgeDI9IjEiIHkyPSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjciIHkxPSIxNiIgeDI9IjEiIHkyPSIxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PHBhdGggZD0iTTM1Ljc1LDMwLjUySDExLjEzYTEuNzUsMS43NSwwLDAsMS0xLjc1LTEuNzZsMC4xLTE3LjNhMS43NSwxLjc1LDAsMCwxLDEuNzUtMS43NEgzNS43NWExLjc1LDEuNzUsMCwwLDEsMS43NSwxLjc1djE3LjNBMS43NSwxLjc1LDAsMCwxLDM1Ljc1LDMwLjUyWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2Q3OWNjIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz48L3N2Zz4=",
  "assets/media/microbit/event_when-broadcast-received_red.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5MZXR0ZXJHZXRfTWFnZW50YTwvdGl0bGU+PHBhdGggZmlsbD0iI0QxMEIwQiIgc3Ryb2tlPSIjOUUyNTI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0zNCwzNkg1LjljLTEuMSwwLTItMC45LTItMkw0LDE3ICBjMC0wLjYsMC4zLTEuMiwwLjgtMS42bDE0LTEwLjVjMC43LTAuNSwxLjctMC41LDIuNCwwbDE0LDEwLjVjMC41LDAuNCwwLjgsMSwwLjgsMS42djE3QzM2LDM1LjEsMzUuMSwzNiwzNCwzNnoiLz48cGF0aCBmaWxsPSIjRjlGOEZGIiBzdHJva2U9IiM5RTI1MjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTEwLDhoMjBjMS4xLDAsMiwwLjksMiwydjE2ICBjMCwxLjEtMC45LDItMiwySDEwYy0xLjEsMC0yLTAuOS0yLTJWMTBDOCw4LjksOC45LDgsMTAsOHoiLz48ZyBvcGFjaXR5PSIwLjEiPjxwYXRoIGZpbGw9IiMyMzFGMjAiIGQ9Ik0zNi41LDE3djFjMCwwLjItMC4xLDAuMy0wLjIsMC40bC0xNC45LDkuM2MtMC40LDAuMy0wLjksMC40LTEuMywwLjRjLTAuNSwwLTAuOS0wLjEtMS4zLTAuNGwtMTUtOS40ICAgYy0wLjEtMC4xLTAuMi0wLjMtMC4yLTAuNHYtMS4yYzAuMS0wLjcsMC40LTEuMywxLTEuOGwwLjctMC41YzAuMi0wLjEsMC40LTAuMSwwLjYsMGwxMS4zLDdsMS41LTEuMWMwLjktMC43LDIuMS0wLjcsMywwbDEuNSwxLjEgICBsMTEuMy03LjFjMC4yLTAuMSwwLjQtMC4xLDAuNiwwbDAuNiwwLjVDMzYuMSwxNS41LDM2LjUsMTYuMiwzNi41LDE3eiIvPjwvZz48cGF0aCBmaWxsPSIjRDEwQjBCIiBzdHJva2U9IiM5RTI1MjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTM2LDE4bC0xNC45LDkuM2MtMC42LDAuNC0xLjUsMC40LTIuMSwwICBMNCwxOHYxNmMwLDEuMSwwLjksMiwyLDJoMjhjMS4xLDAsMi0wLjksMi0yVjE4eiIvPjxwYXRoIGZpbGw9IiNEMTBCMEIiIHN0cm9rZT0iIzlFMjUyNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNNC45LDM1bDEzLjktMTAuMWMwLjctMC41LDEuNy0wLjUsMi40LDAgIEwzNSwzNSIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjExLjgiIHkxPSI0LjEiIHgyPSIxMC4xIiB5Mj0iMSIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjUuMyIgeTE9IjExIiB4Mj0iMiIgeTI9IjguNiIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjI4LjIiIHkxPSI0LjEiIHgyPSIyOS44IiB5Mj0iMSIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjM0LjciIHkxPSIxMSIgeDI9IjM3LjkiIHkyPSI4LjYiLz48L3N2Zz48L3N2Zz4=",
  "assets/media/microbit/event_when-broadcast-received_coral2.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5MZXR0ZXJHZXRfQ29yYWw8L3RpdGxlPjxwYXRoIGZpbGw9IiNGMjZEODMiIHN0cm9rZT0iI0JGNTY2OCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzQsMzZINS45Yy0xLjEsMC0yLTAuOS0yLTJMNCwxNyAgYzAtMC42LDAuMy0xLjIsMC44LTEuNmwxNC0xMC41YzAuNy0wLjUsMS43LTAuNSwyLjQsMGwxNCwxMC41YzAuNSwwLjQsMC44LDEsMC44LDEuNnYxN0MzNiwzNS4xLDM1LjEsMzYsMzQsMzZ6Ii8+PHBhdGggZmlsbD0iI0Y5RjhGRiIgc3Ryb2tlPSIjQkY1NjY4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xMCw4aDIwYzEuMSwwLDIsMC45LDIsMnYxNiAgYzAsMS4xLTAuOSwyLTIsMkgxMGMtMS4xLDAtMi0wLjktMi0yVjEwQzgsOC45LDguOSw4LDEwLDh6Ii8+PGcgb3BhY2l0eT0iMC4xIj48cGF0aCBmaWxsPSIjMjMxRjIwIiBkPSJNMzYuNSwxN3YxYzAsMC4yLTAuMSwwLjMtMC4yLDAuNGwtMTQuOSw5LjNjLTAuNCwwLjMtMC45LDAuNC0xLjMsMC40Yy0wLjUsMC0wLjktMC4xLTEuMy0wLjRsLTE1LTkuNCAgIGMtMC4xLTAuMS0wLjItMC4zLTAuMi0wLjR2LTEuMmMwLjEtMC43LDAuNC0xLjMsMS0xLjhsMC43LTAuNWMwLjItMC4xLDAuNC0wLjEsMC42LDBsMTEuMyw3bDEuNS0xLjFjMC45LTAuNywyLjEtMC43LDMsMGwxLjUsMS4xICAgbDExLjMtNy4xYzAuMi0wLjEsMC40LTAuMSwwLjYsMGwwLjYsMC41QzM2LjEsMTUuNSwzNi41LDE2LjIsMzYuNSwxN3oiLz48L2c+PHBhdGggZmlsbD0iI0YyNkQ4MyIgc3Ryb2tlPSIjQkY1NjY4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0zNiwxOGwtMTQuOSw5LjNjLTAuNiwwLjQtMS41LDAuNC0yLjEsMCAgTDQsMTh2MTZjMCwxLjEsMC45LDIsMiwyaDI4YzEuMSwwLDItMC45LDItMlYxOHoiLz48cGF0aCBmaWxsPSIjRjI2RDgzIiBzdHJva2U9IiNCRjU2NjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTQuOSwzNWwxMy45LTEwLjFjMC43LTAuNSwxLjctMC41LDIuNCwwICBMMzUsMzUiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSIxMS44IiB5MT0iNC4xIiB4Mj0iMTAuMSIgeTI9IjEiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI1LjMiIHkxPSIxMSIgeDI9IjIiIHkyPSI4LjYiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSIyOC4yIiB5MT0iNC4xIiB4Mj0iMjkuOCIgeTI9IjEiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSIzNC43IiB5MT0iMTEiIHgyPSIzNy45IiB5Mj0iOC42Ii8+PC9zdmc+PC9zdmc+",
  "assets/media/microbit/event_broadcast_red.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5ldmVudF9icm9hZGNhc3RfbWFnZW50YTwvdGl0bGU+PHBhdGggZmlsbD0iI0QxMEIwQiIgZD0iTTM1LjgsMzAuNUgxMS4xYy0xLDAtMS44LTAuOC0xLjgtMS43YzAsMCwwLDAsMCwwbDAuMS0xNy4zYzAtMSwwLjgtMS43LDEuOC0xLjdoMjQuNWMxLDAsMS44LDAuOCwxLjgsMS44ICB2MTcuM0MzNy41LDI5LjcsMzYuNywzMC41LDM1LjgsMzAuNXoiLz48cG9seWxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOUUyNTI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHBvaW50cz0iMTAuNCwyOS42IDIzLjUsMTguNyAzNi42LDI5LjYgIi8+PGcgb3BhY2l0eT0iMC4xIj48cGF0aCBmaWxsPSIjMjMxRjIwIiBkPSJNMzcuOSwxMi44TDI2LDI1LjFjLTEuMywxLjQtMy41LDEuNC00LjksMC4xYzAsMC0wLjEtMC4xLTAuMS0wLjFMOS4xLDEyLjhDOSwxMi43LDguOSwxMi40LDksMTIuMyAgIEM5LjEsMTIuMSw5LjMsMTIsOS41LDEyaDI4YzAuMiwwLDAuNCwwLjEsMC41LDAuM0MzOCwxMi41LDM4LDEyLjcsMzcuOSwxMi44eiIvPjwvZz48cGF0aCBmaWxsPSIjRDEwQjBCIiBzdHJva2U9IiM5RTI1MjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTM3LjUsMTEuNUwyNS41LDIxLjhjLTEuMSwxLTIuOCwxLTMuOSwwICBMOS41LDExLjUiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI3IiB5MT0iMTIiIHgyPSI0LjUiIHkyPSIxMiIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIyMCIgeDI9IjQuNSIgeTI9IjIwIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNyIgeTE9IjI4IiB4Mj0iNC41IiB5Mj0iMjgiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI3IiB5MT0iMjQiIHgyPSIxIiB5Mj0iMjQiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI3IiB5MT0iMTYiIHgyPSIxIiB5Mj0iMTYiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiM5RTI1MjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTM1LjgsMzAuNUgxMS4xYy0xLDAtMS44LTAuOC0xLjgtMS43ICBjMCwwLDAsMCwwLDBsMC4xLTE3LjNjMC0xLDAuOC0xLjcsMS44LTEuN2gyNC41YzEsMCwxLjgsMC44LDEuOCwxLjh2MTcuM0MzNy41LDI5LjcsMzYuNywzMC41LDM1LjgsMzAuNXoiLz48L3N2Zz48L3N2Zz4=",
  "assets/media/microbit/sensing_microbit.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0NHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCA0NCAyNCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDQgMjQiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxnPjxnPjxjaXJjbGUgZmlsbD0iI0ZGRkZGRiIgY3g9IjEyLjUiIGN5PSIxMiIgcj0iMi4zIi8+PHBhdGggZmlsbD0iIzJFOEVCOCIgZD0iTTEyLjUsMTQuNmMtMS40LDAtMi42LTEuMi0yLjYtMi42czEuMi0yLjYsMi42LTIuNnMyLjYsMS4yLDIuNiwyLjZTMTQsMTQuNiwxMi41LDE0LjZ6IE0xMi41LDEwICAgIGMtMS4xLDAtMiwwLjktMiwyczAuOSwyLDIsMnMyLTAuOSwyLTJTMTMuNiwxMCwxMi41LDEweiIvPjwvZz48Zz48Y2lyY2xlIGZpbGw9IiNGRkZGRkYiIGN4PSIzMS42IiBjeT0iMTIiIHI9IjIuMyIvPjxwYXRoIGZpbGw9IiMyRThFQjgiIGQ9Ik0zMS42LDE0LjZjLTEuNCwwLTIuNi0xLjItMi42LTIuNnMxLjItMi42LDIuNi0yLjZzMi42LDEuMiwyLjYsMi42UzMzLDE0LjYsMzEuNiwxNC42eiBNMzEuNiwxMCAgICBjLTEuMSwwLTIsMC45LTIsMnMwLjksMiwyLDJzMi0wLjksMi0yUzMyLjcsMTAsMzEuNiwxMHoiLz48L2c+PGc+PHBhdGggZmlsbD0iI0ZGRkZGRiIgZD0iTTE2LjIsNC45YzIuNiwwLDUsMCw1LDBsMCwwbDAsMGMyLjUsMCwzLjcsMCw0LjYsMGMwLjUsMCwwLjksMCwxLjUsMGMwLjksMCwyLjIsMCw0LjUsMCAgICBjMi4yLDAsNC4xLDAuOCw1LjQsMi4yczEuOSwzLjMsMS44LDUuNWMtMC4yLDMuNi0zLDYuMy02LjYsNi40Yy0xLjQsMC00LjcsMC4xLTguNywwLjFjLTQuMSwwLTguMywwLTExLjQtMC4xICAgIGMtMi4yLDAtNC4xLTAuOC01LjQtMi4yYy0xLjMtMS40LTEuOS0zLjMtMS44LTUuNWMwLjItMy42LDMtNi4zLDYuNi02LjRDMTIuNyw0LjksMTQuMiw0LjksMTYuMiw0LjkgTTE2LjIsMC4zICAgIGMtMS43LDAtMy40LDAtNC42LDBjLTYsMC4yLTEwLjcsNC45LTExLDEwLjhjLTAuNCw3LDQuNiwxMi40LDExLjcsMTIuNWMzLjIsMCw3LjYsMC4xLDExLjUsMC4xczcuMywwLDguOS0wLjEgICAgYzYtMC4yLDEwLjctNC45LDExLTEwLjhjMC40LTctNC42LTEyLjQtMTEuNy0xMi41Yy0yLjUsMC0zLjcsMC00LjYsMGMtMS40LDAtMi4xLDAtNi4xLDBDMjEuMiwwLjMsMTguOCwwLjMsMTYuMiwwLjNMMTYuMiwwLjN6Ii8+PHBhdGggZmlsbD0iIzJFOEVCOCIgZD0iTTIzLjYsMjRjLTQuMSwwLTguNCwwLTExLjUtMC4xYy0zLjUsMC02LjctMS40LTguOS0zLjdjLTIuMi0yLjQtMy4zLTUuNi0zLjEtOS4xQzAuNSw1LDUuNCwwLjIsMTEuNSwwICAgIGMxLjEsMCwyLjYsMCw0LjcsMGMyLjYsMCw1LDAsNSwwYzIuNSwwLDMuNiwwLDQuNSwwYzEuNSwwLDIuMSwwLDYuMSwwYzMuNSwwLDYuNywxLjQsOC45LDMuN2MyLjIsMi40LDMuMyw1LjYsMy4xLDkuMSAgICBjLTAuMyw2LjEtNS4yLDEwLjktMTEuMywxMS4xQzMxLDI0LDI3LjgsMjQsMjMuNiwyNHogTTE2LjIsMC42Yy0yLDAtMy42LDAtNC42LDBDNS43LDAuOCwxLjEsNS4zLDAuNywxMS4yICAgIGMtMC4yLDMuMywwLjksNi40LDIuOSw4LjZjMi4xLDIuMiw1LjEsMy41LDguNSwzLjZjMywwLDcuMywwLjEsMTEuNSwwLjFzNy40LDAsOC45LTAuMWM1LjgtMC4yLDEwLjQtNC43LDEwLjgtMTAuNSAgICBjMC4yLTMuMy0wLjktNi40LTIuOS04LjZjLTIuMS0yLjItNS4xLTMuNS04LjUtMy42Yy00LTAuMS00LjYsMC02LjEsMGMtMC45LDAtMi4xLDAtNC42LDBDMjEuMiwwLjYsMTguOCwwLjYsMTYuMiwwLjZ6ICAgICBNMjMuNiwxOS40Yy00LjEsMC04LjQsMC0xMS40LTAuMWMtMi4zLDAtNC4yLTAuOC01LjYtMi4zYy0xLjMtMS40LTItMy40LTEuOS01LjdDNSw3LjcsNy45LDQuOCwxMS42LDQuN2MxLDAsMi41LDAsNC41LDAgICAgYzIuNiwwLDUsMCw1LDBjMi41LDAsMy43LDAsNC42LDBjMC42LDAsMSwwLDEuNSwwYzAuOSwwLDIuMiwwLDQuNSwwczQuMiwwLjgsNS42LDIuM2MxLjMsMS40LDIsMy40LDEuOSw1LjcgICAgYy0wLjIsMy43LTMuMiw2LjYtNi45LDYuN0MzMC45LDE5LjQsMjcuNywxOS40LDIzLjYsMTkuNHogTTE2LjIsNS4yYy0yLDAtMy41LDAtNC41LDBDOC4zLDUuMyw1LjUsOCw1LjQsMTEuNCAgICBjLTAuMSwyLjEsMC41LDMuOSwxLjcsNS4yczMsMi4xLDUuMiwyLjFjMywwLDcuMywwLjEsMTEuNCwwLjFzNy4zLDAsOC43LTAuMWMzLjQtMC4xLDYuMS0yLjgsNi4zLTYuMmMwLjEtMi4xLTAuNS0zLjktMS43LTUuMiAgICBzLTMtMi4xLTUuMi0yLjFjLTIuMywwLTMuNiwwLTQuNSwwYy0wLjUsMC0wLjksMC0xLjQsMGMtMC45LDAtMi4yLDAtNC42LDBDMjEuMSw1LjIsMTguNyw1LjIsMTYuMiw1LjJ6Ii8+PC9nPjwvZz48Zz48cGF0aCBkaXNwbGF5PSJub25lIiBkPSJNMzIuNSwyMy42YzYtMC4yLDEwLjctNC45LDExLTEwLjhjMC40LTctNC42LTEyLjQtMTEuNy0xMi41Yy02LjQtMC4xLTQuMiwwLTEwLjYsMGMwLDAtNi41LTAuMS05LjcsMCAgIGMtNiwwLjItMTAuNyw0LjktMTEsMTAuOGMtMC40LDcsNC42LDEyLjQsMTEuNywxMi41QzE4LjYsMjMuNywyOS4zLDIzLjcsMzIuNSwyMy42eiIvPjxjaXJjbGUgZmlsbD0iI0ZGRkZGRiIgY3g9IjEyLjUiIGN5PSIxMiIgcj0iMi4zIi8+PGNpcmNsZSBmaWxsPSIjRkZGRkZGIiBjeD0iMzEuNiIgY3k9IjEyIiByPSIyLjMiLz48cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMTYuMiw0LjljMi42LDAsNSwwLDUsMGwwLDBsMCwwYzIuNSwwLDMuNywwLDQuNiwwYzAuNSwwLDAuOSwwLDEuNSwwYzAuOSwwLDIuMiwwLDQuNSwwICAgYzIuMiwwLDQuMSwwLjgsNS40LDIuMnMxLjksMy4zLDEuOCw1LjVjLTAuMiwzLjYtMyw2LjMtNi42LDYuNGMtMS40LDAtNC43LDAuMS04LjcsMC4xYy00LjEsMC04LjMsMC0xMS40LTAuMSAgIGMtMi4yLDAtNC4xLTAuOC01LjQtMi4yYy0xLjMtMS40LTEuOS0zLjMtMS44LTUuNWMwLjItMy42LDMtNi4zLDYuNi02LjRDMTIuNyw0LjksMTQuMiw0LjksMTYuMiw0LjkgTTE2LjIsMC4zYy0xLjcsMC0zLjQsMC00LjYsMCAgIGMtNiwwLjItMTAuNyw0LjktMTEsMTAuOGMtMC40LDcsNC42LDEyLjQsMTEuNywxMi41YzMuMiwwLDcuNiwwLjEsMTEuNSwwLjFzNy4zLDAsOC45LTAuMWM2LTAuMiwxMC43LTQuOSwxMS0xMC44ICAgYzAuNC03LTQuNi0xMi40LTExLjctMTIuNWMtMi41LDAtMy43LDAtNC42LDBjLTEuNCwwLTIuMSwwLTYuMSwwQzIxLjIsMC4zLDE4LjgsMC4zLDE2LjIsMC4zTDE2LjIsMC4zeiIvPjwvZz48L3N2Zz48L3N2Zz4=",
  "assets/media/microbit/sensing_pressa.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSIzMnB4IiBoZWlnaHQ9IjMycHgiIHZpZXdCb3g9IjAgMCAzMiAzMiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMzIgMzI7IiB4bWw6c3BhY2U9InByZXNlcnZlIj48c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiNGRkZGRkY7fQo8L3N0eWxlPjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zMiwzMi41SDAuMkwzMiwwLjVWMzIuNXogTTI2LjYsMjkuM2gxLjdsLTMuOC0xMC45aC0xLjNsLTMuOCwxMC45SDIxbDAuOC0yLjRoNEwyNi42LDI5LjN6IE0yMi4zLDI1LjQgIGwxLjUtNC44bDAsMGwxLjUsNC44QzI1LjMsMjUuNCwyMi4zLDI1LjQsMjIuMywyNS40eiIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_when-broadcast-received_purple.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBpZD0iSWNvbiIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+TGV0dGVyR2V0X1B1cnBsZTwvdGl0bGU+PHBhdGggZD0iTTM0LDM2SDUuODdhMiwyLDAsMCwxLTItMkw0LDE3YTIsMiwwLDAsMSwuOC0xLjU5TDE4LjgsNC45YTIsMiwwLDAsMSwyLjQsMGwxNCwxMC41QTIsMiwwLDAsMSwzNiwxN1YzNEEyLDIsMCwwLDEsMzQsMzZaIiBmaWxsPSIjOTZmIiBzdHJva2U9IiM3NzRkY2IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyMCIgcng9IjIiIHJ5PSIyIiBmaWxsPSIjZjlmOGZmIiBzdHJva2U9IiM3NzRkY2IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxnIG9wYWNpdHk9IjAuMSI+PHBhdGggZD0iTTM2LjUsMTd2MWEwLjUsMC41LDAsMCwxLS4yMy40MkwyMS4zMywyNy43NmEyLjQ3LDIuNDcsMCwwLDEtMS4zMy4zOCwyLjUxLDIuNTEsMCwwLDEtMS4zMi0uMzdsLTE1LTkuMzVBMC41LDAuNSwwLDAsMSwzLjUsMThWMTYuNzZBMi40OCwyLjQ4LDAsMCwxLDQuNSwxNWwwLjY2LS41YTAuNSwwLjUsMCwwLDEsLjU2LDBMMTcsMjEuNTVsMS40Ny0xLjA2YTIuNDksMi40OSwwLDAsMSwzLDBMMjMsMjEuNTZsMTEuMzMtNy4wN2EwLjUsMC41LDAsMCwxLC41NiwwTDM1LjUsMTVBMi41MiwyLjUyLDAsMCwxLDM2LjUsMTdaIiBmaWxsPSIjMjMxZjIwIi8+PC9nPjxwYXRoIGQ9Ik0zNiwxOEwyMS4wNiwyNy4zNGEyLDIsMCwwLDEtMi4xMiwwTDQsMThWMzRhMiwyLDAsMCwwLDIsMkgzNGEyLDIsMCwwLDAsMi0yVjE4WiIgZmlsbD0iIzk2ZiIgc3Ryb2tlPSIjNzc0ZGNiIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNNC44NiwzNUwxOC44LDI0Ljg5YTIsMiwwLDAsMSwyLjM5LDBMMzUsMzUiIGZpbGw9IiM5NmYiIHN0cm9rZT0iIzc3NGRjYiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGxpbmUgeDE9IjExLjgyIiB5MT0iNC4xNCIgeDI9IjEwLjE1IiB5Mj0iMC45NyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjUuMzEiIHkxPSIxMS4wNCIgeDI9IjIuMDUiIHkyPSI4LjU5IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48bGluZSB4MT0iMjguMTciIHkxPSI0LjE0IiB4Mj0iMjkuODQiIHkyPSIwLjk3IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48bGluZSB4MT0iMzQuNjkiIHkxPSIxMS4wNCIgeDI9IjM3Ljk0IiB5Mj0iOC41OSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PC9zdmc+PC9zdmc+",
  "assets/media/microbit/event_when-broadcast-received_yellow.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5MZXR0ZXJHZXRfT3JhbmdlPC90aXRsZT48cGF0aCBmaWxsPSIjRkZFQTI3IiBzdHJva2U9IiNDQ0FBMUIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTM0LDM2SDUuOWMtMS4xLDAtMi0wLjktMi0yTDQsMTcgIGMwLTAuNiwwLjMtMS4yLDAuOC0xLjZsMTQtMTAuNWMwLjctMC41LDEuNy0wLjUsMi40LDBsMTQsMTAuNWMwLjUsMC40LDAuOCwxLDAuOCwxLjZ2MTdDMzYsMzUuMSwzNS4xLDM2LDM0LDM2eiIvPjxwYXRoIGZpbGw9IiNGOUY4RkYiIHN0cm9rZT0iI0NDQUExQiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMTAsOGgyMGMxLjEsMCwyLDAuOSwyLDJ2MTYgIGMwLDEuMS0wLjksMi0yLDJIMTBjLTEuMSwwLTItMC45LTItMlYxMEM4LDguOSw4LjksOCwxMCw4eiIvPjxnIG9wYWNpdHk9IjAuMSI+PHBhdGggZmlsbD0iIzIzMUYyMCIgZD0iTTM2LjUsMTd2MWMwLDAuMi0wLjEsMC4zLTAuMiwwLjRsLTE0LjksOS4zYy0wLjQsMC4zLTAuOSwwLjQtMS4zLDAuNGMtMC41LDAtMC45LTAuMS0xLjMtMC40bC0xNS05LjQgICBjLTAuMS0wLjEtMC4yLTAuMy0wLjItMC40di0xLjJjMC4xLTAuNywwLjQtMS4zLDEtMS44bDAuNy0wLjVjMC4yLTAuMSwwLjQtMC4xLDAuNiwwbDExLjMsN2wxLjUtMS4xYzAuOS0wLjcsMi4xLTAuNywzLDBsMS41LDEuMSAgIGwxMS4zLTcuMWMwLjItMC4xLDAuNC0wLjEsMC42LDBsMC42LDAuNUMzNi4xLDE1LjUsMzYuNSwxNi4yLDM2LjUsMTd6Ii8+PC9nPjxwYXRoIGZpbGw9IiNGRkVBMjQiIHN0cm9rZT0iI0NDQUExRCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzYsMThsLTE0LjksOS4zYy0wLjYsMC40LTEuNSwwLjQtMi4xLDAgIEw0LDE4djE2YzAsMS4xLDAuOSwyLDIsMmgyOGMxLjEsMCwyLTAuOSwyLTJWMTh6Ii8+PHBhdGggZmlsbD0iI0ZGRUEyNCIgc3Ryb2tlPSIjQ0NBQTFCIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00LjksMzVsMTMuOS0xMC4xYzAuNy0wLjUsMS43LTAuNSwyLjQsMCAgTDM1LDM1Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMTEuOCIgeTE9IjQuMSIgeDI9IjEwLjEiIHkyPSIxIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNS4zIiB5MT0iMTEiIHgyPSIyIiB5Mj0iOC42Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMjguMiIgeTE9IjQuMSIgeDI9IjI5LjgiIHkyPSIxIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMzQuNyIgeTE9IjExIiB4Mj0iMzcuOSIgeTI9IjguNiIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_when-broadcast-received_orange.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5MZXR0ZXJHZXRfT3JhbmdlPC90aXRsZT48cGF0aCBmaWxsPSIjRkY4NjIyIiBzdHJva2U9IiNDRTZCMTkiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTM0LDM2SDUuOWMtMS4xLDAtMi0wLjktMi0yTDQsMTcgIGMwLTAuNiwwLjMtMS4yLDAuOC0xLjZsMTQtMTAuNWMwLjctMC41LDEuNy0wLjUsMi40LDBsMTQsMTAuNWMwLjUsMC40LDAuOCwxLDAuOCwxLjZ2MTdDMzYsMzUuMSwzNS4xLDM2LDM0LDM2eiIvPjxwYXRoIGZpbGw9IiNGOUY4RkYiIHN0cm9rZT0iI0NFNkIxOSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMTAsOGgyMGMxLjEsMCwyLDAuOSwyLDJ2MTYgIGMwLDEuMS0wLjksMi0yLDJIMTBjLTEuMSwwLTItMC45LTItMlYxMEM4LDguOSw4LjksOCwxMCw4eiIvPjxnIG9wYWNpdHk9IjAuMSI+PHBhdGggZmlsbD0iIzIzMUYyMCIgZD0iTTM2LjUsMTd2MWMwLDAuMi0wLjEsMC4zLTAuMiwwLjRsLTE0LjksOS4zYy0wLjQsMC4zLTAuOSwwLjQtMS4zLDAuNGMtMC41LDAtMC45LTAuMS0xLjMtMC40bC0xNS05LjQgICBjLTAuMS0wLjEtMC4yLTAuMy0wLjItMC40di0xLjJjMC4xLTAuNywwLjQtMS4zLDEtMS44bDAuNy0wLjVjMC4yLTAuMSwwLjQtMC4xLDAuNiwwbDExLjMsN2wxLjUtMS4xYzAuOS0wLjcsMi4xLTAuNywzLDBsMS41LDEuMSAgIGwxMS4zLTcuMWMwLjItMC4xLDAuNC0wLjEsMC42LDBsMC42LDAuNUMzNi4xLDE1LjUsMzYuNSwxNi4yLDM2LjUsMTd6Ii8+PC9nPjxwYXRoIGZpbGw9IiNGRjg0MUYiIHN0cm9rZT0iI0NDNkIxQiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzYsMThsLTE0LjksOS4zYy0wLjYsMC40LTEuNSwwLjQtMi4xLDAgIEw0LDE4djE2YzAsMS4xLDAuOSwyLDIsMmgyOGMxLjEsMCwyLTAuOSwyLTJWMTh6Ii8+PHBhdGggZmlsbD0iI0ZGODQxRiIgc3Ryb2tlPSIjQ0U2QjE5IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00LjksMzVsMTMuOS0xMC4xYzAuNy0wLjUsMS43LTAuNSwyLjQsMCAgTDM1LDM1Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMTEuOCIgeTE9IjQuMSIgeDI9IjEwLjEiIHkyPSIxIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNS4zIiB5MT0iMTEiIHgyPSIyIiB5Mj0iOC42Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMjguMiIgeTE9IjQuMSIgeDI9IjI5LjgiIHkyPSIxIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMzQuNyIgeTE9IjExIiB4Mj0iMzcuOSIgeTI9IjguNiIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_when-broadcast-received_white.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5MZXR0ZXJHZXRfT3JhbmdlPC90aXRsZT48cGF0aCBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNGMkIyMjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTM0LDM2SDUuOWMtMS4xLDAtMi0wLjktMi0yTDQsMTcgIGMwLTAuNiwwLjMtMS4yLDAuOC0xLjZsMTQtMTAuNWMwLjctMC41LDEuNy0wLjUsMi40LDBsMTQsMTAuNWMwLjUsMC40LDAuOCwxLDAuOCwxLjZ2MTdDMzYsMzUuMSwzNS4xLDM2LDM0LDM2eiIvPjxwYXRoIGZpbGw9IiNGOUY4RkYiIHN0cm9rZT0iI0NGOEIxNyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMTAsOGgyMGMxLjEsMCwyLDAuOSwyLDJ2MTYgIGMwLDEuMS0wLjksMi0yLDJIMTBjLTEuMSwwLTItMC45LTItMlYxMEM4LDguOSw4LjksOCwxMCw4eiIvPjxnIG9wYWNpdHk9IjAuMSI+PHBhdGggZmlsbD0iIzIzMUYyMCIgZD0iTTM2LjUsMTd2MWMwLDAuMi0wLjEsMC4zLTAuMiwwLjRsLTE0LjksOS4zYy0wLjQsMC4zLTAuOSwwLjQtMS4zLDAuNGMtMC41LDAtMC45LTAuMS0xLjMtMC40bC0xNS05LjQgICBjLTAuMS0wLjEtMC4yLTAuMy0wLjItMC40di0xLjJjMC4xLTAuNywwLjQtMS4zLDEtMS44bDAuNy0wLjVjMC4yLTAuMSwwLjQtMC4xLDAuNiwwbDExLjMsN2wxLjUtMS4xYzAuOS0wLjcsMi4xLTAuNywzLDBsMS41LDEuMSAgIGwxMS4zLTcuMWMwLjItMC4xLDAuNC0wLjEsMC42LDBsMC42LDAuNUMzNi4xLDE1LjUsMzYuNSwxNi4yLDM2LjUsMTd6Ii8+PC9nPjxwYXRoIGZpbGw9IiNGRkZGRkYiIHN0cm9rZT0iI0YyQjIyNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzYsMThsLTE0LjksOS4zYy0wLjYsMC40LTEuNSwwLjQtMi4xLDAgIEw0LDE4djE2YzAsMS4xLDAuOSwyLDIsMmgyOGMxLjEsMCwyLTAuOSwyLTJWMTh6Ii8+PHBhdGggZmlsbD0iI0ZGRkZGRiIgc3Ryb2tlPSIjRjJCMjI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00LjksMzVsMTMuOS0xMC4xYzAuNy0wLjUsMS43LTAuNSwyLjQsMCAgTDM1LDM1Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMTEuOCIgeTE9IjQuMSIgeDI9IjEwLjEiIHkyPSIxIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNS4zIiB5MT0iMTEiIHgyPSIyIiB5Mj0iOC42Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMjguMiIgeTE9IjQuMSIgeDI9IjI5LjgiIHkyPSIxIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMzQuNyIgeTE9IjExIiB4Mj0iMzcuOSIgeTI9IjguNiIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_when-broadcast-received_magenta.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBpZD0iSWNvbiIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+TGV0dGVyR2V0X01hZ2VudGE8L3RpdGxlPjxwYXRoIGQ9Ik0zNCwzNkg1Ljg3YTIsMiwwLDAsMS0yLTJMNCwxN2EyLDIsMCwwLDEsLjgtMS41OUwxOC44LDQuOWEyLDIsMCwwLDEsMi40LDBsMTQsMTAuNUEyLDIsMCwwLDEsMzYsMTdWMzRBMiwyLDAsMCwxLDM0LDM2WiIgZmlsbD0iI2Q2NWNkNiIgc3Ryb2tlPSIjYTYzZmE2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjAiIHJ4PSIyIiByeT0iMiIgZmlsbD0iI2Y5ZjhmZiIgc3Ryb2tlPSIjYTYzZmE2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48ZyBvcGFjaXR5PSIwLjEiPjxwYXRoIGQ9Ik0zNi41LDE3djFhMC41LDAuNSwwLDAsMS0uMjMuNDJMMjEuMzMsMjcuNzZhMi40NywyLjQ3LDAsMCwxLTEuMzMuMzgsMi41MSwyLjUxLDAsMCwxLTEuMzItLjM3bC0xNS05LjM1QTAuNSwwLjUsMCwwLDEsMy41LDE4VjE2Ljc2QTIuNDgsMi40OCwwLDAsMSw0LjUsMTVsMC42Ni0uNWEwLjUsMC41LDAsMCwxLC41NiwwTDE3LDIxLjU1bDEuNDctMS4wNmEyLjQ5LDIuNDksMCwwLDEsMywwTDIzLDIxLjU2bDExLjMzLTcuMDdhMC41LDAuNSwwLDAsMSwuNTYsMEwzNS41LDE1QTIuNTIsMi41MiwwLDAsMSwzNi41LDE3WiIgZmlsbD0iIzIzMWYyMCIvPjwvZz48cGF0aCBkPSJNMzYsMThMMjEuMDYsMjcuMzRhMiwyLDAsMCwxLTIuMTIsMEw0LDE4VjM0YTIsMiwwLDAsMCwyLDJIMzRhMiwyLDAsMCwwLDItMlYxOFoiIGZpbGw9IiNkNjVjZDYiIHN0cm9rZT0iI2E2M2ZhNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTQuODYsMzVMMTguOCwyNC44OWEyLDIsMCwwLDEsMi4zOSwwTDM1LDM1IiBmaWxsPSIjZDY1Y2Q2IiBzdHJva2U9IiNhNjNmYTYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxsaW5lIHgxPSIxMS44MiIgeTE9IjQuMTQiIHgyPSIxMC4xNSIgeTI9IjAuOTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSI1LjMxIiB5MT0iMTEuMDQiIHgyPSIyLjA1IiB5Mj0iOC41OSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjI4LjE3IiB5MT0iNC4xNCIgeDI9IjI5Ljg0IiB5Mj0iMC45NyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjM0LjY5IiB5MT0iMTEuMDQiIHgyPSIzNy45NCIgeTI9IjguNTkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_when-broadcast-received_green.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBpZD0iSWNvbiIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+TGV0dGVyR2V0X0dyZWVuPC90aXRsZT48cGF0aCBkPSJNMzQsMzZINS44N2EyLDIsMCwwLDEtMi0yTDQsMTdhMiwyLDAsMCwxLC44LTEuNTlMMTguOCw0LjlhMiwyLDAsMCwxLDIuNCwwbDE0LDEwLjVBMiwyLDAsMCwxLDM2LDE3VjM0QTIsMiwwLDAsMSwzNCwzNloiIGZpbGw9IiM0Y2JmNTYiIHN0cm9rZT0iIzQ1OTkzZCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHJlY3QgeD0iOCIgeT0iOCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjIwIiByeD0iMiIgcnk9IjIiIGZpbGw9IiNmOWY4ZmYiIHN0cm9rZT0iIzQ1OTkzZCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGcgb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYuNSwxN3YxYTAuNSwwLjUsMCwwLDEtLjIzLjQyTDIxLjMzLDI3Ljc2YTIuNDcsMi40NywwLDAsMS0xLjMzLjM4LDIuNTEsMi41MSwwLDAsMS0xLjMyLS4zN2wtMTUtOS4zNUEwLjUsMC41LDAsMCwxLDMuNSwxOFYxNi43NkEyLjQ4LDIuNDgsMCwwLDEsNC41LDE1bDAuNjYtLjVhMC41LDAuNSwwLDAsMSwuNTYsMEwxNywyMS41NWwxLjQ3LTEuMDZhMi40OSwyLjQ5LDAsMCwxLDMsMEwyMywyMS41NmwxMS4zMy03LjA3YTAuNSwwLjUsMCwwLDEsLjU2LDBMMzUuNSwxNUEyLjUyLDIuNTIsMCwwLDEsMzYuNSwxN1oiIGZpbGw9IiMyMzFmMjAiLz48L2c+PHBhdGggZD0iTTM2LDE4TDIxLjA2LDI3LjM0YTIsMiwwLDAsMS0yLjEyLDBMNCwxOFYzNGEyLDIsMCwwLDAsMiwySDM0YTIsMiwwLDAsMCwyLTJWMThaIiBmaWxsPSIjNGNiZjU2IiBzdHJva2U9IiM0NTk5M2QiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik00Ljg2LDM1TDE4LjgsMjQuODlhMiwyLDAsMCwxLDIuMzksMEwzNSwzNSIgZmlsbD0iIzRjYmY1NiIgc3Ryb2tlPSIjNDU5OTNkIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48bGluZSB4MT0iMTEuODIiIHkxPSI0LjE0IiB4Mj0iMTAuMTUiIHkyPSIwLjk3IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48bGluZSB4MT0iNS4zMSIgeTE9IjExLjA0IiB4Mj0iMi4wNSIgeTI9IjguNTkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSIyOC4xNyIgeTE9IjQuMTQiIHgyPSIyOS44NCIgeTI9IjAuOTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSIzNC42OSIgeTE9IjExLjA0IiB4Mj0iMzcuOTQiIHkyPSI4LjU5IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48L3N2Zz48L3N2Zz4=",
  "assets/media/microbit/event_when-broadcast-received_cyan.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5MZXR0ZXJHZXRfT3JhbmdlPC90aXRsZT48cGF0aCBmaWxsPSIjNzBFM0YyIiBzdHJva2U9IiMxREI3Q0MiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTM0LDM2SDUuOWMtMS4xLDAtMi0wLjktMi0yTDQsMTcgIGMwLTAuNiwwLjMtMS4yLDAuOC0xLjZsMTQtMTAuNWMwLjctMC41LDEuNy0wLjUsMi40LDBsMTQsMTAuNWMwLjUsMC40LDAuOCwxLDAuOCwxLjZ2MTdDMzYsMzUuMSwzNS4xLDM2LDM0LDM2eiIvPjxwYXRoIGZpbGw9IiNGOUY4RkYiIHN0cm9rZT0iIzFEQjdDQyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMTAsOGgyMGMxLjEsMCwyLDAuOSwyLDJ2MTYgIGMwLDEuMS0wLjksMi0yLDJIMTBjLTEuMSwwLTItMC45LTItMlYxMEM4LDguOSw4LjksOCwxMCw4eiIvPjxnIG9wYWNpdHk9IjAuMSI+PHBhdGggZmlsbD0iIzIzMUYyMCIgZD0iTTM2LjUsMTd2MWMwLDAuMi0wLjEsMC4zLTAuMiwwLjRsLTE0LjksOS4zYy0wLjQsMC4zLTAuOSwwLjQtMS4zLDAuNGMtMC41LDAtMC45LTAuMS0xLjMtMC40bC0xNS05LjQgICBjLTAuMS0wLjEtMC4yLTAuMy0wLjItMC40di0xLjJjMC4xLTAuNywwLjQtMS4zLDEtMS44bDAuNy0wLjVjMC4yLTAuMSwwLjQtMC4xLDAuNiwwbDExLjMsN2wxLjUtMS4xYzAuOS0wLjcsMi4xLTAuNywzLDBsMS41LDEuMSAgIGwxMS4zLTcuMWMwLjItMC4xLDAuNC0wLjEsMC42LDBsMC42LDAuNUMzNi4xLDE1LjUsMzYuNSwxNi4yLDM2LjUsMTd6Ii8+PC9nPjxwYXRoIGZpbGw9IiM3MEUzRjIiIHN0cm9rZT0iIzFEQjdDQyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzYsMThsLTE0LjksOS4zYy0wLjYsMC40LTEuNSwwLjQtMi4xLDAgIEw0LDE4djE2YzAsMS4xLDAuOSwyLDIsMmgyOGMxLjEsMCwyLTAuOSwyLTJWMTh6Ii8+PHBhdGggZmlsbD0iIzcwRTNGMiIgc3Ryb2tlPSIjMURCN0NDIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00LjksMzVsMTMuOS0xMC4xYzAuNy0wLjUsMS43LTAuNSwyLjQsMCAgTDM1LDM1Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMTEuOCIgeTE9IjQuMSIgeDI9IjEwLjEiIHkyPSIxIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNS4zIiB5MT0iMTEiIHgyPSIyIiB5Mj0iOC42Ii8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMjguMiIgeTE9IjQuMSIgeDI9IjI5LjgiIHkyPSIxIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iMzQuNyIgeTE9IjExIiB4Mj0iMzcuOSIgeTI9IjguNiIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_play.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMjQgMjQiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxnPjxwYXRoIGZpbGw9IiNCNEI0QjUiIGQ9Ik00LjIsMTkuNGMwLDIuNiwyLjYsMi41LDMuNSwxLjlMMTkuOSwxNGMwLjUtMC4zLDAuOS0wLjksMC45LTEuNmMwLTAuNi0wLjQtMS4zLTAuOS0xLjZMNy44LDMuNCAgIGMtMS0wLjYtMy41LTEtMy41LDEuOUM0LjIsNS4yLDQuMiwxOS40LDQuMiwxOS40eiIvPjxwYXRoIGZpbGw9IiNGRkZGRkYiIHN0cm9rZT0iI0I0QjRCNSIgc3Ryb2tlLXdpZHRoPSIwLjUiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLW9wYWNpdHk9IjAuNzUiIGQ9Ik00LjIsMTguOSAgIGMwLDIuNiwyLjYsMi41LDMuNSwxLjlsMTIuMS03LjJjMC41LTAuMywwLjktMC45LDAuOS0xLjZjMC0wLjYtMC40LTEuMy0wLjktMS42bC0xMi03LjZjLTEtMC42LTMuNS0xLTMuNSwxLjkgICBDNC4yLDQuNyw0LjIsMTguOSw0LjIsMTguOXoiLz48L2c+PC9zdmc+PC9zdmc+",
  "assets/media/microbit/event_when-broadcast-received_blue.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBpZD0iSWNvbiIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+TGV0dGVyR2V0X0JsdWU8L3RpdGxlPjxwYXRoIGQ9Ik0zNCwzNkg1Ljg3YTIsMiwwLDAsMS0yLTJMNCwxN2EyLDIsMCwwLDEsLjgtMS41OUwxOC44LDQuOWEyLDIsMCwwLDEsMi40LDBsMTQsMTAuNUEyLDIsMCwwLDEsMzYsMTdWMzRBMiwyLDAsMCwxLDM0LDM2WiIgZmlsbD0iIzRjOTdmZiIgc3Ryb2tlPSIjM2Q3OWNjIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjAiIHJ4PSIyIiByeT0iMiIgZmlsbD0iI2Y5ZjhmZiIgc3Ryb2tlPSIjM2Q3OWNjIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48ZyBvcGFjaXR5PSIwLjEiPjxwYXRoIGQ9Ik0zNi41LDE3djFhMC41LDAuNSwwLDAsMS0uMjMuNDJMMjEuMzMsMjcuNzZhMi40NywyLjQ3LDAsMCwxLTEuMzMuMzgsMi41MSwyLjUxLDAsMCwxLTEuMzItLjM3bC0xNS05LjM1QTAuNSwwLjUsMCwwLDEsMy41LDE4VjE2Ljc2QTIuNDgsMi40OCwwLDAsMSw0LjUsMTVsMC42Ni0uNWEwLjUsMC41LDAsMCwxLC41NiwwTDE3LDIxLjU1bDEuNDctMS4wNmEyLjQ5LDIuNDksMCwwLDEsMywwTDIzLDIxLjU2bDExLjMzLTcuMDdhMC41LDAuNSwwLDAsMSwuNTYsMEwzNS41LDE1QTIuNTIsMi41MiwwLDAsMSwzNi41LDE3WiIgZmlsbD0iIzIzMWYyMCIvPjwvZz48cGF0aCBkPSJNMzYsMThMMjEuMDYsMjcuMzRhMiwyLDAsMCwxLTIuMTIsMEw0LDE4VjM0YTIsMiwwLDAsMCwyLDJIMzRhMiwyLDAsMCwwLDItMlYxOFoiIGZpbGw9IiM0Yzk3ZmYiIHN0cm9rZT0iIzNkNzljYyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTQuODYsMzVMMTguOCwyNC44OWEyLDIsMCwwLDEsMi4zOSwwTDM1LDM1IiBmaWxsPSIjNGM5N2ZmIiBzdHJva2U9IiMzZDc5Y2MiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxsaW5lIHgxPSIxMS44MiIgeTE9IjQuMTQiIHgyPSIxMC4xNSIgeTI9IjAuOTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSI1LjMxIiB5MT0iMTEuMDQiIHgyPSIyLjA1IiB5Mj0iOC41OSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjI4LjE3IiB5MT0iNC4xNCIgeDI9IjI5Ljg0IiB5Mj0iMC45NyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjM0LjY5IiB5MT0iMTEuMDQiIHgyPSIzNy45NCIgeTI9IjguNTkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_onrecc.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0NHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCA0NCAyNCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDQgMjQiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxnPjxnPjxjaXJjbGUgZmlsbD0iI0ZGRkZGRiIgY3g9IjEyLjUiIGN5PSIxMiIgcj0iMi4zIi8+PHBhdGggZmlsbD0iI0NFOEMyQSIgZD0iTTEyLjUsMTQuNmMtMS40LDAtMi42LTEuMi0yLjYtMi42YzAtMS40LDEuMi0yLjYsMi42LTIuNnMyLjYsMS4yLDIuNiwyLjZDMTUuMSwxMy40LDE0LDE0LjYsMTIuNSwxNC42eiAgICAgTTEyLjUsMTBjLTEuMSwwLTIsMC45LTIsMmMwLDEuMSwwLjksMiwyLDJzMi0wLjksMi0yQzE0LjUsMTAuOSwxMy42LDEwLDEyLjUsMTB6Ii8+PC9nPjxnPjxjaXJjbGUgZmlsbD0iI0ZGRkZGRiIgY3g9IjMxLjYiIGN5PSIxMiIgcj0iMi4zIi8+PHBhdGggZmlsbD0iI0NFOEMyQSIgZD0iTTMxLjYsMTQuNmMtMS40LDAtMi42LTEuMi0yLjYtMi42YzAtMS40LDEuMi0yLjYsMi42LTIuNmMxLjQsMCwyLjYsMS4yLDIuNiwyLjYgICAgQzM0LjIsMTMuNCwzMywxNC42LDMxLjYsMTQuNnogTTMxLjYsMTBjLTEuMSwwLTIsMC45LTIsMmMwLDEuMSwwLjksMiwyLDJjMS4xLDAsMi0wLjksMi0yQzMzLjYsMTAuOSwzMi43LDEwLDMxLjYsMTB6Ii8+PC9nPjxnPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0xNi4yLDQuOWMyLjYsMCw1LDAsNSwwbDAsMGgwYzIuNSwwLDMuNywwLDQuNiwwYzAuNSwwLDAuOSwwLDEuNSwwYzAuOSwwLDIuMiwwLDQuNSwwICAgIGMyLjIsMCw0LjEsMC44LDUuNCwyLjJjMS4zLDEuNCwxLjksMy4zLDEuOCw1LjVjLTAuMiwzLjYtMyw2LjMtNi42LDYuNGMtMS40LDAtNC43LDAuMS04LjcsMC4xYy00LjEsMC04LjMsMC0xMS40LTAuMSAgICBjLTIuMiwwLTQuMS0wLjgtNS40LTIuMmMtMS4zLTEuNC0xLjktMy4zLTEuOC01LjVjMC4yLTMuNiwzLTYuMyw2LjYtNi40QzEyLjcsNC45LDE0LjIsNC45LDE2LjIsNC45IE0xNi4yLDAuMyAgICBjLTEuNywwLTMuNCwwLTQuNiwwYy02LDAuMi0xMC43LDQuOS0xMSwxMC44Yy0wLjQsNyw0LjYsMTIuNCwxMS43LDEyLjVjMy4yLDAsNy42LDAuMSwxMS41LDAuMWMzLjksMCw3LjMsMCw4LjktMC4xICAgIGM2LTAuMiwxMC43LTQuOSwxMS0xMC44YzAuNC03LTQuNi0xMi40LTExLjctMTIuNWMtMi41LDAtMy43LDAtNC42LDBjLTEuNCwwLTIuMSwwLTYuMSwwQzIxLjIsMC4zLDE4LjgsMC4zLDE2LjIsMC4zTDE2LjIsMC4zeiIvPjxwYXRoIGZpbGw9IiNDRThDMkEiIGQ9Ik0yMy42LDI0Yy00LjEsMC04LjQsMC0xMS41LTAuMWMtMy41LDAtNi43LTEuNC04LjktMy43Yy0yLjItMi40LTMuMy01LjYtMy4xLTkuMUMwLjUsNSw1LjQsMC4yLDExLjUsMCAgICBjMS4xLDAsMi42LDAsNC43LDBjMi42LDAsNSwwLDUsMGMyLjUsMCwzLjYsMCw0LjUsMGMxLjUsMCwyLjEsMCw2LjEsMGMzLjUsMCw2LjcsMS40LDguOSwzLjdjMi4yLDIuNCwzLjMsNS42LDMuMSw5LjEgICAgYy0wLjMsNi4xLTUuMiwxMC45LTExLjMsMTEuMUMzMSwyNCwyNy44LDI0LDIzLjYsMjR6IE0xNi4yLDAuNmMtMiwwLTMuNiwwLTQuNiwwQzUuNywwLjgsMS4xLDUuMywwLjcsMTEuMiAgICBjLTAuMiwzLjMsMC45LDYuNCwyLjksOC42YzIuMSwyLjIsNS4xLDMuNSw4LjUsMy42YzMsMCw3LjMsMC4xLDExLjUsMC4xYzQuMiwwLDcuNCwwLDguOS0wLjFjNS44LTAuMiwxMC40LTQuNywxMC44LTEwLjUgICAgYzAuMi0zLjMtMC45LTYuNC0yLjktOC42Yy0yLjEtMi4yLTUuMS0zLjUtOC41LTMuNmMtNC0wLjEtNC42LDAtNi4xLDBjLTAuOSwwLTIuMSwwLTQuNiwwQzIxLjIsMC42LDE4LjgsMC42LDE2LjIsMC42eiAgICAgTTIzLjYsMTkuNGMtNC4xLDAtOC40LDAtMTEuNC0wLjFjLTIuMywwLTQuMi0wLjgtNS42LTIuM2MtMS4zLTEuNC0yLTMuNC0xLjktNS43QzUsNy43LDcuOSw0LjgsMTEuNiw0LjdjMSwwLDIuNSwwLDQuNSwwICAgIGMyLjYsMCw1LDAsNSwwYzIuNSwwLDMuNywwLDQuNiwwYzAuNiwwLDEsMCwxLjUsMGMwLjksMCwyLjIsMCw0LjUsMGMyLjMsMCw0LjIsMC44LDUuNiwyLjNjMS4zLDEuNCwyLDMuNCwxLjksNS43ICAgIGMtMC4yLDMuNy0zLjIsNi42LTYuOSw2LjdDMzAuOSwxOS40LDI3LjcsMTkuNCwyMy42LDE5LjR6IE0xNi4yLDUuMmMtMiwwLTMuNSwwLTQuNSwwQzguMyw1LjMsNS41LDgsNS40LDExLjQgICAgYy0wLjEsMi4xLDAuNSwzLjksMS43LDUuMmMxLjIsMS4zLDMsMi4xLDUuMiwyLjFjMywwLDcuMywwLjEsMTEuNCwwLjFjNC4xLDAsNy4zLDAsOC43LTAuMWMzLjQtMC4xLDYuMS0yLjgsNi4zLTYuMiAgICBjMC4xLTIuMS0wLjUtMy45LTEuNy01LjJjLTEuMi0xLjMtMy0yLjEtNS4yLTIuMWMtMi4zLDAtMy42LDAtNC41LDBjLTAuNSwwLTAuOSwwLTEuNCwwYy0wLjksMC0yLjIsMC00LjYsMCAgICBDMjEuMSw1LjIsMTguNyw1LjIsMTYuMiw1LjJ6Ii8+PC9nPjwvZz48Zz48cGF0aCBkaXNwbGF5PSJub25lIiBkPSJNMzIuNSwyMy42YzYtMC4yLDEwLjctNC45LDExLTEwLjhjMC40LTctNC42LTEyLjQtMTEuNy0xMi41Yy02LjQtMC4xLTQuMiwwLTEwLjYsMGMwLDAtNi41LTAuMS05LjcsMCAgIGMtNiwwLjItMTAuNyw0LjktMTEsMTAuOGMtMC40LDcsNC42LDEyLjQsMTEuNywxMi41QzE4LjYsMjMuNywyOS4zLDIzLjcsMzIuNSwyMy42eiIvPjxjaXJjbGUgZmlsbD0iI0ZGRkZGRiIgY3g9IjEyLjUiIGN5PSIxMiIgcj0iMi4zIi8+PGNpcmNsZSBmaWxsPSIjRkZGRkZGIiBjeD0iMzEuNiIgY3k9IjEyIiByPSIyLjMiLz48cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMTYuMiw0LjljMi42LDAsNSwwLDUsMGwwLDBoMGMyLjUsMCwzLjcsMCw0LjYsMGMwLjUsMCwwLjksMCwxLjUsMGMwLjksMCwyLjIsMCw0LjUsMCAgIGMyLjIsMCw0LjEsMC44LDUuNCwyLjJjMS4zLDEuNCwxLjksMy4zLDEuOCw1LjVjLTAuMiwzLjYtMyw2LjMtNi42LDYuNGMtMS40LDAtNC43LDAuMS04LjcsMC4xYy00LjEsMC04LjMsMC0xMS40LTAuMSAgIGMtMi4yLDAtNC4xLTAuOC01LjQtMi4yYy0xLjMtMS40LTEuOS0zLjMtMS44LTUuNWMwLjItMy42LDMtNi4zLDYuNi02LjRDMTIuNyw0LjksMTQuMiw0LjksMTYuMiw0LjkgTTE2LjIsMC4zYy0xLjcsMC0zLjQsMC00LjYsMCAgIGMtNiwwLjItMTAuNyw0LjktMTEsMTAuOGMtMC40LDcsNC42LDEyLjQsMTEuNywxMi41YzMuMiwwLDcuNiwwLjEsMTEuNSwwLjFjMy45LDAsNy4zLDAsOC45LTAuMWM2LTAuMiwxMC43LTQuOSwxMS0xMC44ICAgYzAuNC03LTQuNi0xMi40LTExLjctMTIuNWMtMi41LDAtMy43LDAtNC42LDBjLTEuNCwwLTIuMSwwLTYuMSwwQzIxLjIsMC4zLDE4LjgsMC4zLDE2LjIsMC4zTDE2LjIsMC4zeiIvPjwvZz48L3N2Zz48L3N2Zz4=",
  "assets/media/microbit/event_onpressb.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSIzMnB4IiBoZWlnaHQ9IjMycHgiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMzIgMzIiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0wLDBsMzEuOCwwTDAsMzJMMCwweiBNNC45LDE0LjVoNC40YzAuOCwwLDEuNS0wLjMsMi4xLTAuOWMwLjYtMC41LDAuOC0xLjMsMC45LTIuMmMwLTAuNi0wLjEtMS4xLTAuNC0xLjYgIGMtMC4zLTAuNS0wLjctMC44LTEuMy0wLjl2MGMwLjMtMC4xLDAuNi0wLjMsMC44LTAuNWMwLjItMC4yLDAuNC0wLjQsMC41LTAuNkMxMiw3LjQsMTIuMiw3LDEyLjEsNi41YzAtMC45LTAuMy0xLjYtMC44LTIuMSAgQzEwLjgsMy45LDEwLjEsMy42LDksMy42SDQuOVYxNC41eiBNOC44LDUuMWMwLjYsMCwxLDAuMiwxLjMsMC40YzAuMywwLjMsMC40LDAuNywwLjQsMS4xYzAsMC40LTAuMSwwLjgtMC40LDEuMSAgQzkuOCw4LDkuNCw4LjIsOC44LDguMkg2LjVWNS4xSDguOHogTTksOS43YzAuNiwwLDEsMC4yLDEuMywwLjVjMC4zLDAuMywwLjQsMC43LDAuNCwxLjJjMCwwLjQtMC4xLDAuOC0wLjQsMS4xICBDMTAsMTIuOCw5LjYsMTIuOSw5LDEyLjlINi41VjkuN0g5eiIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_onpressa.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSIzMnB4IiBoZWlnaHQ9IjMycHgiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMzIgMzIiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0zMiwzMi41SDAuMkwzMiwwLjVWMzIuNXogTTI2LjYsMjkuM2gxLjdsLTMuOC0xMC45aC0xLjNsLTMuOCwxMC45SDIxbDAuOC0yLjRoNEwyNi42LDI5LjN6IE0yMi4zLDI1LjQgIGwxLjUtNC44aDBsMS41LDQuOEgyMi4zeiIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_broadcast_yellow.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5ldmVudF9icm9hZGNhc3Rfb3JhbmdlPC90aXRsZT48cGF0aCBmaWxsPSIjRkZFQTI3IiBkPSJNMzUuOCwzMC41SDExLjFjLTEsMC0xLjgtMC44LTEuOC0xLjdjMCwwLDAsMCwwLDBsMC4xLTE3LjNjMC0xLDAuOC0xLjcsMS44LTEuN2gyNC41YzEsMCwxLjgsMC44LDEuOCwxLjggIHYxNy4zQzM3LjUsMjkuNywzNi43LDMwLjUsMzUuOCwzMC41eiIvPjxwb2x5bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNDQ0FBMUIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgcG9pbnRzPSIxMC40LDI5LjYgMjMuNSwxOC43IDM2LjYsMjkuNiAiLz48ZyBvcGFjaXR5PSIwLjEiPjxwYXRoIGZpbGw9IiMyMzFGMjAiIGQ9Ik0zNy45LDEyLjhMMjYsMjUuMWMtMS4zLDEuNC0zLjUsMS40LTQuOSwwLjFjMCwwLTAuMS0wLjEtMC4xLTAuMUw5LjEsMTIuOEM5LDEyLjcsOC45LDEyLjQsOSwxMi4zICAgQzkuMSwxMi4xLDkuMywxMiw5LjUsMTJoMjhjMC4yLDAsMC40LDAuMSwwLjUsMC4zQzM4LDEyLjUsMzgsMTIuNywzNy45LDEyLjh6Ii8+PC9nPjxwYXRoIGZpbGw9IiNGRkVBMjQiIHN0cm9rZT0iI0NDQUExQiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzcuNSwxMS41TDI1LjUsMjEuOGMtMS4xLDEtMi44LDEtMy45LDAgIEw5LjUsMTEuNSIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIxMiIgeDI9IjQuNSIgeTI9IjEyIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNyIgeTE9IjIwIiB4Mj0iNC41IiB5Mj0iMjAiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI3IiB5MT0iMjgiIHgyPSI0LjUiIHkyPSIyOCIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIyNCIgeDI9IjEiIHkyPSIyNCIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIxNiIgeDI9IjEiIHkyPSIxNiIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0NDQUExQiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzUuOCwzMC41SDExLjFjLTEsMC0xLjgtMC44LTEuOC0xLjcgIGMwLDAsMCwwLDAsMGwwLjEtMTcuM2MwLTEsMC44LTEuNywxLjgtMS43aDI0LjVjMSwwLDEuOCwwLjgsMS44LDEuOHYxNy4zQzM3LjUsMjkuNywzNi43LDMwLjUsMzUuOCwzMC41eiIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_broadcast_magenta.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBpZD0iSWNvbiIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+ZXZlbnRfYnJvYWRjYXN0X21hZ2VudGE8L3RpdGxlPjxwYXRoIGQ9Ik0zNS43NSwzMC41MkgxMS4xM2ExLjc1LDEuNzUsMCwwLDEtMS43NS0xLjc2bDAuMS0xNy4zYTEuNzUsMS43NSwwLDAsMSwxLjc1LTEuNzRIMzUuNzVhMS43NSwxLjc1LDAsMCwxLDEuNzUsMS43NXYxNy4zQTEuNzUsMS43NSwwLDAsMSwzNS43NSwzMC41MloiIGZpbGw9IiNkNjVjZDYiLz48cG9seWxpbmUgcG9pbnRzPSIxMC4zNiAyOS42NCAyMy41IDE4LjcyIDM2LjYzIDI5LjY0IiBmaWxsPSJub25lIiBzdHJva2U9IiNhNjNmYTYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxnIG9wYWNpdHk9IjAuMSI+PHBhdGggZD0iTTM3Ljg3LDEyLjgxTDI2LDI1LjE0YTMuNDksMy40OSwwLDAsMS01LjA1LDBMOS4xMiwxMi44QTAuNDksMC40OSwwLDAsMSw5LDEyLjI2LDAuNTEsMC41MSwwLDAsMSw5LjQ4LDEyaDI4YTAuNTEsMC41MSwwLDAsMSwuNDYuM0EwLjUzLDAuNTMsMCwwLDEsMzcuODcsMTIuODFaIiBmaWxsPSIjMjMxZjIwIi8+PC9nPjxwYXRoIGQ9Ik0zNy41MSwxMS40N0wyNS40NSwyMS44M2EzLDMsMCwwLDEtMy45MSwwTDkuNDksMTEuNDYiIGZpbGw9IiNkNjVjZDYiIHN0cm9rZT0iI2E2M2ZhNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGxpbmUgeDE9IjciIHkxPSIxMiIgeDI9IjQuNTMiIHkyPSIxMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjciIHkxPSIyMC4wMyIgeDI9IjQuNTMiIHkyPSIyMC4wMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjciIHkxPSIyOCIgeDI9IjQuNTMiIHkyPSIyOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjciIHkxPSIyNCIgeDI9IjEiIHkyPSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PGxpbmUgeDE9IjciIHkxPSIxNiIgeDI9IjEiIHkyPSIxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PHBhdGggZD0iTTM1Ljc1LDMwLjUySDExLjEzYTEuNzUsMS43NSwwLDAsMS0xLjc1LTEuNzZsMC4xLTE3LjNhMS43NSwxLjc1LDAsMCwxLDEuNzUtMS43NEgzNS43NWExLjc1LDEuNzUsMCwwLDEsMS43NSwxLjc1djE3LjNBMS43NSwxLjc1LDAsMCwxLDM1Ljc1LDMwLjUyWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTYzZmE2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz48L3N2Zz4=",
  "assets/media/microbit/event_broadcast_white.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5ldmVudF9icm9hZGNhc3Rfb3JhbmdlPC90aXRsZT48cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMzUuOCwzMC41SDExLjFjLTEsMC0xLjgtMC44LTEuOC0xLjdjMCwwLDAsMCwwLDBsMC4xLTE3LjNjMC0xLDAuOC0xLjcsMS44LTEuN2gyNC41YzEsMCwxLjgsMC44LDEuOCwxLjggIHYxNy4zQzM3LjUsMjkuNywzNi43LDMwLjUsMzUuOCwzMC41eiIvPjxwb2x5bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNDQzlFMUIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgcG9pbnRzPSIxMC40LDI5LjYgMjMuNSwxOC43IDM2LjYsMjkuNiAiLz48ZyBvcGFjaXR5PSIwLjEiPjxwYXRoIGZpbGw9IiMyMzFGMjAiIGQ9Ik0zNy45LDEyLjhMMjYsMjUuMWMtMS4zLDEuNC0zLjUsMS40LTQuOSwwLjFjMCwwLTAuMS0wLjEtMC4xLTAuMUw5LjEsMTIuOEM5LDEyLjcsOC45LDEyLjQsOSwxMi4zICAgQzkuMSwxMi4xLDkuMywxMiw5LjUsMTJoMjhjMC4yLDAsMC40LDAuMSwwLjUsMC4zQzM4LDEyLjUsMzgsMTIuNywzNy45LDEyLjh6Ii8+PC9nPjxwYXRoIGZpbGw9IiNGRkZGRkYiIHN0cm9rZT0iI0NDOUUxQiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzcuNSwxMS41TDI1LjUsMjEuOGMtMS4xLDEtMi44LDEtMy45LDAgIEw5LjUsMTEuNSIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIxMiIgeDI9IjQuNSIgeTI9IjEyIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNyIgeTE9IjIwIiB4Mj0iNC41IiB5Mj0iMjAiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI3IiB5MT0iMjgiIHgyPSI0LjUiIHkyPSIyOCIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIyNCIgeDI9IjEiIHkyPSIyNCIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIxNiIgeDI9IjEiIHkyPSIxNiIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0NDOUUxRCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzUuOCwzMC41SDExLjFjLTEsMC0xLjgtMC44LTEuOC0xLjcgIGMwLDAsMCwwLDAsMGwwLjEtMTcuM2MwLTEsMC44LTEuNywxLjgtMS43aDI0LjVjMSwwLDEuOCwwLjgsMS44LDEuOHYxNy4zQzM3LjUsMjkuNywzNi43LDMwLjUsMzUuOCwzMC41eiIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_broadcast_green.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBpZD0iSWNvbiIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+ZXZlbnRfYnJvYWRjYXN0X2dyZWVuPC90aXRsZT48cGF0aCBkPSJNMzUuNzUsMzAuNTJIMTEuMTNhMS43NSwxLjc1LDAsMCwxLTEuNzUtMS43NmwwLjEtMTcuM2ExLjc1LDEuNzUsMCwwLDEsMS43NS0xLjc0SDM1Ljc1YTEuNzUsMS43NSwwLDAsMSwxLjc1LDEuNzV2MTcuM0ExLjc1LDEuNzUsMCwwLDEsMzUuNzUsMzAuNTJaIiBmaWxsPSIjNGNiZjU2Ii8+PHBvbHlsaW5lIHBvaW50cz0iMTAuMzYgMjkuNjQgMjMuNSAxOC43MiAzNi42MyAyOS42NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDU5OTNkIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48ZyBvcGFjaXR5PSIwLjEiPjxwYXRoIGQ9Ik0zNy44NywxMi44MUwyNiwyNS4xNGEzLjQ5LDMuNDksMCwwLDEtNS4wNSwwTDkuMTIsMTIuOEEwLjQ5LDAuNDksMCwwLDEsOSwxMi4yNiwwLjUxLDAuNTEsMCwwLDEsOS40OCwxMmgyOGEwLjUxLDAuNTEsMCwwLDEsLjQ2LjNBMC41MywwLjUzLDAsMCwxLDM3Ljg3LDEyLjgxWiIgZmlsbD0iIzIzMWYyMCIvPjwvZz48cGF0aCBkPSJNMzcuNTEsMTEuNDdMMjUuNDUsMjEuODNhMywzLDAsMCwxLTMuOTEsMEw5LjQ5LDExLjQ2IiBmaWxsPSIjNGNiZjU2IiBzdHJva2U9IiM0NTk5M2QiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxsaW5lIHgxPSI3IiB5MT0iMTIiIHgyPSI0LjUzIiB5Mj0iMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSI3IiB5MT0iMjAuMDMiIHgyPSI0LjUzIiB5Mj0iMjAuMDMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSI3IiB5MT0iMjgiIHgyPSI0LjUzIiB5Mj0iMjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSI3IiB5MT0iMjQiIHgyPSIxIiB5Mj0iMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSI3IiB5MT0iMTYiIHgyPSIxIiB5Mj0iMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxwYXRoIGQ9Ik0zNS43NSwzMC41MkgxMS4xM2ExLjc1LDEuNzUsMCwwLDEtMS43NS0xLjc2bDAuMS0xNy4zYTEuNzUsMS43NSwwLDAsMSwxLjc1LTEuNzRIMzUuNzVhMS43NSwxLjc1LDAsMCwxLDEuNzUsMS43NXYxNy4zQTEuNzUsMS43NSwwLDAsMSwzNS43NSwzMC41MloiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ1OTkzZCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+PC9zdmc+",
  "assets/media/microbit/event_broadcast_purple.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBpZD0iSWNvbiIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+c2VuZC1tZXNzYWdlLXB1cnBsZTwvdGl0bGU+PHBhdGggZD0iTTM1Ljc1LDMwLjUySDExLjEzYTEuNzUsMS43NSwwLDAsMS0xLjc1LTEuNzZsMC4xLTE3LjNhMS43NSwxLjc1LDAsMCwxLDEuNzUtMS43NEgzNS43NWExLjc1LDEuNzUsMCwwLDEsMS43NSwxLjc1djE3LjNBMS43NSwxLjc1LDAsMCwxLDM1Ljc1LDMwLjUyWiIgZmlsbD0iIzk2ZiIvPjxwb2x5bGluZSBwb2ludHM9IjEwLjM2IDI5LjY0IDIzLjUgMTguNzIgMzYuNjMgMjkuNjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzc3NGRjYiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGcgb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzcuODcsMTIuODFMMjYsMjUuMTRhMy40OSwzLjQ5LDAsMCwxLTUuMDUsMEw5LjEyLDEyLjhBMC40OSwwLjQ5LDAsMCwxLDksMTIuMjYsMC41MSwwLjUxLDAsMCwxLDkuNDgsMTJoMjhhMC41MSwwLjUxLDAsMCwxLC40Ni4zQTAuNTMsMC41MywwLDAsMSwzNy44NywxMi44MVoiIGZpbGw9IiMyMzFmMjAiLz48L2c+PHBhdGggZD0iTTM3LjUxLDExLjQ3TDI1LjQ1LDIxLjgzYTMsMywwLDAsMS0zLjkxLDBMOS40OSwxMS40NiIgZmlsbD0iIzk2ZiIgc3Ryb2tlPSIjNzc0ZGNiIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48bGluZSB4MT0iNyIgeTE9IjEyIiB4Mj0iNC41MyIgeTI9IjEyIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48bGluZSB4MT0iNyIgeTE9IjIwLjAzIiB4Mj0iNC41MyIgeTI9IjIwLjAzIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48bGluZSB4MT0iNyIgeTE9IjI4IiB4Mj0iNC41MyIgeTI9IjI4IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48bGluZSB4MT0iNyIgeTE9IjI0IiB4Mj0iMSIgeTI9IjI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48bGluZSB4MT0iNyIgeTE9IjE2IiB4Mj0iMSIgeTI9IjE2IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48cGF0aCBkPSJNMzUuNzUsMzAuNTJIMTEuMTNhMS43NSwxLjc1LDAsMCwxLTEuNzUtMS43NmwwLjEtMTcuM2ExLjc1LDEuNzUsMCwwLDEsMS43NS0xLjc0SDM1Ljc1YTEuNzUsMS43NSwwLDAsMSwxLjc1LDEuNzV2MTcuM0ExLjc1LDEuNzUsMCwwLDEsMzUuNzUsMzAuNTJaIiBmaWxsPSJub25lIiBzdHJva2U9IiM3NzRkY2IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_broadcast_orange.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5ldmVudF9icm9hZGNhc3Rfb3JhbmdlPC90aXRsZT48cGF0aCBmaWxsPSIjRkY4NjIyIiBkPSJNMzUuOCwzMC41SDExLjFjLTEsMC0xLjgtMC44LTEuOC0xLjdjMCwwLDAsMCwwLDBsMC4xLTE3LjNjMC0xLDAuOC0xLjcsMS44LTEuN2gyNC41YzEsMCwxLjgsMC44LDEuOCwxLjggIHYxNy4zQzM3LjUsMjkuNywzNi43LDMwLjUsMzUuOCwzMC41eiIvPjxwb2x5bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNDRTZCMTkiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgcG9pbnRzPSIxMC40LDI5LjYgMjMuNSwxOC43IDM2LjYsMjkuNiAiLz48ZyBvcGFjaXR5PSIwLjEiPjxwYXRoIGZpbGw9IiMyMzFGMjAiIGQ9Ik0zNy45LDEyLjhMMjYsMjUuMWMtMS4zLDEuNC0zLjUsMS40LTQuOSwwLjFjMCwwLTAuMS0wLjEtMC4xLTAuMUw5LjEsMTIuOEM5LDEyLjcsOC45LDEyLjQsOSwxMi4zICAgQzkuMSwxMi4xLDkuMywxMiw5LjUsMTJoMjhjMC4yLDAsMC40LDAuMSwwLjUsMC4zQzM4LDEyLjUsMzgsMTIuNywzNy45LDEyLjh6Ii8+PC9nPjxwYXRoIGZpbGw9IiNGRjg0MUYiIHN0cm9rZT0iI0NFNkIxOSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzcuNSwxMS41TDI1LjUsMjEuOGMtMS4xLDEtMi44LDEtMy45LDAgIEw5LjUsMTEuNSIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIxMiIgeDI9IjQuNSIgeTI9IjEyIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNyIgeTE9IjIwIiB4Mj0iNC41IiB5Mj0iMjAiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI3IiB5MT0iMjgiIHgyPSI0LjUiIHkyPSIyOCIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIyNCIgeDI9IjEiIHkyPSIyNCIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIxNiIgeDI9IjEiIHkyPSIxNiIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0NFNkIxOSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMzUuOCwzMC41SDExLjFjLTEsMC0xLjgtMC44LTEuOC0xLjcgIGMwLDAsMCwwLDAsMGwwLjEtMTcuM2MwLTEsMC44LTEuNywxLjgtMS43aDI0LjVjMSwwLDEuOCwwLjgsMS44LDEuOHYxNy4zQzM3LjUsMjkuNywzNi43LDMwLjUsMzUuOCwzMC41eiIvPjwvc3ZnPjwvc3ZnPg==",
  "assets/media/microbit/event_broadcast_cyan.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iSWNvbiIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgNDAgNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPjx0aXRsZT5ldmVudF9icm9hZGNhc3RfY3lhbjwvdGl0bGU+PHBhdGggZmlsbD0iIzcwRTNGMiIgZD0iTTM1LjgsMzAuNUgxMS4xYy0xLDAtMS44LTAuOC0xLjgtMS43YzAsMCwwLDAsMCwwbDAuMS0xNy4zYzAtMSwwLjgtMS43LDEuOC0xLjdoMjQuNWMxLDAsMS44LDAuOCwxLjgsMS44ICB2MTcuM0MzNy41LDI5LjcsMzYuNywzMC41LDM1LjgsMzAuNXoiLz48cG9seWxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMURCN0NDIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHBvaW50cz0iMTAuNCwyOS42IDIzLjUsMTguNyAzNi42LDI5LjYgIi8+PGcgb3BhY2l0eT0iMC4xIj48cGF0aCBmaWxsPSIjMjMxRjIwIiBkPSJNMzcuOSwxMi44TDI2LDI1LjFjLTEuMywxLjQtMy41LDEuNC00LjksMC4xYzAsMC0wLjEtMC4xLTAuMS0wLjFMOS4xLDEyLjhDOSwxMi43LDguOSwxMi40LDksMTIuMyAgIEM5LjEsMTIuMSw5LjMsMTIsOS41LDEyaDI4YzAuMiwwLDAuNCwwLjEsMC41LDAuM0MzOCwxMi41LDM4LDEyLjcsMzcuOSwxMi44eiIvPjwvZz48cGF0aCBmaWxsPSIjNzBFM0YyIiBzdHJva2U9IiMxREI3Q0MiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTM3LjUsMTEuNUwyNS41LDIxLjhjLTEuMSwxLTIuOCwxLTMuOSwwICBMOS41LDExLjUiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI3IiB5MT0iMTIiIHgyPSI0LjUiIHkyPSIxMiIvPjxsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgeDE9IjciIHkxPSIyMCIgeDI9IjQuNSIgeTI9IjIwIi8+PGxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB4MT0iNyIgeTE9IjI4IiB4Mj0iNC41IiB5Mj0iMjgiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI3IiB5MT0iMjQiIHgyPSIxIiB5Mj0iMjQiLz48bGluZSBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHgxPSI3IiB5MT0iMTYiIHgyPSIxIiB5Mj0iMTYiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMxRkI4Q0MiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTM1LjgsMzAuNUgxMS4xYy0xLDAtMS44LTAuOC0xLjgtMS43ICBjMCwwLDAsMCwwLDBsMC4xLTE3LjNjMC0xLDAuOC0xLjcsMS44LTEuN2gyNC41YzEsMCwxLjgsMC44LDEuOCwxLjh2MTcuM0MzNy41LDI5LjcsMzYuNywzMC41LDM1LjgsMzAuNXoiLz48L3N2Zz48L3N2Zz4=",
  "assets/media/microbit/event_broadcast_coral2.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBpZD0iSWNvbiIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+ZXZlbnRfYnJvYWRjYXN0X2NvcmFsPC90aXRsZT48cGF0aCBkPSJNMzUuNzUsMzAuNTJIMTEuMTNhMS43NSwxLjc1LDAsMCwxLTEuNzUtMS43NmwwLjEtMTcuM2ExLjc1LDEuNzUsMCwwLDEsMS43NS0xLjc0SDM1Ljc1YTEuNzUsMS43NSwwLDAsMSwxLjc1LDEuNzV2MTcuM0ExLjc1LDEuNzUsMCwwLDEsMzUuNzUsMzAuNTJaIiBmaWxsPSIjZjI2ZDgzIi8+PHBvbHlsaW5lIHBvaW50cz0iMTAuMzYgMjkuNjQgMjMuNSAxOC43MiAzNi42MyAyOS42NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYmY1NjY4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48ZyBvcGFjaXR5PSIwLjEiPjxwYXRoIGQ9Ik0zNy44NywxMi44MUwyNiwyNS4xNGEzLjQ5LDMuNDksMCwwLDEtNS4wNSwwTDkuMTIsMTIuOEEwLjQ5LDAuNDksMCwwLDEsOSwxMi4yNiwwLjUxLDAuNTEsMCwwLDEsOS40OCwxMmgyOGEwLjUxLDAuNTEsMCwwLDEsLjQ2LjNBMC41MywwLjUzLDAsMCwxLDM3Ljg3LDEyLjgxWiIgZmlsbD0iIzIzMWYyMCIvPjwvZz48cGF0aCBkPSJNMzcuNTEsMTEuNDdMMjUuNDUsMjEuODNhMywzLDAsMCwxLTMuOTEsMEw5LjQ5LDExLjQ2IiBmaWxsPSIjZjI2ZDgzIiBzdHJva2U9IiNiZjU2NjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxsaW5lIHgxPSI3IiB5MT0iMTIiIHgyPSI0LjUzIiB5Mj0iMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSI3IiB5MT0iMjAuMDMiIHgyPSI0LjUzIiB5Mj0iMjAuMDMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSI3IiB5MT0iMjgiIHgyPSI0LjUzIiB5Mj0iMjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSI3IiB5MT0iMjQiIHgyPSIxIiB5Mj0iMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSI3IiB5MT0iMTYiIHgyPSIxIiB5Mj0iMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxwYXRoIGQ9Ik0zNS43NSwzMC41MkgxMS4xM2ExLjc1LDEuNzUsMCwwLDEtMS43NS0xLjc2bDAuMS0xNy4zYTEuNzUsMS43NSwwLDAsMSwxLjc1LTEuNzRIMzUuNzVhMS43NSwxLjc1LDAsMCwxLDEuNzUsMS43NXYxNy4zQTEuNzUsMS43NSwwLDAsMSwzNS43NSwzMC41MloiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2JmNTY2OCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+PC9zdmc+",
  "assets/media/microbit/sensing_pressb.svg": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJ1bmRlZmluZWQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSIzMnB4IiBoZWlnaHQ9IjMycHgiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMzIgMzIiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0wLDBsMzEuOCwwTDAsMzJMMCwweiBNNC45LDE0LjVoNC40YzAuOCwwLDEuNS0wLjMsMi4xLTAuOWMwLjYtMC41LDAuOC0xLjMsMC45LTIuMmMwLTAuNi0wLjEtMS4xLTAuNC0xLjYgIGMtMC4zLTAuNS0wLjctMC44LTEuMy0wLjl2MGMwLjMtMC4xLDAuNi0wLjMsMC44LTAuNWMwLjItMC4yLDAuNC0wLjQsMC41LTAuNkMxMiw3LjQsMTIuMiw3LDEyLjEsNi41YzAtMC45LTAuMy0xLjYtMC44LTIuMSAgQzEwLjgsMy45LDEwLjEsMy42LDksMy42SDQuOVYxNC41eiBNOC44LDUuMWMwLjYsMCwxLDAuMiwxLjMsMC40YzAuMywwLjMsMC40LDAuNywwLjQsMS4xYzAsMC40LTAuMSwwLjgtMC40LDEuMSAgQzkuOCw4LDkuNCw4LjIsOC44LDguMkg2LjVWNS4xSDguOHogTTksOS43YzAuNiwwLDEsMC4yLDEuMywwLjVjMC4zLDAuMywwLjQsMC43LDAuNCwxLjJjMCwwLjQtMC4xLDAuOC0wLjQsMS4xICBDMTAsMTIuOCw5LjYsMTIuOSw5LDEyLjlINi41VjkuN0g5eiIvPjwvc3ZnPjwvc3ZnPg=="
}



function getTransform (elem) {
	var pt = {x:0, y:0}
	var xforms = elem.getAttribute('transform');
	if (!xforms) {
	//	console.log ("empty transform", elem)
		return pt;
	}
	xforms  = xforms.replace (/[^0-9.,]+/ , '')// keep only numbers
	xforms  = xforms.replace (/\)/ , '') // take out the lingering end parenthesis
	var parts  = xforms.split (",");
	pt  = {x: Number(parts[0]), y: Number(parts[1]) }	
//	console.log ("getTransform", pt, elem)
	return pt
}

