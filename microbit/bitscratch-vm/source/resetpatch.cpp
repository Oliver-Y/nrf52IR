#include "MicroBit.h"

gpio_t reset_button_gpio;
gpio_irq_t reset_button_gpio_irq;

void reset_button_handler(uint32_t data, gpio_irq_event event) {
	(void) data;
  if (event == IRQ_FALL) microbit_reset();
}

void resetPatch(){
  gpio_init_in(&reset_button_gpio, MICROBIT_PIN_BUTTON_RESET);
  gpio_mode(&reset_button_gpio, PullUp);
  gpio_irq_init(&reset_button_gpio_irq, MICROBIT_PIN_BUTTON_RESET, &reset_button_handler, 1 /* dummy, must be non-zero */);
  gpio_irq_set(&reset_button_gpio_irq, IRQ_FALL, 1);
}
