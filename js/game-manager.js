// 게임 매니저 - 메인 로직 (새로 작성)
class GameManager {
  constructor() {
    this.uid = Utils.ensureUid();
    this.roomId = null;
    this.isHost = false;
    this.playerData = { name: null, team: "team1" };
    this.listeners = new Map();
    this.tenPlayerUI = null; // 새로운 UI 컨트롤러
    
    this.init();
  }

  init() {
    // URL에서 초기 파라미터 확인
    const roomParam = Utils.getUrlParam('room');
    const nameParam = Utils.getUrlParam('name');
    
    if (roomParam && nameParam) {
      // 자동 참가
      setTimeout(() => {
        joinRoomModal.show(roomParam);
      }, 100);
    }
  }

  // 방 생성 - 단순하고 명확하게
  async createRoom({ gameName, hostName, password }) {
    await datadragon.loadChampions();
    
    const roomId = Utils.randomId(6);
    
    console.log(`[방생성] 방 ID: ${roomId}, 방장: ${hostName} (UID: ${this.uid})`);

    // 1단계: 방 메타데이터 생성
    await window.db.ref(`rooms/${roomId}/meta`).set({
      hostId: this.uid,
      hostName,
      gameName: gameName || '칼바람 랜덤 게임',
      password: password ? this.hashPassword(password) : null,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      version: datadragon.version
    });

    // 2단계: 빈 풀 생성
    await window.db.ref(`rooms/${roomId}/pool`).set({
      team1: [],
      team2: [],
      version: datadragon.version,
      rolledAt: firebase.database.ServerValue.TIMESTAMP
    });

    // 3단계: 방장을 팀1에 추가
    await this.addPlayerToRoom(roomId, hostName, "team1", true);
    
    Utils.toast('방이 생성되었습니다.');
  }

  // 방 정보 조회
  async getRoomInfo(roomId) {
    try {
      const [metaSnap, playersSnap] = await Promise.all([
        window.db.ref(`rooms/${roomId}/meta`).once('value'),
        window.db.ref(`rooms/${roomId}/players`).once('value')
      ]);
      
      if (!metaSnap.exists()) {
        return null;
      }
      
      const meta = metaSnap.val();
      const players = playersSnap.val() || {};
      
      return {
        roomId,
        gameName: meta.gameName,
        hostName: meta.hostName,
        hasPassword: !!meta.password,
        playerCount: Object.keys(players).length,
        version: meta.version
      };
    } catch (error) {
      console.error('방 정보 조회 실패:', error);
      return null;
    }
  }

  // 방 참가
  async joinRoom(roomId, { playerName, password }) {
    console.log(`[방참가] ${playerName} (UID: ${this.uid}) → 방: ${roomId}`);

    // 방 존재 확인
    const metaSnap = await window.db.ref(`rooms/${roomId}/meta`).once('value');
    if (!metaSnap.exists()) {
      throw new Error('존재하지 않는 방입니다.');
    }

    const meta = metaSnap.val();
    
    // 비밀번호 확인
    if (meta.password && (!password || this.hashPassword(password) !== meta.password)) {
      throw new Error('비밀번호가 틀렸습니다.');
    }

    // 인원 적은 팀 찾기
    const playersSnap = await window.db.ref(`rooms/${roomId}/players`).once('value');
    const players = playersSnap.val() || {};
    
    const team1Count = Object.values(players).filter(p => p.team === "team1").length;
    const team2Count = Object.values(players).filter(p => p.team === "team2").length;
    const targetTeam = (team1Count <= team2Count) ? "team1" : "team2";
    
    console.log(`[방참가] 현재 팀1: ${team1Count}명, 팀2: ${team2Count}명 → ${targetTeam} 배정`);

    // 플레이어 추가
    await this.addPlayerToRoom(roomId, playerName, targetTeam, false);
    
    Utils.toast('방에 참가했습니다.');
  }

