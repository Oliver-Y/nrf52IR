#include "MicroBitConfig.h"
#include "MicroBitTicker.h"
#include "MicroBitSystemTimer.h"

volatile int32_t ticks = 0;

MicroBitTicker::MicroBitTicker(){
    system_timer_add_component(this);
}

void MicroBitTicker::systemTick(){
	ticks++;
}

MicroBitTicker::~MicroBitTicker(){
    system_timer_remove_component(this);
}
