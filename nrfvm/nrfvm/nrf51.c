#include "nrf_gpio.h"
#include "nrf_nvic.h"
#include "softdevice_handler.h"

void lib_ticker(void);
volatile uint32_t ticks;
void prh(unsigned int);

#define TX_PIN_NUMBER 24
#define RX_PIN_NUMBER 25

volatile uint8_t flash_busy;

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
  NRF_TIMER1->PRESCALER = 4;
  NRF_TIMER1->TASKS_CLEAR = 1;
  NRF_TIMER1->EVENTS_COMPARE[0] = 0;
  NRF_TIMER1->CC[0] = 1000;
  NRF_TIMER1->INTENSET = TIMER_INTENSET_COMPARE0_Enabled << TIMER_INTENSET_COMPARE0_Pos;
  NRF_TIMER1->SHORTS = (TIMER_SHORTS_COMPARE0_CLEAR_Enabled << TIMER_SHORTS_COMPARE0_CLEAR_Pos);
  sd_nvic_SetPriority(TIMER1_IRQn, 3);
  sd_nvic_EnableIRQ(TIMER1_IRQn);
// NVIC_EnableIRQ(TIMER1_IRQn);
  NRF_TIMER1->TASKS_START = 1;
}

void TIMER1_IRQHandler(){
  NRF_TIMER1->EVENTS_COMPARE[0] = 0;
  ticks = (ticks+1)&0x7fffffff;
  lib_ticker();
}

uint32_t now(){return ticks;}

void flash_word_write(uint32_t* dst, uint32_t* src, uint32_t len){
  flash_busy = 1;
  sd_flash_write(dst,src,(len+3)/4);
  while(flash_busy==1);
}

void flash_page_erase(uint32_t* addr){
  uint32_t pagenum = ((uint32_t)addr)/1024;
  flash_busy = 1;
  sd_flash_page_erase(pagenum);
  while(flash_busy==1)sd_app_evt_wait();
}

void sys_evt_dispatch(uint32_t sys_evt){if (sys_evt==NRF_EVT_FLASH_OPERATION_SUCCESS) flash_busy = 0;}
void flash_init(){softdevice_sys_evt_handler_set(sys_evt_dispatch);}

void app_error_fault_handler(uint32_t id, uint32_t pc, uint32_t i){
  error_info_t *info = (error_info_t*) i;
  prh(info->err_code);
  while(1);
}

