#ifndef VM_BLE_H__
#define VM_BLE_H__

#include "ble_nus.h"
#include "ble_advertising.h"
#include "ble_conn_params.h"

ble_nus_t m_nus;
uint16_t  m_conn_handle;
ble_uuid_t  m_adv_uuids;

void on_adv_evt(ble_adv_evt_t ble_adv_evt);
void on_conn_params_evt(ble_conn_params_evt_t p_evt);
void power_manage(void);
void conn_params_error_handler(uint32_t nrf_error);
void conn_params_init(void);
void on_ble_evt(ble_evt_t p_ble_evt);
void ble_evt_dispatch(ble_evt_t p_ble_evt);
void ble_stack_init(void);
void gap_params_init(void);
void nus_data_handler(ble_nus_t p_nus, uint8_t * p_data, uint16_t length);
void services_init();
void advertising_init(void);
uint32_t ble_begin(void);
uint32_t ble_send_data(uint8_t *array, uint8_t length);
void ble_init(void (*cb)(uint8_t *data, uint16_t length));

#endif
