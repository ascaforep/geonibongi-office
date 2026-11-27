/* ============================================================
   건이봉이 오피스 — cats.js
   다섯 비서 고양이 캐릭터를 SVG 로 그립니다.

     window.OfficeCats.svg('geon')      → 몸통까지 있는 고양이 (지도·카드)
     window.OfficeCats.face('geon')     → 얼굴만 (배지·이름표 옆 작은 얼굴)
     window.OfficeCats.faceOf(member)   → 구성원에 저장된 cat 키로 얼굴 그리기
     window.OfficeCats.svgOf(member)    → 구성원에 저장된 cat 키로 몸통 그리기

   고양이가 아닌 구성원(cat 키가 없는 가족)은 얼굴을 그리지 않고
   빈 문자열을 돌려줍니다. 화면 쪽에서 이모지를 그대로 쓰면 됩니다.
   ============================================================ */

(function (global) {
  'use strict';

  var CATS = {
    /* 건이 · 올라 — 라일락 털, 이파리 장식, 다정한 눈 */
    geon: {
      fur: '#C6ADF4', furLight: '#E6DAFF', furDark: '#A585EB',
      inner: '#F9C9DF', ink: '#3F3358', nose: '#F2839B',
      collar: '#8C68DE', extra: 'leaf'
    },
    /* 봉이 · 똑똑이 — 피치 털, 복숭아꽃, 웃는 눈 */
    bong: {
      fur: '#FFC9A8', furLight: '#FFE7D8', furDark: '#F0A379',
      inner: '#FFB0A0', ink: '#5A3B33', nose: '#EE7E92',
      collar: '#E98A5C', extra: 'flower'
    },
    /* 클로드 — 민트 털, 동그란 안경, 책 읽는 고양이 */
    claude: {
      fur: '#ABDFC6', furLight: '#E5F9F0', furDark: '#7CC6A2',
      inner: '#F9C9DF', ink: '#2F4A40', nose: '#EF8DA0',
      collar: '#3E9E76', extra: 'glasses'
    },
    /* 지피티 — 버터 털, 줄무늬, 씩씩한 눈 */
    gpt: {
      fur: '#FBDB90', furLight: '#FFF4D6', furDark: '#E7B84F',
      inner: '#FFB7A0', ink: '#5A4326', nose: '#EE8A9E',
      collar: '#D9A22F', extra: 'stripes'
    },
    /* 안티그래비티 — 하늘 털, 구름 가슴, 반짝이 */
    antigravity: {
      fur: '#ACD8F7', furLight: '#E6F4FF', furDark: '#7FB8E8',
      inner: '#F9C9DF', ink: '#2C4358', nose: '#EF8DA0',
      collar: '#4E92CC', extra: 'cloud'
    }
  };

  var seq = 0;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function furFill(c, uid) {
    return 'url(#fur-' + uid + ')';
  }

  function sparkle(x, y, s, fill) {
    return 'M' + x + ' ' + (y - s) + ' Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y +
      ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) +
      ' Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y +
      ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + ' Z';
  }

  /* 고양이 얼굴 (귀·눈·코·수염) — 몸통 위에 얹을 때와 얼굴만 그릴 때 같이 씁니다 */
  function headMarkup(c, uid, opts) {
    opts = opts || {};
    var g = furFill(c, uid);
    var parts = [];

    /* 귀 */
    parts.push('<path d="M30 34 L27 11 L53 24 Z" fill="' + g + '" stroke="' + g +
      '" stroke-width="6" stroke-linejoin="round"/>');
    parts.push('<path d="M90 34 L93 11 L67 24 Z" fill="' + g + '" stroke="' + g +
      '" stroke-width="6" stroke-linejoin="round"/>');
    parts.push('<path d="M36.5 30 L34.5 17 L47 24.5 Z" fill="' + c.inner + '"/>');
    parts.push('<path d="M83.5 30 L85.5 17 L73 24.5 Z" fill="' + c.inner + '"/>');

    /* 머리 */
    parts.push('<ellipse cx="60" cy="53" rx="34" ry="31" fill="' + g + '"/>');
    parts.push('<ellipse cx="45" cy="37" rx="12" ry="7" fill="#FFFFFF" opacity=".3" transform="rotate(-18 45 37)"/>');

    /* 무늬 */
    if (c.extra === 'stripes') {
      parts.push('<path d="M52 23 Q55 30 54.5 36" stroke="' + c.furDark + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>');
      parts.push('<path d="M60 21.5 Q60 29 60 35" stroke="' + c.furDark + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>');
      parts.push('<path d="M68 23 Q65 30 65.5 36" stroke="' + c.furDark + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>');
      parts.push('<path d="M29 53 h8 M28 59 h8" stroke="' + c.furDark + '" stroke-width="2.6" stroke-linecap="round" opacity=".7"/>');
      parts.push('<path d="M91 53 h-8 M92 59 h-8" stroke="' + c.furDark + '" stroke-width="2.6" stroke-linecap="round" opacity=".7"/>');
    }

    /* 눈 */
    parts.push('<ellipse cx="47.5" cy="53" rx="5.7" ry="6.7" fill="' + c.ink + '"/>');
    parts.push('<ellipse cx="72.5" cy="53" rx="5.7" ry="6.7" fill="' + c.ink + '"/>');
    parts.push('<circle cx="49.5" cy="50.6" r="1.9" fill="#FFFFFF"/>');
    parts.push('<circle cx="74.5" cy="50.6" r="1.9" fill="#FFFFFF"/>');
    parts.push('<circle cx="45.8" cy="55.6" r="1" fill="#FFFFFF" opacity=".75"/>');
    parts.push('<circle cx="70.8" cy="55.6" r="1" fill="#FFFFFF" opacity=".75"/>');

    if (c.extra === 'glasses') {
      parts.push('<circle cx="47.5" cy="53" r="9" fill="#FFFFFF" opacity=".26" stroke="' + c.ink + '" stroke-width="1.9"/>');
      parts.push('<circle cx="72.5" cy="53" r="9" fill="#FFFFFF" opacity=".26" stroke="' + c.ink + '" stroke-width="1.9"/>');
      parts.push('<path d="M56.5 52.5 Q60 51 63.5 52.5" stroke="' + c.ink + '" stroke-width="1.9" fill="none"/>');
      parts.push('<path d="M38.5 51 L31 48" stroke="' + c.ink + '" stroke-width="1.6" opacity=".8"/>');
      parts.push('<path d="M81.5 51 L89 48" stroke="' + c.ink + '" stroke-width="1.6" opacity=".8"/>');
    }

    /* 코·입 */
    parts.push('<ellipse cx="60" cy="64.5" rx="14" ry="9.5" fill="#FFF9F4"/>');
    parts.push('<path d="M56.5 62.2 Q60 60.2 63.5 62.2 Q61.2 66.2 60 68 Q58.8 66.2 56.5 62.2 Z" fill="' + c.nose + '"/>');
    parts.push('<path d="M60 68 Q56.8 71.8 53.4 69.2" stroke="' + c.ink + '" stroke-width="1.7" fill="none" stroke-linecap="round"/>');
    parts.push('<path d="M60 68 Q63.2 71.8 66.6 69.2" stroke="' + c.ink + '" stroke-width="1.7" fill="none" stroke-linecap="round"/>');

    /* 수염 */
    parts.push('<g stroke="' + c.ink + '" stroke-width="1.2" stroke-linecap="round" opacity=".28">' +
      '<path d="M43 61 L28 57.5"/><path d="M43 64 L26 64"/><path d="M44 67 L28 71"/>' +
      '<path d="M77 61 L92 57.5"/><path d="M77 64 L94 64"/><path d="M76 67 L92 71"/></g>');

    /* 볼 */
    if (opts.blush !== false) {
      parts.push('<ellipse cx="34" cy="62" rx="5.4" ry="3.1" fill="#F7A8C0" opacity=".5"/>');
      parts.push('<ellipse cx="86" cy="62" rx="5.4" ry="3.1" fill="#F7A8C0" opacity=".5"/>');
    }

    /* 장식 */
    if (c.extra === 'leaf') {
      parts.push('<path d="M88 17 C81 11 83 3 91 2 C93 8 92 14 88 17 Z" fill="#94D6B2"/>');
      parts.push('<path d="M88 17 C94 13 100 15 100 20 C95 23 90 21 88 17 Z" fill="#B7E6CB"/>');
    }
    if (c.extra === 'flower') {
      parts.push('<g>' +
        '<circle cx="89" cy="10" r="3.6" fill="#FFB99C"/><circle cx="95" cy="14" r="3.6" fill="#FFB99C"/>' +
        '<circle cx="95" cy="21" r="3.6" fill="#FFB99C"/><circle cx="88" cy="23" r="3.6" fill="#FFB99C"/>' +
        '<circle cx="84" cy="16" r="3.6" fill="#FFB99C"/>' +
        '<circle cx="90" cy="16.5" r="2.9" fill="#FBDD93"/></g>');
    }
    if (c.extra === 'cloud') {
      parts.push('<path d="' + sparkle(23, 24, 5.2, c.furDark) + '" fill="' + c.furDark + '" opacity=".75"/>');
      parts.push('<path d="' + sparkle(97, 36, 3.8, c.furDark) + '" fill="' + c.furDark + '" opacity=".6"/>');
      parts.push('<path d="' + sparkle(30, 12, 3.2, '#FFFFFF') + '" fill="#FFFFFF" opacity=".9"/>');
    }

    return parts.join('');
  }

  /* 몸통까지 있는 고양이 (지도 위 캐릭터·비서 카드) */
  function svg(key, order) {
    var c = CATS[key];
    if (!c) return '';
    var uid = 'c' + (++seq) + (order || '');
    var g = furFill(c, uid);
    var parts = [];

    parts.push('<defs><radialGradient id="fur-' + uid + '" cx="36%" cy="26%" r="82%">' +
      '<stop offset="0" stop-color="' + c.furLight + '"/>' +
      '<stop offset=".62" stop-color="' + c.fur + '"/>' +
      '<stop offset="1" stop-color="' + c.furDark + '"/>' +
      '</radialGradient></defs>');

    /* 바닥 그림자 */
    parts.push('<ellipse cx="60" cy="123" rx="31" ry="5" fill="#6B4A36" opacity=".16"/>');

    /* 꼬리 */
    parts.push('<path d="M84 110 C104 109 114 96 107 81" stroke="' + g + '" stroke-width="9.5" fill="none" stroke-linecap="round"/>');
    parts.push('<circle cx="107" cy="81" r="4.8" fill="' + c.furLight + '"/>');

    /* 몸통 */
    parts.push('<path d="M60 60 C41 60 30 74 28 94 C26 110 41 118 60 118 C79 118 94 110 92 94 C90 74 79 60 60 60 Z" fill="' + g + '"/>');

    /* 가슴 털 */
    if (c.extra === 'cloud') {
      parts.push('<g fill="#FFFCF8">' +
        '<ellipse cx="60" cy="99" rx="19" ry="12"/>' +
        '<circle cx="50" cy="95" r="9"/><circle cx="70" cy="95" r="9"/><circle cx="60" cy="91" r="10"/></g>');
    } else {
      parts.push('<ellipse cx="60" cy="98" rx="16" ry="13" fill="#FFFCF8" opacity=".95"/>');
    }

    /* 앞발 */
    parts.push('<ellipse cx="46" cy="114" rx="9.5" ry="6" fill="#FFFCF8"/>');
    parts.push('<ellipse cx="74" cy="114" rx="9.5" ry="6" fill="#FFFCF8"/>');
    parts.push('<path d="M43 112 v3.5 M46.5 112 v3.5 M50 112 v3.5" stroke="' + c.furDark + '" stroke-width="1.1" opacity=".35" stroke-linecap="round"/>');
    parts.push('<path d="M70 112 v3.5 M73.5 112 v3.5 M77 112 v3.5" stroke="' + c.furDark + '" stroke-width="1.1" opacity=".35" stroke-linecap="round"/>');

    /* 머리 + 얼굴 */
    parts.push(headMarkup(c, uid, {}));

    /* 목걸이 (얼굴 아래) */
    parts.push('<path d="M36 86 Q60 96 84 86" stroke="' + c.collar + '" stroke-width="4.2" fill="none" stroke-linecap="round"/>');
    parts.push('<circle cx="60" cy="92.5" r="4.2" fill="#FFD36E" stroke="#E7B84B" stroke-width=".9"/>');
    parts.push('<path d="M60 95.2 v2.2" stroke="#E7B84B" stroke-width="1.1" stroke-linecap="round"/>');

    return '<svg class="cat-svg cat-' + esc(key) + '" viewBox="0 0 120 130" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      parts.join('') + '</svg>';
  }

  /* 얼굴만 — 배지·이름표 옆에 붙이는 작은 얼굴 */
  function face(key) {
    var c = CATS[key];
    if (!c) return '';
    var uid = 'f' + (++seq);
    return '<svg class="cat-svg cat-face cat-face-' + esc(key) + '" viewBox="6 2 108 78" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><radialGradient id="fur-' + uid + '" cx="36%" cy="26%" r="82%">' +
      '<stop offset="0" stop-color="' + c.furLight + '"/>' +
      '<stop offset=".62" stop-color="' + c.fur + '"/>' +
      '<stop offset="1" stop-color="' + c.furDark + '"/>' +
      '</radialGradient></defs>' +
      headMarkup(c, uid, { blush: false }) +
      '</svg>';
  }

  function catKeyOf(member) {
    var key = member && (member.cat || member.id);
    return key && CATS[key] ? key : '';
  }

  global.OfficeCats = {
    keys: Object.keys(CATS),
    has: function (key) { return !!CATS[key]; },
    svg: svg,
    face: face,
    svgOf: function (member) {
      var key = catKeyOf(member);
      return key ? svg(key) : '';
    },
    faceOf: function (member) {
      var key = catKeyOf(member);
      return key ? face(key) : '';
    }
  };
})(window);
