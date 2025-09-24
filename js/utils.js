// 유틸리티 함수들
const Utils = {
  // DOM 선택자 헬퍼
  $: (sel) => document.querySelector(sel),
  $$: (sel) => Array.from(document.querySelectorAll(sel)),

  // 고유 ID 생성 및 관리
  ensureUid() {
    const key = "lol-random-uid";
    let v = localStorage.getItem(key);
    if (!v) {
      // 더 고유한 ID 생성 (시간 + 랜덤)
      const timestamp = Date.now().toString(36);
      const random = this.randomId(6);
      v = `u_${timestamp}_${random}`;
      localStorage.setItem(key, v);
      console.log("[DEBUG] 새 UID 생성:", v);
    } else {
      console.log("[DEBUG] 기존 UID 사용:", v);
    }
    return v;
  },

  // 랜덤 ID 생성
  randomId(n = 6) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < n; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  },

  // 과반수 계산
  majorityNeeded(n) {
    return Math.floor(n / 2) + 1;
  },

  // HTML 이스케이프
  escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  },

  // 토스트 메시지 (나중에 실제 토스트로 교체 가능)
  toast(msg) {
    console.log("[INFO]", msg);
    // TODO: 실제 토스트 UI 구현
  },

  // 챔피언 이미지 URL 생성
  champIconUrl(imageFull, version) {
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${imageFull}`;
  },

  // URL 파라미터 헬퍼
  getUrlParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  },

  setUrlParam(name, value) {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(name, value);
    } else {
      url.searchParams.delete(name);
    }
    window.history.replaceState(null, "", url);
  },

  // 배열에서 중복 없이 n개 샘플링
  sampleUnique(arr, n) {
    const a = arr.slice();
    const out = [];
    for (let i = 0; i < n && a.length > 0; i++) {
      const idx = Math.floor(Math.random() * a.length);
      out.push(a[idx]);
      a.splice(idx, 1);
    }
    return out;
  },

  // 팀 인원 수 계산
  countTeam(players, team) {
    if (!players) return 0;
    return Object.values(players).filter(p => p.team === team).length;
  },

  // 클립보드 복사
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.toast("클립보드에 복사되었습니다.");
    } catch (err) {
      console.error("클립보드 복사 실패:", err);
      this.toast("클립보드 복사에 실패했습니다.");
    }
  }
};

// 전역으로 노출
window.Utils = Utils;