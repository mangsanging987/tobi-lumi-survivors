;(function(){
  const log = [];
  log.push('SPD_MUL=' + SPD_MUL);
  startGame('tobi', ['tennis']);
  const p = G.player;
  spawnBoss();
  const b = G.enemies[G.enemies.length-1];
  log.push('boss timers: expressT=' + b.expressT + ' passengerT=' + b.passengerT);
  // 급행 통과 트리거
  b.expressT = 0.01; b.bt = 99; b.passengerT = 99;
  updateBoss(b, 0.02);
  log.push('express_warn: state=' + b.bstate + ' laneY=' + Math.round(b.laneY) + ' dir=' + b.expressDir);
  // 경고 끝 → 돌진
  b.bt = 0.01;
  updateBoss(b, 0.02);
  log.push('express: state=' + b.bstate + ' shake=' + G.shake);
  const x0 = b.x;
  updateBoss(b, 0.5);
  log.push('express moved: ' + (Math.abs(b.x - x0) > 100) + ' dx=' + Math.round(b.x - x0));
  // 화면 끝까지 → 파편 + idle
  b.x = p.x + b.expressDir * (Math.max(W, H) * 0.8 + 10);
  const nz0 = G.zones.length;
  updateBoss(b, 0.02);
  log.push('express done: state=' + b.bstate + ' debris=' + (G.zones.length - nz0));
  // 승객 소환 트리거
  b.expressT = 99; b.passengerT = 0.01; b.bt = 99;
  const ne0 = G.enemies.length;
  updateBoss(b, 0.02);
  log.push('summon: state=' + b.bstate + ' invulnT=' + b.invulnT.toFixed(1));
  // 무적 확인
  const hp0 = b.hp;
  damageEnemy(b, 500, 0, 0);
  log.push('invuln: hp unchanged=' + (b.hp === hp0));
  // 웨이브 소환
  b.summonWaveT = 0.01;
  updateBoss(b, 0.02);
  log.push('summon wave: spawned=' + (G.enemies.length - ne0));
  // 종료
  b.bt = 0.01;
  updateBoss(b, 0.02);
  log.push('summon done: state=' + b.bstate);
  // 그리기 예외 없음
  try { drawBoss(b); log.push('drawBoss ok'); } catch (err) { log.push('drawBoss FAIL: ' + err.message); }
  b.bstate = 'express_warn';
  try { drawBoss(b); log.push('drawBoss express_warn ok'); } catch (err) { log.push('drawBoss warn FAIL: ' + err.message); }
  console.log(log.join('\n'));
})();
