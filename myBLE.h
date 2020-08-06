
void breakpin1();
void breakpin2();
void breakpin3();
void breakpin4();
void ble_init(void);
void ble_send_data(volatile uint16_t* array, uint8_t *length);
void ble_registercb(void (*cb)());
