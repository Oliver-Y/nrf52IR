# scratch-microvm

Scratch MicroVM is a stack based, token threaded, virtual machine used to represent, run, and maintain the state of programs for embedded devices

### micro:bit Reference Implementation

This implementation of the MicroVM uses the [micro:bit](https://microbit.org/) as the target platform. The micro:bit features the nRF51822, a 32-bit Cortex-M0 processor running at 16MHz with 16KB of RAM and 256KB of flash (early rev. had just 128KB).

The micro:bit also includes a 25 LED 5x5 matrix display, two momentary switches, accelerometer and magnetometer, and general purpose I/O pins exposed via an edge connector.

The Nordic Bluetooth stack consumes approximately half of the available RAM on the micro:bit leaving only ~8KB free. Selecting the micro:bit as a reference implementation demonstrates the ability of the MicroVM to perform even in memory constrained environments.

Finally, the micro:bit employs the [Arm Mbed DAPLink](https://github.com/ARMmbed/DAPLink) on a secondary MCU which provides a simple USB mass storage interface for programming flash memory and avoids the need for specialized programming hardware.

## Getting Started

#### Required Software
- [GNU Arm Embedded Toolchain](https://developer.arm.com/tools-and-software/open-source-software/developer-tools/gnu-toolchain/gnu-rm/downloads)
- [nRF51 SDK v12.3.0](https://developer.nordicsemi.com/)  
Extract to `/usr/local/nRF5_SDK_12.3.0` or update Makefile
- Scratch Link (Lets Scratch connect to Bluetooth devices)  
Get from the [micro:bit extension page](https://scratch.mit.edu/microbit), section 'Install Scratch Link'

#### Require Hardware
- [micro:bit](https://microbit.org/)
- microUSB cable

#### Compiling and Installing
1. Download the MicroVM source code  
`git clone https://github.com/llk/scratch-microvm	`
2. Compile the combined MicroVM firmware and Nordic SoftDevice .hex file  
`cd scratch-microvm`  
`make`
3. Connect the micro:bit to the computer's USB port and copy over the compiled .hex file from  
`_build/scratch-microvm_microbit-combined.hex`  
alternatively you can run `make flash` from the scratch-microvm directory

#### Using the MicroVM
1. Make sure Scratch Link is running, Bluetooth is enabled, and the micro:bit is powered on with the MicroVM firmware.
2. Launch the Scratch demo at  
https://llk.github.io/scratch-gui/microvm
3. Click the 'Add Extension' button and choose the microvm extension  
![Add Extension](https://lh3.googleusercontent.com/6VWlZudJ4pe3HKIkfJUNVtlhqUx6E7lkG01a7exQFY6h4XH8zh37yPmZ1w2IgIvu49sl_JZhZzs=s220)
4. Click 'Connect' in the popup dialog next to the discovered MicroVM device
5. The MicroVM will use Direct Control mode while connected to Scratch
6. Click the ![Download](https://lh3.googleusercontent.com/mffAGWd4EGfoY9JsnMijnvBqGgIdzCUqVNBT8Nt_p3QjL0mqXR_rnaIMI2p9CNq_qzY-7FHSsK0=s220) button to store the Scratch code on the MicroVM, then power-cycle or disconnect the MicroVM from Scratch to enter Download and Run mode

#### Direct Control vs. Download and Run
In **Direct Control** mode, Scratch is the computer. The Scratch VM controls the code execution and uses Bluetooth commands to control the operation of the device running the MicroVM.

In **Download and Run mode**, the MicroVM is the computer. Scratch converts graphical code blocks to bytecodes which are then sent to the MicroVM over bluetooth, stored in flash memory, and executed directly on the MicroVM.

This reference implementation is configured to use Direct Control mode whenever the MicroVM is connected to Scratch over Bluetooth. Without an active Bluetooth connection, the MicroVM will enter Download and Run mode, executing any programs (Scratch block stacks) that are stored in flash memory.
