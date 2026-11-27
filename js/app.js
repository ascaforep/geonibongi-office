/* ============================================================
   건이봉이 오피스 — app.js
   화면 그리기와 버튼 동작. 데이터는 store.js(OfficeStore)만 거쳐 다룹니다.
   ============================================================ */

(function () {
  'use strict';

  var CFG = window.OFFICE_CONFIG || {};
  var store = null;

  var state = {
    members: [],
    messages: [],
    tasks: [],
    notes: [],
    tab: 'map',
    taskFilter: 'all',
    noteColor: 'lilac',
    openRoom: null,
    motion: true
  };

  var TONES = ['lilac', 'peach', 'mint', 'butter'];

  var EMOJIS = ['🌿', '🍑', '🐣', '🐰', '🦊', '🐻', '🐳', '🌸', '🍀', '🐧', '🌙', '🍊'];

  var ROOMS = [
    {
      key: 'command', name: '지휘실', emoji: '🎯', x: 31, y: 35, delay: '0s',
      desc: '오늘 할 일을 정하고 두 팀에 나눠 주는 방이에요.',
      tab: 'members', action: '비서현황 보기'
    },
    {
      key: 'meeting', name: '대회의실', emoji: '🏛️', x: 29, y: 57, delay: '.6s',
      desc: '함께 정할 안건을 모아 두는 방이에요.',
      tab: 'meeting', action: '회의실 열기'
    },
    {
      key: 'work', name: '작업실', emoji: '💻', x: 71, y: 43, delay: '1.1s',
      desc: '맡은 일을 하나씩 체크하는 방이에요.',
      tab: 'work', action: '작업실 열기'
    },
    {
      key: 'lounge', name: '라운지', emoji: '☕', x: 69, y: 71, delay: '1.6s',
      desc: '소소한 가족 메모를 붙여 두는 방이에요.',
      tab: 'notes', action: '메모 열기'
    }
  ];

  /* ---------- 도우미 ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (d >= today) return hm;
    if (today - d < 2 * 86400000) return '어제 ' + hm;
    if (d.getFullYear() === now.getFullYear()) {
      return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + hm;
    }
    return d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate();
  }

  function memberById(id) {
    for (var i = 0; i < state.members.length; i++) {
      if (state.members[i].id === id) return state.members[i];
    }
    return { id: id || '', name: '구성원', label: '구성원', emoji: '🙂', tone: 'butter', role: '' };
  }

  function badgeTone(tone) {
    return tone === 'mint' ? 'mint' : tone === 'butter' ? 'butter' : tone === 'peach' ? 'peach' : 'lilac';
  }

  function memberAvatar(member) {
    return '<div class="avatar tone-' + esc(member.tone || 'butter') + '" aria-hidden="true">' +
      esc(member.emoji || '🙂') + '</div>';
  }

  function toast(message) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { el.classList.remove('is-show'); }, 2100);
  }

  function openTasks() { return state.tasks.filter(function (t) { return !t.done; }); }
  function doneTasks() { return state.tasks.filter(function (t) { return t.done; }); }

  function latestOf(list) {
    var latest = null;
    list.forEach(function (item) {
      if (!latest || String(item.createdAt || '') > String(latest.createdAt || '')) latest = item;
    });
    return latest;
  }

  /* ---------- 환경 설정 저장 (움직임 ON/OFF) ---------- */

  function prefsKey() { return (CFG.prefsKey || 'geonibongi-office:prefs'); }

  function loadPrefs() {
    try {
      var raw = window.localStorage.getItem(prefsKey());
      if (raw) {
        var prefs = JSON.parse(raw);
        if (typeof prefs.motion === 'boolean') state.motion = prefs.motion;
      }
    } catch (err) { /* 무시 */ }
  }

  function savePrefs() {
    try {
      window.localStorage.setItem(prefsKey(), JSON.stringify({ motion: state.motion }));
    } catch (err) { /* 무시 */ }
  }

  /* ---------- 시작 ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    loadPrefs();
    var hash = (location.hash || '').replace('#', '');
    if (['map', 'meeting', 'work', 'members', 'notes'].indexOf(hash) >= 0) state.tab = hash;

    bindTabs();
    bindMotion();
    bindMeetingForm();
    bindTaskForm();
    bindNoteForm();
    bindMemberUI();
    bindRoomCard();
    applyMotion();
    setTab(state.tab, true);

    window.OfficeStore.init().then(function (ready) {
      store = ready;
      setStatus();
      buildPins();
      subscribeAll();
    }).catch(function (err) {
      console.error('[건이봉이 오피스] 시작하지 못했어요', err);
      toast('데이터를 준비하지 못했어요. 새로고침해 주세요.');
    });
  });

  function setStatus() {
    var pill = $('#statusPill');
    var text = $('#statusText');
    var foot = $('#footMode');
    if (store && store.mode === 'firebase') {
      pill.dataset.mode = 'live';
      text.textContent = '가동 중';
      pill.title = 'Firebase 실시간 DB에 연결되어 있어요';
      foot.textContent = '두 팀이 같은 내용을 실시간으로 함께 봐요 · Firebase 연결됨';
    } else {
      pill.dataset.mode = 'local';
      text.textContent = '로컬 모드 · DB 연결 전';
      pill.title = '지금은 이 브라우저에만 저장돼요';
      foot.textContent = '데이터는 이 브라우저에만 저장돼요 · DB를 연결하면 두 팀이 실시간으로 함께 봐요';
    }
  }

  function subscribeAll() {
    store.subscribe('members', function (list) {
      state.members = list.slice().sort(function (a, b) {
        return String(a.joinedAt || '').localeCompare(String(b.joinedAt || ''));
      });
      renderMembers();
      renderFilters();
      renderPeopleSelects();
      renderTasks();
      renderMessages();
      renderNotes();
      renderMapSummary();
      renderRoomCard();
    });

    store.subscribe('messages', function (list) {
      state.messages = list.slice().sort(function (a, b) {
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
      renderMessages();
      renderMapSummary();
      renderRoomCard();
      renderMembers();
    });

    store.subscribe('tasks', function (list) {
      state.tasks = list.slice();
      renderTasks();
      renderFilters();
      renderMapSummary();
      renderRoomCard();
      renderMembers();
    });

    store.subscribe('notes', function (list) {
      state.notes = list.slice().sort(function (a, b) {
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
      renderNotes();
      renderMapSummary();
      renderRoomCard();
      renderMembers();
    });
  }

  /* ---------- 탭 ---------- */

  function bindTabs() {
    $$('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () { setTab(btn.dataset.tab); });
    });
  }

  function setTab(key, silent) {
    if (!key) return;
    state.tab = key;
    $$('.tab').forEach(function (btn) {
      var active = btn.dataset.tab === key;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    $$('.panel').forEach(function (panel) {
      var active = panel.id === 'panel-' + key;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    if (!silent) {
      try { history.replaceState(null, '', '#' + key); } catch (err) { /* 무시 */ }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ---------- 오피스 맵 ---------- */

  function applyMotion() {
    var frame = $('#mapFrame');
    var toggle = $('#motionToggle');
    var label = $('#motionLabel');
    if (!frame) return;
    frame.classList.toggle('lively', state.motion);
    if (toggle) {
      toggle.classList.toggle('is-on', state.motion);
      toggle.setAttribute('aria-pressed', state.motion ? 'true' : 'false');
    }
    if (label) label.textContent = state.motion ? 'ON' : 'OFF';
  }

  function bindMotion() {
    var toggle = $('#motionToggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      state.motion = !state.motion;
      savePrefs();
      applyMotion();
      toast(state.motion ? '캐릭터가 살랑살랑 움직여요' : '움직임을 멈췄어요');
    });
  }

  function buildPins() {
    var host = $('#mapPins');
    if (!host) return;
    host.innerHTML = ROOMS.map(function (room) {
      return '<button class="pin" type="button" data-room="' + room.key + '" ' +
        'style="left:' + room.x + '%;top:' + room.y + '%;--d:' + room.delay + '" ' +
        'aria-pressed="false" aria-label="' + room.name + ' 정보 보기">' +
        '<span aria-hidden="true">' + room.emoji + '</span>' + room.name + '</button>';
    }).join('');

    host.addEventListener('click', function (e) {
      var btn = e.target.closest('.pin');
      if (!btn) return;
      openRoom(btn.dataset.room);
    });
  }

  function renderMapSummary() {
    var open = openTasks().length;
    var headline = $('#mapHeadline');
    if (headline) {
      headline.textContent = open > 0
        ? open + '건의 일이 진행 중이에요'
        : state.members.length + '개 팀이 대기 중이에요';
    }
    var teams = $('#chipTeams');
    if (teams) teams.textContent = state.members.length + '개 팀 가동';
    var count = $('#chipMembers');
    if (count) count.textContent = String(state.members.length);
  }

  function roomStats(room) {
    var open = openTasks().length;
    var done = doneTasks().length;
    if (room.key === 'command') {
      return [
        { tone: 'lilac', text: '진행 중 ' + open + '건' },
        { tone: 'mint', text: '완료 ' + done + '건' },
        { tone: 'butter', text: '구성원 ' + state.members.length + '명' }
      ];
    }
    if (room.key === 'meeting') {
      return [{ tone: 'lilac', text: '안건 ' + state.messages.length + '개' }];
    }
    if (room.key === 'work') {
      return [
        { tone: 'lilac', text: '진행 중 ' + open + '건' },
        { tone: 'mint', text: '완료 ' + done + '건' }
      ];
    }
    return [{ tone: 'butter', text: '메모 ' + state.notes.length + '개' }];
  }

  function roomRecent(room) {
    if (room.key === 'command') {
      var tasks = openTasks().sort(function (a, b) {
        return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      });
      return tasks.length
        ? '가장 먼저 할 일: ' + tasks[0].title
        : '지금은 밀린 일이 없어요. 아주 좋아요!';
    }
    if (room.key === 'meeting') {
      var msg = latestOf(state.messages);
      return msg ? '최근 안건: ' + msg.title : '아직 올라온 안건이 없어요.';
    }
    if (room.key === 'work') {
      var left = openTasks();
      return left.length
        ? '작업실에 ' + left.length + '건이 기다리고 있어요.'
        : '오늘 할 일을 작업실에 적어 보세요.';
    }
    var note = latestOf(state.notes);
    if (!note) return '아직 붙여 둔 메모가 없어요.';
    var text = note.text || '';
    return '최근 메모: ' + (text.length > 28 ? text.slice(0, 28) + '…' : text);
  }

  function openRoom(key) {
    var room = null;
    ROOMS.forEach(function (r) { if (r.key === key) room = r; });
    if (!room) return;
    state.openRoom = key;
    $$('.pin').forEach(function (pin) {
      pin.classList.toggle('is-active', pin.dataset.room === key);
      pin.setAttribute('aria-pressed', pin.dataset.room === key ? 'true' : 'false');
    });
    var card = $('#roomCard');
    if (card) card.hidden = false;
    renderRoomCard();
    if (card && window.innerWidth < 560) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function closeRoom() {
    state.openRoom = null;
    $$('.pin').forEach(function (pin) {
      pin.classList.remove('is-active');
      pin.setAttribute('aria-pressed', 'false');
    });
    var card = $('#roomCard');
    if (card) card.hidden = true;
  }

  function renderRoomCard() {
    var key = state.openRoom;
    var card = $('#roomCard');
    if (!key || !card || card.hidden) return;
    var room = null;
    ROOMS.forEach(function (r) { if (r.key === key) room = r; });
    if (!room) return;

    $('#roomEmoji').textContent = room.emoji;
    $('#roomName').textContent = room.name;
    $('#roomDesc').textContent = room.desc;
    $('#roomStats').innerHTML = roomStats(room).map(function (stat) {
      return '<span class="badge badge-' + stat.tone + '">' + esc(stat.text) + '</span>';
    }).join('');
    $('#roomRecent').textContent = roomRecent(room);

    var go = $('#roomGo');
    go.textContent = room.action;
    go.dataset.room = room.key;
  }

  function bindRoomCard() {
    var close = $('#roomClose');
    if (close) close.addEventListener('click', closeRoom);

    var go = $('#roomGo');
    if (go) {
      go.addEventListener('click', function () {
        var room = null;
        ROOMS.forEach(function (r) { if (r.key === go.dataset.room) room = r; });
        if (!room) return;
        setTab(room.tab);
      });
    }
  }

  /* ---------- 회의실 ---------- */

  function bindMeetingForm() {
    var form = $('#messageForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#msgTitle').value.trim();
      if (!title) return;
      var author = $('#msgAuthor').value || (state.members[0] && state.members[0].id);
      if (!author) { toast('먼저 구성원을 확인해 주세요'); return; }
      store.add('messages', {
        title: title,
        body: $('#msgBody').value.trim(),
        authorId: author
      }).then(function () {
        form.reset();
        $('#msgTitle').focus();
        toast('회의실에 안건을 올렸어요');
      }).catch(function () { toast('올리지 못했어요. 다시 시도해 주세요.'); });
    });

    var list = $('#messageList');
    if (list) {
      list.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-act="del-message"]');
        if (!btn) return;
        var id = btn.closest('.item').dataset.id;
        if (!window.confirm('이 안건을 지울까요? 지우면 되돌릴 수 없어요.')) return;
        store.remove('messages', id)
          .then(function () { toast('안건을 지웠어요'); })
          .catch(function () { toast('지우지 못했어요. 다시 시도해 주세요.'); });
      });
    }
  }

  function renderMessages() {
    var list = $('#messageList');
    if (!list) return;
    var items = state.messages;
    $('#messageEmpty').hidden = items.length > 0;

    list.innerHTML = items.map(function (msg) {
      var author = memberById(msg.authorId);
      return '<article class="item" data-id="' + esc(msg.id) + '">' +
        memberAvatar(author) +
        '<div class="item-body">' +
          '<div class="item-meta">' +
            '<span class="badge badge-' + badgeTone(author.tone) + '">' + esc(author.label) + '</span>' +
            '<span>' + esc(fmtTime(msg.createdAt)) + '</span>' +
          '</div>' +
          '<h3 class="item-title">' + esc(msg.title) + '</h3>' +
          (msg.body ? '<p class="item-text">' + esc(msg.body) + '</p>' : '') +
        '</div>' +
        '<div class="item-actions">' +
          '<button class="mini-btn" type="button" data-act="del-message" aria-label="안건 지우기">🗑</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* ---------- 작업실 ---------- */

  function bindTaskForm() {
    var form = $('#taskForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#taskTitle').value.trim();
      if (!title) return;
      var assignee = $('#taskAssignee').value || (state.members[0] && state.members[0].id);
      if (!assignee) { toast('먼저 구성원을 확인해 주세요'); return; }
      store.add('tasks', { title: title, assigneeId: assignee, done: false, doneAt: null })
        .then(function () {
          form.reset();
          $('#taskTitle').focus();
          toast('작업실에 할 일을 붙였어요');
        }).catch(function () { toast('추가하지 못했어요. 다시 시도해 주세요.'); });
    });

    var list = $('#taskList');
    if (list) {
      list.addEventListener('click', function (e) {
        var toggle = e.target.closest('[data-act="toggle"]');
        if (toggle) {
          var card = toggle.closest('.task');
          var id = card.dataset.id;
          var nextDone = !card.classList.contains('is-done');
          store.update('tasks', id, { done: nextDone, doneAt: nextDone ? new Date().toISOString() : null })
            .then(function () { toast(nextDone ? '완료! 수고했어요 🎉' : '다시 진행 중으로 옮겼어요'); })
            .catch(function () { toast('바꾸지 못했어요. 다시 시도해 주세요.'); });
          return;
        }
        var del = e.target.closest('[data-act="del-task"]');
        if (del) {
          var tid = del.closest('.task').dataset.id;
          if (!window.confirm('이 할 일을 지울까요?')) return;
          store.remove('tasks', tid)
            .then(function () { toast('할 일을 지웠어요'); })
            .catch(function () { toast('지우지 못했어요. 다시 시도해 주세요.'); });
        }
      });
    }

    var filters = $('#taskFilters');
    if (filters) {
      filters.addEventListener('click', function (e) {
        var btn = e.target.closest('.filter');
        if (!btn) return;
        state.taskFilter = btn.dataset.filter;
        renderFilters();
        renderTasks();
      });
    }
  }

  function renderFilters() {
    var host = $('#taskFilters');
    if (!host) return;

    if (state.taskFilter !== 'all' && !state.members.some(function (m) { return m.id === state.taskFilter; })) {
      state.taskFilter = 'all';
    }

    var all = state.tasks.length;
    var parts = ['<button class="filter' + (state.taskFilter === 'all' ? ' is-active' : '') +
      '" type="button" data-filter="all">전체 <span class="count">' + all + '</span></button>'];

    state.members.forEach(function (m) {
      var count = state.tasks.filter(function (t) { return t.assigneeId === m.id; }).length;
      parts.push('<button class="filter' + (state.taskFilter === m.id ? ' is-active' : '') +
        '" type="button" data-filter="' + esc(m.id) + '">' +
        esc(m.emoji || '') + ' ' + esc(m.label) + ' <span class="count">' + count + '</span></button>');
    });

    host.innerHTML = parts.join('');
  }

  function renderTasks() {
    var list = $('#taskList');
    if (!list) return;

    var items = state.tasks.filter(function (t) {
      return state.taskFilter === 'all' || t.assigneeId === state.taskFilter;
    }).sort(function (a, b) {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      if (a.done) return String(b.doneAt || '').localeCompare(String(a.doneAt || ''));
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });

    $('#taskEmpty').hidden = items.length > 0;

    list.innerHTML = items.map(function (task) {
      var owner = memberById(task.assigneeId);
      return '<div class="item task' + (task.done ? ' is-done' : '') + '" data-id="' + esc(task.id) + '">' +
        '<button class="check' + (task.done ? ' is-checked' : '') + '" type="button" data-act="toggle" ' +
          'role="checkbox" aria-checked="' + (task.done ? 'true' : 'false') + '" ' +
          'aria-label="' + (task.done ? '완료 취소' : '완료로 표시') + '">✓</button>' +
        '<div class="task-main">' +
          '<div class="task-title">' + esc(task.title) + '</div>' +
          '<div class="task-tags">' +
            '<span class="badge badge-' + badgeTone(owner.tone) + '">' + esc(owner.emoji + ' ' + owner.label) + '</span>' +
            (task.done
              ? '<span class="badge badge-done">완료</span>'
              : '<span class="badge badge-wait">진행 중</span>') +
            '<span class="badge badge-muted">' + esc(fmtTime(task.createdAt)) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="item-actions">' +
          '<button class="mini-btn" type="button" data-act="del-task" aria-label="할 일 지우기">🗑</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ---------- 구성원 선택 상자 ---------- */

  function renderPeopleSelects() {
    var selects = [$('#msgAuthor'), $('#taskAssignee'), $('#noteAuthor')];
    selects.forEach(function (select) {
      if (!select) return;
      var current = select.value;
      select.innerHTML = state.members.map(function (m) {
        return '<option value="' + esc(m.id) + '">' + esc(m.label) + '</option>';
      }).join('');
      var exists = state.members.some(function (m) { return m.id === current; });
      if (exists) select.value = current;
    });
  }

  /* ---------- 비서현황 ---------- */

  function bindMemberUI() {
    var grid = $('#memberGrid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        if (e.target.closest('.member-add')) {
          openMemberModal();
          return;
        }
        var del = e.target.closest('[data-act="del-member"]');
        if (del) {
          var id = del.closest('.member-card').dataset.id;
          removeMember(id);
        }
      });
    }

    var modal = $('#memberModal');
    if (modal) {
      $$('[data-close="memberModal"]', modal).forEach(function (btn) {
        btn.addEventListener('click', function () { modal.hidden = true; });
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.hidden) modal.hidden = true;
    });

    var picker = $('#memberEmoji');
    if (picker) {
      picker.innerHTML = EMOJIS.map(function (emoji, i) {
        return '<button class="emoji-choice' + (i === 0 ? ' is-active' : '') + '" type="button" ' +
          'data-emoji="' + emoji + '" role="radio" aria-checked="' + (i === 0 ? 'true' : 'false') + '" ' +
          'aria-label="얼굴 ' + emoji + '">' + emoji + '</button>';
      }).join('');
      picker.addEventListener('click', function (e) {
        var btn = e.target.closest('.emoji-choice');
        if (!btn) return;
        $$('.emoji-choice', picker).forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-checked', b === btn ? 'true' : 'false');
        });
      });
    }

    var form = $('#memberForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = $('#memberName').value.trim();
        if (!name) return;
        var pickle = $('#memberPickle').value.trim();
        var picked = $('.emoji-choice.is-active', form);
        var emoji = (picked && picked.dataset.emoji) || '🙂';
        var tone = TONES[state.members.length % TONES.length];

        store.add('members', {
          name: name,
          pickle: pickle,
          label: pickle ? name + ' · ' + pickle : name,
          emoji: emoji,
          tone: tone,
          role: '',
          core: false,
          joinedAt: window.OfficeStore.nowISO()
        }).then(function () {
          form.reset();
          var first = $('.emoji-choice', form);
          if (first) {
            $$('.emoji-choice', form).forEach(function (b) {
              b.classList.toggle('is-active', b === first);
              b.setAttribute('aria-checked', b === first ? 'true' : 'false');
            });
          }
          $('#memberModal').hidden = true;
          toast(name + ' 팀을 오피스에 더했어요');
        }).catch(function () { toast('추가하지 못했어요. 다시 시도해 주세요.'); });
      });
    }
  }

  function openMemberModal() {
    var modal = $('#memberModal');
    if (!modal) return;
    modal.hidden = false;
    var input = $('#memberName');
    if (input) setTimeout(function () { input.focus(); }, 80);
  }

  function removeMember(id) {
    var target = null;
    state.members.forEach(function (m) { if (m.id === id) target = m; });
    if (!target) return;
    if (target.core) { toast('기본 구성원은 지울 수 없어요'); return; }

    var fallback = state.members.filter(function (m) { return m.id !== id; })[0];
    if (!fallback) { toast('마지막 구성원은 지울 수 없어요'); return; }

    var ok = window.confirm(target.label + ' 팀을 오피스에서 뺄까요?\n맡긴 일과 글은 ' +
      fallback.label + ' 팀으로 옮겨 둘게요.');
    if (!ok) return;

    state.tasks.forEach(function (t) {
      if (t.assigneeId === id) {
        store.update('tasks', t.id, { assigneeId: fallback.id }).catch(function () {});
      }
    });
    state.messages.forEach(function (m) {
      if (m.authorId === id) {
        store.update('messages', m.id, { authorId: fallback.id }).catch(function () {});
      }
    });
    state.notes.forEach(function (n) {
      if (n.authorId === id) {
        store.update('notes', n.id, { authorId: fallback.id }).catch(function () {});
      }
    });
    store.remove('members', id)
      .then(function () { toast('구성원을 정리했어요'); })
      .catch(function () { toast('정리하지 못했어요. 다시 시도해 주세요.'); });
  }

  function renderMembers() {
    var grid = $('#memberGrid');
    if (!grid) return;

    var cards = state.members.map(function (m) {
      var mine = state.tasks.filter(function (t) { return t.assigneeId === m.id; });
      var open = mine.filter(function (t) { return !t.done; }).length;
      var done = mine.length - open;

      var activity = [];
      state.tasks.forEach(function (t) { if (t.assigneeId === m.id) activity.push(t); });
      state.messages.forEach(function (msg) { if (msg.authorId === m.id) activity.push(msg); });
      state.notes.forEach(function (n) { if (n.authorId === m.id) activity.push(n); });
      var latest = latestOf(activity);

      return '<article class="member-card" data-id="' + esc(m.id) + '">' +
        '<div class="member-top">' +
          '<div class="member-avatar tone-' + esc(m.tone || 'butter') + '" aria-hidden="true">' +
            esc(m.emoji || '🙂') + '</div>' +
          '<div>' +
            '<h3 class="member-name">' + esc(m.label) +
              '<span class="badge badge-muted">직책 미정</span></h3>' +
            '<p class="member-sub">' + (m.pickle ? '피클 ' + esc(m.pickle) + '와 함께' : '함께하는 팀') + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="member-badges">' +
          '<span class="badge badge-' + badgeTone(m.tone) + '">' +
            (m.core ? '기본 구성원' : '새로 합류') + '</span>' +
          '<span class="badge badge-mint">비서실 상주</span>' +
        '</div>' +
        '<div class="member-stats">' +
          '<div class="stat is-lilac"><div class="stat-num">' + open + '</div>' +
            '<div class="stat-label">진행 중</div></div>' +
          '<div class="stat is-mint"><div class="stat-num">' + done + '</div>' +
            '<div class="stat-label">완료</div></div>' +
        '</div>' +
        '<div class="member-foot">' +
          '<span class="status-tag' + (open > 0 ? ' is-working' : '') + '">' +
            '<i class="dot" aria-hidden="true"></i>' + (open > 0 ? '작업 중' : '대기 중') + '</span>' +
          '<span>' + (latest ? '최근 ' + esc(fmtTime(latest.createdAt)) : '아직 기록 없음') + '</span>' +
        '</div>' +
        (m.core ? '' :
          '<button class="mini-btn member-remove" type="button" data-act="del-member" ' +
          'aria-label="' + esc(m.label) + ' 내보내기">✕</button>') +
      '</article>';
    });

    cards.push(
      '<button class="member-add" type="button">' +
        '<span class="plus" aria-hidden="true">＋</span>' +
        '가족 구성원 추가' +
        '<small>다음에 더 붙일 수 있어요</small>' +
      '</button>'
    );

    grid.innerHTML = cards.join('');
  }

  /* ---------- 메모 ---------- */

  function bindNoteForm() {
    var picker = $('#noteColors');
    if (picker) {
      picker.addEventListener('click', function (e) {
        var swatch = e.target.closest('.swatch');
        if (!swatch) return;
        state.noteColor = swatch.dataset.color;
        $$('.swatch', picker).forEach(function (s) {
          var active = s === swatch;
          s.classList.toggle('is-active', active);
          s.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      });
    }

    var form = $('#noteForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = $('#noteText').value.trim();
      if (!text) return;
      var author = $('#noteAuthor').value || (state.members[0] && state.members[0].id);
      if (!author) { toast('먼저 구성원을 확인해 주세요'); return; }
      store.add('notes', { text: text, color: state.noteColor, authorId: author })
        .then(function () {
          $('#noteText').value = '';
          $('#noteText').focus();
          toast('메모를 붙였어요');
        }).catch(function () { toast('붙이지 못했어요. 다시 시도해 주세요.'); });
    });

    var list = $('#noteList');
    if (list) {
      list.addEventListener('click', function (e) {
        var del = e.target.closest('[data-act="del-note"]');
        if (!del) return;
        var id = del.closest('.note').dataset.id;
        if (!window.confirm('이 메모를 뗄까요?')) return;
        store.remove('notes', id)
          .then(function () { toast('메모를 뗐어요'); })
          .catch(function () { toast('떼지 못했어요. 다시 시도해 주세요.'); });
      });
    }
  }

  function renderNotes() {
    var list = $('#noteList');
    if (!list) return;
    $('#noteEmpty').hidden = state.notes.length > 0;

    list.innerHTML = state.notes.map(function (note) {
      var author = memberById(note.authorId);
      return '<article class="note" data-id="' + esc(note.id) + '" data-color="' + esc(note.color || 'lilac') + '">' +
        '<p class="note-text">' + esc(note.text) + '</p>' +
        '<div class="note-foot">' +
          '<span>' + esc(author.emoji + ' ' + author.label) + ' · ' + esc(fmtTime(note.createdAt)) + '</span>' +
          '<button class="mini-btn" type="button" data-act="del-note" aria-label="메모 떼기">✕</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }
})();
