// 새로운 10명 플레이어 UI 관리자
class TenPlayerUI {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.playerSlots = {};
    this.currentBanModal = null;
    this.currentKickModal = null;
    this.init();
  }

  init() {
    this.setupSlots();
    this.setupBanModal();
    this.setupKickModal();
    this.setupTeamDropZones();
    this.setupKickZone();
  }

  // 플레이어 슬롯 초기화
  setupSlots() {
    const slots = document.querySelectorAll('.player-slot');
    slots.forEach(slot => {
      const team = slot.dataset.team;
      const slotNum = slot.dataset.slot;
      const key = `${team}-${slotNum}`;
      
      // 기존 player-ban 영역 초기화
      const banDisplay = slot.querySelector('.player-ban');
      if (banDisplay) {
        banDisplay.className = 'player-ban empty';
        banDisplay.innerHTML = '';
        banDisplay.title = '밴 설정/해제';
      }

      // 초기 상태로 모든 슬롯 숨김
      slot.classList.remove('visible', 'occupied', 'me');
      
      this.playerSlots[key] = {
        element: slot,
        team: team,
        slot: slotNum,
        player: null,
        isRerollActive: false
      };

      // 버튼 이벤트 설정
      const banArea = slot.querySelector('.player-ban');
      const rerollBtn = slot.querySelector('.btn-reroll');

      banArea.addEventListener('click', () => this.handleBanClick(key));
      rerollBtn.addEventListener('click', () => this.handleRerollClick(key));
      
      // 드래그 앤 드롭 이벤트 설정
      this.setupDragAndDrop(slot, key);
    });
  }

  // 밴 모달 설정
  setupBanModal() {
    const modal = document.getElementById('banModal');
    const closeBtn = document.getElementById('closeBanModal');
    const searchInput = document.getElementById('banSearchInput');
    
    closeBtn.addEventListener('click', () => this.closeBanModal());
    
    // 모달 바깥쪽 클릭시 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeBanModal();
    });

    // 검색 기능
    searchInput.addEventListener('input', (e) => {
      this.filterChampions(e.target.value);
    });
  }

  // 킥 모달 설정  
  setupKickModal() {
    const modal = document.getElementById('kickModal');
    const closeBtn = document.getElementById('closeKickModal');
    const confirmBtn = document.getElementById('confirmKickBtn');
    const cancelBtn = document.getElementById('cancelKickBtn');

    closeBtn.addEventListener('click', () => this.closeKickModal());
    cancelBtn.addEventListener('click', () => this.closeKickModal());
    confirmBtn.addEventListener('click', () => this.confirmKick());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeKickModal();
    });
  }

  // 플레이어 데이터 업데이트
  updatePlayers(players) {
    // 모든 슬롯 초기화
    Object.values(this.playerSlots).forEach(slot => {
      this.clearSlot(slot);
    });

    // 플레이어 배치
    let team1Count = 0;
    let team2Count = 0;

    Object.entries(players).forEach(([uid, playerData]) => {
      const team = playerData.team;
      let slotIndex;

      if (team === 'team1') {
        slotIndex = ++team1Count;
      } else if (team === 'team2') {
        slotIndex = ++team2Count;
      }

      if (slotIndex <= 5) {
        const key = `${team}-${slotIndex}`;
        if (this.playerSlots[key]) {
          this.setSlot(key, uid, playerData);
        }
      }
    });
    
    // 팀별 인원수 표시 업데이트
    this.updateTeamCounts(team1Count, team2Count);
    
    // 빈 슬롯들의 밴 아이콘을 기본 소환사 아이콘으로 설정
    this.updateEmptySlotBanIcons();
    
    // 모든 슬롯의 드래그 가능 여부 업데이트
    this.updateAllSlotsDraggable();
  }

  // 빈 슬롯의 밴 아이콘 업데이트
  updateEmptySlotBanIcons() {
    Object.entries(this.playerSlots).forEach(([key, slot]) => {
      if (!slot.player) {
        this.updatePlayerBan(key, null);
      }
    });
  }

  // 슬롯 설정
  setSlot(key, uid, playerData) {
    const slot = this.playerSlots[key];
    if (!slot) return;

    slot.player = { uid, ...playerData };
    
    const element = slot.element;
    const nameSpan = element.querySelector('.player-name');
    
    nameSpan.textContent = playerData.name;
    nameSpan.classList.remove('empty');
    
    // 슬롯을 부드럽게 표시하고 점유 상태로 설정
    element.style.display = 'flex';
    // 다음 프레임에서 애니메이션 시작
    requestAnimationFrame(() => {
      element.classList.add('visible', 'occupied');
    });
    
    // 본인 표시
    if (uid === this.gameManager.uid) {
      element.classList.add('me');
    }

    // 호스트인 경우 드래그 가능 (킥 버튼 대신 드래그로 추방)

    // 밴 상태 업데이트
    this.updatePlayerBan(key, playerData.ban);

    // 드래그 가능 여부 업데이트
    this.updateSlotDraggable(key);

    // 리롤 상태는 별도 투표 시스템에서 업데이트됨
  }

  // 슬롯 초기화
  clearSlot(slot) {
    slot.player = null;
    slot.isRerollActive = false;
    
    const element = slot.element;
    const nameSpan = element.querySelector('.player-name');
    
    nameSpan.textContent = `플레이어${slot.slot}`;
    nameSpan.classList.add('empty');
    
    // 슬롯을 부드럽게 숨기고 모든 상태 클래스 제거
    element.classList.remove('visible', 'occupied', 'me');
    
    // 애니메이션 후 완전히 숨김
    setTimeout(() => {
      if (!element.classList.contains('visible')) {
        element.style.display = 'none';
      }
    }, 300); // transition 시간과 맞춤
    
    // 기존 킥 버튼이 있다면 제거 (이제 드래그로 추방)
    const kickBtn = element.querySelector('.btn-kick');
    if (kickBtn) kickBtn.remove();
    
    // 드래그 가능 여부 업데이트
    const key = `${slot.team}-${slot.slot}`;
    this.updateSlotDraggable(key);

    // 리롤 버튼 상태 초기화
    const rerollBtn = element.querySelector('.btn-reroll');
    rerollBtn.classList.remove('active');
  }

  // 킥 버튼 제거됨 - 이제 드래그 앤 드롭으로 추방

  // 밴 클릭 처리
  async handleBanClick(slotKey) {
    const slot = this.playerSlots[slotKey];
    if (!slot.player) return;

    // 관리자는 모든 플레이어의 밴을 제어할 수 있음
    if (!this.gameManager.isHost && slot.player.uid !== this.gameManager.uid) {
      alert('자신의 슬롯에서만 밴을 설정할 수 있습니다.');
      return;
    }

    // 현재 선택된 플레이어를 저장
    this.currentBanTargetUid = slot.player.uid;
    this.currentBanSlotKey = slotKey;
    await this.showBanModal();
  }

  // 리롤 클릭 처리
  async handleRerollClick(slotKey) {
    const slot = this.playerSlots[slotKey];
    if (!slot.player) return;

    // 관리자는 모든 플레이어의 리롤 투표를 제어할 수 있음
    if (!this.gameManager.isHost && slot.player.uid !== this.gameManager.uid) {
      alert('자신의 슬롯에서만 리롤을 설정할 수 있습니다.');
      return;
    }

    const targetUid = slot.player.uid;
    const newState = !slot.isRerollActive;
    await this.gameManager.toggleRerollVoteForPlayer(targetUid, newState);
  }

  // 리롤 상태 업데이트
  updateRerollState(slotKey, isActive) {
    const slot = this.playerSlots[slotKey];
    if (!slot) return;

    slot.isRerollActive = isActive;
    const rerollBtn = slot.element.querySelector('.btn-reroll');
    
    if (isActive) {
      rerollBtn.classList.add('active');
    } else {
      rerollBtn.classList.remove('active');
    }
  }

  // 투표 상태 업데이트 (Firebase votes 데이터 기반)
  updateVoteStates(votes) {
    const v = votes || {};
    
    // 모든 슬롯의 리롤 상태 초기화
    Object.keys(this.playerSlots).forEach(key => {
      const slot = this.playerSlots[key];
      if (slot.player) {
        const uid = slot.player.uid;
        let isActive = false;
        
        // 전역 리롤 투표 확인
        if (v.globalReroll && v.globalReroll[uid]) {
          isActive = true;
        }
        
        // 팀별 리롤 투표 확인
        const team = slot.player.team;
        if (team === 'team1' && v.team1Reroll && v.team1Reroll[uid]) {
          isActive = true;
        } else if (team === 'team2' && v.team2Reroll && v.team2Reroll[uid]) {
          isActive = true;
        }
        
        this.updateRerollState(key, isActive);
      }
    });
    
    // 과반수 달성 체크 및 관리자 버튼 스타일 업데이트
    this.checkVoteMajority(v);
  }

  // 투표 과반수 체크
  checkVoteMajority(votes) {
    if (!this.gameManager.isHost) return;
    
    const globalRerollBtn = document.getElementById('forceRollBtn');
    const team1RerollBtn = document.getElementById('forceTeam1Btn');
    const team2RerollBtn = document.getElementById('forceTeam2Btn');
    
    // 전체 플레이어 수 계산
    const totalPlayers = Object.values(this.playerSlots).filter(slot => slot.player).length;
    const team1Players = Object.values(this.playerSlots).filter(slot => 
      slot.player && slot.player.team === 'team1').length;
    const team2Players = Object.values(this.playerSlots).filter(slot => 
      slot.player && slot.player.team === 'team2').length;
    
    // 투표 수 계산
    const globalVotes = votes.globalReroll ? Object.keys(votes.globalReroll).length : 0;
    
    // globalReroll 데이터를 팀별로 분리해서 계산
    let team1Votes = 0;
    let team2Votes = 0;
    
    if (votes.globalReroll) {
      Object.keys(votes.globalReroll).forEach(uid => {
        // 해당 uid가 어느 팀인지 찾기
        for (const slot of Object.values(this.playerSlots)) {
          if (slot.player && slot.player.uid === uid) {
            if (slot.player.team === 'team1') {
              team1Votes++;
            } else if (slot.player.team === 'team2') {
              team2Votes++;
            }
            break;
          }
        }
      });
    }
    
    // 과반수 체크 및 스타일 적용
    if (globalRerollBtn) {
      if (globalVotes > totalPlayers / 2) {
        globalRerollBtn.classList.add('ready');
      } else {
        globalRerollBtn.classList.remove('ready');
      }
    }
    
    if (team1RerollBtn) {
      if (team1Votes > team1Players / 2) {
        team1RerollBtn.classList.add('ready');
      } else {
        team1RerollBtn.classList.remove('ready');
      }
    }
    
    if (team2RerollBtn) {
      if (team2Votes > team2Players / 2) {
        team2RerollBtn.classList.add('ready');
      } else {
        team2RerollBtn.classList.remove('ready');
      }
    }
  }

  // 밴 모달 표시
  async showBanModal() {
    const modal = document.getElementById('banModal');
    const grid = document.getElementById('banChampionGrid');
    
    // 챔피언 데이터 로드
    if (!window.datadragon.version) {
      await window.datadragon.loadChampions();
    }
    const champions = window.datadragon.champsById;
    
    grid.innerHTML = '';
    
    Object.entries(champions).forEach(([key, champ]) => {
      const item = document.createElement('div');
      item.className = 'champion-select-item';
      item.style.backgroundImage = `url(${window.datadragon.champIconUrl(champ.imageFull)})`;
      item.title = champ.name;
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'name';
      nameSpan.textContent = champ.name;
      item.appendChild(nameSpan);
      
      item.addEventListener('click', async () => {
        // 현재 선택된 플레이어의 밴 설정
        if (this.currentBanTargetUid) {
          if (this.currentBanTargetUid === this.gameManager.uid) {
            await this.gameManager.setBan(key);
          } else {
            await this.gameManager.setBanForPlayer(this.currentBanTargetUid, key);
          }
        }
        this.closeBanModal();
      });
      
      grid.appendChild(item);
    });
    
    modal.hidden = false;
  }

  // 밴 모달 닫기
  closeBanModal() {
    const modal = document.getElementById('banModal');
    modal.hidden = true;
    document.getElementById('banSearchInput').value = '';
    this.currentBanTargetUid = null;
    this.currentBanSlotKey = null;
  }

  // 챔피언 필터링
  filterChampions(searchTerm) {
    const items = document.querySelectorAll('.champion-select-item');
    const term = searchTerm.toLowerCase();
    
    items.forEach(item => {
      const name = item.title.toLowerCase();
      if (name.includes(term)) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }

  // 킥 모달 표시
  showKickModal(uid, playerName) {
    const modal = document.getElementById('kickModal');
    const nameSpan = document.getElementById('kickPlayerName');
    
    nameSpan.textContent = playerName;
    this.currentKickModal = { uid, playerName };
    
    modal.hidden = false;
  }

  // 킥 모달 닫기
  closeKickModal() {
    const modal = document.getElementById('kickModal');
    modal.hidden = true;
    this.currentKickModal = null;
  }

  // 킥 확정
  async confirmKick() {
    if (!this.currentKickModal) return;
    
    try {
      await this.gameManager.kickPlayer(this.currentKickModal.uid);
      this.closeKickModal();
    } catch (error) {
      alert('플레이어 추방에 실패했습니다: ' + error.message);
    }
  }

  // 챔피언 풀 업데이트
  updateChampionPools(poolData) {
    if (!poolData) return;

    const team1Grid = document.getElementById('team1Pool');
    const team2Grid = document.getElementById('team2Pool');

    // 팀1 풀 업데이트
    if (poolData.team1) {
      this.renderChampionGrid(team1Grid, poolData.team1);
    }

    // 팀2 풀 업데이트  
    if (poolData.team2) {
      this.renderChampionGrid(team2Grid, poolData.team2);
    }
  }

  // 챔피언 그리드 렌더링
  async renderChampionGrid(container, championKeys) {
    if (!championKeys || championKeys.length === 0) {
      container.innerHTML = '<div class="empty">아직 선택하지 않았습니다.</div>';
      return;
    }

    container.innerHTML = '';
    
    for (const key of championKeys) {
      const champData = window.datadragon.getChampion(key);
      if (!champData) continue;

      const card = document.createElement('div');
      card.className = 'champion-card';
      card.style.backgroundImage = `url(${window.datadragon.champIconUrl(champData.imageFull)})`;
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'champion-name';
      nameSpan.textContent = champData.name;
      card.appendChild(nameSpan);
      
      container.appendChild(card);
    }
  }

  // 플레이어 밴 상태 업데이트
  updatePlayerBan(slotKey, championKey) {
    const slot = this.playerSlots[slotKey];
    if (!slot) return;

    const banDisplay = slot.element.querySelector('.player-ban');
    if (!banDisplay) return;

    if (championKey && window.datadragon.getChampion(championKey)) {
      const champ = window.datadragon.getChampion(championKey);
      banDisplay.style.backgroundImage = `url(${window.datadragon.champIconUrl(champ.imageFull)})`;
      banDisplay.innerHTML = '';
      banDisplay.title = `밴: ${champ.name}`;
      banDisplay.className = 'player-ban active';
    } else {
      // 기본 소환사 아이콘 사용 (DataDragon 로드 상태와 무관하게 하드코딩)
      const defaultIconUrl = window.datadragon.version 
        ? window.datadragon.getDefaultSummonerIconUrl()
        : 'https://ddragon.leagueoflegends.com/cdn/15.19.1/img/profileicon/29.png';
      
      banDisplay.style.backgroundImage = `url(${defaultIconUrl})`;
      banDisplay.innerHTML = '';
      banDisplay.title = '밴 없음';
      banDisplay.className = 'player-ban empty';
    }
  }

  // 드래그 앤 드롭 설정
  setupDragAndDrop(slotElement, slotKey) {
    // 드래그 시작
    slotElement.addEventListener('dragstart', (e) => {
      const slot = this.playerSlots[slotKey];
      
      // 호스트가 아니거나 빈 슬롯이면 드래그 불가
      if (!this.gameManager.isHost || !slot.player) {
        e.preventDefault();
        return;
      }
      
      // 드래그 데이터 설정
      e.dataTransfer.setData('text/plain', JSON.stringify({
        sourceSlot: slotKey,
        playerUid: slot.player.uid,
        playerName: slot.player.name
      }));
      
      e.dataTransfer.effectAllowed = 'move';
      slotElement.classList.add('dragging');
      
      // 추방존 표시 (자기 자신이 아닌 경우에만)
      if (slot.player.uid !== this.gameManager.uid) {
        this.showKickZone();
      }
      
      console.log(`[드래그시작] ${slot.player.name} (${slotKey})`);
    });
    
    // 드래그 종료
    slotElement.addEventListener('dragend', (e) => {
      slotElement.classList.remove('dragging');
      
      // 모든 드롭존 하이라이트 제거
      document.querySelectorAll('.team-section').forEach(section => {
        section.classList.remove('drag-over');
      });
      
      // 추방존 숨기기
      this.hideKickZone();
    });
    
    // 드래그오버 (필요시 슬롯별 처리)
    slotElement.addEventListener('dragover', (e) => {
      if (this.gameManager.isHost) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    });
    
    // 플레이어가 있는 슬롯만 드래그 가능하도록 설정
    this.updateSlotDraggable(slotKey);
  }

  // 팀 섹션에 드롭존 설정
  setupTeamDropZones() {
    const teamSections = document.querySelectorAll('.team-section');
    
    teamSections.forEach(section => {
      const team = section.dataset.team;
      
      // 드래그오버
      section.addEventListener('dragover', (e) => {
        if (this.gameManager.isHost) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          section.classList.add('drag-over');
        }
      });
      
      // 드래그 나가기
      section.addEventListener('dragleave', (e) => {
        // 자식 요소로 이동하는 경우가 아닐 때만 하이라이트 제거
        if (!section.contains(e.relatedTarget)) {
          section.classList.remove('drag-over');
        }
      });
      
      // 드롭
      section.addEventListener('drop', async (e) => {
        e.preventDefault();
        section.classList.remove('drag-over');
        
        if (!this.gameManager.isHost) return;
        
        try {
          const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
          const { sourceSlot, playerUid, playerName } = dragData;
          
          const sourceTeam = sourceSlot.split('-')[0];
          const targetTeam = team;
          
          console.log(`[드롭] ${playerName}: ${sourceTeam} → ${targetTeam}`);
          
          // 같은 팀이면 무시
          if (sourceTeam === targetTeam) {
            console.log('[드롭] 같은 팀으로 이동 시도 - 무시');
            return;
          }
          
          // 팀 변경 실행
          await this.gameManager.changePlayerTeam(playerUid, targetTeam);
          
        } catch (error) {
          console.error('[드롭] 실패:', error);
          Utils.toast(error.message || '팀 변경에 실패했습니다.');
        }
      });
    });
  }

  // 슬롯 드래그 가능 여부 업데이트
  updateSlotDraggable(slotKey) {
    const slot = this.playerSlots[slotKey];
    const element = slot.element;
    
    // 호스트이고 플레이어가 있는 슬롯만 드래그 가능
    const isDraggable = this.gameManager.isHost && slot.player;
    element.draggable = isDraggable;
    
    if (isDraggable) {
      element.classList.add('draggable');
    } else {
      element.classList.remove('draggable');
    }
  }

  // 모든 슬롯의 드래그 가능 여부 업데이트
  updateAllSlotsDraggable() {
    Object.keys(this.playerSlots).forEach(key => {
      this.updateSlotDraggable(key);
    });
  }

  // 추방존 설정
  setupKickZone() {
    const kickZone = document.getElementById('kickZone');
    if (!kickZone) return;

    // 드래그오버
    kickZone.addEventListener('dragover', (e) => {
      if (this.gameManager.isHost) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        kickZone.classList.add('drag-over');
      }
    });

    // 드래그 나가기
    kickZone.addEventListener('dragleave', (e) => {
      if (!kickZone.contains(e.relatedTarget)) {
        kickZone.classList.remove('drag-over');
      }
    });

    // 드롭 - 추방 실행
    kickZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      kickZone.classList.remove('drag-over');
      
      if (!this.gameManager.isHost) return;

      try {
        const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const { playerUid, playerName } = dragData;
        
        // 자기 자신은 추방할 수 없음
        if (playerUid === this.gameManager.uid) {
          Utils.toast('자기 자신은 추방할 수 없습니다.');
          return;
        }

        console.log(`[드롭추방] ${playerName} (${playerUid}) 추방 시도`);
        
        // 추방 확인 없이 바로 실행 (드래그가 이미 의도적인 행동이므로)
        await this.gameManager.kickPlayer(playerUid);
        Utils.toast(`${playerName}을(를) 추방했습니다.`);
        
      } catch (error) {
        console.error('[드롭추방] 실패:', error);
        Utils.toast('추방에 실패했습니다.');
      }
    });
  }

  // 드래그 시작 시 추방존 표시
  showKickZone() {
    if (this.gameManager.isHost) {
      const kickZone = document.getElementById('kickZone');
      if (kickZone) {
        kickZone.style.display = 'block';
      }
    }
  }

  // 드래그 종료 시 추방존 숨기기
  hideKickZone() {
    const kickZone = document.getElementById('kickZone');
    if (kickZone) {
      kickZone.style.display = 'none';
    }
  }

  // 팀별 인원수 업데이트
  updateTeamCounts(team1Count, team2Count) {
    const team1Title = document.querySelector('.team1-section .team-title');
    const team2Title = document.querySelector('.team2-section .team-title');
    
    if (team1Title) {
      team1Title.innerHTML = `1팀 <span class="team-count">(${team1Count}/5)</span>`;
    }
    
    if (team2Title) {
      team2Title.innerHTML = `2팀 <span class="team-count">(${team2Count}/5)</span>`;
    }
  }
}

// 전역으로 노출
window.TenPlayerUI = TenPlayerUI;