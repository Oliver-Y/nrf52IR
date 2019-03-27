#include "ble.h"
#include "ble_hci.h"
#include "ble_srv_common.h"
#include "ble_advdata.h"
#include "ble_advertising.h"
#include "ble_conn_params.h"
#include "ble_nus.h"
#include "ble_conn_state.h"

#include "softdevice_handler.h"
#include "app_timer.h"

#define APP_FEATURE_NOT_SUPPORTED       BLE_GATT_STATUS_ATTERR_APP_BEGIN + 2

#define CENTRAL_LINK_COUNT 0
#define PERIPHERAL_LINK_COUNT 1

#define DEVICE_NAME "micro:bit"
#define NUS_SERVICE_UUID_TYPE           BLE_UUID_TYPE_VENDOR_BEGIN

#define APP_ADV_INTERVAL                64
#define APP_ADV_TIMEOUT_IN_SECONDS      180

#define MIN_CONN_INTERVAL    MSEC_TO_UNITS(20, UNIT_1_25_MS)
#define MAX_CONN_INTERVAL    MSEC_TO_UNITS(75, UNIT_1_25_MS)
#define SLAVE_LATENCY				 0
#define CONN_SUP_TIMEOUT		 MSEC_TO_UNITS(4000, UNIT_10_MS)

#define FIRST_CONN_PARAMS_UPDATE_DELAY  APP_TIMER_TICKS(5000, APP_TIMER_PRESCALER)
#define NEXT_CONN_PARAMS_UPDATE_DELAY   APP_TIMER_TICKS(30000, APP_TIMER_PRESCALER)
#define MAX_CONN_PARAMS_UPDATE_COUNT    3

#define APP_TIMER_PRESCALER      0
#define APP_TIMER_OP_QUEUE_SIZE  2

void (*ble_data_callback)(uint8_t *data, uint16_t length);

ble_nus_t m_nus;
uint16_t  m_conn_handle = BLE_CONN_HANDLE_INVALID;
uint32_t m_err;

ble_uuid_t  m_adv_uuids[] = {{BLE_UUID_NUS_SERVICE, NUS_SERVICE_UUID_TYPE}};

void print(int32_t);
void prh(unsigned int);
void prs(char*);

void on_adv_evt(ble_adv_evt_t ble_adv_evt)
{
	/* uint32_t err_code; */

	switch (ble_adv_evt)
	{
		case BLE_ADV_EVT_FAST:
			/* err_code = bsp_indication_set(BSP_INDICATE_ADVERTISING); */
			/* APP_ERROR_CHECK(err_code); */
			break;
		case BLE_ADV_EVT_IDLE:
			/* sleep_mode_enter(); */
			break;
		default:
			break;
	}
}

void on_conn_params_evt(ble_conn_params_evt_t * p_evt)
{
	uint32_t err_code;

	if (p_evt->evt_type == BLE_CONN_PARAMS_EVT_FAILED)
	{
		err_code = sd_ble_gap_disconnect(m_conn_handle, BLE_HCI_CONN_INTERVAL_UNACCEPTABLE);
		APP_ERROR_CHECK(err_code);
	}
}

void conn_params_error_handler(uint32_t nrf_error)
{
	APP_ERROR_HANDLER(nrf_error);
}

void conn_params_init(void)
{
	uint32_t               err_code;
	ble_conn_params_init_t cp_init;

	memset(&cp_init, 0, sizeof(cp_init));

	cp_init.p_conn_params                  = NULL;
	cp_init.first_conn_params_update_delay = FIRST_CONN_PARAMS_UPDATE_DELAY;
	cp_init.next_conn_params_update_delay  = NEXT_CONN_PARAMS_UPDATE_DELAY;
	cp_init.max_conn_params_update_count   = MAX_CONN_PARAMS_UPDATE_COUNT;
	cp_init.start_on_notify_cccd_handle    = BLE_GATT_HANDLE_INVALID;
	cp_init.disconnect_on_fail             = false;
	cp_init.evt_handler                    = on_conn_params_evt;
	cp_init.error_handler                  = conn_params_error_handler;

	err_code = ble_conn_params_init(&cp_init);
//	APP_ERROR_CHECK(err_code);
	m_err = err_code;
}

