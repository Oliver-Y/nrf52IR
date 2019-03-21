#include <stdint.h>

#include "nordic_common.h"
#include "nrf.h"
#include "nrf_gpio.h"
#include "nrf_nvic.h"
#include "app_timer.h"
#include "fstorage.h"

#include "microbit.h"
#include "lib/vm.h"
#include "lib/vm_uart.h"
#include "lib/vm_ble.h"

#define APP_TIMER_PRESCALER      0
#define APP_TIMER_OP_QUEUE_SIZE  4

volatile uint32_t ticks = 0;

static uint8_t fs_callback_flag;

static void cfg_led_row(uint32_t pin)
{
  nrf_gpio_cfg(
      pin,
      NRF_GPIO_PIN_DIR_OUTPUT,
      NRF_GPIO_PIN_INPUT_DISCONNECT,
      NRF_GPIO_PIN_NOPULL,
      NRF_GPIO_PIN_H0H1,
      NRF_GPIO_PIN_NOSENSE);
}

static void cfg_led_matrix(void)
{
  cfg_led_row(13);
  cfg_led_row(4);
  nrf_gpio_pin_clear(13);
  nrf_gpio_pin_set(4);
}

void send(uint8_t *buf, int len){
  int i;
  for(i=0;i<len;i++) uputc(*buf++);
}

void ble_data_received(uint8_t *data, uint16_t length)
{
  /* vm_uart_print(data, length); */
}

void uart_data_handle(uint8_t *data, uint16_t length)
{
  uint32_t err_code = ble_send_data(data, length);
  APP_ERROR_CHECK(err_code);
}

void timer_init()
{
  NRF_TIMER1->MODE      = TIMER_MODE_MODE_Timer;
  NRF_TIMER1->BITMODE   = TIMER_BITMODE_BITMODE_16Bit;
  NRF_TIMER1->PRESCALER = 5;
  NRF_TIMER1->TASKS_CLEAR = 1;
  NRF_TIMER1->EVENTS_COMPARE[0] = 0;
  NRF_TIMER1->EVENTS_COMPARE[1] = 0;
  NRF_TIMER1->CC[0] = 500;
  NRF_TIMER1->CC[1] = 25000;
  NRF_TIMER1->INTENSET = TIMER_INTENSET_COMPARE0_Enabled << TIMER_INTENSET_COMPARE0_Pos;
  NRF_TIMER1->SHORTS = (TIMER_SHORTS_COMPARE0_CLEAR_Enabled << TIMER_SHORTS_COMPARE0_CLEAR_Pos);
  NRF_TIMER1->INTENSET = TIMER_INTENSET_COMPARE1_Enabled << TIMER_INTENSET_COMPARE1_Pos;
  NRF_TIMER1->SHORTS = (TIMER_SHORTS_COMPARE1_CLEAR_Enabled << TIMER_SHORTS_COMPARE1_CLEAR_Pos);
  sd_nvic_SetPriority(TIMER1_IRQn, 3);
  sd_nvic_EnableIRQ(TIMER1_IRQn);
  /* NVIC_EnableIRQ(TIMER1_IRQn); */
  NRF_TIMER1->TASKS_START = 1;
}

void TIMER1_IRQHandler()
{
  if ((NRF_TIMER1->EVENTS_COMPARE[0] != 0) &&
     ((NRF_TIMER1->INTENSET & TIMER_INTENSET_COMPARE0_Msk) != 0)) {
    NRF_TIMER1->EVENTS_COMPARE[0] = 0;
    ticks = (ticks+1)&0x7fffffff;
    /* [> lib_ticker(); <] */
  }
  if ((NRF_TIMER1->EVENTS_COMPARE[1] != 0) &&
     ((NRF_TIMER1->INTENSET & TIMER_INTENSET_COMPARE1_Msk) != 0)) {
    NRF_TIMER1->EVENTS_COMPARE[1] = 0;
    vm_run();
  }
}

static void fs_evt_handler(fs_evt_t const * const evt, fs_ret_t result)
{
  if (result == FS_SUCCESS) {
    if (evt->id == FS_EVT_STORE) {
      fs_callback_flag = 0;
    }
  }
}

FS_REGISTER_CFG(fs_config_t fs_config) =
{
  .p_start_addr = (uint32_t*) 0x30000,
  .callback = fs_evt_handler,
  .num_pages = 32,
  .priority = 0xfe
};

void flash_write(uint8_t page, uint32_t value)
{
  fs_ret_t ret = fs_store(&fs_config, fs_config.p_start_addr + page, &value, 1, NULL);
  APP_ERROR_CHECK(ret);
  while(fs_callback_flag == 1){power_manage();}
}

void flash_erase(uint8_t page)
{
  fs_callback_flag = 1;
  fs_ret_t ret = fs_erase(&fs_config, fs_config.p_start_addr + page, 1, NULL);
  APP_ERROR_CHECK(ret);
}

uint32_t flash_read(uint8_t page)
{
  return *(fs_config.p_start_addr + page);
}

void fstorage_init()
{
  fs_ret_t ret = fs_init();
  APP_ERROR_CHECK(ret);
}

/* void dispatch(uint8_t c){ */
  /* if(c==0xff) ping(); */
  /* else if(c==0xfe) readmemory(); */
  /* else if(c==0xfd) writememory(); */
  /* else if(c==0xfc) writeflash(); */
  /* else if(c==0xfb) eraseflash(); */
  /* else if(c==0xf8) runcc(); */
/* } */

/* void writeflash(){ */
  /* uint32_t addr = read32(); */
  /* uint32_t count = ugetc(); */
  /* uint32_t i; */
  /* for(i=0;i<count;i+=4) { */
      /* flash_word_write((uint32_t*)addr, read32()); */
      /* addr+=4; */
    /* } */
  /* [> sendresponse(0xfc); <] */
/* } */

int main(void)
{
	uint32_t err_code;

  APP_TIMER_INIT(APP_TIMER_PRESCALER, APP_TIMER_OP_QUEUE_SIZE, false);
  /* uart_init(uart_data_handle); */
  uart_init();
  timer_init();

  cfg_led_matrix();
  ble_init(ble_data_received);

  err_code = ble_begin();
  APP_ERROR_CHECK(err_code);

  fstorage_init();

  flash_erase(0);
  static uint32_t data = 0x47414147;
  flash_write(0, data);

  uint32_t rdata = flash_read(0);
  for (int i=0; i<4; i++) {
    uputc(rdata >> (8 * i));
  }
  send("\r\n", 2);

  vm_stop();

  for (;;)
  {
    if (NRF_UART0->EVENTS_RXDRDY==1) {
      uputc(ugetc());
    }
  }
}
