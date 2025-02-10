[![Compile Node.js Project](https://github.com/sirfergy/ftmstorscble/actions/workflows/compile.yaml/badge.svg)](https://github.com/sirfergy/ftmstorscble/actions/workflows/compile.yaml)

# ftmstorscble
Reads FTMS treadmill speed data and broadcasts it as a BLE running speed and cadence service. If you have an ANT+ USB stick it will also include cadence information along with the running speed from the treadmill.

# Motivation
I have a Garmin Forerunner watch and a Horizon Fitness treadmill, and wanted to find a way for my Garmin to read the current speed from the treadmill instead of guessing it from my ANT+ foot pod. The ideal solution would be that Garmin supports the BLE FTMS profile, but people have been asking for it for years and it's not materialized.

# Requirements
- nodejs
- follow instructions for your environment for https://github.com/abandonware/noble
- follow instructions for your environment for https://github.com/abandonware/bleno
- MQTT broker
- To not run as sudo, run this from noble
```sh
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

- If you plan to use ANT, please follow the steps [here](https://gallochri.com/2020/05/universal-treadmill-speed-sensor-for-zwift-with-ant-stick-and-raspberry-pi/), with the step for creating a UDEV rule being the most important
  - `lsusb` to get device ID
  - Create UDEV rule
    - `sudo vim /etc/udev/rules.d/Dynastream-ANTUSB-m.rules`
    - `SUBSYSTEM=="usb", ATTRS{idVendor}=="0fcf", ATTRS{idProduct}=="1008", RUN+="/sbin/modprobe usbserial vendor=0x0fcf product=0x1008", MODE="0666", OWNER="pi", GROUP="root"`, replacing 1009 with the ID of your device


# How to use
- `npm install`
- `npm run build`
- `npm run publisher`
- `npm run subscriber`
- To use an MQTT server not running on the local machine (or publisher or subscriber role are on different machines), pass the `--broker mqtt://mqtthost:8113` parameter
- On your Garmin search for a sensor and it _should_ find your machine running as the subscriber

## Raspberry Pi
If you have a Raspberry Pi, the native bluetooth does not support (at least with bleno/noble) both the publisher and subscriber roles. In this case you have two options:

- Setup ftmstorscble on two different Pi's, with one being the publisher and the other the subscriber
- Buy a USB BT dongle that uses a supported chipset, e.g. one based on the rtl8761bu chipset.  
   - You need to set the `NOBLE_HCI_DEVICE_ID` environment variable to the USB adapter when running the publisher command

# Notes
This is written pretty specific for my scenario, but with some additional effort it could be expanded to work for many more scenarios.

# Troubleshooting
## Raspberry Pi
- The USB BT adapter may not power up, you need to disable the soft block using these two steps:
  - `rfkill list`
  - `rfkill unblock bluetooth`
-  The bootloader may have a [bug](https://github.com/raspberrypi/linux/issues/6141) that was recently fixed that prevents the USB BT adapter from initializing. Updating the bootloader resolves
    - `sudo dmesg | grep -i blue` to check for errors initializing the bluetooth controller
    - https://pimylifeup.com/raspberry-pi-bootloader/