void on_ble_evt(ble_evt_t * p_ble_evt)
{
	uint32_t err_code;

	switch (p_ble_evt->header.evt_id)
	{
		case BLE_GAP_EVT_CONNECTED:
			/* err_code = bsp_indication_set(BSP_INDICATE_CONNECTED); */
			/* APP_ERROR_CHECK(err_code); */
			m_conn_handle = p_ble_evt->evt.gap_evt.conn_handle;
			break; // BLE_GAP_EVT_CONNECTED

		case BLE_GAP_EVT_DISCONNECTED:
			/* err_code = bsp_indication_set(BSP_INDICATE_IDLE); */
			/* APP_ERROR_CHECK(err_code); */
			m_conn_handle = BLE_CONN_HANDLE_INVALID;
			break; // BLE_GAP_EVT_DISCONNECTED

		case BLE_GAP_EVT_SEC_PARAMS_REQUEST:
			// Pairing not supported
			err_code = sd_ble_gap_sec_params_reply(m_conn_handle, BLE_GAP_SEC_STATUS_PAIRING_NOT_SUPP, NULL, NULL);
			APP_ERROR_CHECK(err_code);
			break; // BLE_GAP_EVT_SEC_PARAMS_REQUEST

		case BLE_GATTS_EVT_SYS_ATTR_MISSING:
			// No system attributes have been stored.
			err_code = sd_ble_gatts_sys_attr_set(m_conn_handle, NULL, 0, 0);
			APP_ERROR_CHECK(err_code);
			break; // BLE_GATTS_EVT_SYS_ATTR_MISSING

		case BLE_GATTC_EVT_TIMEOUT:
			// Disconnect on GATT Client timeout event.
			err_code = sd_ble_gap_disconnect(p_ble_evt->evt.gattc_evt.conn_handle,
																			 BLE_HCI_REMOTE_USER_TERMINATED_CONNECTION);
			APP_ERROR_CHECK(err_code);
			break; // BLE_GATTC_EVT_TIMEOUT

		case BLE_GATTS_EVT_TIMEOUT:
			// Disconnect on GATT Server timeout event.
			err_code = sd_ble_gap_disconnect(p_ble_evt->evt.gatts_evt.conn_handle,
																			 BLE_HCI_REMOTE_USER_TERMINATED_CONNECTION);
			APP_ERROR_CHECK(err_code);
			break; // BLE_GATTS_EVT_TIMEOUT

		case BLE_EVT_USER_MEM_REQUEST:
			err_code = sd_ble_user_mem_reply(p_ble_evt->evt.gattc_evt.conn_handle, NULL);
			APP_ERROR_CHECK(err_code);
			break; // BLE_EVT_USER_MEM_REQUEST

		case BLE_GATTS_EVT_RW_AUTHORIZE_REQUEST:
		{
			ble_gatts_evt_rw_authorize_request_t  req;
			ble_gatts_rw_authorize_reply_params_t auth_reply;

			req = p_ble_evt->evt.gatts_evt.params.authorize_request;

			if (req.type != BLE_GATTS_AUTHORIZE_TYPE_INVALID)
			{
				if ((req.request.write.op == BLE_GATTS_OP_PREP_WRITE_REQ)     ||
					(req.request.write.op == BLE_GATTS_OP_EXEC_WRITE_REQ_NOW) ||
					(req.request.write.op == BLE_GATTS_OP_EXEC_WRITE_REQ_CANCEL))
				{
					if (req.type == BLE_GATTS_AUTHORIZE_TYPE_WRITE)
					{
						auth_reply.type = BLE_GATTS_AUTHORIZE_TYPE_WRITE;
					}
					else
					{
						auth_reply.type = BLE_GATTS_AUTHORIZE_TYPE_READ;
					}
					auth_reply.params.write.gatt_status = APP_FEATURE_NOT_SUPPORTED;
					err_code = sd_ble_gatts_rw_authorize_reply(p_ble_evt->evt.gatts_evt.conn_handle,
																										 &auth_reply);
					APP_ERROR_CHECK(err_code);
				}
			}
		} break; // BLE_GATTS_EVT_RW_AUTHORIZE_REQUEST

		default:
				// No implementation needed.
				break;
	}
}

void ble_evt_dispatch(ble_evt_t * p_ble_evt)
{
	ble_conn_params_on_ble_evt(p_ble_evt);
	ble_nus_on_ble_evt(&m_nus, p_ble_evt);
	on_ble_evt(p_ble_evt);
	ble_advertising_on_ble_evt(p_ble_evt);
}

#define NRF_CLOCK_LFCLKSRC {.source = NRF_CLOCK_LF_SRC_RC, .rc_ctiv = 16, .rc_temp_ctiv = 2, .xtal_accuracy=NRF_CLOCK_LF_XTAL_ACCURACY_20_PPM}

