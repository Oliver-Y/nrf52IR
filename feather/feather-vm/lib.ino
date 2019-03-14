char prbuf[128];
char* prptr;

void sendprbuf(){
  int len = strlen(prbuf);
  Serial.write(0xf0);
  Serial.write(len);
  for(int i=0;i<len;i++) Serial.write(prbuf[i]);
  Serial.write(0xed);
}

void printnum(int32_t n){
  if(n<0) {*prptr++='-'; n=-n;}
  int32_t k = (int32_t)(n/100);
  int32_t d1 = (int32_t)((n/10)%10);
  int32_t d2 = (int32_t)(n%10);
  prptr+= sprintf(prptr,"%d", (int)k);
  if(d1||d2) *prptr++='.';
  if(d1||d2) prptr+= sprintf(prptr,"%d",(int)d1);
  if(d2) prptr+= sprintf(prptr,"%d",(int)d2);
}

void print(int32_t c){prptr = prbuf; printnum(c); sprintf(prptr,"\n"); sendprbuf();}

int32_t t0;

void prim_print(){
  print(vm_pop_raw());
}

void prim_resett(){
  t0 = now();
}

void prim_timer(){
  float t = (float)(now()-t0);
  vm_push_float(t/1000);
}

void prim_ledon(){ble.sendCommandCheckOK("AT+HWModeLED=" "MANUAL,ON");}
void prim_ledoff(){ble.sendCommandCheckOK("AT+HWModeLED=" "MANUAL,OFF");}


void(*libprims[])() = {
  prim_print, prim_resett, prim_timer,
  prim_ledon, prim_ledoff
};



