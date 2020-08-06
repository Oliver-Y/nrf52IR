#include <stdint.h>

#include "nordic_common.h"
#include "nrf.h"

#include "nrf_gpio.h"
#include "nrf_delay.h"
#include "nrf_drv_clock.h"
#include "nrf_drv_gpiote.h"
#include "nrf_drv_ppi.h"
#include <stdint.h>
#include <string.h>
#include "nordic_common.h"
#include "nrf.h"
#include "ble_hci.h"
#include "ble_advdata.h"
#include "ble_advertising.h"
#include "ble_conn_params.h"
#include "nrf_sdh.h"
#include "nrf_sdh_soc.h"
#include "nrf_sdh_ble.h"
#include "nrf_ble_gatt.h"
#include "nrf_ble_qwr.h"
#include "app_timer.h"
#include "ble_nus.h"
#include "app_uart.h"
#include "app_util_platform.h"
#include "bsp_btn_ble.h"
#include "nrf_pwr_mgmt.h"
#include "myBLE.h"

                                      /**< Number of attempts before giving up the connection parameter negotiation. */

//Waveshare LED
#define LED1 NRF_GPIO_PIN_MAP(0,13)
#define LED2 NRF_GPIO_PIN_MAP(0,14)
#define LED3 NRF_GPIO_PIN_MAP(1,9)
#define LED4 NRF_GPIO_PIN_MAP(0,16)

#define BUTTON NRF_GPIO_PIN_MAP(0,11)
#define IN_PIN NRF_GPIO_PIN_MAP(1,10)
#define IR_PIN NRF_GPIO_PIN_MAP(1,14)
#define OUT_PIN NRF_GPIO_PIN_MAP(1,13)

#define LEARN_MODE 1
#define MATCH_MODE 2


volatile uint32_t current_ms = 0;
volatile uint16_t pulse[100];
volatile uint32_t pulse_counter;
volatile uint8_t mode = 1;
volatile uint8_t pattern[100];
volatile uint8_t learn_tim = 0;
volatile uint8_t pulse_tracker = 0;
//volatile uint16_t now;
//volatile uint16_t last_time;

uint32_t ppi_gpio_out_addr;
uint32_t ppi_gpio_in_addr;
//APP_TIMER_DEF(single_shot_id);
uint32_t myCounter = 0;

//Algorithm Changing
static uint8_t find_pattern(volatile uint16_t * p){
  uint8_t pattern_index = 0;
  // I has to start after the initial iteration of the pattern.
  for(int i = 1; i < 100; ++i){
    uint8_t j = i;
    while(p[pattern_index] == p[j]){
      j++;
      pattern_index++;
    }
  }
  return pattern_index;
}

static uint8_t match_pattern(volatile uint8_t *p,volatile uint16_t *t,uint8_t length){
  for (int i = 0; i < length; ++i){
    if (p[i] != t[i]){
      return 0;
    }
  }
  return 1;
}

void find_matchp(){
    uint8_t size = find_pattern(pulse);
    //fills pattern array
    for (int i = 0; i < size; ++i){
      pattern[i] = pulse[i];
    }
    //matches
    uint8_t logic = match_pattern(pattern,pulse,size);
    if(logic == 1){
      breakpin1();
    }

}


//Bluetooth callback function
void pulse_cb(uint32_t p){
  if(p == 1){
    breakpin1();
  }
  if(p == 3){
    breakpin3();
  }
  if(p==5){
    mode = 2;
  }
}

// Software Timer?
/*static void tim_init(){
  nrf_drv_clock_init();
  nrf_drv_clock_lfclk_request(NULL);
 app_timer_create(&single_shot_id,
                                APP_TIMER_MODE_SINGLE_SHOT,
                                single_timer_handler);*/
//}

void pulse_array_init(){
  for(int i = 0; i < sizeof(pulse)/sizeof(uint32_t); ++i){
    pulse[i] = 0;
  }
}

