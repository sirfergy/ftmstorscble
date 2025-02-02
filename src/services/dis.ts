import bleno from "@abandonware/bleno";

const DIS_SERVICE_UUID = '180A';
const MANUFACTURER_NAME_CHAR_UUID = '2A29';
const MODEL_NUMBER_CHAR_UUID = '2A24';
const SERIAL_NUMBER_CHAR_UUID = '2A25';
const HARDWARE_REVISION_CHAR_UUID = '2A27';
const FIRMWARE_REVISION_CHAR_UUID = '2A26';
const SOFTWARE_REVISION_CHAR_UUID = '2A28';

const manufacturerName = new bleno.Characteristic({
    uuid: MANUFACTURER_NAME_CHAR_UUID,
    properties: ['read'],
    value: Buffer.from('MyManufacturer')
});

const modelNumber = new bleno.Characteristic({
    uuid: MODEL_NUMBER_CHAR_UUID,
    properties: ['read'],
    value: Buffer.from('Model123')
});

const serialNumber = new bleno.Characteristic({
    uuid: SERIAL_NUMBER_CHAR_UUID,
    properties: ['read'],
    value: Buffer.from('SN123456')
});

const hardwareRevision = new bleno.Characteristic({
    uuid: HARDWARE_REVISION_CHAR_UUID,
    properties: ['read'],
    value: Buffer.from('Rev1')
});

const firmwareRevision = new bleno.Characteristic({
    uuid: FIRMWARE_REVISION_CHAR_UUID,
    properties: ['read'],
    value: Buffer.from('FW1.0')
});

const softwareRevision = new bleno.Characteristic({
    uuid: SOFTWARE_REVISION_CHAR_UUID,
    properties: ['read'],
    value: Buffer.from('SW1.0')
});

export class DeviceInformationService extends bleno.PrimaryService {
    constructor() {
        super({
            uuid: DIS_SERVICE_UUID,
            characteristics: [
                manufacturerName,
                modelNumber,
                serialNumber,
                hardwareRevision,
                firmwareRevision,
                softwareRevision
            ]
        });
    }
}