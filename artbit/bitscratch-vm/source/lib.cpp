#include <stdint.h>
#include "MicroBit.h"
#include "MicroBitTicker.h"
#include "MicroBitUARTService.h"
#include "vm.h"


#define flashshapes 0x31000

unsigned char directshape[5];

MicroBitDisplay display;
MicroBitButton buttona(MICROBIT_PIN_BUTTON_A, MICROBIT_ID_BUTTON_A);
MicroBitButton buttonb(MICROBIT_PIN_BUTTON_B, MICROBIT_ID_BUTTON_B);
MicroBitI2C i2c = MicroBitI2C(I2C_SDA0, I2C_SCL0);
//MicroBitAccelerometer acc = MicroBitAccelerometer(i2c);
MicroBitAccelerometer *acc;
MicroBitFont ramshapefont((const unsigned char*)directshape, 32+2);
MicroBitTicker ticker;
MicroBitRadio radio;

extern MicroBitStorage flash;
extern MicroBitSerial pc;
extern MicroBitUARTService *ble_uart;

void putc(uint8_t);
void usb_putc(uint8_t);

void mwait(int32_t);
void setshape(int32_t);
void clear(void);
void direct_setshape(uint8_t,uint8_t,uint8_t,uint8_t,uint8_t);
int radiorecv(void);
void print(int32_t);

extern volatile uint32_t ticks;
uint32_t lastticks;
int32_t t0;
int btna_evt, btna_count;
int btnb_evt, btnb_count;
int btnab_evt;
int radio_evt;


int32_t pollphase;
int16_t xbuf[32];
int16_t ybuf[32];
int16_t zbuf[32];
int16_t accbuf[32];
float pace = 0.5;

char prbuf[128];
char* prptr;

int thisshape = 0;
int shapeoffh = 0;
int shapeoffv = 0;
int recvchar=-1;
int pollrecv=-1;
int pollinhibit = 0;


void boot_flash(){
  direct_setshape(0x00,0x00,0x04,0x00,0x00); mwait(50);
  direct_setshape(0x00,0x0e,0x04,0x0e,0x00); mwait(50);
  direct_setshape(0x1f,0x11,0x11,0x11,0x1f); mwait(50);
  direct_setshape(0x00,0x0e,0x00,0x0e,0x00); mwait(50);
  direct_setshape(0x00,0x00,0x04,0x00,0x00); mwait(50);
  clear();
}

void lib_init(){
  acc = &MicroBitAccelerometer::autoDetect(i2c);  
  microbit_seed_random();
  radio.enable();
  display.setDisplayMode(DISPLAY_MODE_BLACK_AND_WHITE);
  display.setBrightness(100);
  boot_flash();
}

void evt_poll(){
  if(pollinhibit>0){
    int c = radiorecv();
    if(c!=-1) pollrecv=c;
    pollinhibit--;
    return;
  }
  if(buttona.isPressed()) btna_count++;
  else btna_count=0;
  if(buttonb.isPressed()) btnb_count++;
  else btnb_count=0;
  if((btna_count>0)&&(btna_count<3)&&(btnb_count>0)&&(btnb_count<3)){
    btna_count=4;
    btnb_count=4;
    btnab_evt=1;
  }
  if(btna_count==3) btna_evt=1;
  if(btnb_count==3) btnb_evt=1;
  int c = radiorecv();
  if(c!=-1) {recvchar = c; pollrecv=c; radio_evt=1;}
}

void dev_poll(){
  if(ticks==lastticks) return;
  lastticks = ticks;
  int16_t x = acc->getX();
  int16_t y = acc->getY();
  int16_t z = acc->getZ();
  float acc = sqrt((float)(x*x+y*y+z*z));
  xbuf[pollphase] = x;
  ybuf[pollphase] = y;
  zbuf[pollphase] = z;
  accbuf[pollphase] = (int32_t)acc;
  pollphase++;
  pollphase &= 0x1f;
}