  // 플레이어를 방에 추가하는 단순한 함수
  async addPlayerToRoom(roomId, playerName, team, isHost) {
    this.roomId = roomId;
    this.isHost = isHost;
    this.playerData = { name: playerName, team };

    // 플레이어 데이터 설정 - 안전한 방식으로 추가
    const playerPath = `rooms/${roomId}/players/${this.uid}`;
    const playerData = {
      name: playerName,
      team: team,
      ban: null,
      joinedAt: firebase.database.ServerValue.TIMESTAMP,
      lastActive: firebase.database.ServerValue.TIMESTAMP
    };

    // 🔍 상세 디버깅
    console.log(`[디버깅] roomId:`, roomId);
    console.log(`[디버깅] this.uid:`, this.uid);
    console.log(`[디버깅] playerPath:`, playerPath);
    console.log(`[디버깅] 추가할 플레이어 데이터:`, playerData);

    // 기존 플레이어 목록 먼저 확인
    const playersSnapshot = await window.db.ref(`rooms/${roomId}/players`).once('value');
    const existingPlayers = playersSnapshot.val() || {};
    console.log(`[디버깅] 기존 플레이어 목록:`, Object.keys(existingPlayers));
    console.log(`[디버깅] 기존 플레이어 상세:`, existingPlayers);

    const playerRef = window.db.ref(playerPath);
    console.log(`[디버깅] playerRef.toString():`, playerRef.toString());
    
    // ✅ set() 사용 (새 플레이어 노드 생성)
    await playerRef.set(playerData);
    
    // 추가 후 다시 확인
    const afterSnapshot = await window.db.ref(`rooms/${roomId}/players`).once('value');
    const afterPlayers = afterSnapshot.val() || {};
    console.log(`[디버깅] 추가 후 플레이어 목록:`, Object.keys(afterPlayers));
    console.log(`[디버깅] 추가 후 플레이어 상세:`, afterPlayers);
    console.log(`[플레이어추가] ${playerName} → ${team}팀 완료`);

    // 연결 끊김 시 자동 제거
    window.db.ref(playerPath).onDisconnect().remove();

    // URL 업데이트
    Utils.setUrlParam('room', roomId);
    Utils.setUrlParam('name', playerName);

    // 리스너 설정 및 UI 업데이트
    this.bindListeners(roomId);
    this.updateUI();
  }

  // Firebase 리스너 바인딩 - 단순화
  bindListeners(roomId) {
    this.unbindListeners();

    console.log(`[리스너] ${roomId} 방에 대한 리스너 설정`);

    // 플레이어 목록 리스너
    window.db.ref(`rooms/${roomId}/players`).on('value', (snap) => {
      const players = snap.val() || {};
      console.log(`[리스너] 플레이어 목록 업데이트:`, Object.keys(players));
      this.renderPlayers(players);
      this.renderBans(players);
    });

    // 투표 리스너
    window.db.ref(`rooms/${roomId}/votes`).on('value', (snap) => {
      const votes = snap.val() || {};
      this.updateVoteIndicators(votes);
      
      // 새로운 UI로 투표 상태 업데이트
      if (this.tenPlayerUI) {
        this.tenPlayerUI.updateVoteStates(votes);
      }
      
      if (this.isHost) {
        this.maybeApplyRerolls(votes);
      }
    });

    // 풀 리스너
    window.db.ref(`rooms/${roomId}/pool`).on('value', (snap) => {
      const pool = snap.val();
      this.renderPools(pool);
    });

    // 메타 리스너 (호스트 권한 확인용)
    window.db.ref(`rooms/${roomId}/meta`).on('value', (snap) => {
      const meta = snap.val() || {};
      this.isHost = (meta.hostId === this.uid);
      this.updateUI();
    });
  }

  // 리스너 해제
  unbindListeners() {
    console.log(`[리스너] 기존 리스너 해제`);
    // 추후 필요시 구체적인 리스너 해제 로직 구현
  }

