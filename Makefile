PROJECT_NAME     := scratch-microvm_microbit
TARGETS          := scratch-microvm_microbit
OUTPUT_DIRECTORY := _build

# Download nRF5 SDK v12.3.0 from https://developer.nordicsemi.com/
SDK_ROOT := /usr/local/nRF5_SDK_12.3.0
PROJ_DIR := .

$(OUTPUT_DIRECTORY)/scratch-microvm_microbit.out: \
  LINKER_SCRIPT  := scratch-microvm_microbit-firmware.ld

# Source files common to all targets
SRC_FILES += \
  $(SDK_ROOT)/components/ble/ble_advertising/ble_advertising.c \
	$(SDK_ROOT)/components/ble/ble_services/ble_nus/ble_nus.c \
  $(SDK_ROOT)/components/ble/common/ble_advdata.c \
  $(SDK_ROOT)/components/ble/common/ble_conn_params.c \
  $(SDK_ROOT)/components/ble/common/ble_srv_common.c \
  $(SDK_ROOT)/components/drivers_nrf/clock/nrf_drv_clock.c \
  $(SDK_ROOT)/components/drivers_nrf/common/nrf_drv_common.c \
	$(SDK_ROOT)/components/libraries/fstorage/fstorage.c \
  $(SDK_ROOT)/components/libraries/timer/app_timer.c \
  $(SDK_ROOT)/components/libraries/util/app_error.c \
  $(SDK_ROOT)/components/libraries/util/app_error_weak.c \
  $(SDK_ROOT)/components/libraries/util/app_util_platform.c \
  $(SDK_ROOT)/components/softdevice/common/softdevice_handler/softdevice_handler.c \
  $(SDK_ROOT)/components/toolchain/gcc/gcc_startup_nrf51.S \
  $(SDK_ROOT)/components/toolchain/system_nrf51.c \
	$(PROJ_DIR)/lib/lib.c \
  $(PROJ_DIR)/lib/vm.c \
  $(PROJ_DIR)/lib/vm_ble.c \
	$(PROJ_DIR)/lib/vm_uart.c \
  $(PROJ_DIR)/main.c \

# Include folders common to all targets
INC_FOLDERS += \
  $(SDK_ROOT)/components/ble/ble_advertising \
  $(SDK_ROOT)/components/ble/ble_services/ble_nus \
  $(SDK_ROOT)/components/ble/common \
  $(SDK_ROOT)/components/device \
  $(SDK_ROOT)/components/drivers_nrf/clock \
  $(SDK_ROOT)/components/drivers_nrf/common \
  $(SDK_ROOT)/components/drivers_nrf/delay \
  $(SDK_ROOT)/components/drivers_nrf/hal \
  $(SDK_ROOT)/components/drivers_nrf/uart \
  $(SDK_ROOT)/components/libraries/experimental_section_vars \
	$(SDK_ROOT)/components/libraries/fifo \
  $(SDK_ROOT)/components/libraries/fstorage \
  $(SDK_ROOT)/components/libraries/log \
  $(SDK_ROOT)/components/libraries/log/src \
  $(SDK_ROOT)/components/libraries/timer \
  $(SDK_ROOT)/components/libraries/util \
  $(SDK_ROOT)/components/softdevice/s130/headers \
  $(SDK_ROOT)/components/toolchain \
  $(SDK_ROOT)/components/toolchain/cmsis/include \
  $(SDK_ROOT)/components/softdevice/common/softdevice_handler \
	$(PROJ_DIR) \

# Libraries common to all targets
LIB_FILES += \

# C flags common to all targets
CFLAGS += -DBOARD_MICROBIT
CFLAGS += -DSOFTDEVICE_PRESENT
CFLAGS += -DNRF51
CFLAGS += -DS130
CFLAGS += -DBLE_STACK_SUPPORT_REQD
CFLAGS += -DSWI_DISABLE0
CFLAGS += -DNRF51822
CFLAGS += -DNRF_SD_BLE_API_VERSION=2
CFLAGS += -mcpu=cortex-m0
CFLAGS += -mthumb -mabi=aapcs
CFLAGS +=  -Wall -O3 -g3
CFLAGS += -mfloat-abi=soft
# keep every function in separate section, this allows linker to discard unused ones
CFLAGS += -ffunction-sections -fdata-sections -fno-strict-aliasing
CFLAGS += -fno-builtin --short-enums

# C++ flags common to all targets
CXXFLAGS += \

# Assembler flags common to all targets
ASMFLAGS += -x assembler-with-cpp
ASMFLAGS += -DBOARD_PCA10028
ASMFLAGS += -DSOFTDEVICE_PRESENT
ASMFLAGS += -DNRF51
ASMFLAGS += -DS130
ASMFLAGS += -DBLE_STACK_SUPPORT_REQD
ASMFLAGS += -DSWI_DISABLE0
ASMFLAGS += -DNRF51822
ASMFLAGS += -DNRF_SD_BLE_API_VERSION=2
ASMFLAGS += -D__HEAP_SIZE=1024

# Linker flags
LDFLAGS += -mthumb -mabi=aapcs -L $(TEMPLATE_PATH) -T$(LINKER_SCRIPT)
LDFLAGS += -mcpu=cortex-m0
# let linker to dump unused sections
LDFLAGS += -Wl,--gc-sections
# use newlib in nano version
LDFLAGS += --specs=nano.specs -lc -lnosys

.PHONY: $(TARGETS) default all clean help flash flash_softdevice

# Default target - first one defined
default: combined

TEMPLATE_PATH := $(SDK_ROOT)/components/toolchain/gcc

include $(TEMPLATE_PATH)/Makefile.common

$(foreach target, $(TARGETS), $(call define_target, $(target)))

combined: $(OUTPUT_DIRECTORY)/scratch-microvm_microbit.hex
	@echo Merging: $< and s130 hex
	mergehex -m $< $(SDK_ROOT)/components/softdevice/s130/hex/s130_nrf51_2.0.1_softdevice.hex -o $(OUTPUT_DIRECTORY)/scratch-microvm_microbit-combined.hex

# Flash the program
flash: combined
	@echo Flashing: $(OUTPUT_DIRECTORY)/scratch-microvm_microbit-combined.hex
	cp $(OUTPUT_DIRECTORY)/scratch-microvm_microbit-combined.hex /Volumes/MICROBIT
