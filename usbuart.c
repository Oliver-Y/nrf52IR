#include "app_usbd_core.h"
#include "app_usbd.h"
#include "app_usbd_string_desc.h"
#include "app_usbd_cdc_acm.h"
#include "app_usbd_serial_num.h"
#include "nrf_gpio.h"

//#include "vm.h"

#define CDC_ACM_COMM_INTERFACE  0
#define CDC_ACM_COMM_EPIN       NRF_DRV_USBD_EPIN2

#define CDC_ACM_DATA_INTERFACE  1
#define CDC_ACM_DATA_EPIN       NRF_DRV_USBD_EPIN1
#define CDC_ACM_DATA_EPOUT      NRF_DRV_USBD_EPOUT1

#define BLUE_LED NRF_GPIO_PIN_MAP(1,10)

uint8_t rxbuf[256];
uint8_t rxoutptr = 0;
uint8_t rxlen = 0;
bool txempty = true;

void cdc_acm_user_ev_handler(app_usbd_class_inst_t const*, app_usbd_cdc_acm_user_event_t);
void usbd_user_ev_handler(app_usbd_event_type_t);

APP_USBD_CDC_ACM_GLOBAL_DEF(m_app_cdc_acm,
                            cdc_acm_user_ev_handler,
                            CDC_ACM_COMM_INTERFACE,
                            CDC_ACM_DATA_INTERFACE,
                            CDC_ACM_COMM_EPIN,
                            CDC_ACM_DATA_EPIN,
                            CDC_ACM_DATA_EPOUT,
                            APP_USBD_CDC_COMM_PROTOCOL_AT_V250
);


void usbserial_init(){
  static const app_usbd_config_t usbd_config = {
      .ev_state_proc = usbd_user_ev_handler
  };
  app_usbd_serial_num_generate();
  app_usbd_init(&usbd_config);
  app_usbd_class_inst_t const * class_cdc_acm = app_usbd_cdc_acm_class_inst_get(&m_app_cdc_acm);
  app_usbd_class_append(class_cdc_acm);
  app_usbd_power_events_enable();
  nrf_gpio_cfg_output(BLUE_LED);
}

void usbd_user_ev_handler(app_usbd_event_type_t event){
  switch (event){
    case APP_USBD_EVT_STOPPED:
        app_usbd_disable();
        break;
    case APP_USBD_EVT_POWER_DETECTED:
        if (!nrf_drv_usbd_is_enabled()) app_usbd_enable();
        break;
    case APP_USBD_EVT_POWER_REMOVED:
        app_usbd_stop();
        break;
    case APP_USBD_EVT_POWER_READY:
        app_usbd_start();
        break;
    default:
        break;
  }
}

void cdc_acm_user_ev_handler(app_usbd_class_inst_t const * p_inst,
                                    app_usbd_cdc_acm_user_event_t event){
    app_usbd_cdc_acm_t const *p_cdc_acm = app_usbd_cdc_acm_class_get(p_inst);
    switch (event){
    case APP_USBD_CDC_ACM_USER_EVT_PORT_OPEN:
      nrf_gpio_pin_set(BLUE_LED);
      app_usbd_cdc_acm_read_any(&m_app_cdc_acm,rxbuf,256);
      break;
    case APP_USBD_CDC_ACM_USER_EVT_PORT_CLOSE:
      nrf_gpio_pin_clear(BLUE_LED);
      break;
    case APP_USBD_CDC_ACM_USER_EVT_RX_DONE:
      rxlen = app_usbd_cdc_acm_rx_size(p_cdc_acm);
      rxoutptr = 0;
      break;
    case APP_USBD_CDC_ACM_USER_EVT_TX_DONE:
      txempty = true;
      break;
    default:
      break;
  }
}

void uputc(uint8_t c){
  while(!txempty) app_usbd_event_queue_process();
  txempty = false;
  app_usbd_cdc_acm_write(&m_app_cdc_acm, &c, 1);
}

uint8_t ugetc(){
  uint8_t res = rxbuf[rxoutptr++];
  if(rxoutptr==rxlen) app_usbd_cdc_acm_read_any(&m_app_cdc_acm,rxbuf,256);
  return res;
}

void upoll(){while (app_usbd_event_queue_process()){}}
bool uavail(){return rxlen>rxoutptr;}
