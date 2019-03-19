#include <stdbool.h>
#include <stdint.h>
#include "nrf_gpio.h"
#include "nrf_delay.h"

#define MAJOR_VERSION 0
#define MINOR_VERSION 1

#define ROW1 13
#define COL1 4

#define OP_ONBUTTONA 0x80
#define OP_ONBUTTONB 0x81

uint8_t code[128];
volatile uint32_t ticks = 0;
extern int btna_evt, btnb_evt;

void vm_runcc(uint32_t);
void vm_run(void);
void vm_stop(void);
void vm_run_toggle(uint8_t);

void lib_init(void);
void lib_poll(void);
void lib_ticker(void);

void uart_init(void);
void uputc(uint8_t);
uint8_t ugetc(void);
bool uavail(void);
void flash_word_write(uint32_t*, uint32_t);
void flash_page_erase(uint32_t*);
uint32_t now(void);

void timer_init(void);

void send(uint8_t *buf, int len){
  int i;
  for(i=0;i<len;i++) uputc(*buf++);
}

void sendresponse(uint8_t resp){
  uint8_t buf[3];
  buf[0] = resp;
  buf[1] = 0;
  buf[2] = 0xed;
  send(buf,3);
}

uint32_t read32(){
  uint8_t c1 = ugetc();
  uint8_t c2 = ugetc();
  uint8_t c3 = ugetc();
  uint8_t c4 = ugetc();
  return (c4<<24)+(c3<<16)+(c2<<8)+c1;
}

void ping(){
  uint8_t buf[5];
  buf[0] = 0xff;
  buf[1] = 2;
  buf[2] = MAJOR_VERSION;
  buf[3] = MINOR_VERSION;
  buf[4] = 0xed;
  send(buf,5);
}


void readmemory(){
  uint32_t addr = read32();
  uint32_t count = ugetc();
  uint32_t i;
  uputc(0xfe);
  uputc(count);
  for(i=0;i<count;i++) uputc(*((uint8_t*) addr++));
  uputc(0xed);
}

void writememory(){
  uint32_t addr = read32();
  uint32_t count = ugetc();
  uint32_t i;
  uputc(0xfd);
  uputc(count);
  for(i=0;i<count;i++){
      uint8_t c = ugetc();
      *((uint8_t*) addr++)=c;
      uputc(c);
  }
  uputc(0xed);
}

void writeflash(){
  uint32_t addr = read32();
  uint32_t count = ugetc();
  uint32_t i;
  for(i=0;i<count;i+=4) {
    flash_word_write((uint32_t*)addr, read32());
    addr+=4;
  }
  sendresponse(0xfc);
}

void eraseflash(){
  uint32_t addr = read32();
  flash_page_erase((uint32_t*) addr);
  sendresponse(0xfb);
}

void runcc(){
  uint32_t count = ugetc();
  uputc(0xf8);
  uputc(count);
  for(uint8_t i=0;i<count;i++){
    uint8_t c = ugetc();
    code[i] = c;
    uputc(c);
  }
  uputc(0xed);
  vm_runcc((uint32_t)code);
}

uint8_t rand8(void);



void dispatch(uint8_t c){
  if(c==0xff) ping();
  else if(c==0xfe) readmemory();
  else if(c==0xfd) writememory();
  else if(c==0xfc) writeflash();
  else if(c==0xfb) eraseflash();
  else if(c==0xf8) runcc();
}

int main(void){
  uart_init();
  lib_init();
  timer_init();
  nrf_gpio_pin_set(ROW1);
  nrf_gpio_pin_clear(COL1);
  nrf_delay_ms(500);
  nrf_gpio_pin_clear(ROW1);
  nrf_gpio_pin_set(COL1);
  vm_stop();

  uint32_t end = now()+50;
  while (1){
    while(now()<end){
      if(uavail())dispatch(ugetc());
      if(btna_evt){btna_evt=0; vm_run_toggle(OP_ONBUTTONA);}
      if(btnb_evt){btnb_evt=0; vm_run_toggle(OP_ONBUTTONB);}
    }
    lib_poll();
    vm_run();
    end+=50;
  }
}



