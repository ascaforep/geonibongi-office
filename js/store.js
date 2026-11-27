/* ============================================================
   건이봉이 오피스 — store.js
   데이터 저장 담당. 화면(app.js)은 아래 4개의 함수만 알면 됩니다.

     store.subscribe('tasks', function (list) { ... })
     store.add('tasks', { title: '...' })
     store.update('tasks', id, { done: true })
     store.remove('tasks', id)

   지금은 localStorage 백엔드로 동작하고, db-config.js 의 firebase.enabled 를
   true 로 바꾸면 같은 화면 코드가 Firebase Realtime Database 백엔드로 붙습니다.
   ============================================================ */

(function (global) {
  'use strict';

  var CFG = global.OFFICE_CONFIG || {};
  var COLLECTIONS = ['members', 'messages', 'tasks', 'notes'];

  /* ---------- 작은 도우미들 ---------- */

  function nowISO() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) +
      Math.random().toString(36).slice(2, 7);
  }

  function member(id, name, pickle, emoji, tone, extra) {
    extra = extra || {};
    return {
      id: id,
      name: name,
      pickle: pickle,
      label: extra.label || (pickle ? name + ' · ' + pickle : name),
      emoji: emoji,
      tone: tone,
      role: extra.role || '',   // 직책은 나중에 정해요 ("직책 미정")
      sub: extra.sub || '',     // 카드에 보이는 한 줄 소개
      kind: extra.kind || '',   // 'ai' 면 AI 직원으로 표시
      core: extra.core === false ? false : true,  // 기본 구성원 (지우기 버튼 없음)
      joinedAt: nowISO()
    };
  }

  /* 처음 열었을 때 보이는 기본 데이터
     — 사람 두 팀(건이·봉이)과 AI 직원 두 명(Claude·GPT) */
  function seedState() {
    return {
      members: [
        member('geon', '건이', '올라', '🌿', 'lilac'),
        member('bong', '봉이', '똑똑이', '🍑', 'peach'),
        member('claude', 'Claude', 'Claude', '🧠', 'mint', {
          label: 'Claude',
          sub: '노션 일 목록으로 함께 일해요',
          kind: 'ai'
        }),
        member('gpt', 'GPT', 'GPT', '🤖', 'butter', {
          label: 'GPT',
          sub: '노션 일 목록으로 함께 일해요',
          kind: 'ai'
        })
      ],
      messages: [],
      tasks: [],
      notes: [
        {
          id: 'note-welcome',
          text: '오피스 문을 열었어요! 필요한 건 메모에 붙여 두고, 같이 정할 일은 회의실에 올려 주세요.',
          color: 'lilac',
          authorId: 'geon',
          createdAt: nowISO()
        }
      ]
    };
  }

  function byDateDesc(a, b) {
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  }

  /* 기본 구성원 목록 (지금 화면의 seed 기준) */
  function coreMembers() {
    return seedState().members;
  }

  /* 이미 저장된 구성원에 없는 기본 구성원만 조용히 채워 넣습니다.
     (기존 구성원의 이름·얼굴·색은 절대 건드리지 않아요) */
  function mergeCoreMembers(list) {
    var arr = Array.isArray(list) ? list.slice() : [];
    var have = {};
    arr.forEach(function (m) { if (m && m.id) have[m.id] = true; });
    coreMembers().forEach(function (m) {
      if (!have[m.id]) arr.push(m);
    });
    return arr;
  }

  /* ============================================================
     로컬 모드 (localStorage)
     ============================================================ */

  function LocalBackend() {
    this.key = CFG.storageKey || 'geonibongi-office:v1';
    this.subs = {};
    this.state = this._read() || seedState();
    this._normalize();
    this._save();

    var self = this;
    global.addEventListener('storage', function (e) {
      if (e.key !== self.key) return;
      var next = self._read();
      if (!next) return;
      self.state = next;
      self._normalize();
      COLLECTIONS.forEach(function (c) { self._emit(c); });
    });
  }

  LocalBackend.prototype._read = function () {
    try {
      var raw = global.localStorage.getItem(this.key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (err) {
      return null;
    }
  };

  LocalBackend.prototype._normalize = function () {
    if (!this.state || typeof this.state !== 'object') this.state = seedState();
    var seed = null;
    COLLECTIONS.forEach(function (c) {
      if (!Array.isArray(this.state[c])) {
        if (c === 'members') {
          seed = seed || seedState();
          this.state[c] = seed.members;
        } else {
          this.state[c] = [];
        }
      }
    }, this);
    this.state.members = mergeCoreMembers(this.state.members);
  };

  LocalBackend.prototype._save = function () {
    try {
      global.localStorage.setItem(this.key, JSON.stringify(this.state));
    } catch (err) {
      console.warn('[건이봉이 오피스] 저장하지 못했어요', err);
    }
  };

  LocalBackend.prototype._emit = function (collection) {
    var list = (this.state[collection] || []).slice();
    (this.subs[collection] || []).forEach(function (cb) {
      try { cb(list); } catch (err) { console.error(err); }
    });
  };

  LocalBackend.prototype.subscribe = function (collection, cb) {
    if (!this.subs[collection]) this.subs[collection] = [];
    this.subs[collection].push(cb);
    cb((this.state[collection] || []).slice());
    var self = this;
    return function () {
      self.subs[collection] = (self.subs[collection] || []).filter(function (fn) {
        return fn !== cb;
      });
    };
  };

  LocalBackend.prototype.add = function (collection, item) {
    var record = Object.assign({}, item);
    record.id = record.id || uid(collection.slice(0, 3));
    record.createdAt = record.createdAt || nowISO();
    this.state[collection] = (this.state[collection] || []).concat([record]);
    this._save();
    this._emit(collection);
    return Promise.resolve(record);
  };

  LocalBackend.prototype.update = function (collection, id, patch) {
    var found = null;
    this.state[collection] = (this.state[collection] || []).map(function (item) {
      if (item.id !== id) return item;
      found = Object.assign({}, item, patch);
      return found;
    });
    if (!found) return Promise.reject(new Error('항목을 찾지 못했어요: ' + id));
    this._save();
    this._emit(collection);
    return Promise.resolve(found);
  };

  LocalBackend.prototype.remove = function (collection, id) {
    this.state[collection] = (this.state[collection] || []).filter(function (item) {
      return item.id !== id;
    });
    this._save();
    this._emit(collection);
    return Promise.resolve();
  };

  /* ============================================================
     Firebase Realtime Database 모드
     (빌드 도구 없이 compat SDK 를 script 로 불러옵니다)
     ============================================================ */

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('스크립트를 불러오지 못했어요: ' + src)); };
      document.head.appendChild(el);
    });
  }

  function FirebaseBackend(db, root) {
    this.db = db;
    this.root = root;
    this.subs = {};
    this._ready = this._ensureSeed();
  }

  FirebaseBackend.prototype.path = function (child) {
    return this.root + '/' + child;
  };

  FirebaseBackend.prototype._ensureSeed = function () {
    var self = this;
    var selfRef = this.db.ref(this.path('meta/seeded'));
    return selfRef.once('value').then(function (snap) {
      if (snap.val()) return null;
      var seed = seedState();
      var payload = { 'meta/seeded': true, 'meta/createdAt': nowISO() };
      COLLECTIONS.forEach(function (c) {
        var bag = {};
        (seed[c] || []).forEach(function (item) { bag[item.id] = item; });
        payload[c] = bag;
      });
      return self.db.ref(self.root).update(payload);
    }).then(function () {
      return self._ensureCoreMembers();
    }).catch(function (err) {
      console.warn('[건이봉이 오피스] 초기 데이터를 준비하지 못했어요', err);
    });
  };

  /* 이미 사는 중인 DB 에 빠진 기본 구성원(Claude·GPT 등)만 더합니다.
     이미 있는 구성원은 읽기만 하고 지우거나 덮어쓰지 않아요. */
  FirebaseBackend.prototype._ensureCoreMembers = function () {
    var self = this;
    return this.db.ref(this.path('members')).once('value').then(function (snap) {
      var value = snap.val() || {};
      var have = {};
      if (Array.isArray(value)) {
        value.filter(Boolean).forEach(function (item, i) {
          have[item.id || String(i)] = true;
        });
      } else {
        Object.keys(value).forEach(function (key) {
          var item = value[key] || {};
          have[item.id || key] = true;
        });
      }
      var patch = {};
      coreMembers().forEach(function (m) {
        if (!have[m.id]) patch['members/' + m.id] = m;
      });
      if (!Object.keys(patch).length) return null;
      return self.db.ref(self.root).update(patch);
    }).catch(function (err) {
      console.warn('[건이봉이 오피스] 기본 구성원을 채우지 못했어요', err);
    });
  };

  FirebaseBackend.prototype.ready = function () {
    return this._ready;
  };

  FirebaseBackend.prototype.subscribe = function (collection, cb) {
    var ref = this.db.ref(this.path(collection));
    var handler = ref.on('value', function (snap) {
      var value = snap.val() || {};
      var list = Array.isArray(value)
        ? value.filter(Boolean).map(function (item, i) {
            return Object.assign({}, item, { id: item.id || String(i) });
          })
        : Object.keys(value).map(function (key) {
            var item = value[key] || {};
            return Object.assign({}, item, { id: item.id || key });
          });
      cb(list);
    }, function (err) {
      console.warn('[건이봉이 오피스] 실시간 구독 오류', err);
    });
    return function () { ref.off('value', handler); };
  };

  FirebaseBackend.prototype.add = function (collection, item) {
    var record = Object.assign({}, item);
    record.id = record.id || uid(collection.slice(0, 3));
    record.createdAt = record.createdAt || nowISO();
    return this.db.ref(this.path(collection + '/' + record.id)).set(record)
      .then(function () { return record; });
  };

  FirebaseBackend.prototype.update = function (collection, id, patch) {
    return this.db.ref(this.path(collection + '/' + id)).update(patch)
      .then(function () { return Object.assign({ id: id }, patch); });
  };

  FirebaseBackend.prototype.remove = function (collection, id) {
    return this.db.ref(this.path(collection + '/' + id)).remove();
  };

  /* ============================================================
     초기화
     ============================================================ */

  function wrap(backend, mode) {
    return {
      mode: mode,
      subscribe: function (collection, cb) { return backend.subscribe(collection, cb); },
      add: function (collection, item) { return backend.add(collection, item); },
      update: function (collection, id, patch) { return backend.update(collection, id, patch); },
      remove: function (collection, id) { return backend.remove(collection, id); }
    };
  }

  /* ============================================================
     로그인 문 (Google 로그인 + 허용된 이메일만 입장)
     실제 잠금은 Firebase 보안 규칙이 하고, 이 화면은 안내용입니다.
     ============================================================ */

  function gate() {
    var el = document.getElementById('authGate');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'authGate';
    el.className = 'auth-gate';
    el.innerHTML =
      '<div class="auth-card">' +
        '<div class="auth-emoji" aria-hidden="true">🔐</div>' +
        '<h2>건이봉이 오피스</h2>' +
        '<p class="auth-msg" id="authMsg">가족만 들어올 수 있어요.<br>Google 계정으로 로그인해 주세요.</p>' +
        '<button type="button" class="auth-btn" id="authBtn">Google로 로그인</button>' +
        '<p class="auth-hint">카카오톡 안에서 열었다면 오른쪽 위 메뉴 → <b>다른 브라우저로 열기</b>(Chrome·Safari)로 열어 주세요.</p>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  function showGate(msg) {
    var el = gate();
    el.hidden = false;
    if (msg) document.getElementById('authMsg').innerHTML = msg;
    return el;
  }

  function hideGate() {
    var el = document.getElementById('authGate');
    if (el) el.hidden = true;
  }

  function isAllowed(user, fb) {
    var list = (fb.allowedEmails || []).map(function (e) { return String(e).toLowerCase(); });
    if (!list.length) return true;
    return !!(user && user.email && list.indexOf(user.email.toLowerCase()) !== -1);
  }

  function waitForUser(auth, fb, sdk) {
    return new Promise(function (resolve) {
      var done = false;
      auth.onAuthStateChanged(function (user) {
        if (done) return;
        if (user && isAllowed(user, fb)) {
          done = true;
          hideGate();
          resolve(user);
          return;
        }
        if (user) {
          auth.signOut();
          showGate('<b>' + user.email + '</b> 계정은 아직 입장 허락이 없어요.<br>등록된 가족 계정으로 다시 로그인해 주세요.');
        } else {
          showGate();
        }
      });
      gate().querySelector('#authBtn').onclick = function () {
        var provider = new sdk.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        auth.signInWithPopup(provider).catch(function (err) {
          if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment')) {
            return auth.signInWithRedirect(provider);
          }
          if (err && err.code === 'auth/popup-closed-by-user') return;
          showGate('로그인하지 못했어요 (' + esc(err && err.code || err) + ').<br>Chrome·Safari에서 다시 시도해 주세요.');
        });
      };
    });
  }

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function addLogout(auth, user) {
    var pill = document.getElementById('statusPill');
    if (!pill || document.getElementById('logoutBtn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'logoutBtn';
    btn.className = 'logout-btn';
    btn.title = user.email + ' 로그아웃';
    btn.textContent = '로그아웃';
    btn.onclick = function () { auth.signOut().then(function () { location.reload(); }); };
    pill.parentNode.insertBefore(btn, pill.nextSibling);
  }

  function startFirebase(fb) {
    var version = fb.sdkVersion || '10.12.2';
    var base = 'https://www.gstatic.com/firebasejs/' + version + '/';
    var sdk, app;
    return loadScript(base + 'firebase-app-compat.js')
      .then(function () { return loadScript(base + 'firebase-auth-compat.js'); })
      .then(function () { return loadScript(base + 'firebase-database-compat.js'); })
      .then(function () {
        sdk = global.firebase;
        app = (sdk.apps && sdk.apps.length) ? sdk.app() : sdk.initializeApp(fb.config);
        if (fb.requireLogin === false) return null;
        var auth = app.auth();
        return waitForUser(auth, fb, sdk).then(function (user) {
          addLogout(auth, user);
          return user;
        });
      })
      .then(function () {
        var backend = new FirebaseBackend(app.database(), fb.rootPath || 'offices/geonibongi');
        return backend.ready().then(function () { return wrap(backend, 'firebase'); });
      });
  }

  function init() {
    var fb = CFG.firebase || {};
    var configured = !!(fb.enabled && fb.config && fb.config.databaseURL);
    if (!configured) {
      return Promise.resolve(wrap(new LocalBackend(), 'local'));
    }
    return startFirebase(fb).catch(function (err) {
      console.warn('[건이봉이 오피스] Firebase 연결 실패', err);
      if (fb.requireLogin !== false) {
        showGate('연결에 문제가 생겼어요.<br>잠시 뒤 새로고침해 주세요.');
        return new Promise(function () {});  /* 잠금 모드에서는 로컬로 넘어가지 않음 */
      }
      return wrap(new LocalBackend(), 'local');
    });
  }

  global.OfficeStore = {
    init: init,
    uid: uid,
    nowISO: nowISO,
    COLLECTIONS: COLLECTIONS
  };
})(window);
