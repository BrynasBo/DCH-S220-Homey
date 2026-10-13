# D-Link DCH-S220 for Homey

Experimental Homey SDK 3 driver for local control of a D-Link DCH-S220 Wi-Fi siren over HNAP.

## Version 0.1.9

- Pair by local IP address, username (`Admin`) and the six-digit PIN from the label.
- Read playing status.
- Start and stop the siren.
- Select sounds 1–6, volume 1–100% and duration from 1 second in Flows.
- Flow actions for play, stop, beep and 1–5 individual door-chime signals.
- Beep and door-chime Flow cards have their own 1–100% volume setting.
- Beep actions use the volume selected on the device.
- Step-by-step pairing guide for WPS, IP reservation and the six-digit PIN.
- New app and device artwork.
- Loud-sound warning during installation.
- No D-Link cloud connection and no computer-side proxy required.

## Install for testing

1. Extract the project on the development computer.
2. Open Command Prompt in the project folder.
3. Run `npm install`.
4. Run `homey app validate`.
5. Run `homey app run` and select the Homey Pro.
6. Add a DCH-S220 device in Homey and enter its local credentials.

Keep the siren on a reserved DHCP address. Do not publish screenshots containing the PIN.

## Attribution

HNAP actions and device parameters were cross-checked against:

- mtflud/DCH-S220-Web-Control (ISC)
- ldotlopez/python-hnap and ha-hnap-device

This project does not use the obsolete mydlink cloud service.
