// Data Dragon API 관련 기능
class DataDragon {
  constructor() {
    this.version = null;
    this.champsById = {};
    this.flatList = [];
    this.summonerIcons = {};
  }

  async loadChampions() {
    if (this.version) return;

    try {
      // 최신 버전 가져오기
      const vRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const versions = await vRes.json();
      const latest = versions[0];
      this.version = latest;

      // 한국어 챔피언 데이터 가져오기
      const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latest}/data/ko_KR/champion.json`);
      const cJson = await cRes.json();
      const data = cJson.data;

      const champsById = {};
      const flatList = [];

      Object.keys(data).forEach(k => {
        const c = data[k];
        champsById[c.id] = {
          id: c.id,
          name: c.name,
          imageFull: c.image.full
        };
        flatList.push({ 
          id: c.id, 
          name: c.name, 
          imageFull: c.image.full 
        });
      });

      // 이름 순 정렬
      flatList.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      
      this.champsById = champsById;
      this.flatList = flatList;

      console.log(`[INFO] 챔피언 데이터 로드 완료: ${flatList.length}개, 버전: ${latest}`);
      
      // 소환사 아이콘도 함께 로드
      await this.loadSummonerIcons();
    } catch (error) {
      console.error("챔피언 데이터 로드 실패:", error);
      Utils.toast("챔피언 데이터를 불러오는데 실패했습니다.");
    }
  }

  async loadSummonerIcons() {
    if (!this.version) return;
    
    try {
      // 소환사 아이콘 데이터 가져오기
      const iconRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${this.version}/data/ko_KR/summoner.json`);
      const iconJson = await iconRes.json();
      this.summonerIcons = iconJson.data;
      
      console.log(`[INFO] 소환사 아이콘 데이터 로드 완료`);
    } catch (error) {
      console.error("소환사 아이콘 데이터 로드 실패:", error);
    }
  }

  getChampion(id) {
    return this.champsById[id] || null;
  }

  getAllChampions() {
    return this.champsById;
  }

  searchChampions(query) {
    const q = query.toLowerCase();
    return this.flatList.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.id.toLowerCase().includes(q)
    );
  }

  getRandomChampions(excludeSet, count) {
    const excluded = new Set(excludeSet || []);
    const candidates = this.flatList
      .map(c => c.id)
      .filter(id => !excluded.has(id));
    
    return Utils.sampleUnique(candidates, count);
  }

  champIconUrl(imageFull) {
    return Utils.champIconUrl(imageFull, this.version);
  }

  // 기본 소환사 아이콘 URL (아이콘 ID 29: 기본 아이콘)
  getDefaultSummonerIconUrl() {
    const defaultIconId = '29'; // 기본 소환사 아이콘 ID
    return `https://ddragon.leagueoflegends.com/cdn/${this.version}/img/profileicon/${defaultIconId}.png`;
  }

  // 소환사 아이콘 URL
  summonerIconUrl(iconId) {
    return `https://ddragon.leagueoflegends.com/cdn/${this.version}/img/profileicon/${iconId}.png`;
  }
}

// 전역 인스턴스
window.datadragon = new DataDragon();