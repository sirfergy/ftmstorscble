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
    - `SUBSYSTEM=="usb", ATTRS{idVendor}=="0fcf", ATTRS{idProduct}=="1009", RUN+="/sbin/modprobe usbserial vendor=0x0fcf product=0x1009", MODE="0666", OWNER="pi", GROUP="root"`, replacing 1009 with the ID of your device


# How to use


# Notes
This is written pretty specific for my scenario, but with some additional effort it could be expanded to work for many more scenarios.

On linux, you have to use my fork of noble due to a recent change to the kernel. I have a [PR](https://github.com/abandonware/noble/pull/349) out but not sure when it'll be merged.