/* ============================================================
   건이봉이 오피스 — 데이터 연결 설정 (db-config.js)

   지금은 브라우저의 localStorage 에만 저장되는 '로컬 모드'로 동작합니다.
   나중에 무료 Firebase Realtime Database 를 붙일 때는
   아래 firebase.enabled 를 true 로 바꾸고 firebase.config 값을 채우면
   화면 코드(app.js / style.css / index.html)는 손대지 않아도 됩니다.

   ── Firebase 연결 순서 (자세한 설명은 README.md) ──────────────
   1) https://console.firebase.google.com 에서 프로젝트 만들기
   2) 빌드 > Realtime Database 만들기 (위치: asia-southeast1)
   3) 프로젝트 설정 > 내 앱(웹) 추가 → firebaseConfig 복사
   4) 아래 config 에 붙여 넣고 enabled: true 로 변경
   5) 저장 후 GitHub 에 올리면 두 사람이 실시간으로 같은 내용을 봅니다.

   ※ 보안 규칙은 README 의 예시를 참고하세요. 공개 저장소에 올릴 때는
      데이터베이스 규칙을 꼭 함께 설정해 주세요.
   ============================================================ */

window.OFFICE_CONFIG = {
  appName: '건이봉이 오피스',

  /* localStorage 키 (로컬 모드에서만 사용) */
  storageKey: 'geonibongi-office:v1',

  /* 움직임 ON/OFF 같은 화면 설정 저장 키 */
  prefsKey: 'geonibongi-office:prefs',

  firebase: {
    enabled: false,

    /* Realtime Database 주소가 들어 있는 firebaseConfig 를 그대로 붙여 넣으세요. */
    config: {
      apiKey: '',
      authDomain: '',
      databaseURL: '',          // 예: https://my-office-default-rtdb.asia-southeast1.firebasedatabase.app
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    },

    /* 이 오피스의 데이터가 저장될 경로 (같은 DB 를 다른 오피스와 나눠 쓸 때 사용) */
    rootPath: 'offices/geonibongi',

    /* 불러올 Firebase JS SDK 버전 (compat 빌드, 빌드 도구 없이 script 로딩) */
    sdkVersion: '10.12.2'
  }
};
