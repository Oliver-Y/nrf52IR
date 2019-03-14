var commandCenter;
var procedures;
var compiler;
var urlvars;

window.onload = setup;

function setup(){
	var titleheight = window.outerHeight-window.innerHeight;
	window.resizeTo(1352,titleheight+670);
	window.addEventListener('resize',resize);
	frame.ondragover =  function (e) {self.allowDrop(e)}; 
	frame.ondrop = function (e) {self.handleDropFile(e)};
	commandCenter = new CommandCenter();
	procedures = new Procedures();
	compiler = new Compiler();
	compiler.setup();
	resize();
	cc.focus();
//	bleinit();
}

function allowDrop (evt) { 
	evt.preventDefault(); 
	evt.stopPropagation();
}

function handleDropFile (evt) { 
	evt.preventDefault(); 
	if (evt.stopPropagation) evt.stopPropagation();
	else evt.cancelBubble = true;
	var file = evt.dataTransfer.files[0];
	if(file.type=='text/plain'){
		var reader = new FileReader();
	  reader.onload = readprocs;
	  reader.readAsText(file);
	} else if(file.type=='image/png'){
		var reader = new FileReader();
	  reader.onload = readimage;
	  reader.readAsDataURL(file);
	} 

  function readprocs(){
  	procs.value = reader.result;
  	procedures.readProcs();
  }

  function readimage(){
  	loadpng(reader.result);
  }
}

/////////////////////////
//
// UI
// 
/////////////////////////

function resize (e) {
	var doch = getDocumentHeight();
	var docw = getDocumentWidth();
 	cc.style.width = Math.floor(docw/2.5-60) +'px';
 	cc.style.height = (doch-cc.offsetTop-22)+'px';
 	procs.style.width = Math.floor(docw*1.5/2.5-10) +'px';
 	procs.style.height = (doch-procs.offsetTop-22)+'px';
}


function handleCnvKeyDown(e) {
 if(e.ctrlKey){
	if(e.keyCode==70) {e.preventDefault(); e.stopPropagation(); cc.focus();}
	if(e.keyCode==71) {e.preventDefault(); e.stopPropagation(); commandCenter.runLine('go');}
	if(e.keyCode==190) {commandCenter.stop();}
 }
}


/////////////////////////
//
// loader
//
/////////////////////////

function loadpng(dataurl, fcn){
	var img = new Image;
	img.onload = sendImage;
	img.src = dataurl;

	function sendImage(){
		var code = readHiddenData();
		procs.value = (code=='bad sig') ? '' : code;
		procedures.readProcs();
	}

	function readHiddenData(){
		var cnv = document.createElement("canvas");
    cnv.width = img.naturalWidth;
    cnv.height = img.naturalHeight;
		var ctx = cnv.getContext('2d');
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(img, 0, 0);
		return ImageData.getImageData(ctx);
	}
}

function lprint(x){commandCenter.insert(x+'\n');}
