// ==UserScript==
// @name         Japan profile autofill
// @description  Fetch data from api.chixiaotao.cn/api/jp and fill the current form
// @match        *://*/*
// @connect      api.chixiaotao.cn
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// ==/UserScript==

(function () {
  'use strict';

  const API_URL = 'https://api.chixiaotao.cn/api/jp';

  let profile = null;
  let profilePromise = null;

  const KANA_CHARS = [
    'ア', 'イ', 'ウ', 'エ', 'オ',
    'カ', 'キ', 'ク', 'ケ', 'コ',
    'サ', 'シ', 'ス', 'セ', 'ソ',
    'タ', 'チ', 'ツ', 'テ', 'ト',
    'ナ', 'ニ', 'ヌ', 'ネ', 'ノ',
    'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
    'マ', 'ミ', 'ム', 'メ', 'モ',
    'ヤ', 'ユ', 'ヨ',
    'ラ', 'リ', 'ル', 'レ', 'ロ',
    'ワ', 'ン'
  ];

  const JAPAN_PREF_MAP = {
    Hokkaido: '北海道',
    Aomori: '青森県',
    Iwate: '岩手県',
    Miyagi: '宮城県',
    Akita: '秋田県',
    Yamagata: '山形県',
    Fukushima: '福島県',
    Ibaraki: '茨城県',
    Tochigi: '栃木県',
    Gunma: '群馬県',
    Saitama: '埼玉県',
    Chiba: '千葉県',
    Tokyo: '東京都',
    Kanagawa: '神奈川県',
    Niigata: '新潟県',
    Toyama: '富山県',
    Ishikawa: '石川県',
    Fukui: '福井県',
    Yamanashi: '山梨県',
    Nagano: '長野県',
    Gifu: '岐阜県',
    Shizuoka: '静岡県',
    Aichi: '愛知県',
    Mie: '三重県',
    Shiga: '滋賀県',
    Kyoto: '京都府',
    Osaka: '大阪府',
    Hyogo: '兵庫県',
    Nara: '奈良県',
    Wakayama: '和歌山県',
    Tottori: '鳥取県',
    Shimane: '島根県',
    Okayama: '岡山県',
    Hiroshima: '広島県',
    Yamaguchi: '山口県',
    Tokushima: '徳島県',
    Kagawa: '香川県',
    Ehime: '愛媛県',
    Kochi: '高知県',
    Fukuoka: '福岡県',
    Saga: '佐賀県',
    Nagasaki: '長崎県',
    Kumamoto: '熊本県',
    Oita: '大分県',
    Miyazaki: '宮崎県',
    Kagoshima: '鹿児島県',
    Okinawa: '沖縄県'
  };

  async function requestJson(url) {
    if (typeof GM !== 'undefined' && GM.xmlHttpRequest) {
      return await new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
          method: 'GET',
          url,
          headers: { Accept: 'application/json' },
          timeout: 20000,
          onload: response => {
            try {
              resolve(JSON.parse(response.responseText));
            } catch (e) {
              reject(new Error('API JSON parse failed'));
            }
          },
          onerror: () => reject(new Error('GM request failed')),
          ontimeout: () => reject(new Error('GM request timeout'))
        });
      });
    }

    if (typeof GM_xmlhttpRequest !== 'undefined') {
      return await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          headers: { Accept: 'application/json' },
          timeout: 20000,
          onload: response => {
            try {
              resolve(JSON.parse(response.responseText));
            } catch (e) {
              reject(new Error('API JSON parse failed'));
            }
          },
          onerror: () => reject(new Error('GM request failed')),
          ontimeout: () => reject(new Error('GM request timeout'))
        });
      });
    }

    const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
    if (!res.ok) throw new Error('API request failed: ' + res.status);
    return await res.json();
  }

  async function getProfile(forceNew = false) {
    if (profile && !forceNew) return profile;

    if (!profilePromise || forceNew) {
      profilePromise = requestJson(API_URL)
        .then(json => {
          if (!json || !json.ok || !json.data) {
            throw new Error('API response format invalid');
          }
          profile = json.data;
          return profile;
        })
        .finally(() => {
          profilePromise = null;
        });
    }

    return await profilePromise;
  }

  function fireEvents(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function setInput(selector, value) {
    const el = document.querySelector(selector);
    if (!el || value == null || value === '') return false;

    el.focus();

    const tag = el.tagName.toLowerCase();
    const proto = tag === 'textarea'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    if (setter) setter.call(el, value);
    else el.value = value;

    fireEvents(el);
    return true;
  }

  function setCheckbox(selector, checked) {
    const el = document.querySelector(selector);
    if (!el) return false;

    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'checked'
    )?.set;

    if (setter) setter.call(el, checked);
    else el.checked = checked;

    fireEvents(el);
    return true;
  }

  function setSelect(selector, wantedValues) {
    const el = document.querySelector(selector);
    if (!el) return false;

    const values = Array.isArray(wantedValues) ? wantedValues : [wantedValues];
    const normalized = values
      .map(item => String(item || '').trim().toLowerCase())
      .filter(Boolean);

    const options = [...el.options];

    let option = options.find(opt => {
      const value = String(opt.value || '').trim().toLowerCase();
      return normalized.some(key => value === key);
    });

    if (!option) {
      option = options.find(opt => {
        const text = String(opt.textContent || '').trim().toLowerCase();
        const value = String(opt.value || '').trim().toLowerCase();
        return normalized.some(key =>
          text === key || value === key || text.includes(key) || value.includes(key)
        );
      });
    }

    if (!option) return false;

    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (setter) setter.call(el, option.value);
    else el.value = option.value;

    fireEvents(el);
    return true;
  }

  function setSelectValue(selector, value) {
    const el = document.querySelector(selector);
    if (!el) return false;

    const option = [...el.options].find(opt => String(opt.value) === String(value));
    if (!option) return false;

    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (setter) setter.call(el, option.value);
    else el.value = option.value;

    fireEvents(el);
    return true;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function randomKana(length) {
    let result = '';
    for (let i = 0; i < length; i += 1) {
      result += KANA_CHARS[Math.floor(Math.random() * KANA_CHARS.length)];
    }
    return result;
  }

  function buildKanaName() {
    return {
      firstNameKana: randomKana(3),
      lastNameKana: randomKana(3)
    };
  }

  async function waitForSelectOptions(selector, predicate, timeoutMs = 15000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const el = document.querySelector(selector);
      if (el) {
        const options = [...el.options].map(opt => ({
          value: String(opt.value || ''),
          text: String(opt.textContent || '').trim()
        }));

        if (predicate(options, el)) return true;
      }

      await wait(300);
    }

    return false;
  }

  function getAddressParts(data) {
    const rawAddress = data && data.raw ? data.raw.Trans_Address || '' : '';
    const parts = rawAddress.split(',').map(item => item.trim()).filter(Boolean);

    if (parts.length >= 4) {
      return {
        postalCode: data.billingPostalCode || parts[0],
        state: data.billingState || parts[parts.length - 1],
        city: parts[parts.length - 2] || data.billingCity || '',
        line1: parts.slice(1, -2).join(', ') || data.billingLine1 || '',
        line2: data.billingLine2 || ''
      };
    }

    return {
      postalCode: data.billingPostalCode || '',
      state: data.billingState || '',
      city: data.billingCity || '',
      line1: data.billingLine1 || '',
      line2: data.billingLine2 || ''
    };
  }

  function toJapanesePref(value) {
    const key = String(value || '').trim();
    return JAPAN_PREF_MAP[key] || key;
  }

  function formatExpiry(value) {
    const text = String(value || '').trim();
    const match = text.match(/^(\d{1,2})\/(\d{2,4})$/);
    if (!match) return text;

    const mm = match[1].padStart(2, '0');
    const yy = match[2].slice(-2);
    return `${mm}/${yy}`;
  }

  async function switchCountryToJapan() {
    const changed =
      setSelectValue('#country', 'JP') ||
      setSelect('#country', ['JP', 'Japan', 'japan', 'jp', '日本']);

    if (!changed) return false;

    await wait(1000);

    await waitForSelectOptions(
      '#billingState',
      options => {
        if (options.length <= 1) return false;

        const values = options.map(o => o.value);
        const texts = options.map(o => o.text);
        const country = document.querySelector('#country');
        const countryIsJapan = country && String(country.value).toUpperCase() === 'JP';

        const looksLikeChina =
          values.includes('北京') ||
          values.includes('广东') ||
          texts.includes('北京') ||
          texts.includes('广东') ||
          texts.includes('中国');

        return countryIsJapan && !looksLikeChina;
      },
      15000
    );

    return true;
  }

  async function fillForm(forceNew = false) {
    try {
      const data = await getProfile(forceNew);
      if (!data) throw new Error('No profile data');

      const address = getAddressParts(data);
      const raw = data.raw || {};
      const kanaName = buildKanaName();
      const expiry = formatExpiry(raw.Expires);
      const prefJa = toJapanesePref(address.state || data.billingState);

      await switchCountryToJapan();
      await wait(5000);

      setInput('#email', data.email);

      setSelect('#phoneType', [
        data.phoneType || 'MOBILE',
        'mobile',
        'MOBILE'
      ]);
      setInput('#phone', data.phone);

      setInput('#full-name', data.fullName);
      setInput('#countrySpecificFirstName', kanaName.firstNameKana);
      setInput('#countrySpecificLastName', kanaName.lastNameKana);
      setInput('#firstName', data.firstName);
      setInput('#lastName', data.lastName);

      setInput('#billingPostalCode', address.postalCode);
      setSelect('#billingState', [prefJa, address.state, data.billingState, data.billingCity]);
      setInput('#billingCity', address.city);
      setInput('#billingLine1', address.line1);
      setInput('#billingLine2', address.line2);

      setInput('#cardNumber', raw.Credit_Card_Number);
      setInput('#cardExpiry', expiry);
      setInput('#cardCvv', raw.CVV2);

      setInput('#password', data.password);
      setInput('#dateOfBirth', data.dateOfBirth);

      setSelect('#identityDocumentType', [
        data.identityDocumentType || 'NATIONAL_ID',
        'NATIONAL_ID'
      ]);
      setInput('#identityDocumentNumber', data.identityDocumentNumber);
      setCheckbox('#marketingOptIn', !!data.marketingOptIn);

      updatePanel(data);
    } catch (err) {
      alert('Autofill failed: ' + err.message);
    }
  }

  function profileText(data) {
    return [
      'Email: ' + (data.email || ''),
      'Password: ' + (data.password || ''),
      'Phone: +81 ' + (data.phone || ''),
      'Name: ' + (data.fullName || ''),
      'State: ' + (data.billingState || ''),
      'City: ' + (data.billingCity || ''),
      'Address: ' + (data.billingLine1 || ''),
      'Postal: ' + (data.billingPostalCode || ''),
      'Birthday: ' + (data.dateOfBirth || '')
    ].join('\n');
  }

  function copyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      document.execCommand('copy');
      alert('Copied');
    } catch (e) {
      alert(text);
    }

    textarea.remove();
  }

  function updatePanel(data) {
    const email = document.getElementById('__jp_email__');
    if (!email) return;

    document.getElementById('__jp_email__').value = data.email || '';
    document.getElementById('__jp_password__').value = data.password || '';
    document.getElementById('__jp_phone__').value = '+81 ' + (data.phone || '');
    document.getElementById('__jp_name__').value = data.fullName || '';
    document.getElementById('__jp_addr__').value =
      `${data.billingLine1 || ''}, ${data.billingCity || ''}, ${data.billingPostalCode || ''}`;
  }

  function createPanel() {
    if (document.getElementById('__jp_autofill_panel__')) return;

    const panel = document.createElement('div');
    panel.id = '__jp_autofill_panel__';
    panel.style.cssText = `
      position: fixed;
      left: 10px;
      right: 10px;
      bottom: 18px;
      z-index: 2147483647;
      background: #111;
      color: #fff;
      border-radius: 12px;
      padding: 12px;
      font-size: 13px;
      box-shadow: 0 4px 20px rgba(0,0,0,.35);
    `;

    panel.innerHTML = `
      <div style="font-weight:700;margin-bottom:8px;">Japan profile autofill</div>

      <div>Email</div>
      <input id="__jp_email__" readonly style="width:100%;box-sizing:border-box;background:#222;color:#0f0;border:1px solid #555;border-radius:8px;padding:8px;margin:4px 0 8px;">

      <div>Password</div>
      <input id="__jp_password__" readonly style="width:100%;box-sizing:border-box;background:#222;color:#0f0;border:1px solid #555;border-radius:8px;padding:8px;margin:4px 0 8px;">

      <div>Phone</div>
      <input id="__jp_phone__" readonly style="width:100%;box-sizing:border-box;background:#222;color:#0f0;border:1px solid #555;border-radius:8px;padding:8px;margin:4px 0 8px;">

      <div>Name</div>
      <input id="__jp_name__" readonly style="width:100%;box-sizing:border-box;background:#222;color:#0f0;border:1px solid #555;border-radius:8px;padding:8px;margin:4px 0 8px;">

      <div>Address</div>
      <input id="__jp_addr__" readonly style="width:100%;box-sizing:border-box;background:#222;color:#0f0;border:1px solid #555;border-radius:8px;padding:8px;margin:4px 0 8px;">

      <div style="display:flex;gap:8px;margin-top:8px;">
        <button id="__jp_fill__" style="flex:1;padding:10px;border-radius:8px;border:0;">Fill</button>
        <button id="__jp_new__" style="flex:1;padding:10px;border-radius:8px;border:0;">New</button>
        <button id="__jp_copy__" style="flex:1;padding:10px;border-radius:8px;border:0;">Copy</button>
        <button id="__jp_close__" style="flex:1;padding:10px;border-radius:8px;border:0;">Close</button>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('__jp_fill__').onclick = () => fillForm(false);
    document.getElementById('__jp_new__').onclick = () => {
      profile = null;
      fillForm(true);
    };
    document.getElementById('__jp_copy__').onclick = async () => {
      const data = await getProfile(false);
      copyText(profileText(data));
    };
    document.getElementById('__jp_close__').onclick = () => {
      setPanelClosed(true);
      panel.remove();
    };
  }

  function isPanelClosed() {
    return window.__jp_panel_closed__ === true;
  }

  function setPanelClosed(value) {
    window.__jp_panel_closed__ = !!value;
  }

  if (!isPanelClosed()) {
    createPanel();
  }

  getProfile(false)
    .then(data => updatePanel(data))
    .catch(err => alert('Load profile failed: ' + err.message));

  const observer = new MutationObserver(() => {
    if (!isPanelClosed()) {
      createPanel();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