#define TX_PIN_NUMBER 24
#define RX_PIN_NUMBER 25

void uart_init(){
  nrf_gpio_cfg_output(TX_PIN_NUMBER);
  nrf_gpio_cfg_input(RX_PIN_NUMBER, NRF_GPIO_PIN_NOPULL);  

  NRF_UART0->PSELTXD = TX_PIN_NUMBER;
  NRF_UART0->PSELRXD = RX_PIN_NUMBER;

  NRF_UART0->BAUDRATE         = (UART_BAUDRATE_BAUDRATE_Baud19200 << UART_BAUDRATE_BAUDRATE_Pos);
  NRF_UART0->ENABLE           = (UART_ENABLE_ENABLE_Enabled << UART_ENABLE_ENABLE_Pos);
  NRF_UART0->TASKS_STARTTX    = 1;
  NRF_UART0->TASKS_STARTRX    = 1;
  NRF_UART0->EVENTS_RXDRDY    = 0;
}

uint8_t ugetc(void)
{
  while(NRF_UART0->EVENTS_RXDRDY!=1){} 
  NRF_UART0->EVENTS_RXDRDY=0;
  return (uint8_t)NRF_UART0->RXD;
}

void uputc(uint8_t c){
  NRF_UART0->TXD = c;
  while (NRF_UART0->EVENTS_TXDRDY!=1){}
  NRF_UART0->EVENTS_TXDRDY=0;
}

bool uavail(){return NRF_UART0->EVENTS_RXDRDY==1;}

void timer_init(){
  NRF_TIMER1->MODE      = TIMER_MODE_MODE_Timer;
  NRF_TIMER1->BITMODE   = TIMER_BITMODE_BITMODE_16Bit;
  NRF_TIMER1->PRESCALER = 0;
  NRF_TIMER1->TASKS_CLEAR = 1;
  NRF_TIMER1->EVENTS_COMPARE[0] = 0;
  NRF_TIMER1->CC[0] = 16000;
  NRF_TIMER1->INTENSET = TIMER_INTENSET_COMPARE0_Enabled << TIMER_INTENSET_COMPARE0_Pos;
  NRF_TIMER1->SHORTS = (TIMER_SHORTS_COMPARE0_CLEAR_Enabled << TIMER_SHORTS_COMPARE0_CLEAR_Pos);
  NVIC_EnableIRQ(TIMER1_IRQn);
  NRF_TIMER1->TASKS_START = 1;
}

void TIMER1_IRQHandler(){
  NRF_TIMER1->EVENTS_COMPARE[0] = 0;
  ticks = (ticks+1)&0x7fffffff;
  lib_ticker();
}

void flash_word_write(uint32_t* p_address, uint32_t value){
  NRF_NVMC->CONFIG = (NVMC_CONFIG_WEN_Wen << NVMC_CONFIG_WEN_Pos);
  while (NRF_NVMC->READY == NVMC_READY_READY_Busy);
  *p_address = value;
  while (NRF_NVMC->READY == NVMC_READY_READY_Busy);
  NRF_NVMC->CONFIG = (NVMC_CONFIG_WEN_Ren << NVMC_CONFIG_WEN_Pos);
  while (NRF_NVMC->READY == NVMC_READY_READY_Busy);
}

void flash_page_erase(uint32_t* p_page){
  NRF_NVMC->CONFIG = (NVMC_CONFIG_WEN_Een << NVMC_CONFIG_WEN_Pos);
  while (NRF_NVMC->READY == NVMC_READY_READY_Busy);
  NRF_NVMC->ERASEPAGE = (uint32_t)p_page;
  while (NRF_NVMC->READY == NVMC_READY_READY_Busy);
  NRF_NVMC->CONFIG = (NVMC_CONFIG_WEN_Ren << NVMC_CONFIG_WEN_Pos);
  while (NRF_NVMC->READY == NVMC_READY_READY_Busy);
}


uint32_t now(){return ticks;}