//pulsing functions
//Change to hardware capture
void pulser(nrf_drv_gpiote_pin_t pin, nrf_gpiote_polarity_t action){
    mode = 1;
   learn_tim = current_ms + 30000;
   if (mode == LEARN_MODE){
  if(pulse_counter == 0){
    //last_time = current_ms;
    pulse_counter ++;
    nrf_gpio_pin_clear(LED4);
    return;
  }
    nrf_gpio_pin_toggle(LED4);
    //uint32_t now = current_ms;
    if(pulse_counter < sizeof(pulse)/sizeof(pulse[0])){
    //  pulse[pulse_counter++] = now - last_time;
    }
    if (pulse_counter > 1000){
      //breakpin3();
    }
  //  last_time = now;
  }
if (mode == MATCH_MODE){
  find_matchp();
  }
}


void pulsehandler_init(){
  pulse_array_init();
  uint32_t err_code;
  nrf_drv_gpiote_init();
  nrf_drv_gpiote_out_config_t config = GPIOTE_CONFIG_OUT_TASK_TOGGLE(true);
  config.init_state = true;
  err_code = nrf_drv_gpiote_out_init(LED4,&config);
  APP_ERROR_CHECK(err_code);

  nrf_drv_gpiote_in_config_t config1 = GPIOTE_CONFIG_IN_SENSE_HITOLO(true);
  config1.pull = NRF_GPIO_PIN_NOPULL;
  nrf_drv_gpiote_in_init(IN_PIN,&config1,pulser);
  nrf_drv_gpiote_in_event_enable(IN_PIN, true);
}

  /*nrf_drv_gpiote_in_config_t config2 = GPIOTE_CONFIG_IN_SENSE_TOGGLE(true);
  config2.pull = NRF_GPIO_PIN_NOPULL;
  nrf_drv_gpiote_in_init(BUTTON,&config2,in_pin_handler);
  nrf_drv_gpiote_in_event_enable(BUTTON, true);
}

void in_pin_handler(nrf_drv_gpiote_pin_t pin, nrf_gpiote_polarity_t action){
  nrf_gpio_pin_toggle(LED1);
}*/
/*void GPIOTE_IRQHandler(void) {
  if (NRF_GPIOTE -> EVENTS_IN[1] !=0){
    NRF_GPIOTE-> EVENTS_IN[1] = 0;
    nrf_gpio_pin_toggle(4);
  }
} */
void time_capture(nrf_drv_gpiote_pin_t pin, nrf_gpiote_polarity_t action){
  //now = NRF_TIMER2->CC[1];
  //NRF_TIMER2 -> EVENTS_COMPARE[1] = 0;
//  NRF_GPIOTE->EVENTS_IN[1] = 0;
//  last_time = NRF_TIMER2 -> CC[1];
//  NRF_TIMER2 -> TASKS_CAPTURE[1] = 1;
  //now = NRF_TIMER2 -> CC[1];
  //pulse[pulse_counter++] = NRF_TIMER2->CC[1];
//  now = NRF_TIMER2->CC[1];
//  pulse[pulse_counter++] = NRF_TIMER2->CC[1];
//  last_time = now;
//  last_time = now;
//  NRF_TIMER2 -> TASKS_CLEAR = 1;
  //last_time = now;
  nrf_gpio_pin_toggle(OUT_PIN);
  nrf_gpio_pin_toggle(LED4);
}

