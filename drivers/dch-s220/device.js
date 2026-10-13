'use strict';

const Homey = require('homey');
const { HnapClient } = require('../../lib/hnap-client');

module.exports = class DchS220Device extends Homey.Device {
  async onInit() {
    this._createClient();

    await this._setDefault('siren_sound', '5');
    await this._migrateVolume();
    await this._setDefault('siren_volume', 0.2);
    await this._setDefault('siren_duration', 5);

    this.registerCapabilityListener('onoff', async value => {
      if (value) return this.play();
      return this.stop();
    });
    this.registerCapabilityListener('siren_sound', async value => this.setCapabilityValue('siren_sound', String(value)));
    this.registerCapabilityListener('siren_volume', async value => this.setCapabilityValue('siren_volume', Number(value)));
    this.registerCapabilityListener('siren_duration', async value => this.setCapabilityValue('siren_duration', Number(value)));

    await this.refreshStatus().catch(error => this._handleError(error));
    this._startPolling();
    this.log('DCH-S220 initialized');
  }

  _createClient() {
    const settings = this.getSettings();
    this.client = new HnapClient({
      ip: settings.ip,
      username: settings.username || 'Admin',
      pin: settings.pin,
    });
  }

  async _setDefault(capability, value) {
    if (this.getCapabilityValue(capability) === null) await this.setCapabilityValue(capability, value);
  }

  async _migrateVolume() {
    const current = Number(this.getCapabilityValue('siren_volume'));
    if (Number.isFinite(current) && current > 1) {
      await this.setCapabilityValue('siren_volume', Math.min(1, current / 100));
    }
  }

  _startPolling() {
    if (this.pollTimer) this.homey.clearInterval(this.pollTimer);
    const seconds = Math.max(5, Number(this.getSetting('poll_interval') || 15));
    this.pollTimer = this.homey.setInterval(() => {
      this.refreshStatus().catch(error => this._handleError(error));
    }, seconds * 1000);
  }

  async refreshStatus() {
    const playing = await this.client.getPlayingStatus();
    await this.setCapabilityValue('onoff', playing);
    await this.setAvailable();
    return playing;
  }

  async play(options = {}) {
    const sound = Math.min(6, Math.max(1, Number(options.sound ?? this.getCapabilityValue('siren_sound') ?? 5)));
    const volume = options.volume !== undefined
      ? Math.min(100, Math.max(1, Number(options.volume)))
      : Math.round(Math.min(1, Math.max(0.01, Number(this.getCapabilityValue('siren_volume') ?? 0.2))) * 100);
    const duration = Math.min(300, Math.max(1, Number(options.duration ?? this.getCapabilityValue('siren_duration') ?? 5)));
    await this.client.play(sound, volume, duration);
    await this.setCapabilityValue('onoff', true);
    return true;
  }

  async stop() {
    await this.client.stop();
    await this.setCapabilityValue('onoff', false);
    return true;
  }

  async beep(times = 1, requestedVolume) {
    const volume = requestedVolume !== undefined && Number.isFinite(Number(requestedVolume))
      ? Math.min(100, Math.max(1, Math.round(Number(requestedVolume))))
      : Math.round(Math.min(1, Math.max(0.01, Number(this.getCapabilityValue('siren_volume') ?? 0.2))) * 100);
    await this.client.beep(Math.min(20, Math.max(1, Number(times))), volume);
    return true;
  }

  async chimeSequences(times = 1, requestedVolume) {
    const sequences = Math.min(5, Math.max(1, Math.round(Number(times) || 1)));
    const volume = requestedVolume !== undefined && Number.isFinite(Number(requestedVolume))
      ? Math.min(100, Math.max(1, Math.round(Number(requestedVolume))))
      : Math.round(Math.min(1, Math.max(0.01, Number(this.getCapabilityValue('siren_volume') ?? 0.2))) * 100);

    for (let sequence = 0; sequence < sequences; sequence += 1) {
      await this.client.play(5, volume, 1);
      await this.setCapabilityValue('onoff', true);
      if (sequence < sequences - 1) {
        await new Promise(resolve => this.homey.setTimeout(resolve, 5000));
      }
    }
    return true;
  }

  async onSettings({ changedKeys }) {
    if (changedKeys.some(key => ['ip', 'username', 'pin'].includes(key))) {
      this._createClient();
      await this.refreshStatus();
    }
    if (changedKeys.includes('poll_interval')) this._startPolling();
  }

  async _handleError(error) {
    this.error(error.message);
    await this.setUnavailable(`DCH-S220: ${error.message}`).catch(() => {});
  }

  async onDeleted() {
    if (this.pollTimer) this.homey.clearInterval(this.pollTimer);
  }
};
