class Procedures {

constructor(){
	var t = this;
	t.localprocs = '';
	procs.autocapitalize = 'off';
	procs.autocorrect = 'off';
	procs.autocomplete = 'off';
	procs.spellcheck = false;
	procs.focused = false;
	procs.onfocus = function(){procs.focused = true;};
	procs.onblur = function(){procs.focused = false; t.readProcs()};
	procs.onkeydown = handleKeyDown;

	function handleKeyDown(e) {
	 if(e.ctrlKey){
//	 	if(e.keyCode==70) {e.preventDefault(); e.stopPropagation(); cc.focus();}
	 	if(e.keyCode==71) {e.preventDefault(); e.stopPropagation(); t.readProcs(); commandCenter.runLine('go');}
	 	if(e.keyCode==190) {commandCenter.stop();}
	 }
	}
}

	
readProcs(){
	compiler.downloadProcs(procs.value);
}

}