void gpio_init(){
//  NRF_GPIOTE->CONFIG[0] |= 0b00000000000000110000110100000011;
//  NRF_GPIOTE->CONFIG[0] = (GPIOTE_CONFIG_MODE_Task << GPIOTE_CONFIG_MODE_Pos);
//  NRF_GPIOTE->CONFIG[0] = (LED1 << GPIOTE_CONFIG_PSEL_Pos);
//  NRF_GPIOTE->CONFIG[0] = (GPIOTE_CONFIG_POLARITY_Toggle << GPIOTE_CONFIG_POLARITY_Pos);

  /*NRF_GPIOTE->CONFIG[0] = GPIOTE_CONFIG_MODE_Task << GPIOTE_CONFIG_MODE_Pos |                             // 3<<0
                                         GPIOTE_CONFIG_POLARITY_Toggle << GPIOTE_CONFIG_POLARITY_Pos |      // 3<<16
                                         LED1 << GPIOTE_CONFIG_PSEL_Pos ;*/

/*  NRF_GPIOTE->CONFIG[1] = GPIOTE_CONFIG_MODE_Event << GPIOTE_CONFIG_MODE_Pos |                             // 3<<0
                                        GPIOTE_CONFIG_POLARITY_Toggle << GPIOTE_CONFIG_POLARITY_Pos |      // 3<<16
                                        IR_PIN << GPIOTE_CONFIG_PSEL_Pos ;
  NRF_GPIOTE -> INTENSET |= GPIOTE_INTENSET_IN1_Msk;
  sd_nvic_SetPriority(GPIOTE_IRQn,3);
  sd_nvic_EnableIRQ(GPIOTE_IRQn);*/

  nrf_gpio_cfg_output(OUT_PIN);
  nrf_drv_gpiote_init();
  nrf_drv_gpiote_out_config_t config = GPIOTE_CONFIG_OUT_TASK_TOGGLE(true);
  config.init_state = true;
  nrf_drv_gpiote_out_init(LED1,&config);
  ppi_gpio_out_addr = nrf_drv_gpiote_out_task_addr_get(LED1);
  nrf_drv_gpiote_out_task_enable(LED1);

  nrf_drv_gpiote_in_config_t config1 = GPIOTE_CONFIG_IN_SENSE_HITOLO(true);
  config1.pull = NRF_GPIO_PIN_NOPULL;
  nrf_drv_gpiote_in_init(IR_PIN,&config1,time_capture);
  ppi_gpio_in_addr = nrf_drv_gpiote_in_event_addr_get(IR_PIN);
  nrf_drv_gpiote_in_event_enable(IR_PIN, true);
;


  /*NRF_GPIOTE->CONFIG[1] = GPIOTE_CONFIG_MODE_Event << GPIOTE_CONFIG_MODE_Pos |
                                          IR_PIN << GPIOTE_CONFIG_PSEL_Pos |
                                          GPIOTE_CONFIG_POLARITY_Toggle << GPIOTE_CONFIG_POLARITY_Pos ;
  //NRF_GPIOTE->INTENSET |= GPIOTE_INTENSET_IN1_Msk << GPIOTE_INTENSET_IN1_Pos;
  NRF_GPIOTE->INTENSET |= 0b00000000000000000000000000000010;*/
//  nrf_gpio_cfg_output(LED1);
//  nrf_gpiote_task_configure(0,LED1,NRF_GPIOTE_POLARITY_TOGGLE, NRF_GPIOTE_INITIAL_VALUE_LOW);
  nrf_gpio_cfg_output(LED3);
  nrf_gpio_cfg_output(LED4);
  nrf_gpio_pin_toggle(LED3);
  nrf_gpio_pin_toggle(LED4);
}

//Timer functions
void timer_init()
{
  /*nrf_drv_clock_init();
  nrf_drv_clock_lfclk_request(NULL);
  while(!nrf_drv_clock_lfclk_is_running()){}*/
  NRF_TIMER1->MODE      = TIMER_MODE_MODE_Timer << TIMER_MODE_MODE_Pos;
  NRF_TIMER1->BITMODE   = TIMER_BITMODE_BITMODE_16Bit;
  NRF_TIMER1->PRESCALER = 8;
  NRF_TIMER1->TASKS_CLEAR = 1;
  //NRF_TIMER1->EVENTS_COMPARE[0] = 0;
    NRF_TIMER1->CC[0] = 31250;
//  NRF_TIMER1->TASKS_CAPTURE[1] = 1;
//    NRF_TIMER1->INTENSET = TIMER_INTENSET_COMPARE0_Enabled << TIMER_INTENSET_COMPARE0_Pos;
//  NRF_TIMER1->INTENSET = TIMER_INTENSET_COMPARE0_Msk;
//  NRF_TIMER1->SHORTS                  = TIMER_SHORTS_COMPARE0_CLEAR_Msk;
  NRF_TIMER1->SHORTS = (TIMER_SHORTS_COMPARE0_CLEAR_Enabled << TIMER_SHORTS_COMPARE0_CLEAR_Pos);
//  NRF_TIMER1->SHORTS = (TIMER_SHORTS_COMPARE1_CLEAR_Msk << 0);
  //sd_nvic_SetPriority(TIMER1_IRQn,3);
  //sd_nvic_EnableIRQ(TIMER1_IRQn);
  NRF_TIMER1->TASKS_START = 1;
}