void direct_setshape(uint8_t a, uint8_t b, uint8_t c,  uint8_t d,  uint8_t e){
  directshape[0] = a;
  directshape[1] = b;
  directshape[2] = c;
  directshape[3] = d;
  directshape[4] = e;
  MicroBitFont::setSystemFont(ramshapefont);
  display.printChar(32);
}

void ddots(uint8_t* s){
  direct_setshape(s[0],s[1],s[2],s[3],s[4]);
}


void mwait(int32_t d){
  if(d<0) return;
  uint64_t end = system_timer_current_time()+d;
  while(system_timer_current_time()<end){};
}

int32_t lib_random(int32_t min, int32_t max){
  return min+microbit_random(max-min+1);
}

void flashwrite(uint32_t* addr, uint32_t data){flash.flashWordWrite(addr, data);}
void flasherase(uint32_t* addr){flash.flashPageErase(addr);}



/////////////////////////////////
//
// Serial Printing Primitives
//
/////////////////////////////////

void sendprbuf(){
  int len = strlen(prbuf);
  usb_putc(0xf0);
  usb_putc(len);
  for(int i=0;i<len;i++) usb_putc(prbuf[i]);
  usb_putc(0xed);
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
void prs(uint8_t *s){sprintf(prbuf,"%s\n",s); sendprbuf();}

void prf(uint8_t *s, int32_t n) {
  prptr = prbuf;
  for (; *s; s++) {
    if (*s=='%'){
      s++;
      switch (*s){
          case 'b': prptr+= sprintf(prbuf,"%02x",(int)n); break;
          case 'h': prptr+= sprintf(prbuf,"%04x",(int)n); break;
          case 'w': prptr+= sprintf(prbuf,"%08x",(int)n); break;
          case 'd': printnum(n); break;
          case 0: return;
          default: *prptr++=*s; break;
      }
    } else *prptr++=*s;
  }
  *prptr = 0;
  sendprbuf();
}

void prim_print(){
  print(vm_pop_raw());
}

void prim_prs(){
  prs((uint8_t*)vm_pop_raw());
}

void prim_prf(){
    int32_t val = vm_pop();
    uint8_t *format = (uint8_t*)vm_pop_raw();
    prf(format,val);
}



/////////////////////////////////
//
// Timer Primitives
//
/////////////////////////////////

int32_t now(){
  return ((int32_t)system_timer_current_time())&0x7fffffff;
}

void prim_resett(){
  t0 = now();
}

void prim_timer(){
  float t = (float)(now()-t0);
  vm_push_float(t/1000);
}

void prim_ticks(){
  vm_push(ticks);
}


/////////////////////////////////
//
// Shape Primitives
//
/////////////////////////////////

int32_t nshapes(){
  unsigned char *font = (unsigned char*)flashshapes;
  int32_t i;
  for(i=0;i<1000;i++){
    if(font[5*i]==0xff) return i;
  }
  return 0;
}


void clear(){
  direct_setshape(0,0,0,0,0);
  thisshape = 0;
  shapeoffh = 0;
  shapeoffv = 0;
}

void setshape(int32_t s){
  if(s<=0) clear();
  else {
    ddots((uint8_t*)&((unsigned char*)flashshapes)[5*(s-1)]);
    thisshape = s;
    shapeoffh = 0;
    shapeoffv = 0;
  }
}

void nextshape(){
  unsigned char *font = (unsigned char*)flashshapes;
  thisshape++;
  shapeoffh = 0;
  shapeoffv = 0;
  if(font[5*(thisshape-1)]==0xff) thisshape = 1;
  ddots(&font[5*(thisshape-1)]);
}

void prevshape(){
  unsigned char *font = (unsigned char*)flashshapes;
  shapeoffh = 0;
  shapeoffv = 0;
  if(thisshape>1) thisshape--;
  else {
    thisshape = 1;
    while(font[5*thisshape]!=0xff) thisshape++;
  }
  ddots(&font[5*(thisshape-1)]);
}
void prim_setshape(){
  int32_t n = vm_pop()-1;
  int32_t len = nshapes();
  n%=len;
  if(n<0) n+=len;
  setshape(n+1);
  vm_wait(pace);
}

void prim_shape(){
  vm_push(thisshape);
}
void prim_clear(){
  clear();
//  vm_wait(pace);
}

void prim_nextshape(){
  nextshape();
  vm_wait(pace);
}
void prim_prevshape(){
  prevshape();
  vm_wait(pace);
}



/////////////////////////////////
//
// Scrolling Primitives
//
/////////////////////////////////

void scrollhDraw(){
  uint8_t *font = (uint8_t*)flashshapes;
  uint8_t *lefts = &font[5*(thisshape-1)];
  uint8_t *rights = &font[5*(thisshape)];
  if(*rights==0xff) rights = font;
  uint8_t line1 = ((lefts[0]<<shapeoffh)&0x3f)+(rights[0]>>(5-shapeoffh));
  uint8_t line2 = ((lefts[1]<<shapeoffh)&0x3f)+(rights[1]>>(5-shapeoffh));
  uint8_t line3 = ((lefts[2]<<shapeoffh)&0x3f)+(rights[2]>>(5-shapeoffh));
  uint8_t line4 = ((lefts[3]<<shapeoffh)&0x3f)+(rights[3]>>(5-shapeoffh));
  uint8_t line5 = ((lefts[4]<<shapeoffh)&0x3f)+(rights[4]>>(5-shapeoffh));
  direct_setshape(line1,line2,line3,line4,line5);
}

void scroll_l(){
  if(thisshape==0) nextshape();
  if(shapeoffv>0) shapeoffv=0;
  shapeoffh++;
  if(shapeoffh==5) nextshape();
  else scrollhDraw();
}

void scroll_r(){
  if(thisshape==0) prevshape();
  if(shapeoffv>0) shapeoffv=0;
  if(shapeoffh>0) shapeoffh--;
  else {
    if(thisshape>1) thisshape--;
    else {
      uint8_t *font = (uint8_t*)flashshapes;
      thisshape = 1;
      while(font[5*thisshape]!=0xff) thisshape++;
    }
    shapeoffh = 4;
  }
  scrollhDraw();
}

void scrollvDraw(){
  uint8_t *font = (uint8_t*)flashshapes;
  uint8_t *top = &font[5*(thisshape-1)+shapeoffv];
  uint8_t line1 = *top++; if(*top==0xff) top = font;
  uint8_t line2 = *top++; if(*top==0xff) top = font;
  uint8_t line3 = *top++; if(*top==0xff) top = font;
  uint8_t line4 = *top++; if(*top==0xff) top = font;
  uint8_t line5 = *top++; if(*top==0xff) top = font;
  direct_setshape(line1,line2,line3,line4,line5);
}

void scroll_u(){
  if(thisshape==0) nextshape();
  if(shapeoffh>0) shapeoffh=0;
  shapeoffv++;
  if(shapeoffv==5) nextshape();
  else scrollvDraw();
}

void scroll_d(){
  if(thisshape==0) prevshape();
  if(shapeoffh>0) shapeoffh=0;
  if(shapeoffv>0) shapeoffv--;
  else {
    if(thisshape>1) thisshape--;
    else {
      uint8_t *font = (uint8_t*)flashshapes;
      thisshape = 1;
      while(font[5*thisshape]!=0xff) thisshape++;
    }
    shapeoffv = 4;
  }
  scrollvDraw();
}


void prim_scroll_l(){
  scroll_l();
  vm_wait(pace/5-.051);
}

void prim_scroll_r(){
  scroll_r();
  vm_wait(pace/5-.051);
}

void prim_scroll_d(){
  scroll_d();
  vm_wait(pace/5-.051);
}

void prim_scroll_u(){
  scroll_u();
  vm_wait(pace/5-.051);
}


/////////////////////////////////
//
// Display Primitives
//
/////////////////////////////////


void prim_setpace(){
  pace = vm_pop_float();
}

void setbrightness(int32_t b){display.setBrightness(b);}

void prim_brightness(){
    int32_t n = vm_pop();
    if(n<1) n=1;
    if(n>100) n=100;
    display.setBrightness(n*255/100);
}

uint8_t pop_coord(){
  int32_t n = vm_pop();
  n %= 5;
  if(n<0) n+=5;
  return (uint8_t) n;
}

void prim_doton(){
  uint8_t y = pop_coord();
  uint8_t x = pop_coord();
  directshape[4-y] |= 1<<(4-x);
  display.printChar(32);
}

void prim_dotoff(){
  uint8_t y = pop_coord();
  uint8_t x = pop_coord();
  directshape[4-y] &= (0x3f^(1<<(4-x)));
  display.printChar(32);
}


/////////////////////////////////
//
// I/O Primitives
//
/////////////////////////////////

int32_t buf_ave(int16_t *buf){
  int res=0;
  for(int i=0;i<32;i++) res+=buf[i];
  return (int32_t)(res/32);
}

int32_t accx(){return buf_ave(xbuf);}
int32_t accy(){return buf_ave(ybuf);}
int32_t accz(){return buf_ave(zbuf);}
int32_t accmag(){return buf_ave(accbuf);}

void prim_accx(){
  vm_push(accx());
}

void prim_accy(){
  vm_push(accy());
}

void prim_accz(){
  vm_push(accz());
}

void prim_acc(){
  vm_push(accmag());
}

void prim_buttona(){
  vm_push(buttona.isPressed());
}

void prim_buttonb(){
  vm_push(buttonb.isPressed());
}

void rsend(uint8_t c){radio.datagram.send(&c, 1);}
int rrecc(){int c=recvchar; recvchar=-1; return c;}
int rpeek(){return recvchar;}

int radiorecv(){
  uint8_t c=0;
  radio.idleTick();
  int len = radio.datagram.recv(&c, 1);
  if(len==MICROBIT_INVALID_PARAMETER) return -1;
  else return c;
}

void prim_rrecc(){
  vm_push(rrecc());
}

void prim_rsend(){
  rsend((uint8_t)vm_pop());
}

void putc16(int32_t n){
  putc(n&0xff);
  putc((n>>8)&0xff);
}

void usb_io_state(){
  putc(0xf5);
  putc(11);
  putc(buttona.isPressed());
  putc(buttonb.isPressed());
  putc(pollrecv); pollrecv=-1;
  putc16(accx());
  putc16(accy());
  putc16(accz());
  putc16(accmag());
  putc(0xed);
}

void write16(uint8_t* addr, int32_t n){
  addr[0]=(uint8_t)(n&0xff);
  addr[1]=(uint8_t)((n>>8)&0xff);
}

void ble_io_state(){
  uint8_t buf[14];
  buf[0] = 0xf5;
  buf[1] = 11;
  buf[2] = buttona.isPressed();
  buf[3] = buttonb.isPressed();
  buf[4] = pollrecv; pollrecv=-1;
  write16(&buf[5], accx());
  write16(&buf[7], accy());
  write16(&buf[9], accz());
  write16(&buf[11], accmag());
  buf[13]= 0xed;
  ble_uart->send(buf,14,ASYNC);
}

void(*libprims[])() = {
  prim_print, prim_prs, prim_prf,
  prim_resett, prim_timer, prim_ticks,
  prim_setshape, prim_shape, prim_clear, prim_nextshape, prim_prevshape,
  prim_scroll_l, prim_scroll_r, prim_scroll_d, prim_scroll_u,
  prim_doton, prim_dotoff, prim_brightness,
  prim_setpace,
  prim_accx, prim_accy, prim_accz, prim_acc,
  prim_buttona, prim_buttonb,
  prim_rsend, prim_rrecc,
};