  updateUI() {
    // 게임 화면 표시
    Utils.$('#welcomeScreen').style.display = 'none';
    Utils.$('#gameScreen').style.display = 'block';

    // 새로운 UI 컨트롤러 초기화 (한 번만)
    if (!this.tenPlayerUI) {
      this.tenPlayerUI = new TenPlayerUI(this);
    }

    // 방 정보 표시
    const roomInfo = Utils.$('#roomInfo');
    roomInfo.innerHTML = `
      <span>방 코드: <strong>${this.roomId}</strong></span>
      <span>내 이름: <strong>${Utils.escapeHtml(this.playerData.name)}</strong></span>
    `;

    // 호스트 컨트롤 표시/숨김
    const hostControls = Utils.$('#hostControls');
    if (hostControls) {
      hostControls.style.display = this.isHost ? 'block' : 'none';
    }

    // 버전 정보 표시
    const versionInfo = Utils.$('#versionInfo');
    if (versionInfo && window.datadragon) {
      versionInfo.textContent = `Data Dragon: ${window.datadragon.version}`;
    }
  }

  renderPlayers(players) {
    const arr = Object.entries(players).map(([uid, p]) => ({ uid, ...p }));
    const t1 = arr.filter(p => p.team === "team1");
    const t2 = arr.filter(p => p.team === "team2");

    console.log(`[DEBUG] 플레이어 렌더링:`, {
      총인원: arr.length,
      팀1: t1.map(p => `${p.name}(${p.uid.substr(-4)})`),
      팀2: t2.map(p => `${p.name}(${p.uid.substr(-4)})`)
    });

    // 새로운 10명 플레이어 UI로 업데이트
    if (this.tenPlayerUI) {
      this.tenPlayerUI.updatePlayers(players);
      return;
    }

    // 기존 UI 폴백 (필요시)
    const makeLi = (p) => {
      const li = document.createElement("li");
      li.className = "player" + (p.uid === this.uid ? " me" : "");
      li.innerHTML = `<span>${Utils.escapeHtml(p.name)}</span>`;
      
      if (this.isHost && p.uid !== this.uid) {
        const kick = document.createElement("button");
        kick.className = "kick-btn";
        kick.textContent = "강퇴";
        kick.onclick = () => this.kickPlayer(p.uid);
        li.appendChild(kick);
      }
      return li;
    };

    const team1List = Utils.$('#team1List');
    const team2List = Utils.$('#team2List');
    
    if (team1List) {
      team1List.innerHTML = "";
      t1.forEach(p => team1List.appendChild(makeLi(p)));
    }
    
    if (team2List) {
      team2List.innerHTML = "";
      t2.forEach(p => team2List.appendChild(makeLi(p)));
    }
  }

  renderBans(players) {
    const bannedList = Utils.$('#bannedList');
    if (!bannedList) return;

    bannedList.innerHTML = "";
    const entries = Object.entries(players).filter(([uid, p]) => p.ban);
    
    entries.forEach(([uid, p]) => {
      const champ = datadragon.getChampion(p.ban);
      if (!champ) return;
      
      const card = document.createElement("div");
      card.className = "ban-card";
      card.innerHTML = `
        <img src="${datadragon.champIconUrl(champ.imageFull)}" alt="${Utils.escapeHtml(champ.name)}" />
        <span>${Utils.escapeHtml(p.name)}: ${Utils.escapeHtml(champ.name)}</span>
      `;
      bannedList.appendChild(card);
    });
  }

  renderPools(pool) {
    // 새로운 UI로 업데이트
    if (this.tenPlayerUI) {
      this.tenPlayerUI.updateChampionPools(pool);
      return;
    }

    // 기존 UI 폴백
    const team1Pool = Utils.$('#team1Pool');
    const team2Pool = Utils.$('#team2Pool');
    
    if (!team1Pool || !team2Pool) return;
    
    team1Pool.innerHTML = "";
    team2Pool.innerHTML = "";
    
    if (!pool || !pool.team1 || !pool.team2) return;

    const renderTeam = (container, list) => {
      list.forEach(id => {
        const champ = window.DataDragon?.getChampion(id);
        if (!champ) return;
        
        const div = document.createElement("div");
        div.className = "champ";
        div.innerHTML = `
          <img src="${champ.image}" alt="${Utils.escapeHtml(champ.name)}" />
          <div class="meta">${Utils.escapeHtml(champ.name)}</div>
        `;
        div.onclick = () => this.setMyPick(id);
        container.appendChild(div);
      });
    };

    renderTeam(team1Pool, pool.team1);
    renderTeam(team2Pool, pool.team2);
  }