/*void TIMER2_IRQHandler(){
  NRF_TIMER2->EVENTS_COMPARE[1] = 0;
  nrf_gpio_pin_toggle(LED3);
} */

void timer2_init(){
  NRF_TIMER2->MODE = TIMER_MODE_MODE_Timer << TIMER_MODE_MODE_Pos;
  NRF_TIMER2->BITMODE   = TIMER_BITMODE_BITMODE_16Bit;
  NRF_TIMER2->PRESCALER = 9;
  NRF_TIMER2->TASKS_CLEAR = 1;
  //NRF_TIMER2->CC[0] = 62500;
  //NRF_TIMER2->SHORTS = (TIMER_SHORTS_COMPARE0_CLEAR_Enabled << TIMER_SHORTS_COMPARE0_CLEAR_Pos);
  NRF_TIMER2->TASKS_START = 1;
  NRF_TIMER2->TASKS_CAPTURE[1] = 1;
  //last_time = 0;
}

/*void TIMER1_IRQHandler()
{
//NRF_TIMER1->EVENTS_COMPARE[0] = 0;
  nrf_gpio_pin_toggle(LED4);
} */

void ppi_init(){
  nrf_drv_ppi_init();
  nrf_drv_ppi_channel_alloc(NRF_PPI_CHANNEL0);
  nrf_drv_ppi_channel_assign(NRF_PPI_CHANNEL0,(uint32_t)&NRF_TIMER1 ->EVENTS_COMPARE[0],ppi_gpio_out_addr);
//  nrf_drv_ppi_channel_assign(NRF_PPI_CHANNEL0,(uint32_t)&NRF_TIMER1 ->EVENTS_COMPARE[0],
//(uint32_t)&NRF_GPIOTE ->TASKS_OUT[0]);
  nrf_drv_ppi_channel_enable(NRF_PPI_CHANNEL0);
//  NRF_PPI -> CH[0].EEP = (uint32_t)&NRF_TIMER1 ->EVENTS_COMPARE[0];
//  NRF_PPI -> CH[0].TEP = (uint32_t)&NRF_GPIOTE ->TASKS_OUT[0];
//  NRF_PPI->CHENSET = PPI_CHEN_CH0_Enabled << PPI_CHEN_CH0_Pos;
/*  NRF_PPI -> CH[1].EEP = (uint32_t)&NRF_GPIOTE -> EVENTS_IN[1];
  NRF_PPI -> CH[1].TEP = (uint32_t)&NRF_TIMER1 -> TASKS_CAPTURE[1];
  NRF_PPI->CHENSET = PPI_CHEN_CH1_Enabled << PPI_CHEN_CH1_Pos;*/

}
void ppi2_init(){
//  nrf_drv_ppi_init();
//  nrf_drv_ppi_assign(NRF_PPI_CHANNEL1,
//  NRF_PPI -> CH[1].EEP = ppi_gpio_in_addr;
  NRF_PPI -> CH[1].EEP = (uint32_t)&NRF_LPCOMP -> EVENTS_DOWN;
  NRF_PPI -> CH[1].TEP = (uint32_t)&NRF_TIMER2 ->TASKS_CAPTURE[1];
  NRF_PPI->FORK[1].TEP = (uint32_t)&NRF_TIMER2->TASKS_CLEAR;
  NRF_PPI->CHENSET = PPI_CHEN_CH1_Enabled << PPI_CHEN_CH1_Pos;
}
/*void lpcomp_event_handler(nrf_lpcomp_event_t event) {
  nrf_gpio_pin_toggle(LED4);
  //NRF_LPCOMP -> EVENTS_CROSS = 0;
  //NRF_LPCOMP -> TASKS_SAMPLE = 1;
}*/