void ble_stack_init(void)
{
  uint32_t err_code;

  /* nrf_clock_lf_cfg_t clock_lf_cfg = { */
    /* .source = NRF_CLOCK_LF_SRC_RC, */
    /* .rc_ctiv       = 16, */
    /* .rc_temp_ctiv  = 2, */
    /* .xtal_accuracy = NRF_CLOCK_LF_XTAL_ACCURACY_250_PPM}; */
  nrf_clock_lf_cfg_t clock_lf_cfg = NRF_CLOCK_LFCLKSRC;

  SOFTDEVICE_HANDLER_INIT(&clock_lf_cfg, NULL);

  ble_enable_params_t ble_enable_params;
  err_code = softdevice_enable_get_default_config(CENTRAL_LINK_COUNT,
                                                  PERIPHERAL_LINK_COUNT,
                                                  &ble_enable_params);
  APP_ERROR_CHECK(err_code);

  CHECK_RAM_START_ADDR(CENTRAL_LINK_COUNT, PERIPHERAL_LINK_COUNT);

  err_code = softdevice_enable(&ble_enable_params);
  APP_ERROR_CHECK(err_code);

  err_code = softdevice_ble_evt_handler_set(ble_evt_dispatch);
  APP_ERROR_CHECK(err_code);
}

void gap_params_init(void)
{
	uint32_t                err_code;
	ble_gap_conn_params_t   gap_conn_params;
	ble_gap_conn_sec_mode_t sec_mode;

	BLE_GAP_CONN_SEC_MODE_SET_OPEN(&sec_mode);

	err_code = sd_ble_gap_device_name_set(&sec_mode,
																				(const uint8_t *) DEVICE_NAME,
																				strlen(DEVICE_NAME));
	APP_ERROR_CHECK(err_code);

	memset(&gap_conn_params, 0, sizeof(gap_conn_params));

	gap_conn_params.min_conn_interval = MIN_CONN_INTERVAL;
	gap_conn_params.max_conn_interval = MAX_CONN_INTERVAL;
	gap_conn_params.slave_latency     = SLAVE_LATENCY;
	gap_conn_params.conn_sup_timeout  = CONN_SUP_TIMEOUT;

	err_code = sd_ble_gap_ppcp_set(&gap_conn_params);
	APP_ERROR_CHECK(err_code);
}

void nus_data_handler(ble_nus_t * p_nus, uint8_t * p_data, uint16_t length)
{
  (*ble_data_callback)(p_data, length);
}

void services_init()
{
	uint32_t       err_code;
	ble_nus_init_t nus_init;

	memset(&nus_init, 0, sizeof(nus_init));

	nus_init.data_handler = nus_data_handler;

	err_code = ble_nus_init(&m_nus, &nus_init);
	APP_ERROR_CHECK(err_code);
}

void advertising_init(void)
{
	uint32_t               err_code;
	ble_advdata_t          advdata;
	ble_advdata_t          scanrsp;
	ble_adv_modes_config_t options;

	// Build advertising data struct to pass into @ref ble_advertising_init.
	memset(&advdata, 0, sizeof(advdata));
	advdata.name_type          = BLE_ADVDATA_FULL_NAME;
	advdata.include_appearance = false;
	advdata.flags              = BLE_GAP_ADV_FLAGS_LE_ONLY_LIMITED_DISC_MODE;

	memset(&scanrsp, 0, sizeof(scanrsp));
	scanrsp.uuids_complete.uuid_cnt = sizeof(m_adv_uuids) / sizeof(m_adv_uuids[0]);
	scanrsp.uuids_complete.p_uuids  = m_adv_uuids;

	memset(&options, 0, sizeof(options));
	options.ble_adv_fast_enabled  = true;
	options.ble_adv_fast_interval = APP_ADV_INTERVAL;
	options.ble_adv_fast_timeout  = APP_ADV_TIMEOUT_IN_SECONDS;

	err_code = ble_advertising_init(&advdata, &scanrsp, &options, on_adv_evt, NULL);
	APP_ERROR_CHECK(err_code);
}

uint32_t ble_begin(void)
{
  uint32_t err_code;
  err_code = ble_advertising_start(BLE_ADV_MODE_FAST);
  return err_code;
}

uint32_t ble_send_data(uint8_t *array, uint8_t length)
{
  return ble_nus_string_send(&m_nus, array, length);
}

void ble_init(void (*cb)(uint8_t *data, uint16_t length))
{
  APP_TIMER_INIT(APP_TIMER_PRESCALER, APP_TIMER_OP_QUEUE_SIZE, false);
  ble_data_callback = cb;
  ble_stack_init();
	gap_params_init();
	services_init();
  advertising_init();
	conn_params_init();
	ble_begin();
}