  // 간단한 해시 함수 (실제 서비스에서는 더 강력한 해시를 사용해야 함)
  hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return hash.toString(36);
  }

  async kickPlayer(uid) {
    if (!this.isHost) return;
    await window.db.ref(`rooms/${this.roomId}/players/${uid}`).remove();
  }

  setMyPick(champId) {
    localStorage.setItem('myPick', champId);
    this.renderMyPick(champId);
  }

  renderMyPick(champId) {
    const myPick = Utils.$('#myPick');
    if (!myPick) return;

    myPick.innerHTML = "";
    
    if (!champId) {
      const span = document.createElement("span");
      span.className = "empty";
      span.textContent = "아직 선택하지 않았습니다.";
      myPick.appendChild(span);
      return;
    }

    const champ = datadragon.getChampion(champId);
    if (!champ) return;

    const div = document.createElement("div");
    div.className = "pick-card";
    div.innerHTML = `
      <img src="${datadragon.champIconUrl(champ.imageFull)}" alt="${Utils.escapeHtml(champ.name)}" />
      <div>
        <div>${Utils.escapeHtml(champ.name)}</div>
        <div class="hint">${champ.id}</div>
      </div>
    `;
    myPick.appendChild(div);
  }

  async updateVoteIndicators(votes) {
    const v = votes || {};
    
    try {
      const playersSnap = await window.db.ref(`rooms/${this.roomId}/players`).once('value');
      const players = playersSnap.val() || {};
      
      const t1Count = Utils.countTeam(players, "team1");
      const t2Count = Utils.countTeam(players, "team2");
      const total = t1Count + t2Count;

      const t1Votes = Object.keys(v.team1Reroll || {}).length;
      const t2Votes = Object.keys(v.team2Reroll || {}).length;
      const gVotes = Object.keys(v.globalReroll || {}).length;

      const team1VoteCount = Utils.$('#team1VoteCount');
      const team2VoteCount = Utils.$('#team2VoteCount');
      const globalVoteCount = Utils.$('#globalVoteCount');

      if (team1VoteCount) team1VoteCount.textContent = `${t1Votes}/${Utils.majorityNeeded(t1Count)}`;
      if (team2VoteCount) team2VoteCount.textContent = `${t2Votes}/${Utils.majorityNeeded(t2Count)}`;
      if (globalVoteCount) globalVoteCount.textContent = `${gVotes}/${Utils.majorityNeeded(total)}`;
    } catch (error) {
      console.error('투표 표시 업데이트 실패:', error);
    }
  }

  async maybeApplyRerolls(votes) {
    // 자동 리롤은 비활성화하되, 투표 상태 업데이트는 유지
    if (!this.isHost) return;

    try {
      const playersSnap = await window.db.ref(`rooms/${this.roomId}/players`).once('value');
      const players = playersSnap.val() || {};
      
      const t1Count = Utils.countTeam(players, "team1");
      const t2Count = Utils.countTeam(players, "team2");
      const total = t1Count + t2Count;

      const t1Votes = Object.keys((votes && votes.team1Reroll) || {}).length;
      const t2Votes = Object.keys((votes && votes.team2Reroll) || {}).length;
      const gVotes = Object.keys((votes && votes.globalReroll) || {}).length;

      const t1Need = Utils.majorityNeeded(t1Count);
      const t2Need = Utils.majorityNeeded(t2Count);
      const gNeed = Utils.majorityNeeded(total);

      // 자동 리롤 실행은 비활성화, 투표 상태만 확인
      console.log(`[투표상태] 전체: ${gVotes}/${gNeed}, 팀1: ${t1Votes}/${t1Need}, 팀2: ${t2Votes}/${t2Need}`);
      
      // 투표 초기화는 하지 않음 (수동 리롤에서만 처리)
    } catch (error) {
      console.error('투표 상태 확인 실패:', error);
    }
  }

  async hostRollBoth() {
    if (!this.isHost) return;

    try {
      await datadragon.loadChampions();
      
      // 밴된 챔피언들 수집
      const playersSnap = await window.db.ref(`rooms/${this.roomId}/players`).once('value');
      const players = playersSnap.val() || {};
      
      const bannedChamps = new Set();
      Object.values(players).forEach(p => {
        if (p.ban) bannedChamps.add(p.ban);
      });
      
      // 랜덤 풀 생성
      const team1Pool = datadragon.getRandomChampions(bannedChamps, 15);
      const team2Pool = datadragon.getRandomChampions(new Set([...bannedChamps, ...team1Pool]), 15);
      
      if (team1Pool.length < 15 || team2Pool.length < 15) {
        Utils.toast('후보 챔피언이 부족합니다. 밴을 줄여주세요.');
        return;
      }
      
      // 풀 업데이트
      await window.db.ref(`rooms/${this.roomId}/pool`).update({
        team1: team1Pool,
        team2: team2Pool,
        version: datadragon.version,
        rolledAt: firebase.database.ServerValue.TIMESTAMP
      });
      
      // 전체 리롤 투표 초기화
      try {
        console.log('[전체리롤] 투표 초기화 시작...');
        const votesRef = window.db.ref(`rooms/${this.roomId}/votes/globalReroll`);
        console.log('[전체리롤] 투표 경로:', votesRef.toString());
        
        await votesRef.remove();
        console.log('[전체리롤] 모든 투표 초기화 완료');
      } catch (voteError) {
        console.error('[전체리롤] 투표 초기화 실패:', voteError);
        // 개별적으로 제거 시도
        await this.clearAllVotes();
      }
    } catch (error) {
      console.error('전체 리롤 실패:', error);
      throw error;
    }
  }

  async hostRollTeam(team) {
    if (!this.isHost) return;

    try {
      await datadragon.loadChampions();
      
      // 현재 풀과 밴 정보 가져오기
      const [poolSnap, playersSnap] = await Promise.all([
        window.db.ref(`rooms/${this.roomId}/pool`).once('value'),
        window.db.ref(`rooms/${this.roomId}/players`).once('value')
      ]);
      
      const pool = poolSnap.val() || { team1: [], team2: [] };
      const players = playersSnap.val() || {};
      
      // 제외할 챔피언들 (밴 + 상대팀 풀)
      const excluded = new Set();
      Object.values(players).forEach(p => {
        if (p.ban) excluded.add(p.ban);
      });
      
      const otherTeam = team === 'team1' ? 'team2' : 'team1';
      pool[otherTeam].forEach(id => excluded.add(id));
      
      // 새 풀 생성
      const newPool = datadragon.getRandomChampions(excluded, 15);
      
      if (newPool.length < 15) {
        Utils.toast('후보 챔피언이 부족합니다.');
        return;
      }
      
      // 풀 업데이트
      await window.db.ref(`rooms/${this.roomId}/pool`).update({
        [team]: newPool,
        version: datadragon.version,
        rolledAt: firebase.database.ServerValue.TIMESTAMP
      });
      
      // 해당 팀의 리롤 투표 초기화
      try {
        await this.clearTeamVotes(team, players);
        console.log(`[${team}리롤] ${team} 팀 투표 초기화 완료`);
      } catch (voteError) {
        console.error(`[${team}리롤] 투표 초기화 실패:`, voteError);
      }
    } catch (error) {
      console.error('팀 리롤 실패:', error);
      throw error;
    }
  }

  // 모든 투표 초기화 (개별 제거)
  async clearAllVotes() {
    try {
      const votesSnap = await window.db.ref(`rooms/${this.roomId}/votes/globalReroll`).once('value');
      const votes = votesSnap.val() || {};
      
      console.log('[투표초기화] 개별 제거 시작:', Object.keys(votes));
      
      // 각 투표를 개별적으로 제거
      const removePromises = Object.keys(votes).map(uid => 
        window.db.ref(`rooms/${this.roomId}/votes/globalReroll/${uid}`).remove()
      );
      
      await Promise.all(removePromises);
      console.log('[투표초기화] 개별 제거 완료');
    } catch (error) {
      console.error('[투표초기화] 개별 제거도 실패:', error);
    }
  }

  // 팀별 투표 초기화
  async clearTeamVotes(team, players) {
    const teamPlayers = Object.entries(players).filter(([uid, p]) => p.team === team);
    
    console.log(`[${team}팀투표초기화] 대상:`, teamPlayers.map(([uid, p]) => p.name));
    
    // 해당 팀 플레이어들의 globalReroll 투표 제거
    const removePromises = teamPlayers.map(([uid, playerData]) => 
      window.db.ref(`rooms/${this.roomId}/votes/globalReroll/${uid}`).remove()
    );
    
    await Promise.all(removePromises);
  }

  // 팀별 리롤 투표 초기화만 (챔피언 풀 변경 없이)
  async clearTeamVotesOnly(team) {
    if (!this.isHost) return;
    
    try {
      const playersSnap = await window.db.ref(`rooms/${this.roomId}/players`).once('value');
      const players = playersSnap.val() || {};
      
      await this.clearTeamVotes(team, players);
      console.log(`[${team}팀투표초기화] ${team} 팀 투표만 초기화 완료`);
    } catch (error) {
      console.error(`[${team}팀투표초기화] 실패:`, error);
      throw error;
    }
  }

  async leaveRoom() {
    if (!this.roomId) return;
    
    await window.db.ref(`rooms/${this.roomId}/players/${this.uid}`).remove();
    
    this.unbindListeners();
    this.roomId = null;
    
    // URL 초기화
    Utils.setUrlParam('room', '');
    Utils.setUrlParam('name', '');
    
    // 화면 전환
    Utils.$('#gameScreen').style.display = 'none';
    Utils.$('#welcomeScreen').style.display = 'block';
    
    Utils.toast('방을 나갔습니다.');
  }

  // 리롤 투표 토글 (전역 리롤로 설정)
  async toggleRerollVote(isActive) {
    if (!this.roomId) return;
    
    try {
      const votePath = `rooms/${this.roomId}/votes/globalReroll/${this.uid}`;
      if (isActive) {
        await window.db.ref(votePath).set(true);
      } else {
        await window.db.ref(votePath).remove();
      }
      console.log(`[리롤투표] ${isActive ? '활성화' : '비활성화'}`);
    } catch (error) {
      console.error('[리롤투표] 실패:', error);
      throw error;
    }
  }

  // 다른 플레이어의 리롤 투표 토글 (관리자 전용)
  async toggleRerollVoteForPlayer(targetUid, isActive) {
    if (!this.roomId) return;
    
    try {
      const votePath = `rooms/${this.roomId}/votes/globalReroll/${targetUid}`;
      if (isActive) {
        await window.db.ref(votePath).set(true);
      } else {
        await window.db.ref(votePath).remove();
      }
      console.log(`[리롤투표] 플레이어 ${targetUid}: ${isActive ? '활성화' : '비활성화'}`);
    } catch (error) {
      console.error('[리롤투표] 실패:', error);
      throw error;
    }
  }

  // 밴 설정
  async setBan(championKey) {
    if (!this.roomId) return;
    
    try {
      const banPath = `rooms/${this.roomId}/players/${this.uid}/ban`;
      await window.db.ref(banPath).set(championKey);
      console.log(`[밴설정] ${championKey} 설정 완료`);
      
      // UI 업데이트 (본인 슬롯 찾기)
      if (this.tenPlayerUI && this.tenPlayerUI.playerSlots) {
        for (const [slotKey, slot] of Object.entries(this.tenPlayerUI.playerSlots)) {
          if (slot.player && slot.player.uid === this.uid) {
            this.tenPlayerUI.updatePlayerBan(slotKey, championKey);
            break;
          }
        }
      }
    } catch (error) {
      console.error('[밴설정] 실패:', error);
      throw error;
    }
  }

  // 다른 플레이어의 밴 설정 (관리자 전용)
  async setBanForPlayer(targetUid, championKey) {
    if (!this.roomId) return;
    
    try {
      const banPath = `rooms/${this.roomId}/players/${targetUid}/ban`;
      await window.db.ref(banPath).set(championKey);
      console.log(`[밴설정] 플레이어 ${targetUid}: ${championKey} 설정 완료`);
      
      // UI 업데이트 (해당 플레이어 슬롯 찾기)
      if (this.tenPlayerUI && this.tenPlayerUI.playerSlots) {
        for (const [slotKey, slot] of Object.entries(this.tenPlayerUI.playerSlots)) {
          if (slot.player && slot.player.uid === targetUid) {
            this.tenPlayerUI.updatePlayerBan(slotKey, championKey);
            break;
          }
        }
      }
    } catch (error) {
      console.error('[밴설정] 실패:', error);
      throw error;
    }
  }

  // 플레이어 추방 (호스트 전용)
  async kickPlayer(targetUid) {
    if (!this.isHost) {
      throw new Error('호스트만 플레이어를 추방할 수 있습니다.');
    }
    
    try {
      const playerPath = `rooms/${this.roomId}/players/${targetUid}`;
      await window.db.ref(playerPath).remove();
      console.log(`[플레이어추방] ${targetUid} 추방 완료`);
    } catch (error) {
      console.error('[플레이어추방] 실패:', error);
      throw error;
    }
  }

  // 플레이어 팀 변경 (호스트 전용)
  async changePlayerTeam(targetUid, newTeam, targetSlot = null) {
    if (!this.isHost) {
      throw new Error('호스트만 플레이어 팀을 변경할 수 있습니다.');
    }
    
    if (!this.roomId) return;
    
    try {
      // 현재 플레이어 정보 가져오기
      const playersSnap = await window.db.ref(`rooms/${this.roomId}/players`).once('value');
      const players = playersSnap.val() || {};
      const targetPlayer = players[targetUid];
      
      if (!targetPlayer) {
        throw new Error('대상 플레이어를 찾을 수 없습니다.');
      }
      
      // 팀 변경이 필요한 경우에만 실행
      if (targetPlayer.team !== newTeam) {
        // 새 팀의 인원 수 확인 (최대 5명)
        const newTeamCount = Object.values(players).filter(p => p.team === newTeam).length;
        if (newTeamCount >= 5) {
          throw new Error(`${newTeam === 'team1' ? '팀1' : '팀2'}은 이미 5명입니다.`);
        }
        
        // 플레이어 팀 업데이트
        const playerPath = `rooms/${this.roomId}/players/${targetUid}/team`;
        await window.db.ref(playerPath).set(newTeam);
        
        console.log(`[팀변경] ${targetPlayer.name}: ${targetPlayer.team} → ${newTeam}`);
        
        // 투표 초기화 (팀이 바뀌었으므로)
        const votePath = `rooms/${this.roomId}/votes/globalReroll/${targetUid}`;
        await window.db.ref(votePath).remove();
        
        Utils.toast(`${targetPlayer.name}을(를) ${newTeam === 'team1' ? '팀1' : '팀2'}로 이동했습니다.`);
      }
    } catch (error) {
      console.error('[팀변경] 실패:', error);
      Utils.toast(error.message || '팀 변경에 실패했습니다.');
      throw error;
    }
  }

  // TODO: 나머지 게임 로직들 (투표, 리롤, 밴 등)을 여기에 추가 예정
}

// 전역 게임 매니저 인스턴스
window.gameManager = new GameManager();