void lpcomp_init(){
/*  nrf_drv_lpcomp_config_t config = NRF_DRV_LPCOMP_DEFAULT_CONFIG;
  config.input = NRF_LPCOMP_INPUT_0;
  nrf_drv_lpcomp_init(&config, lpcomp_event_handler);
  nrf_drv_lpcomp_enable(); */
  NRF_LPCOMP -> PSEL = (LPCOMP_PSEL_PSEL_AnalogInput2 << LPCOMP_PSEL_PSEL_Pos);
  NRF_LPCOMP ->REFSEL |= (LPCOMP_REFSEL_REFSEL_SupplyFourEighthsPrescaling << LPCOMP_REFSEL_REFSEL_Pos);
//  NRF_LPCOMP -> HYST |= (LPCOMP_HYST_HYST_Hyst50mV << LPCOMP_HYST_HYST_Pos);
  NRF_LPCOMP -> ANADETECT = (LPCOMP_ANADETECT_ANADETECT_Down << LPCOMP_ANADETECT_ANADETECT_Pos);
  NRF_LPCOMP -> INTENSET = LPCOMP_INTENSET_DOWN_Msk;
  NRF_LPCOMP -> ENABLE = LPCOMP_ENABLE_ENABLE_Enabled;
  sd_nvic_SetPriority(LPCOMP_IRQn,6);
  sd_nvic_EnableIRQ(LPCOMP_IRQn);
  nrf_gpio_cfg_output(LED4);
  nrf_gpio_pin_toggle(LED4);
  NRF_LPCOMP -> TASKS_START = 1;
}
void LPCOMP_IRQHandler(void){
  pulse[pulse_counter++] = NRF_TIMER2->CC[1];
  NRF_LPCOMP->EVENTS_DOWN = 0;
  nrf_gpio_pin_toggle(LED4);

  //nrf_gpio_pin_write (OUT_PIN,NRF_LPCOMP->RESULT);
  //NRF_LPCOMP->TASKS_SAMPLE = 1;
}

/*void comp_init(){
  NRF_COMP -> PSEL |= (COMP_PSEL_PSEL_AnalogInput2 << COMP_PSEL_PSEL_Pos);
  NRF_COMP -> REFSEL |= (COMP_REFSEL_REFSEL_Int2V4 << COMP_REFSEL_REFSEL_Pos);
  NRF_COMP -> MODE |= (COMP_MODE_SP_High << COMP_MODE_SP_Pos);
  NRF_COMP -> MODE |= (COMP_MODE_MAIN_SE << COMP_MODE_MAIN_Pos);
  NRF_COMP -> INTENSET = COMP_INTENSET_CROSS_Msk;
  NRF_COMP -> ENABLE = COMP_ENABLE_ENABLE_Enabled;
  sd_nvic_SetPriority(TEMP_IRQn,6);
  sd_nvic_EnableIRQ(TEMP_IRQn);
  nrf_gpio_cfg_output(LED4);
  nrf_gpio_pin_toggle(LED4);
  NRF_COMP -> TASKS_START = 1;
}
void TEMP_IRQHandler(void){
  pulse[pulse_counter++] = NRF_TIMER2 -> CC[1];
  NRF_COMP->EVENTS_CROSS = 0;
  nrf_gpio_pin_toggle(LED4);
}*/


int main(void)
{
  //  tim_init();
  //  gpio_init();
    //pulsehandler_init();
  //  timer_init();
//    ppi_init();
    timer2_init();
    lpcomp_init();
    //comp_init();
    ppi2_init();
    ble_init();
  //  ble_registercb(&pulse_cb);
  //  uint32_t timeout = current_ms + 10000;
  //this should be set
  while(1) {
    nrf_pwr_mgmt_run();
    uint8_t l = 100;
    ble_send_data(pulse,&l);
/*    if(current_ms > timeout){
      uint8_t l = 100;
//      nrf_gpio_pin_toggle(LED2);
      ble_send_data(pulse,&l);
      timeout += 10000;
    }
    if (mode == LEARN_MODE){
      if (learn_tim != 0)
      {
        nrf_gpio_pin_clear(LED1);
        if(current_ms > learn_tim){
          nrf_gpio_pin_toggle(LED1);
          mode = MATCH_MODE;
      }
    }
  }

}*/
}
}
