'use strict';

const crypto = require('crypto');

const NS = 'http://purenetworks.com/HNAP1/';

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function readTag(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) throw new Error(`DCH-S220 response did not contain ${tag}`);
  return match[1].trim();
}

function hmacMd5(key, value) {
  return crypto.createHmac('md5', key).update(value).digest('hex').toUpperCase();
}

class HnapClient {
  constructor({ ip, username = 'Admin', pin, timeout = 8000 }) {
    this.ip = String(ip).trim();
    this.username = String(username || 'Admin').trim();
    this.pin = String(pin).trim();
    this.timeout = timeout;
    this.cookie = null;
    this.privateKey = null;
  }

  _body(action, content = '') {
    return `<?xml version="1.0" encoding="utf-8"?>` +
      `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
      `xmlns:xsd="http://www.w3.org/2001/XMLSchema" ` +
      `xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
      `<soap:Body><${action} xmlns="${NS}">${content}</${action}></soap:Body></soap:Envelope>`;
  }

  async _post(action, body, authenticated = true) {
    const timestamp = Date.now().toString();
    const actionUri = `${NS}${action}`;
    const soapAction = `"${actionUri}"`;
    const headers = {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: soapAction,
    };

    if (this.cookie) headers.Cookie = `uid=${this.cookie}`;
    if (authenticated) {
      if (!this.privateKey) await this.login();
      headers.HNAP_AUTH = `${hmacMd5(this.privateKey, `${timestamp}${soapAction}`)} ${timestamp}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(`http://${this.ip}/HNAP1/`, {
        method: 'POST', headers, body, signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`DCH-S220 returned HTTP ${response.status}`);
      return text;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Timeout while contacting DCH-S220');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async login() {
    if (!/^\d{6}$/.test(this.pin)) throw new Error('PIN must contain exactly six digits');

    const request = this._body('Login',
      `<Action>request</Action><Username>${escapeXml(this.username)}</Username>` +
      `<LoginPassword></LoginPassword><Captcha></Captcha>`);
    const challengeResponse = await this._post('Login', request, false);
    const challenge = readTag(challengeResponse, 'Challenge');
    const cookie = readTag(challengeResponse, 'Cookie');
    const publicKey = readTag(challengeResponse, 'PublicKey');

    const privateKey = hmacMd5(`${publicKey}${this.pin}`, challenge);
    const loginPassword = hmacMd5(privateKey, challenge);
    this.cookie = cookie;
    this.privateKey = privateKey;

    const login = this._body('Login',
      `<Action>login</Action><Username>${escapeXml(this.username)}</Username>` +
      `<LoginPassword>${loginPassword}</LoginPassword><Captcha></Captcha>`);
    const result = await this._post('Login', login, true);
    const status = readTag(result, 'LoginResult');
    if (!/^success$/i.test(status)) {
      this.cookie = null;
      this.privateKey = null;
      throw new Error(`DCH-S220 login failed: ${status}`);
    }
    return true;
  }

  async action(action, resultTag, content = '') {
    try {
      const xml = await this._post(action, this._body(action, content), true);
      return readTag(xml, resultTag);
    } catch (error) {
      if (/401|login|auth/i.test(error.message)) {
        this.cookie = null;
        this.privateKey = null;
      }
      throw error;
    }
  }

  async getPlayingStatus() {
    const value = await this.action('GetSirenAlarmSettings', 'IsSounding',
      '<ModuleID>1</ModuleID><Controller>1</Controller>');
    return !/^false$|^0$/i.test(value);
  }

  async play(sound, volume, duration) {
    return this.action('SetSoundPlay', 'SetSoundPlayResult',
      `<ModuleID>1</ModuleID><Controller>1</Controller>` +
      `<SoundType>${Number(sound)}</SoundType><Volume>${Number(volume)}</Volume>` +
      `<Duration>${Number(duration)}</Duration>`);
  }

  async stop() {
    return this.action('SetAlarmDismissed', 'SetAlarmDismissedResult',
      '<ModuleID>1</ModuleID><Controller>1</Controller>');
  }

  async beep(times = 1, volume = 20) {
    return this.play(6, Math.min(100, Math.max(1, Number(volume))), times);
  }
}

module.exports = { HnapClient, readTag, hmacMd5 };
