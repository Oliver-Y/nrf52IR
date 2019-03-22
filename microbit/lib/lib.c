#include <stdint.h>
#include <string.h>
#include <stdio.h>
#include "nrf_gpio.h"

#include "vm.h"
#include "vm_uart.h"

char prbuf[128];
char* prptr;

#define BTNA_PIN 17
#define BTNB_PIN 26

int rowpins[] = {13,14,15};
int colpins[] = {4,5,6,7,8,9,10,11,12};
int btna_evt, last_btna=0;
int btnb_evt, last_btnb=0;

int leddecode[] = {
  0,1, 1,8, 0,2, 1,16, 0,4,
  2,8, 2,16, 2,32, 2,64, 2,128,
  1,2, 0,256, 1,4, 2,256, 1,1,
  0,128, 0,64, 0,32, 0,16, 0,8,
  2,4, 1,64, 2,1, 1,32, 2,2
};

uint16_t matrix[3];
int thisrow = 0;

static void cfg_led(uint32_t pin)
{
  nrf_gpio_cfg(
      pin,
      NRF_GPIO_PIN_DIR_OUTPUT,
      NRF_GPIO_PIN_INPUT_DISCONNECT,
      NRF_GPIO_PIN_NOPULL,
      NRF_GPIO_PIN_H0H1,
      NRF_GPIO_PIN_NOSENSE);
}

void lib_init(){
  int i;
  for(i=0;i<3;i++){
      cfg_led(rowpins[i]);
      nrf_gpio_pin_clear(rowpins[i]);
    }
  for(i=0;i<9;i++){
      cfg_led(colpins[i]);
      nrf_gpio_pin_set(colpins[i]);
    }
  nrf_gpio_cfg_input(BTNA_PIN,  NRF_GPIO_PIN_NOPULL);
  nrf_gpio_cfg_input(BTNB_PIN,  NRF_GPIO_PIN_NOPULL);
}

void lib_poll(){
  int this_btna = nrf_gpio_pin_read(BTNA_PIN)?0:1;
  int this_btnb = nrf_gpio_pin_read(BTNB_PIN)?0:1;
  if(this_btna&!last_btna) btna_evt=1;
  last_btna = this_btna;
  if(this_btnb&!last_btnb) btnb_evt=1;
  last_btnb = this_btnb;
}

void prim_doton(){
  int n = vm_pop()%25;
  int offset = leddecode[n*2];
  int mask = leddecode[n*2+1];
  matrix[offset]|=mask;
}

void prim_dotoff(){
  int n = vm_pop()%25;
  int offset = leddecode[n*2];
  int mask = leddecode[n*2+1];
  matrix[offset]&=~mask;
}

void lib_ticker(){
  int i;
  nrf_gpio_pin_clear(rowpins[thisrow++]);
  if(thisrow==4) thisrow=0;
  uint16_t bits = matrix[thisrow];
  for(i=0;i<9;i++){
      if(bits&1) nrf_gpio_pin_clear(colpins[i]);
      else nrf_gpio_pin_set(colpins[i]);
      bits>>=1;
    }
  nrf_gpio_pin_set(rowpins[thisrow]);
}

void sendprbuf(){
  int len = strlen(prbuf);
  uputc(0xf0);
  uputc(len);
  for(int i=0;i<len;i++) uputc(prbuf[i]);
  uputc(0xed);
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

void prim_print(){print(vm_pop_raw());}

int32_t t0;

void prim_resett(){
  t0 = now();
}

void prim_timer(){
  float t = (float)(now()-t0);
  vm_push_float(t/1000);
}

void prim_buttona(){vm_push(nrf_gpio_pin_read(BTNA_PIN)?0:1);}

void(*libprims[])() = {
  prim_print, prim_resett, prim_timer,
  prim_buttona,
  prim_doton, prim_dotoff
};
