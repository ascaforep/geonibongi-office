# 건이봉이 오피스

건이(올라) · 봉이(똑똑이) · 꼼꼼이 세 팀, 그리고 AI 직원 세 명(클로드 · 지피티 · 안티그래비티)이 함께 쓰는 가족 공동 비서실 웹페이지입니다.
비서들은 각자 다른 고양이 캐릭터로 그려집니다.
직급·보고 체계: **감사팀(건이·올라) → 비서실장(똑똑이) → 비서(꼼꼼이)**. 감사팀 요청은 비서실장을 거치지 않고 바로 내려갈 수 있습니다.
빌드 도구 없이 HTML/CSS/JS 만으로 동작해서 **GitHub Pages 에 폴더를 그대로 올리면 바로 열립니다.**

![오피스 맵](assets/office-map.png)

## 들어 있는 것

| 탭 | 내용 |
| --- | --- |
| 🗺️ 오피스 맵 | 5인용 미니어처 오피스 그림 + 고양이 비서들 + 방 핀(지휘실 · 대회의실 · 작업실 · 라운지), 오늘 상태 요약, 움직임 ON/OFF |
| 💬 회의실 | 함께 정할 안건 올리기 · 지우기 (올린 사람 표시) |
| 🧰 작업실 | 할 일 추가 · 완료 체크 · 지우기, 담당자별 필터 (전체 / 건이 · 올라 / 봉이 · 똑똑이 / 꼼꼼이 / 클로드 / 지피티 / 안티그래비티) |
| 📊 비서현황 | 고양이 프로필 카드(진행 중·완료 수, 상태, 직책 배지) + 가족 구성원 추가 |
| 📝 메모 | 색깔 메모 붙이기 · 떼기 |

- 저장: 지금은 브라우저 `localStorage` (같은 기기·같은 브라우저에만 저장)
- 두 사람이 실시간으로 같이 쓰려면 아래 **Firebase 연결**만 하면 됩니다. 화면 코드는 고칠 필요 없어요.

## 파일

```
projects/geonibongi-office/
├── index.html          화면 뼈대
├── css/style.css       디자인 (크림 + 라일락 파스텔)
├── js/db-config.js     데이터 연결 설정 (Firebase 값 넣는 곳)
├── js/store.js         저장 담당 (localStorage ↔ Firebase 교체 가능)
├── js/cats.js          고양이 비서 캐릭터 (SVG)
├── js/app.js           화면 동작
├── assets/office-map.png  오피스 그림 (5인용 확장 · webp 동봉)
└── README.md
```

## GitHub Pages 에 올리기

1. GitHub 에서 새 저장소를 하나 만듭니다. (예: `geonibongi-office`)
2. 이 폴더 안의 파일을 저장소 루트에 그대로 올립니다.
   ```bash
   git init
   git add .
   git commit -m "건이봉이 오피스"
   git branch -M main
   git remote add origin https://github.com/<아이디>/geonibongi-office.git
   git push -u origin main
   ```
3. 저장소 → Settings → Pages → Source: `Deploy from a branch`, Branch: `main` / `/ (root)` → Save
4. 1~2분 뒤 `https://<아이디>.github.io/geonibongi-office/` 로 열립니다.

> 저장소가 Public 이므로 소스에 전화번호·집주소 같은 개인정보는 넣지 않았습니다.
> 이름도 `건이 · 올라`, `봉이 · 똑똑이` 별칭만 씁니다.
> 주소를 아는 사람은 페이지를 볼 수 있으니, 공개하고 싶지 않은 내용은 메모에 적지 마세요.
> (민감한 내용이 필요해지면 Firebase 로그인 규칙을 함께 켜는 것을 권합니다.)

## Firebase 실시간 DB 연결 (무료)

1. https://console.firebase.google.com → **프로젝트 추가**
2. **빌드 → Realtime Database → 데이터베이스 만들기**
   - 위치: `asia-southeast1` (서울과 가까움), 보안 규칙은 일단 **테스트 모드**
3. 프로젝트 설정(⚙️) → **내 앱 → 웹 앱 추가** → `firebaseConfig` 값 복사
4. `js/db-config.js` 를 열어 아래처럼 채웁니다.
   ```js
   firebase: {
     enabled: true,
     config: {
       apiKey: "...",
       authDomain: "...",
       databaseURL: "https://....asia-southeast1.firebasedatabase.app",
       projectId: "...",
       storageBucket: "...",
       messagingSenderId: "...",
       appId: "..."
     },
     rootPath: 'offices/geonibongi',
     sdkVersion: '10.12.2'
   }
   ```
5. 커밋해서 올리면 끝. 오른쪽 위 상태 배지가 `가동 중` 으로 바뀌고, 두 사람이 같은 내용을 실시간으로 봅니다.

### 데이터 모양 (Realtime Database)

```
offices/geonibongi/
├── meta/            { seeded: true, createdAt: ... }
├── members/<id>     { id, name, pickle, label, emoji, tone, cat, role, core, joinedAt }
├── messages/<id>    { id, title, body, authorId, createdAt }
├── tasks/<id>       { id, title, assigneeId, done, doneAt, createdAt }
└── notes/<id>       { id, text, color, authorId, createdAt }
```

### 보안 규칙 예시 (테스트 모드 만료 후)

테스트 모드는 30일 뒤 닫힙니다. 그때는 아래처럼 최소한의 규칙을 넣어 두세요.

```json
{
  "rules": {
    "offices": {
      "geonibongi": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> 위 규칙은 주소를 아는 사람이면 누구나 읽고 쓸 수 있습니다. 가족용으로는 충분하지만,
> 더 안전하게 쓰려면 Firebase **Authentication → 익명 로그인**을 켜고
> `".read": "auth != null"`, `".write": "auth != null"` 로 바꾸는 방법이 있습니다.
> 이 경우 `js/store.js` 의 `startFirebase()` 안에서 `firebase.auth().signInAnonymously()` 를
> 한 줄 추가하면 됩니다.

## 나중에 더 붙일 수 있는 것

- 가족 구성원 추가: **비서현황 → ＋ 가족 구성원 추가** (직책은 비워 두고 나중에 정할 수 있어요)
- 직책 정하기: 구성원 데이터의 `role` 값만 채우면 배지가 `직책 미정` 대신 표시됩니다.
  (`js/app.js` 의 `renderMembers()` 에서 `직책 미정` 부분을 `m.role` 로 바꾸면 됩니다.)
- 알림(푸시), 일정 연동, 사진 공유 등은 지금 구조 위에 탭만 더하면 됩니다.

## 로컬에서 미리 보기

`index.html` 을 브라우저로 바로 열어도 되지만, 아래처럼 작은 서버로 열면 더 확실합니다.

```bash
cd projects/geonibongi-office
python3 -m http.server 8765
# 브라우저에서 http://localhost:8765
```
